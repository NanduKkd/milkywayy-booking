import { NextResponse } from "next/server";
import { getRequestSource } from "@/lib/helpers/requestSource";
import {
  isAdminBookingHandoffRateLimitError,
  previewAdminBookingHandoffPromotionPricing,
} from "@/lib/services/adminBookingHandoffs";
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

jest.mock("@/lib/services/adminBookingHandoffs", () => ({
  isAdminBookingHandoffRateLimitError: jest.fn(),
  previewAdminBookingHandoffPromotionPricing: jest.fn(),
}));

describe("Booking handoff promotion preview route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getRequestSource.mockResolvedValue("127.0.0.1");
    isAdminBookingHandoffRateLimitError.mockReturnValue(false);
  });

  it("previews pricing without accepting a browser-supplied customer ID", async () => {
    previewAdminBookingHandoffPromotionPricing.mockResolvedValue({
      eligibleSubtotal: 820,
      selectedPromotion: {
        promotionId: 44,
        kind: "PERSONAL",
        benefitAmount: 125,
      },
    });

    const response = await POST(
      {
        json: jest.fn().mockResolvedValue({
          eligibleSubtotal: 820,
          promotionCode: "PERSONAL10",
          userId: 999,
        }),
      },
      { params: Promise.resolve({ token: "handoff-token" }) },
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(previewAdminBookingHandoffPromotionPricing).toHaveBeenCalledWith({
      token: "handoff-token",
      eligibleSubtotal: 820,
      enteredCode: "PERSONAL10",
      requestSource: "127.0.0.1",
    });
    expect(data.selectedPromotion.kind).toBe("PERSONAL");
  });

  it("fails safely before exposing promotion eligibility", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    previewAdminBookingHandoffPromotionPricing.mockRejectedValue(
      new Error("Phone verification is required before pricing or payment"),
    );

    const response = await POST(
      {
        json: jest.fn().mockResolvedValue({ eligibleSubtotal: 820 }),
      },
      { params: Promise.resolve({ token: "handoff-token" }) },
    );

    expect(response.status).toBe(400);
    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: "Phone verification is required before pricing or payment" },
      { status: 400 },
    );
    consoleSpy.mockRestore();
  });

  it("returns a bounded 429 response for rate-limited previews", async () => {
    const error = Object.assign(new Error("Too many requests"), {
      retryAfterSeconds: 17,
    });
    previewAdminBookingHandoffPromotionPricing.mockRejectedValue(error);
    isAdminBookingHandoffRateLimitError.mockReturnValue(true);

    const response = await POST(
      {
        json: jest.fn().mockResolvedValue({ eligibleSubtotal: 820 }),
      },
      { params: Promise.resolve({ token: "handoff-token" }) },
    );

    expect(response.status).toBe(429);
    expect(response.headers).toEqual({ "Retry-After": "17" });
    expect(await response.json()).toEqual({
      error: "Too many pricing requests. Please wait before trying again.",
    });
  });

  it("does not expose unexpected pricing or database errors", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    previewAdminBookingHandoffPromotionPricing.mockRejectedValue(
      new Error("synthetic database detail"),
    );

    const response = await POST(
      {
        json: jest.fn().mockResolvedValue({ eligibleSubtotal: 820 }),
      },
      { params: Promise.resolve({ token: "handoff-token" }) },
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Unable to load promotion pricing",
    });
    consoleSpy.mockRestore();
  });
});
