import { NextResponse } from "next/server";
import { auth } from "@/lib/helpers/auth";
import { previewAdminBookingPreparation } from "@/lib/services/adminBookingPreparation";
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

jest.mock("@/lib/services/adminBookingPreparation", () => ({
  isAdminBookingPreparationValidationError: jest.fn((error) =>
    String(error?.message || "").includes("required"),
  ),
  previewAdminBookingPreparation: jest.fn(),
}));

describe("Admin scheduling calendar booking preparation POST route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auth.mockResolvedValue({ id: 1, role: "SUPERADMIN" });
  });

  it("returns a booking preparation preview for a super admin", async () => {
    previewAdminBookingPreparation.mockResolvedValue({
      customerMode: "existing",
      totalAmount: 1450,
      properties: [],
    });

    const response = await POST({
      json: jest.fn().mockResolvedValue({
        customerMode: "existing",
        customerId: 7,
        properties: [],
      }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(previewAdminBookingPreparation).toHaveBeenCalledWith({
      actorUser: { id: 1, role: "SUPERADMIN" },
      input: {
        customerMode: "existing",
        customerId: 7,
        properties: [],
      },
    });
    expect(data.totalAmount).toBe(1450);
  });

  it("rejects anonymous and non-superadmin access", async () => {
    auth.mockResolvedValueOnce(null);

    const unauthorizedResponse = await POST({
      json: jest.fn(),
    });

    expect(unauthorizedResponse.status).toBe(401);
    expect(previewAdminBookingPreparation).not.toHaveBeenCalled();

    auth.mockResolvedValueOnce({ id: 2, role: "CUSTOMER" });

    const forbiddenResponse = await POST({
      json: jest.fn(),
    });

    expect(forbiddenResponse.status).toBe(403);
    expect(previewAdminBookingPreparation).not.toHaveBeenCalled();
  });

  it("returns validation failures as 400", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    previewAdminBookingPreparation.mockRejectedValue(
      new Error("Customer is required"),
    );

    const response = await POST({
      json: jest.fn().mockResolvedValue({
        customerMode: "existing",
        properties: [],
      }),
    });

    expect(response.status).toBe(400);
    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: "Customer is required" },
      { status: 400 },
    );

    consoleSpy.mockRestore();
  });

  it("returns stale availability conflicts as 409", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    previewAdminBookingPreparation.mockRejectedValue(
      new Error("Selected time on 2026-07-21 is no longer available."),
    );

    const response = await POST({
      json: jest.fn().mockResolvedValue({
        customerMode: "existing",
        customerId: 7,
        properties: [],
      }),
    });

    expect(response.status).toBe(409);
    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: "Selected time on 2026-07-21 is no longer available." },
      { status: 409 },
    );

    consoleSpy.mockRestore();
  });
});
