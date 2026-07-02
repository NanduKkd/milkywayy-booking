import { NextResponse } from "next/server";
import { setSessionUser } from "@/lib/helpers/auth";
import { getRequestSource } from "@/lib/helpers/requestSource";
import { verifyAdminBookingHandoffOtp } from "@/lib/services/adminBookingHandoffs";
import { POST } from "../route";

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200,
    })),
  },
}));

jest.mock("@/lib/helpers/auth", () => ({
  setSessionUser: jest.fn(),
}));

jest.mock("@/lib/helpers/requestSource", () => ({
  getRequestSource: jest.fn(),
}));

jest.mock("@/lib/services/adminBookingHandoffs", () => ({
  verifyAdminBookingHandoffOtp: jest.fn(),
}));

describe("Booking handoff verify OTP route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getRequestSource.mockResolvedValue("127.0.0.1");
  });

  it("verifies OTP and stores a customer session", async () => {
    verifyAdminBookingHandoffOtp.mockResolvedValue({
      id: 88,
      phone: "+971500000099",
      role: "CUSTOMER",
    });

    const response = await POST(
      {
        json: jest.fn().mockResolvedValue({
          verificationId: "verify-1",
          otp: "123456",
        }),
      },
      {
        params: Promise.resolve({ token: "handoff-token" }),
      },
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(verifyAdminBookingHandoffOtp).toHaveBeenCalledWith({
      token: "handoff-token",
      verificationId: "verify-1",
      otp: "123456",
      requestSource: "127.0.0.1",
    });
    expect(setSessionUser).toHaveBeenCalledWith({
      id: 88,
      phone: "+971500000099",
      role: "CUSTOMER",
    });
    expect(data.id).toBe(88);
  });

  it("returns 400 on verification failure", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    verifyAdminBookingHandoffOtp.mockRejectedValue(new Error("Invalid OTP"));

    const response = await POST(
      {
        json: jest.fn().mockResolvedValue({
          verificationId: "verify-1",
          otp: "123456",
        }),
      },
      {
        params: Promise.resolve({ token: "handoff-token" }),
      },
    );

    expect(response.status).toBe(400);
    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: "Invalid OTP" },
      { status: 400 },
    );

    consoleSpy.mockRestore();
  });
});
