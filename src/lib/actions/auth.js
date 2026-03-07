"use server";

import "@/lib/db/relations";
import bcrypt from "bcrypt";
import { USER_ROLES } from "@/lib/config/app.config";
import models from "@/lib/db/models";
import { setSessionUser } from "@/lib/helpers/auth";
import { actionWrapper } from "./utils";

const TWILIO_VERIFY_API_BASE = "https://verify.twilio.com/v2";
const ALLOWED_VERIFY_CHANNELS = new Set(["sms", "whatsapp"]);

const hasTwilioVerifyConfig = () =>
  Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_VERIFY_SERVICE_SID,
  );

const getTwilioAuthHeader = () => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  const credentials = Buffer.from(`${sid}:${token}`).toString("base64");
  return `Basic ${credentials}`;
};

const parseTwilioErrorMessage = (raw) => {
  if (!raw) return "Twilio request failed";
  try {
    const parsed = JSON.parse(raw);
    const code = parsed?.code;
    if (code === 60223) {
      return "Selected OTP channel is disabled in Twilio Verify. Enable it in Verify Service settings or change TWILIO_OTP_CHANNEL.";
    }
    return parsed?.message || raw;
  } catch {
    return raw;
  }
};

const sendTwilioOtp = async (phone) => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;
  const auth = getTwilioAuthHeader();
  if (!sid || !verifySid || !auth) {
    throw new Error("Twilio Verify config missing");
  }

  const configuredChannel = String(
    process.env.TWILIO_OTP_CHANNEL || "whatsapp",
  ).toLowerCase();
  const primaryChannel = ALLOWED_VERIFY_CHANNELS.has(configuredChannel)
    ? configuredChannel
    : "whatsapp";
  const fallbackChannel = primaryChannel === "whatsapp" ? "sms" : "whatsapp";

  const sendWithChannel = async (channel) => {
    const payload = new URLSearchParams();
    payload.append("To", phone);
    payload.append("Channel", channel);

    const res = await fetch(
      `${TWILIO_VERIFY_API_BASE}/Services/${verifySid}/Verifications`,
      {
        method: "POST",
        headers: {
          Authorization: auth,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: payload.toString(),
      },
    );

    if (res.ok) return { ok: true, error: null };
    const text = await res.text();
    return { ok: false, error: parseTwilioErrorMessage(text) || "Failed to send OTP via Twilio" };
  };

  const primary = await sendWithChannel(primaryChannel);
  if (primary.ok) return;

  const shouldFallback =
    String(primary.error || "").includes("channel is disabled") ||
    String(primary.error || "").toLowerCase().includes("channel not configured");

  if (!shouldFallback) {
    throw new Error(primary.error);
  }

  const secondary = await sendWithChannel(fallbackChannel);
  if (secondary.ok) return;

  throw new Error(
    `OTP delivery failed on ${primaryChannel} and ${fallbackChannel}. ${secondary.error}`,
  );
};

const verifyTwilioOtp = async (phone, otp) => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;
  const auth = getTwilioAuthHeader();
  if (!sid || !verifySid || !auth) {
    throw new Error("Twilio Verify config missing");
  }

  const payload = new URLSearchParams();
  payload.append("To", phone);
  payload.append("Code", otp);

  const res = await fetch(
    `${TWILIO_VERIFY_API_BASE}/Services/${verifySid}/VerificationCheck`,
    {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: payload.toString(),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      parseTwilioErrorMessage(text) || "Failed to verify OTP via Twilio",
    );
  }

  const data = await res.json();
  return data?.status === "approved";
};

const adminLoginHandler = async ({ email, password }) => {
  // Check if email exists
  const user = await models.User.findOne({
    where: { email },
  });

  if (!user) throw new Error("User does not exist");

  if (user.role === USER_ROLES.CUSTOMER) {
    throw new Error("Access denied");
  }

  if (!user.password) throw new Error("You are not allowed to login");

  // Check if password matches
  if (await bcrypt.compare(password, user.password)) {
    const userData = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt,
    };

    await setSessionUser(userData);

    return userData;
  }

  throw new Error("Invalid password");
};

export const adminLogin = actionWrapper(adminLoginHandler);

const customerSendOtpHandler = async ({ phone }) => {
  const user = await models.User.findOne({ where: { phone } });
  if (!user) {
    return {
      userId: null,
      isNewUser: true,
      requiresRegistration: true,
      debugOtp: null,
      userData: null,
    };
  }

  if (user.role !== USER_ROLES.CUSTOMER) {
    throw new Error("User found but not a customer");
  }

  let debugOtp = null;
  if (hasTwilioVerifyConfig()) {
    await sendTwilioOtp(phone);
    if (user.otp) {
      user.otp = null;
      await user.save();
    }
  } else {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    user.otp = hashedOtp;
    await user.save();
    if (process.env.NODE_ENV !== "production") {
      debugOtp = otp;
    }
  }

  return {
    userId: user.id,
    isNewUser: false,
    requiresRegistration: false,
    debugOtp,
    userData: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
  };
};

export const customerSendOtp = actionWrapper(customerSendOtpHandler);

const customerVerifyOtpHandler = async ({ userId, otp }) => {
  const user = await models.User.findByPk(userId);

  if (!user || user.role !== USER_ROLES.CUSTOMER) {
    throw new Error("User not found");
  }

  let isValid = false;
  if (hasTwilioVerifyConfig()) {
    isValid = await verifyTwilioOtp(user.phone, otp);
  } else {
    if (!user.otp) {
      throw new Error("OTP not found");
    }
    isValid = await bcrypt.compare(otp, user.otp);
  }

  if (!isValid) {
    throw new Error("Invalid OTP");
  }

  // Clear OTP
  user.otp = null;
  await user.save();

  // Generate auth token and save session
  const userData = {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
  };

  await setSessionUser(userData);

  return userData;
};

export const customerVerifyOtp = actionWrapper(customerVerifyOtpHandler);

const updateCustomerProfileHandler = async ({ userId, fullName, email }) => {
  const user = await models.User.findByPk(userId);

  if (!user || user.role !== USER_ROLES.CUSTOMER) {
    throw new Error("User not found");
  }

  // Update user details
  await user.update({
    fullName: fullName.trim(),
    email: email?.trim() || null,
  });

  // Return updated user data
  const userData = {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
  };

  return userData;
};

export const updateCustomerProfile = actionWrapper(updateCustomerProfileHandler);

const createCustomerHandler = async ({ fullName, phone, email }) => {
  // Check if user already exists with this phone
  const existingUser = await models.User.findOne({ where: { phone } });
  if (existingUser) {
    throw new Error("An account with this phone number already exists");
  }

  // Create new customer
  const user = await models.User.create({
    fullName,
    phone,
    email,
    role: USER_ROLES.CUSTOMER,
  });

  const userData = {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
  };

  return {
    ...userData,
    requiresOtpVerification: true,
  };
};

export const createCustomer = actionWrapper(createCustomerHandler);

const logoutHandler = async () => {
  await setSessionUser(null);
};

export const logout = actionWrapper(logoutHandler);
