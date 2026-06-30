import { NextResponse } from "next/server";
import Booking from "@/lib/db/models/booking";
import { auth } from "@/lib/helpers/auth";
import { GET } from "../route";

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200,
    })),
  },
}));
jest.mock("@/lib/db/models/booking", () => ({
  findAll: jest.fn(),
}));
jest.mock("@/lib/db/models/bookingdeliveryfile", () => ({}));
jest.mock("@/lib/db/models/bookingrevision", () => ({}));
jest.mock("@/lib/db/models/transaction", () => ({
  findAll: jest.fn().mockResolvedValue([]),
}));
jest.mock("@/lib/db/models/user", () => ({}));
jest.mock("@/lib/db/relations", () => ({}));
jest.mock("@/lib/helpers/auth", () => ({
  auth: jest.fn(),
}));
jest.mock("@/lib/services/promotionCheckout", () => ({
  applyPromotionForCheckoutTransaction: jest.fn(),
  expirePromotionForCheckoutTransaction: jest.fn(),
}));

describe("Admin Bookings API Route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auth.mockResolvedValue({ id: 1, role: "SUPERADMIN" });
  });

  it("returns bookings for an admin", async () => {
    const mockBookings = [{ id: 1, status: "CONFIRMED" }];
    Booking.findAll.mockResolvedValue(mockBookings);

    const response = await GET();
    const data = await response.json();

    expect(data).toEqual(mockBookings);
    expect(Booking.findAll).toHaveBeenCalled();
    expect(NextResponse.json).toHaveBeenCalledWith(mockBookings);
  });

  it("rejects non-admin users before querying bookings", async () => {
    auth.mockResolvedValue({ id: 2, role: "CUSTOMER" });

    const response = await GET();

    expect(response.status).toBe(403);
    expect(Booking.findAll).not.toHaveBeenCalled();
  });

  it("returns 500 on error", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    Booking.findAll.mockRejectedValue(new Error("DB Error"));

    const response = await GET();

    expect(response.status).toBe(500);
    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: "Failed to fetch bookings" },
      { status: 500 },
    );

    consoleSpy.mockRestore();
  });
});
