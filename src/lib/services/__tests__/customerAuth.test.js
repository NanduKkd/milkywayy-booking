import bcrypt from "bcrypt";
import models from "@/lib/db/models";
import {
  buildCustomerSessionUserData,
  sendCustomerOtp,
  verifyCustomerOtp,
} from "../customerAuth";
import { consumeRateLimit, RateLimitExceededError } from "../oauthRateLimits";

jest.mock("bcrypt", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock("jose", () => ({
  SignJWT: class SignJWT {
    constructor(payload) {
      this.payload = payload;
    }

    setProtectedHeader() {
      return this;
    }

    setIssuedAt() {
      return this;
    }

    setIssuer(issuer) {
      this.payload.iss = issuer;
      return this;
    }

    setAudience(audience) {
      this.payload.aud = audience;
      return this;
    }

    setExpirationTime() {
      return this;
    }

    async sign() {
      return JSON.stringify(this.payload);
    }
  },
  jwtVerify: jest.fn(async (token) => ({
    payload: JSON.parse(token),
  })),
}));

jest.mock("@/lib/db/models", () => ({
  __esModule: true,
  default: {
    User: {
      findOne: jest.fn(),
      findByPk: jest.fn(),
    },
  },
}));

jest.mock("../oauthRateLimits", () => ({
  consumeRateLimit: jest.fn(),
  RateLimitExceededError: class RateLimitExceededError extends Error {
    constructor({ bucketType, retryAfterSeconds }) {
      super("Too many requests. Please wait before trying again.");
      this.name = "RateLimitExceededError";
      this.bucketType = bucketType;
      this.retryAfterSeconds = retryAfterSeconds;
    }
  },
}));

describe("customerAuth service", () => {
  const originalEnv = {
    NODE_ENV: process.env.NODE_ENV,
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_VERIFY_SERVICE_SID: process.env.TWILIO_VERIFY_SERVICE_SID,
    TWILIO_WHATSAPP_FROM: process.env.TWILIO_WHATSAPP_FROM,
    TWILIO_MESSAGING_SERVICE_SID: process.env.TWILIO_MESSAGING_SERVICE_SID,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = "test";
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_VERIFY_SERVICE_SID;
    delete process.env.TWILIO_WHATSAPP_FROM;
    delete process.env.TWILIO_MESSAGING_SERVICE_SID;
    consumeRateLimit.mockResolvedValue({
      requestCount: 1,
      remaining: 4,
      expiresAt: new Date("2026-06-29T00:15:00.000Z"),
    });
  });

  afterAll(() => {
    Object.entries(originalEnv).forEach(([key, value]) => {
      if (typeof value === "undefined") {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
  });

  it("returns an opaque verification id even when the customer does not exist", async () => {
    models.User.findOne.mockResolvedValue(null);

    const result = await sendCustomerOtp({
      phone: "+971500000000",
      requestSource: "127.0.0.1",
    });

    expect(typeof result.verificationId).toBe("string");
    expect(result.debugOtp).toBeNull();
    expect(models.User.findOne).toHaveBeenCalledWith({
      where: { phone: "+971500000000" },
    });
    expect(consumeRateLimit).toHaveBeenCalledTimes(2);
  });

  it("stores OTP metadata and returns a verification id for existing customers", async () => {
    bcrypt.hash.mockResolvedValue("hashed-otp");
    const save = jest.fn();
    const user = {
      id: 7,
      fullName: "A Customer",
      email: "customer@example.com",
      phone: "+971500000000",
      role: "CUSTOMER",
      accountType: "INDIVIDUAL",
      companyName: null,
      billingAddress: null,
      trn: null,
      createdAt: "2026-06-29T00:00:00.000Z",
      otp: null,
      otpExpiresAt: null,
      otpAttemptCount: 0,
      otpResendAvailableAt: null,
      save,
    };
    models.User.findOne.mockResolvedValue(user);

    const result = await sendCustomerOtp({
      phone: user.phone,
      requestSource: "127.0.0.1",
      now: new Date("2026-06-29T00:00:00.000Z"),
    });

    expect(typeof result.verificationId).toBe("string");
    expect(result.debugOtp).toHaveLength(6);
    expect(user.otp).toBe("hashed-otp");
    expect(user.otpAttemptCount).toBe(0);
    expect(user.otpExpiresAt).toEqual(new Date("2026-06-29T00:05:00.000Z"));
    expect(user.otpResendAvailableAt).toEqual(
      new Date("2026-06-29T00:01:00.000Z"),
    );
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("rejects resend requests inside the throttle window", async () => {
    const user = {
      id: 7,
      phone: "+971500000000",
      role: "CUSTOMER",
      otp: "hashed-otp",
      otpExpiresAt: new Date("2026-06-29T00:05:00.000Z"),
      otpAttemptCount: 0,
      otpResendAvailableAt: new Date("2026-06-29T00:01:00.000Z"),
      save: jest.fn(),
    };
    models.User.findOne.mockResolvedValue(user);

    await expect(
      sendCustomerOtp({
        phone: user.phone,
        requestSource: "127.0.0.1",
        now: new Date("2026-06-29T00:00:30.000Z"),
      }),
    ).rejects.toThrow("Please wait 30 seconds before trying again.");
  });

  it("verifies a valid OTP and clears the stored state", async () => {
    bcrypt.hash.mockResolvedValue("hashed-otp");
    bcrypt.compare.mockResolvedValue(true);
    const save = jest.fn();
    const user = {
      id: 9,
      fullName: "Verified Customer",
      email: "verified@example.com",
      phone: "+971511111111",
      role: "CUSTOMER",
      accountType: "COMPANY",
      companyName: "Milkywayy Realty",
      billingAddress: "Dubai",
      trn: "TRN-123",
      createdAt: "2026-06-29T00:00:00.000Z",
      otp: null,
      otpExpiresAt: null,
      otpAttemptCount: 0,
      otpResendAvailableAt: null,
      save,
    };
    models.User.findOne.mockResolvedValue(user);

    const { verificationId } = await sendCustomerOtp({
      phone: user.phone,
      requestSource: "127.0.0.1",
      now: new Date("2026-06-29T00:00:00.000Z"),
    });

    models.User.findByPk.mockResolvedValue(user);

    const result = await verifyCustomerOtp({
      verificationId,
      otp: "123456",
      requestSource: "127.0.0.1",
      now: new Date("2026-06-29T00:02:00.000Z"),
    });

    expect(result).toEqual(buildCustomerSessionUserData(user));
    expect(user.otp).toBeNull();
    expect(user.otpExpiresAt).toBeNull();
    expect(user.otpAttemptCount).toBe(0);
    expect(user.otpResendAvailableAt).toBeNull();
    expect(save).toHaveBeenCalledTimes(2);
    expect(consumeRateLimit).toHaveBeenCalledTimes(4);
  });

  it("clears expired OTP state and rejects verification", async () => {
    bcrypt.hash.mockResolvedValue("hashed-otp");
    const freshSave = jest.fn();
    const expiredSave = jest.fn();
    const freshUser = {
      id: 9,
      phone: "+971511111111",
      role: "CUSTOMER",
      otp: null,
      otpExpiresAt: null,
      otpAttemptCount: 0,
      otpResendAvailableAt: null,
      save: freshSave,
    };
    const user = {
      ...freshUser,
      otp: "stored-hash",
      otpExpiresAt: new Date("2026-06-29T00:05:00.000Z"),
      otpAttemptCount: 0,
      otpResendAvailableAt: new Date("2026-06-29T00:01:00.000Z"),
      save: expiredSave,
    };
    models.User.findOne.mockResolvedValue(freshUser);
    models.User.findByPk.mockResolvedValue(user);

    const expiredVerificationId = await sendCustomerOtp({
      phone: freshUser.phone,
      requestSource: "127.0.0.1",
      now: new Date("2026-06-29T00:00:00.000Z"),
    });

    await expect(
      verifyCustomerOtp({
        verificationId: expiredVerificationId.verificationId,
        otp: "123456",
        requestSource: "127.0.0.1",
        now: new Date("2026-06-29T00:06:00.000Z"),
      }),
    ).rejects.toThrow("OTP expired or not found. Please request a new one.");

    expect(user.otp).toBeNull();
    expect(user.otpExpiresAt).toBeNull();
    expect(user.otpAttemptCount).toBe(0);
    expect(user.otpResendAvailableAt).toBeNull();
    expect(freshSave).toHaveBeenCalledTimes(1);
    expect(expiredSave).toHaveBeenCalledTimes(1);
  });

  it("caps invalid OTP attempts and clears state on the final failure", async () => {
    bcrypt.hash.mockResolvedValue("hashed-otp");
    bcrypt.compare.mockResolvedValue(false);
    const save = jest.fn();
    const user = {
      id: 9,
      phone: "+971511111111",
      role: "CUSTOMER",
      otp: null,
      otpExpiresAt: null,
      otpAttemptCount: 0,
      otpResendAvailableAt: null,
      save,
    };
    models.User.findOne.mockResolvedValue(user);

    const { verificationId } = await sendCustomerOtp({
      phone: user.phone,
      requestSource: "127.0.0.1",
      now: new Date("2026-06-29T00:00:00.000Z"),
    });

    user.otpAttemptCount = 4;
    models.User.findByPk.mockResolvedValue(user);

    await expect(
      verifyCustomerOtp({
        verificationId,
        otp: "000000",
        requestSource: "127.0.0.1",
        now: new Date("2026-06-29T00:02:00.000Z"),
      }),
    ).rejects.toThrow(
      "Too many invalid OTP attempts. Please request a new code.",
    );

    expect(user.otp).toBeNull();
    expect(user.otpExpiresAt).toBeNull();
    expect(user.otpAttemptCount).toBe(0);
    expect(user.otpResendAvailableAt).toBeNull();
  });

  it("maps database-backed rate-limit failures to safe messages", async () => {
    models.User.findOne.mockResolvedValue(null);
    consumeRateLimit.mockRejectedValueOnce(
      new RateLimitExceededError({
        bucketType: "customer-otp-send-phone",
        retryAfterSeconds: 90,
      }),
    );

    await expect(
      sendCustomerOtp({
        phone: "+971500000000",
        requestSource: "127.0.0.1",
      }),
    ).rejects.toThrow("Please wait 2 minutes before trying again.");
  });
});
