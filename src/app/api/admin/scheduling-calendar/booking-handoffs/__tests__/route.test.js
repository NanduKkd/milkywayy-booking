import { NextResponse } from "next/server";
import { auth } from "@/lib/helpers/auth";
import {
  createAdminBookingHandoff,
  sendAdminBookingHandoffLink,
} from "@/lib/services/adminBookingHandoffs";
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
  auth: jest.fn(),
}));

jest.mock("@/lib/db/relations", () => ({}));

jest.mock("@/lib/services/adminBookingHandoffs", () => ({
  createAdminBookingHandoff: jest.fn(),
  sendAdminBookingHandoffLink: jest.fn(),
  isAdminBookingHandoffValidationError: jest.fn((error) =>
    String(error?.message || "").includes("required"),
  ),
}));

describe("Admin booking handoff POST route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auth.mockResolvedValue({ id: 1, role: "SUPERADMIN" });
  });

  it("creates or regenerates a booking handoff for a super admin", async () => {
    createAdminBookingHandoff.mockResolvedValue({
      transactionId: 91,
      url: "https://example.com/booking/handoff/token-1",
    });

    const response = await POST({
      json: jest.fn().mockResolvedValue({
        input: {
          customerMode: "existing",
          customerId: 12,
          properties: [],
        },
        transactionId: 91,
        sendWhatsApp: true,
      }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(createAdminBookingHandoff).toHaveBeenCalledWith({
      actorUser: { id: 1, role: "SUPERADMIN" },
      input: {
        customerMode: "existing",
        customerId: 12,
        properties: [],
      },
      transactionId: 91,
      sendWhatsApp: true,
    });
    expect(data.transactionId).toBe(91);
  });

  it("rejects anonymous and non-superadmin access", async () => {
    auth.mockResolvedValueOnce(null);
    const unauthorizedResponse = await POST({ json: jest.fn() });
    expect(unauthorizedResponse.status).toBe(401);

    auth.mockResolvedValueOnce({ id: 3, role: "CUSTOMER" });
    const forbiddenResponse = await POST({ json: jest.fn() });
    expect(forbiddenResponse.status).toBe(403);
  });

  it("sends an existing handoff link without regenerating it", async () => {
    sendAdminBookingHandoffLink.mockResolvedValue({
      notification: { attempted: true, sent: true },
    });

    const response = await POST({
      json: jest.fn().mockResolvedValue({
        action: "send_whatsapp",
        transactionId: 91,
      }),
    });

    expect(response.status).toBe(200);
    expect(sendAdminBookingHandoffLink).toHaveBeenCalledWith({
      actorUser: { id: 1, role: "SUPERADMIN" },
      transactionId: 91,
    });
    expect(createAdminBookingHandoff).not.toHaveBeenCalled();
  });

  it("returns validation failures as 400", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    createAdminBookingHandoff.mockRejectedValue(
      new Error("Phone number is required"),
    );

    const response = await POST({
      json: jest.fn().mockResolvedValue({
        input: {
          customerMode: "new",
          customer: {},
          properties: [],
        },
      }),
    });

    expect(response.status).toBe(400);
    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: "Phone number is required" },
      { status: 400 },
    );

    consoleSpy.mockRestore();
  });

  it("returns stale availability conflicts as 409", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    createAdminBookingHandoff.mockRejectedValue(
      new Error(
        "Selected time on 2026-07-21 is blocked by admin calendar rules.",
      ),
    );

    const response = await POST({
      json: jest.fn().mockResolvedValue({
        input: {
          customerMode: "existing",
          customerId: 12,
          properties: [],
        },
      }),
    });

    expect(response.status).toBe(409);
    expect(NextResponse.json).toHaveBeenCalledWith(
      {
        error:
          "Selected time on 2026-07-21 is blocked by admin calendar rules.",
      },
      { status: 409 },
    );

    consoleSpy.mockRestore();
  });
});
