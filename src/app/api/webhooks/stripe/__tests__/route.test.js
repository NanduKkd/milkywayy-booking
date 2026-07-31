import { sendBookingConfirmation } from "@/lib/actions/notifications";
import Booking from "@/lib/db/models/booking";
import Transaction from "@/lib/db/models/transaction";
import User from "@/lib/db/models/user";
import { applyPromotionForCheckoutTransaction } from "@/lib/services/promotionCheckout";
import { POST } from "../route";

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200,
    })),
  },
}));

jest.mock("stripe", () => {
  const constructEvent = jest.fn();
  const Stripe = jest.fn(() => ({
    webhooks: {
      constructEvent,
    },
  }));
  Stripe.mockConstructEvent = constructEvent;
  return Stripe;
});

jest.mock("@/lib/actions/notifications", () => ({
  sendBookingConfirmation: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock("@/lib/db/models/booking", () => ({
  update: jest.fn(),
  findAll: jest.fn(),
}));

jest.mock("@/lib/db/models/transaction", () => ({
  findByPk: jest.fn(),
}));

jest.mock("@/lib/db/models/user", () => ({
  findByPk: jest.fn(),
}));

jest.mock("@/lib/helpers/invoice", () => ({
  ensureTransactionInvoiceUrl: jest
    .fn()
    .mockResolvedValue("https://example.com/invoice.pdf"),
}));

jest.mock("@/lib/services/promotionCheckout", () => ({
  applyPromotionForCheckoutTransaction: jest.fn(),
}));

describe("Stripe webhook route", () => {
  const buildRequest = (signature = "sig_123") => ({
    headers: {
      get: jest.fn(() => signature),
    },
    text: jest.fn().mockResolvedValue("payload"),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    applyPromotionForCheckoutTransaction.mockResolvedValue(null);
    Booking.update.mockResolvedValue([1]);
    Booking.findAll.mockResolvedValue([]);
    User.findByPk.mockResolvedValue({ id: 7 });
  });

  it("applies the checkout promotion reservation before confirming bookings", async () => {
    const Stripe = require("stripe");
    const transaction = {
      id: 55,
      userId: 7,
      status: "pending",
      invoiceUrl: null,
      metadata: {},
      update: jest.fn(),
    };

    Stripe.mockConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      id: "evt_123",
      data: {
        object: {
          id: "cs_123",
          payment_status: "paid",
          payment_intent: "pi_123",
          metadata: {
            transactionId: "55",
          },
        },
      },
    });
    Transaction.findByPk.mockResolvedValue(transaction);

    const request = buildRequest();
    const response = await POST(request);
    const payload = await response.json();

    expect(payload).toEqual({ received: true });
    expect(request.headers.get).toHaveBeenCalledWith("stripe-signature");
    expect(Stripe.mockConstructEvent).toHaveBeenCalledWith(
      "payload",
      "sig_123",
      process.env.STRIPE_WEBHOOK_SECRET,
    );
    expect(transaction.update).toHaveBeenCalledWith({
      status: "success",
      stripePaymentIntentId: "pi_123",
      paidAt: expect.any(Date),
    });
    expect(applyPromotionForCheckoutTransaction).toHaveBeenCalledWith({
      transactionId: 55,
    });
    expect(Booking.update).toHaveBeenCalledWith(
      { status: "CONFIRMED" },
      { where: { transactionId: 55 } },
    );
  });

  it("keeps duplicate checkout completion webhooks idempotent after success", async () => {
    const Stripe = require("stripe");
    const transaction = {
      id: 55,
      userId: 7,
      status: "success",
      invoiceUrl: "https://example.com/invoice.pdf",
      metadata: {
        bookingConfirmationSentAt: "2026-07-01T10:15:00.000Z",
      },
      update: jest.fn(),
    };

    Stripe.mockConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      id: "evt_456",
      data: {
        object: {
          id: "cs_123",
          payment_status: "paid",
          payment_intent: "pi_123",
          metadata: {
            transactionId: "55",
          },
        },
      },
    });
    Transaction.findByPk.mockResolvedValue(transaction);

    const response = await POST(buildRequest());
    const payload = await response.json();

    expect(payload).toEqual({ received: true });
    expect(transaction.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        status: "success",
      }),
    );
    expect(applyPromotionForCheckoutTransaction).toHaveBeenCalledWith({
      transactionId: 55,
    });
    expect(Booking.update).toHaveBeenCalledWith(
      { status: "CONFIRMED" },
      { where: { transactionId: 55 } },
    );
    expect(sendBookingConfirmation).not.toHaveBeenCalled();
  });

  it.each([
    ["missing", null],
    ["invalid", "sig_invalid"],
  ])("returns 400 for a %s webhook signature", async (_label, signature) => {
    const Stripe = require("stripe");
    Stripe.mockConstructEvent.mockImplementation(() => {
      throw new Error("No signatures found matching the expected signature");
    });

    const response = await POST(buildRequest(signature));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      error: "No signatures found matching the expected signature",
    });
  });

  it("returns 500 when a verified event handler fails", async () => {
    const Stripe = require("stripe");
    Stripe.mockConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      id: "evt_handler_failure",
      data: {
        object: {
          id: "cs_handler_failure",
          payment_status: "paid",
          payment_intent: "pi_handler_failure",
          metadata: {
            transactionId: "55",
          },
        },
      },
    });
    Transaction.findByPk.mockRejectedValue(new Error("Synthetic DB failure"));

    const response = await POST(buildRequest());
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toEqual({ error: "Webhook handler failed" });
  });
});
