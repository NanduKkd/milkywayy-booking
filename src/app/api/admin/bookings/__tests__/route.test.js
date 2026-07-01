import { NextResponse } from "next/server";
import { Op } from "sequelize";
import Booking from "@/lib/db/models/booking";
import Transaction from "@/lib/db/models/transaction";
import { auth } from "@/lib/helpers/auth";
import {
  applyPromotionForCheckoutTransaction,
  expirePromotionForCheckoutTransaction,
} from "@/lib/services/promotionCheckout";
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
  update: jest.fn(),
}));
jest.mock("@/lib/db/models/bookingdeliveryfile", () => ({}));
jest.mock("@/lib/db/models/bookingrevision", () => ({}));
jest.mock("@/lib/db/models/transaction", () => ({
  findAll: jest.fn().mockResolvedValue([]),
}));
jest.mock("stripe", () => {
  const retrieve = jest.fn();
  const Stripe = jest.fn(() => ({
    checkout: {
      sessions: {
        retrieve,
      },
    },
  }));
  Stripe.mockRetrieveSession = retrieve;
  return Stripe;
});
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
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    global.fetch = jest.fn();
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

  it("reconciles paid pending checkout sessions before listing bookings", async () => {
    const Stripe = require("stripe");
    const transaction = {
      id: 91,
      status: "pending",
      stripePaymentIntentId: "cs_91",
      paidAt: null,
      update: jest.fn(),
    };

    Transaction.findAll.mockResolvedValue([transaction]);
    Stripe.mockRetrieveSession.mockResolvedValue({
      payment_status: "paid",
      payment_intent: "pi_91",
    });
    Booking.findAll.mockResolvedValue([]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(transaction.update).toHaveBeenCalledWith({
      status: "success",
      stripePaymentIntentId: "pi_91",
      paidAt: expect.any(Date),
    });
    expect(applyPromotionForCheckoutTransaction).toHaveBeenCalledWith({
      transactionId: 91,
    });
    expect(Booking.update).toHaveBeenCalledWith(
      { status: "CONFIRMED" },
      {
        where: {
          transactionId: 91,
          status: { [Op.in]: ["DRAFT"] },
        },
      },
    );
  });

  it("expires pending checkout reservations when Stripe sessions have elapsed", async () => {
    const Stripe = require("stripe");
    const transaction = {
      id: 92,
      status: "pending",
      stripePaymentIntentId: "cs_92",
      paidAt: null,
      update: jest.fn(),
    };

    Transaction.findAll.mockResolvedValue([transaction]);
    Stripe.mockRetrieveSession.mockResolvedValue({
      payment_status: "unpaid",
      expires_at: Math.floor(Date.now() / 1000) - 60,
    });
    Booking.findAll.mockResolvedValue([]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(transaction.update).toHaveBeenCalledWith({ status: "failed" });
    expect(expirePromotionForCheckoutTransaction).toHaveBeenCalledWith({
      transactionId: 92,
    });
    expect(Booking.update).toHaveBeenCalledWith(
      { cancelledAt: null, status: "DRAFT" },
      {
        where: {
          transactionId: 92,
          status: { [Op.in]: ["DRAFT", "CANCELLED"] },
        },
      },
    );
  });
});
