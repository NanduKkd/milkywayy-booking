"use server";

import "@/lib/db/relations";
import bcrypt from "bcrypt";
import { headers } from "next/headers";
import { USER_ROLES } from "@/lib/config/app.config";
import models from "@/lib/db/models";
import { setSessionUser } from "@/lib/helpers/auth";
import {
  buildCustomerSessionUserData,
  sendCustomerOtp,
  verifyCustomerOtp,
} from "@/lib/services/customerAuth";
import { actionWrapper } from "./utils";

const normalizeOptionalString = (value) => {
  const normalized = String(value ?? "").trim();
  return normalized || null;
};

const getRequestSource = async () => {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");
  const realIp = headerStore.get("x-real-ip");
  const connectingIp = headerStore.get("cf-connecting-ip");
  const ip =
    forwardedFor?.split(",")[0]?.trim() || realIp || connectingIp || "unknown";

  return ip;
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
    const userData = buildCustomerSessionUserData(user);

    await setSessionUser(userData);

    return userData;
  }

  throw new Error("Invalid password");
};

export const adminLogin = actionWrapper(adminLoginHandler);

const customerSendOtpHandler = async ({ phone }) => {
  return sendCustomerOtp({
    phone,
    requestSource: await getRequestSource(),
  });
};

export const customerSendOtp = actionWrapper(customerSendOtpHandler);

const customerVerifyOtpHandler = async ({ verificationId, otp }) => {
  const userData = await verifyCustomerOtp({
    verificationId,
    otp,
    requestSource: await getRequestSource(),
  });

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
  const userData = buildCustomerSessionUserData(user);

  return userData;
};

export const updateCustomerProfile = actionWrapper(
  updateCustomerProfileHandler,
);

const createCustomerHandler = async ({
  accountType,
  fullName,
  companyName,
  phone,
  email,
  billingAddress,
  trn,
}) => {
  // Check if user already exists with this phone
  const existingUser = await models.User.findOne({ where: { phone } });
  if (existingUser) {
    throw new Error("An account with this phone number already exists");
  }

  const normalizedEmail = normalizeOptionalString(email);
  if (normalizedEmail) {
    const existingEmailUser = await models.User.findOne({
      where: { email: normalizedEmail },
    });
    if (existingEmailUser) {
      throw new Error("An account with this email already exists");
    }
  }

  const normalizedAccountType =
    accountType === "COMPANY" ? "COMPANY" : "INDIVIDUAL";
  const normalizedFullName =
    normalizedAccountType === "COMPANY"
      ? normalizeOptionalString(companyName)
      : normalizeOptionalString(fullName);

  if (!normalizedFullName) {
    throw new Error(
      normalizedAccountType === "COMPANY"
        ? "Company name is required"
        : "Full name is required",
    );
  }

  // Create new customer
  const user = await models.User.create({
    fullName: normalizedFullName,
    phone,
    email: normalizedEmail,
    accountType: normalizedAccountType,
    companyName:
      normalizedAccountType === "COMPANY"
        ? normalizeOptionalString(companyName)
        : null,
    billingAddress:
      normalizedAccountType === "COMPANY"
        ? normalizeOptionalString(billingAddress)
        : null,
    trn:
      normalizedAccountType === "COMPANY" ? normalizeOptionalString(trn) : null,
    role: USER_ROLES.CUSTOMER,
  });

  const userData = buildCustomerSessionUserData(user);

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
