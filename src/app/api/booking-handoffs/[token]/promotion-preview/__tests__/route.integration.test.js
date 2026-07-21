/** @jest-environment node */

import { createHmac } from "node:crypto";
import { sessionConfig } from "@/lib/config/session";
import Transaction from "@/lib/db/models/transaction";
import { getRequestSource } from "@/lib/helpers/requestSource";
import {
  consumeRateLimit,
  RateLimitExceededError,
} from "@/lib/services/oauthRateLimits";
import { POST } from "../route";

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      headers: init?.headers || {},
      status: init?.status || 200,
    })),
  },
}));

jest.mock("@/lib/helpers/requestSource", () => ({
  getRequestSource: jest.fn(),
}));

jest.mock("@/lib/actions/discounts", () => ({
  getDiscounts: jest.fn(),
}));

jest.mock("@/lib/db/db", () => ({
  sequelize: {
    transaction: jest.fn(),
  },
}));

jest.mock("@/lib/db/relations", () => ({}));

jest.mock("@/lib/db/models/booking", () => ({
  create: jest.fn(),
  destroy: jest.fn(),
  findAll: jest.fn(),
}));

jest.mock("@/lib/db/models/transaction", () => ({
  create: jest.fn(),
  findByPk: jest.fn(),
}));

jest.mock("@/lib/db/models/user", () => ({}));

jest.mock("@/lib/db/models/wallettransaction", () => ({
  create: jest.fn(),
  destroy: jest.fn(),
}));

jest.mock("@/lib/helpers/pricing", () => ({
  getPricingConfig: jest.fn(),
}));

jest.mock("@/lib/helpers/promotionPricing", () => ({
  calculateWalletCreditPreview: jest.fn(),
}));

jest.mock("@/lib/services/adminBookingHandoffNotifications", () => ({
  sendAdminBookingHandoffWhatsApp: jest.fn(),
}));

jest.mock("@/lib/services/adminBookingPreparation", () => ({
  previewAdminBookingPreparation: jest.fn(),
}));

jest.mock("@/lib/services/bookingPreparation", () => ({
  buildPreparedPropertySummary: jest.fn(),
  START_TIME_TO_SLOT: {},
}));

jest.mock("@/lib/services/customerAuth", () => ({
  sendCustomerOtp: jest.fn(),
  verifyCustomerOtp: jest.fn(),
}));

jest.mock("@/lib/services/promotionCheckout", () => ({
  releasePromotionForCheckoutTransaction: jest.fn(),
  reservePromotionForCheckoutTransaction: jest.fn(),
}));

jest.mock("@/lib/services/promotionPricing", () => ({
  evaluateCheckoutPromotionPricing: jest.fn(),
  isPromotionCodeValidationSuccessful: jest.fn(),
}));

jest.mock("@/lib/services/schedulingConflictRevalidation", () => ({
  loadSchedulingConflictContext: jest.fn(),
}));

jest.mock("@/lib/services/oauthRateLimits", () => ({
  consumeRateLimit: jest.fn(),
  RateLimitExceededError: class RateLimitExceededError extends Error {},
}));

const HANDOFF_AUDIENCE = "admin-booking-handoff";
const HANDOFF_ISSUER = "milkywayy";

async function buildSyntheticToken({
  issuer = HANDOFF_ISSUER,
  audience = HANDOFF_AUDIENCE,
  key = sessionConfig.key,
} = {}) {
  const encode = (value) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const header = encode({ alg: "HS256", typ: "JWT" });
  const payload = encode({
    transactionId: 91,
    version: "synthetic-v1",
    purpose: HANDOFF_AUDIENCE,
    iss: issuer,
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
  });
  const signingInput = `${header}.${payload}`;
  const signature = createHmac("sha256", key)
    .update(signingInput)
    .digest("base64url");

  return `${signingInput}.${signature}`;
}

function buildRequest(token) {
  return [
    {
      json: jest.fn().mockResolvedValue({ eligibleSubtotal: 820 }),
    },
    { params: Promise.resolve({ token }) },
  ];
}

describe("booking handoff promotion preview token boundary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getRequestSource.mockResolvedValue("synthetic-test-source");
    consumeRateLimit.mockResolvedValue({ remaining: 10 });
  });

  it.each([
    ["malformed compact JWS", "invalid-token"],
    [
      "invalid signature",
      () =>
        buildSyntheticToken({
          key: new TextEncoder().encode("synthetic-wrong-signing-key"),
        }),
    ],
    ["wrong issuer", () => buildSyntheticToken({ issuer: "other-service" })],
    ["wrong audience", () => buildSyntheticToken({ audience: "other-client" })],
  ])(
    "returns exactly the safe 400 response for %s before protected lookups",
    async (_, tokenInput) => {
      const token =
        typeof tokenInput === "function" ? await tokenInput() : tokenInput;
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const response = await POST(...buildRequest(token));

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "Invalid booking handoff link",
      });
      expect(Transaction.findByPk).not.toHaveBeenCalled();
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("jose"),
        expect.anything(),
      );
      consoleSpy.mockRestore();
    },
  );

  it("keeps valid-token protected-state and rate-limit behavior intact", async () => {
    const protectedTransaction = {
      id: 91,
      userId: 12,
      user: { id: 12, role: "CUSTOMER" },
      status: "pending",
      metadata: {
        adminBookingHandoff: {
          version: "synthetic-v1",
          requiresRegistration: true,
          expiresAt: "2099-07-21T12:00:00.000Z",
        },
      },
    };
    Transaction.findByPk.mockResolvedValue(protectedTransaction);

    const protectedToken = await buildSyntheticToken();
    const protectedConsoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation();
    const protectedResponse = await POST(...buildRequest(protectedToken));

    expect(protectedResponse.status).toBe(400);
    expect(await protectedResponse.json()).toEqual({
      error: "Phone verification is required before pricing or payment",
    });
    expect(Transaction.findByPk).toHaveBeenCalledTimes(1);
    protectedConsoleSpy.mockRestore();

    jest.clearAllMocks();
    getRequestSource.mockResolvedValue("synthetic-test-source");
    const rateLimitError = Object.assign(
      new RateLimitExceededError("synthetic rate limit"),
      { retryAfterSeconds: 19 },
    );
    consumeRateLimit.mockRejectedValue(rateLimitError);

    const rateLimitedConsoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation();
    const rateLimitedResponse = await POST(...buildRequest(protectedToken));

    expect(rateLimitedResponse.status).toBe(429);
    expect(rateLimitedResponse.headers).toEqual({ "Retry-After": "19" });
    expect(await rateLimitedResponse.json()).toEqual({
      error: "Too many pricing requests. Please wait before trying again.",
    });
    expect(Transaction.findByPk).not.toHaveBeenCalled();
    rateLimitedConsoleSpy.mockRestore();
  });
});
