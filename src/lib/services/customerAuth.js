import bcrypt from "bcrypt";
import { jwtVerify, SignJWT } from "jose";
import { USER_ROLES } from "@/lib/config/app.config";
import { sessionConfig } from "@/lib/config/session";
import models from "@/lib/db/models";
import { sendWhatsAppTemplate } from "@/lib/notifications/whatsapp";
import {
  consumeRateLimit,
  RateLimitExceededError,
} from "@/lib/services/oauthRateLimits";

const TWILIO_VERIFY_API_BASE = "https://verify.twilio.com/v2";
const ALLOWED_VERIFY_CHANNELS = new Set(["sms", "whatsapp"]);
const OTP_LENGTH = 6;
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_THROTTLE_MS = 60 * 1000;
const OTP_MAX_VERIFY_ATTEMPTS = 5;
const OTP_VERIFICATION_TOKEN_TTL = "10m";
const OTP_TOKEN_AUDIENCE = "customer-auth-otp";
const OTP_TOKEN_ISSUER = "milkywayy";

const OTP_LIMITS = {
  send: {
    phone: {
      bucketType: "customer-otp-send-phone",
      limit: 5,
      windowMs: 15 * 60 * 1000,
    },
    source: {
      bucketType: "customer-otp-send-source",
      limit: 20,
      windowMs: 15 * 60 * 1000,
    },
  },
  verify: {
    phone: {
      bucketType: "customer-otp-verify-phone",
      limit: 10,
      windowMs: 15 * 60 * 1000,
    },
    source: {
      bucketType: "customer-otp-verify-source",
      limit: 30,
      windowMs: 15 * 60 * 1000,
    },
  },
};

function toWhatsAppPhone(phone) {
  if (!phone) return null;

  const cleaned = String(phone).replace(/\s/g, "").trim();

  if (!cleaned) return null;
  if (cleaned.startsWith("whatsapp:")) return cleaned;

  return `whatsapp:${cleaned}`;
}

function normalizePhone(phone) {
  return String(phone ?? "")
    .replace(/\s/g, "")
    .trim();
}

function hasTwilioVerifyConfig() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_VERIFY_SERVICE_SID,
  );
}

function hasWhatsAppOtpConfig() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      (process.env.TWILIO_WHATSAPP_FROM ||
        process.env.TWILIO_MESSAGING_SERVICE_SID),
  );
}

function getTwilioAuthHeader() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;

  if (!sid || !token) return null;

  const credentials = Buffer.from(`${sid}:${token}`).toString("base64");
  return `Basic ${credentials}`;
}

function parseTwilioErrorMessage(raw) {
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
}

function createNumericOtp() {
  return Math.floor(
    10 ** (OTP_LENGTH - 1) + Math.random() * 9 * 10 ** (OTP_LENGTH - 1),
  ).toString();
}

function formatRateLimitMessage(error) {
  const retryAfterSeconds = error.retryAfterSeconds ?? 60;

  if (retryAfterSeconds >= 60) {
    const retryAfterMinutes = Math.ceil(retryAfterSeconds / 60);
    return `Too many attempts. Please wait ${retryAfterMinutes} minute${retryAfterMinutes === 1 ? "" : "s"} before trying again.`;
  }

  return `Too many attempts. Please wait ${retryAfterSeconds} second${retryAfterSeconds === 1 ? "" : "s"} before trying again.`;
}

function getOtpExpiry(now = new Date()) {
  return new Date(now.getTime() + OTP_TTL_MS);
}

function getOtpResendAvailableAt(now = new Date()) {
  return new Date(now.getTime() + OTP_RESEND_THROTTLE_MS);
}

function normalizeRequestSource(requestSource) {
  const normalized = String(requestSource ?? "").trim();
  return normalized || "unknown";
}

function isOtpExpired(user, now) {
  return Boolean(
    user?.otpExpiresAt &&
      new Date(user.otpExpiresAt).getTime() <= now.getTime(),
  );
}

async function clearStoredOtpState(user) {
  user.otp = null;
  user.otpExpiresAt = null;
  user.otpAttemptCount = 0;
  user.otpResendAvailableAt = null;
  await user.save();
}

async function storeOtpState({ user, otpHash, now }) {
  user.otp = otpHash;
  user.otpExpiresAt = getOtpExpiry(now);
  user.otpAttemptCount = 0;
  user.otpResendAvailableAt = getOtpResendAvailableAt(now);
  await user.save();
}

async function ensureOtpCanBeResent({ user, now }) {
  if (isOtpExpired(user, now)) {
    await clearStoredOtpState(user);
    return;
  }

  if (
    user.otpResendAvailableAt &&
    new Date(user.otpResendAvailableAt).getTime() > now.getTime()
  ) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil(
        (new Date(user.otpResendAvailableAt).getTime() - now.getTime()) / 1000,
      ),
    );
    throw new Error(
      formatRateLimitMessage(
        new RateLimitExceededError({
          bucketType: "customer-otp-resend",
          retryAfterSeconds,
        }),
      ),
    );
  }
}

async function applyRateLimit({ bucket, key, now }) {
  try {
    await consumeRateLimit({
      bucketType: bucket.bucketType,
      key,
      limit: bucket.limit,
      windowMs: bucket.windowMs,
      now,
    });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      throw new Error(formatRateLimitMessage(error));
    }

    throw error;
  }
}

async function applyOtpSendRateLimits({ phone, requestSource, now }) {
  await applyRateLimit({
    bucket: OTP_LIMITS.send.phone,
    key: `phone:${phone}`,
    now,
  });

  await applyRateLimit({
    bucket: OTP_LIMITS.send.source,
    key: `source:${normalizeRequestSource(requestSource)}`,
    now,
  });
}

async function applyOtpVerifyRateLimits({ phone, requestSource, now }) {
  if (phone) {
    await applyRateLimit({
      bucket: OTP_LIMITS.verify.phone,
      key: `phone:${phone}`,
      now,
    });
  }

  await applyRateLimit({
    bucket: OTP_LIMITS.verify.source,
    key: `source:${normalizeRequestSource(requestSource)}`,
    now,
  });
}

async function issueOtpVerificationId({ phone, userId }) {
  return new SignJWT({
    phone,
    userId: userId ?? null,
    purpose: OTP_TOKEN_AUDIENCE,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(OTP_TOKEN_ISSUER)
    .setAudience(OTP_TOKEN_AUDIENCE)
    .setExpirationTime(OTP_VERIFICATION_TOKEN_TTL)
    .sign(sessionConfig.key);
}

async function verifyOtpVerificationId(verificationId) {
  const { payload } = await jwtVerify(verificationId, sessionConfig.key, {
    issuer: OTP_TOKEN_ISSUER,
    audience: OTP_TOKEN_AUDIENCE,
  });

  return {
    phone: normalizePhone(payload.phone),
    userId:
      typeof payload.userId === "number" ||
      (typeof payload.userId === "string" && payload.userId !== "")
        ? Number(payload.userId)
        : null,
  };
}

async function sendTwilioOtp(phone) {
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
    return {
      ok: false,
      error: parseTwilioErrorMessage(text) || "Failed to send OTP via Twilio",
    };
  };

  const primary = await sendWithChannel(primaryChannel);

  if (primary.ok) return;

  const shouldFallback =
    String(primary.error || "").includes("channel is disabled") ||
    String(primary.error || "")
      .toLowerCase()
      .includes("channel not configured");

  if (!shouldFallback) {
    throw new Error(primary.error);
  }

  const secondary = await sendWithChannel(fallbackChannel);

  if (secondary.ok) return;

  throw new Error(
    `OTP delivery failed on ${primaryChannel} and ${fallbackChannel}. ${secondary.error}`,
  );
}

async function verifyTwilioOtp(phone, otp) {
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
}

export function buildCustomerSessionUserData(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    accountType: user.accountType || "INDIVIDUAL",
    companyName: user.companyName,
    billingAddress: user.billingAddress,
    trn: user.trn,
    createdAt: user.createdAt,
  };
}

export async function sendCustomerOtp({
  phone,
  requestSource,
  now = new Date(),
}) {
  const normalizedPhone = normalizePhone(phone);

  if (!normalizedPhone) {
    throw new Error("Phone number is required");
  }

  await applyOtpSendRateLimits({
    phone: normalizedPhone,
    requestSource,
    now,
  });

  const user = await models.User.findOne({ where: { phone: normalizedPhone } });
  const isCustomerUser = user?.role === USER_ROLES.CUSTOMER && !user.disabledAt;
  const verificationId = await issueOtpVerificationId({
    phone: normalizedPhone,
    userId: isCustomerUser ? user.id : null,
  });

  if (!user || !isCustomerUser) {
    return {
      verificationId,
      debugOtp: null,
    };
  }

  await ensureOtpCanBeResent({ user, now });

  let debugOtp = null;

  if (hasWhatsAppOtpConfig()) {
    const otp = createNumericOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const whatsappTo = toWhatsAppPhone(normalizedPhone);

    if (!whatsappTo) {
      throw new Error("Invalid phone number for WhatsApp");
    }

    await storeOtpState({ user, otpHash: hashedOtp, now });

    const result = await sendWhatsAppTemplate({
      to: whatsappTo,
      templateName: "login_otp",
      variables: { Code: otp, Expiry_Minutes: "5" },
    });

    if (!result.success) {
      await clearStoredOtpState(user);
      throw new Error(result.error || "Failed to send OTP to WhatsApp");
    }

    if (process.env.NODE_ENV !== "production") {
      debugOtp = otp;
    }
  } else if (hasTwilioVerifyConfig()) {
    await storeOtpState({ user, otpHash: null, now });

    try {
      await sendTwilioOtp(normalizedPhone);
    } catch (error) {
      await clearStoredOtpState(user);
      throw error;
    }

    if (process.env.NODE_ENV !== "production") {
      debugOtp = "(Verify API - check Twilio logs)";
    }
  } else {
    const otp = createNumericOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);

    await storeOtpState({ user, otpHash: hashedOtp, now });

    if (process.env.NODE_ENV !== "production") {
      debugOtp = otp;
    }
  }

  return {
    verificationId,
    debugOtp,
  };
}

export async function verifyCustomerOtp({
  verificationId,
  otp,
  requestSource,
  now = new Date(),
}) {
  const normalizedOtp = String(otp ?? "").trim();

  if (!normalizedOtp) {
    throw new Error("OTP is required");
  }

  let verificationPayload;

  try {
    verificationPayload = await verifyOtpVerificationId(verificationId);
  } catch {
    throw new Error("OTP expired or not found. Please request a new one.");
  }

  await applyOtpVerifyRateLimits({
    phone: verificationPayload.phone,
    requestSource,
    now,
  });

  if (!verificationPayload.userId) {
    throw new Error("Invalid OTP");
  }

  const user = await models.User.findByPk(verificationPayload.userId);

  if (
    !user ||
    user.role !== USER_ROLES.CUSTOMER ||
    user.disabledAt ||
    normalizePhone(user.phone) !== verificationPayload.phone
  ) {
    throw new Error("Invalid OTP");
  }

  if (isOtpExpired(user, now)) {
    await clearStoredOtpState(user);
    throw new Error("OTP expired or not found. Please request a new one.");
  }

  if ((user.otpAttemptCount || 0) >= OTP_MAX_VERIFY_ATTEMPTS) {
    await clearStoredOtpState(user);
    throw new Error(
      "Too many invalid OTP attempts. Please request a new code.",
    );
  }

  let isValid = false;

  if (hasWhatsAppOtpConfig()) {
    if (!user.otp) {
      throw new Error("OTP expired or not found. Please request a new one.");
    }

    isValid = await bcrypt.compare(normalizedOtp, user.otp);
  } else if (hasTwilioVerifyConfig()) {
    isValid = await verifyTwilioOtp(user.phone, normalizedOtp);
  } else {
    if (!user.otp) {
      throw new Error("OTP expired or not found. Please request a new one.");
    }

    isValid = await bcrypt.compare(normalizedOtp, user.otp);
  }

  if (!isValid) {
    const nextAttemptCount = (user.otpAttemptCount || 0) + 1;

    if (nextAttemptCount >= OTP_MAX_VERIFY_ATTEMPTS) {
      await clearStoredOtpState(user);
      throw new Error(
        "Too many invalid OTP attempts. Please request a new code.",
      );
    }

    user.otpAttemptCount = nextAttemptCount;
    await user.save();
    throw new Error("Invalid OTP");
  }

  await clearStoredOtpState(user);

  return buildCustomerSessionUserData(user);
}
