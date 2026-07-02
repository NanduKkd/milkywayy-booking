import { NextResponse } from "next/server";
import { getAdminBookingHandoffByToken } from "@/lib/services/adminBookingHandoffs";
import { GET } from "../route";

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200,
    })),
  },
}));

jest.mock("@/lib/services/adminBookingHandoffs", () => ({
  getAdminBookingHandoffByToken: jest.fn(),
}));

describe("Booking handoff GET route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads a booking handoff by token", async () => {
    getAdminBookingHandoffByToken.mockResolvedValue({
      transactionId: 17,
      requiresRegistration: true,
    });

    const response = await GET(
      {},
      {
        params: Promise.resolve({ token: "handoff-token" }),
      },
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(getAdminBookingHandoffByToken).toHaveBeenCalledWith({
      token: "handoff-token",
    });
    expect(data.transactionId).toBe(17);
  });

  it("returns a bad request for invalid tokens", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    getAdminBookingHandoffByToken.mockRejectedValue(
      new Error("This booking handoff link is no longer active"),
    );

    const response = await GET(
      {},
      {
        params: Promise.resolve({ token: "old-token" }),
      },
    );

    expect(response.status).toBe(400);
    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: "This booking handoff link is no longer active" },
      { status: 400 },
    );

    consoleSpy.mockRestore();
  });
});
