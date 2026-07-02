import { NextResponse } from "next/server";
import { getRequestSource } from "@/lib/helpers/requestSource";
import { sendAdminBookingHandoffOtp } from "@/lib/services/adminBookingHandoffs";
import { POST } from "../route";

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200,
    })),
  },
}));

jest.mock("@/lib/helpers/requestSource", () => ({
  getRequestSource: jest.fn(),
}));

jest.mock("@/lib/services/adminBookingHandoffs", () => ({
  isAdminBookingHandoffValidationError: jest.fn((error) =>
    String(error?.message || "").includes("required"),
  ),
  sendAdminBookingHandoffOtp: jest.fn(),
}));

describe("Booking handoff OTP route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getRequestSource.mockResolvedValue("127.0.0.1");
  });

  it("sends OTP for a registration handoff", async () => {
    sendAdminBookingHandoffOtp.mockResolvedValue({
      verificationId: "verify-1",
    });

    const response = await POST(
      {
        json: jest.fn().mockResolvedValue({
          customer: {
            accountType: "INDIVIDUAL",
            fullName: "Lina Client",
            phone: "+971500000099",
          },
        }),
      },
      {
        params: Promise.resolve({ token: "handoff-token" }),
      },
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(sendAdminBookingHandoffOtp).toHaveBeenCalledWith({
      token: "handoff-token",
      customer: {
        accountType: "INDIVIDUAL",
        fullName: "Lina Client",
        phone: "+971500000099",
      },
      requestSource: "127.0.0.1",
    });
    expect(data.verificationId).toBe("verify-1");
  });

  it("returns validation failures as 400", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    sendAdminBookingHandoffOtp.mockRejectedValue(
      new Error("Phone number is required"),
    );

    const response = await POST(
      {
        json: jest.fn().mockResolvedValue({
          customer: {},
        }),
      },
      {
        params: Promise.resolve({ token: "handoff-token" }),
      },
    );

    expect(response.status).toBe(400);
    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: "Phone number is required" },
      { status: 400 },
    );

    consoleSpy.mockRestore();
  });
});
