import { NextResponse } from "next/server";
import { createAdminBookingHandoffCheckout } from "@/lib/services/adminBookingHandoffs";
import { POST } from "../route";

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200,
    })),
  },
}));

jest.mock("@/lib/services/adminBookingHandoffs", () => ({
  createAdminBookingHandoffCheckout: jest.fn(),
}));

describe("Booking handoff checkout route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("starts checkout for a valid handoff", async () => {
    createAdminBookingHandoffCheckout.mockResolvedValue({
      url: "https://stripe.test/session",
    });

    const response = await POST(
      {
        json: jest.fn().mockResolvedValue({
          properties: [{ preferredDate: "2099-07-21" }],
          promotionCode: "WELCOME10",
        }),
      },
      {
        params: Promise.resolve({ token: "handoff-token" }),
      },
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(createAdminBookingHandoffCheckout).toHaveBeenCalledWith({
      token: "handoff-token",
      properties: [{ preferredDate: "2099-07-21" }],
      enteredCode: "WELCOME10",
    });
    expect(data.url).toBe("https://stripe.test/session");
  });

  it("returns 400 when checkout cannot continue", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    createAdminBookingHandoffCheckout.mockRejectedValue(
      new Error("Phone verification is required before payment"),
    );

    const response = await POST(
      {
        json: jest.fn().mockResolvedValue({
          properties: [],
          promotionCode: "",
        }),
      },
      {
        params: Promise.resolve({ token: "handoff-token" }),
      },
    );

    expect(response.status).toBe(400);
    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: "Phone verification is required before payment" },
      { status: 400 },
    );

    consoleSpy.mockRestore();
  });
});
