import { headers } from "next/headers";
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

jest.mock("next/headers", () => ({
  headers: jest.fn(),
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
  ensureTransactionInvoiceUrl: jest.fn().mockResolvedValue("https://example.com/invoice.pdf"),
}));

jest.mock("@/lib/services/promotionCheckout", () => ({
  applyPromotionForCheckoutTransaction: jest.fn(),
}));

describe("Stripe webhook route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    headers.mockReturnValue({
      get: jest.fn(() => "sig_123"),
    });
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

    const response = await POST({
      text: jest.fn().mockResolvedValue("payload"),
    });
    const payload = await response.json();

    expect(payload).toEqual({ received: true });
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
});
