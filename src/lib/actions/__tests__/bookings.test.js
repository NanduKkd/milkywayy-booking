import { Op } from "sequelize";
import Booking from "@/lib/db/models/booking";
import CalendarEvent from "@/lib/db/models/calendarevent";
import DynamicConfig from "@/lib/db/models/dynamicconfig";
import {
  cancelBookingBySessionId,
  createBookings,
  createTransactionAndPaymentIntent,
} from "../bookings";

// Unmock the module under test because it is globally mocked in jest.setup.js
jest.unmock("../bookings");
jest.unmock("@/lib/actions/utils"); // unmock utils too just in case

import Stripe from "stripe";
import { getDiscounts } from "@/lib/actions/discounts";
import { sequelize } from "@/lib/db/db";
import Transaction from "@/lib/db/models/transaction";
import User from "@/lib/db/models/user";
import { auth } from "@/lib/helpers/auth";
import { getPricingConfig } from "@/lib/helpers/pricing";
import {
  applyPromotionForCheckoutTransaction,
  releasePromotionForCheckoutTransaction,
  reservePromotionForCheckoutTransaction,
} from "@/lib/services/promotionCheckout";
import { evaluateCheckoutPromotionPricing } from "@/lib/services/promotionPricing";

const mockTransaction = {
  LOCK: {
    UPDATE: "UPDATE",
  },
};

function buildFutureWorkingDate() {
  const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  while (date.getDay() === 0) {
    date.setDate(date.getDate() + 1);
  }

  return date.toISOString().slice(0, 10);
}

// Mock dependencies that cause side effects or DB connections
jest.mock("@/lib/db/relations", () => ({}));
jest.mock("@/lib/db/db", () => ({
  sequelize: {
    define: jest.fn(() => ({})),
    query: jest.fn(),
    transaction: jest.fn((callback) => callback(mockTransaction)),
    models: {
      User: {},
      Transaction: {},
    },
  },
}));

jest.mock("@/lib/db/models/booking", () => ({
  findAll: jest.fn(),
  count: jest.fn(),
  destroy: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
}));

jest.mock("@/lib/db/models/calendarevent", () => ({
  findAll: jest.fn(),
}));

jest.mock("@/lib/db/models/transaction", () => ({
  create: jest.fn(),
  update: jest.fn(),
  findOne: jest.fn(),
  findByPk: jest.fn(),
}));

jest.mock("@/lib/db/models/dynamicconfig", () => ({
  findOne: jest.fn(),
}));

jest.mock("@/lib/db/models/user", () => ({
  findByPk: jest.fn(),
}));

jest.mock("@/lib/db/models/wallettransaction", () => ({
  create: jest.fn(),
}));

jest.mock("@/lib/db/models/coupon", () => ({
  findOne: jest.fn(),
}));

jest.mock("@/lib/helpers/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/helpers/pricing", () => ({
  getPricingConfig: jest.fn(),
}));

jest.mock("@/lib/actions/discounts", () => ({
  getDiscounts: jest.fn(),
}));

jest.mock("@/lib/services/promotionCheckout", () => ({
  PROMOTION_CHECKOUT_RESERVATION_WINDOW_MS: 24 * 60 * 60 * 1000,
  applyPromotionForCheckoutTransaction: jest.fn(),
  releasePromotionForCheckoutTransaction: jest.fn(),
  reservePromotionForCheckoutTransaction: jest.fn(),
}));

jest.mock("@/lib/services/promotionPricing", () => ({
  evaluateCheckoutPromotionPricing: jest.fn(),
  isPromotionCodeValidationSuccessful: jest.fn((codeValidation) =>
    ["APPLIED", "SUPERSEDED"].includes(codeValidation?.status),
  ),
}));

jest.mock("stripe", () => {
  const create = jest.fn();
  const mockStripe = jest.fn(() => ({
    checkout: {
      sessions: {
        create,
      },
    },
  }));
  mockStripe.mockCreateSession = create;
  return mockStripe;
});

describe("Booking Actions", () => {
  const mockUserId = "user-123";
  const mockFutureDate = buildFutureWorkingDate();
  const mockProperties = [
    {
      propertyType: "Apartment",
      propertySize: "1 Bed",
      services: ["Photography"],
      preferredDate: mockFutureDate,
      startTime: "10:00",
      duration: 2,
      building: "Tower A",
      community: "Downtown",
      unitNumber: "101",
      contactName: "John Doe",
      contactPhone: "+1234567890",
    },
  ];

  const mockPricingConfig = {
    Apartment: {
      sizes: [
        {
          label: "1 Bed",
          prices: {
            Photography: { price: 500, slots: 1 },
          },
        },
      ],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    auth.mockResolvedValue({ id: mockUserId });
    getPricingConfig.mockResolvedValue(mockPricingConfig);
    getDiscounts.mockResolvedValue({ success: true, data: [] });
    User.findByPk.mockResolvedValue({
      id: mockUserId,
      email: "test@example.com",
    });
    DynamicConfig.findOne.mockResolvedValue(null);
    applyPromotionForCheckoutTransaction.mockResolvedValue(null);
    releasePromotionForCheckoutTransaction.mockResolvedValue(null);
    reservePromotionForCheckoutTransaction.mockResolvedValue(null);
    evaluateCheckoutPromotionPricing.mockResolvedValue({
      eligibleSubtotal: 0,
      selectedPromotion: null,
      codeValidation: null,
    });

    // Mock Booking.findAll to return empty for availability check
    Booking.findAll.mockResolvedValue([]);
    Booking.count.mockResolvedValue(0);
    CalendarEvent.findAll.mockResolvedValue([]);
  });

  describe("createBookings", () => {
    it("should create bookings successfully with startTime and duration", async () => {
      Booking.create.mockResolvedValue({
        id: 1,
        bookingCode: null,
        update: jest.fn().mockImplementation(function updateBooking(data) {
          this.bookingCode = data.bookingCode;
          return Promise.resolve(this);
        }),
      });

      const result = await createBookings(mockProperties);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([{ id: 1, bookingCode: "MWB-1001" }]);
      expect(Booking.destroy).toHaveBeenCalledWith({
        where: { userId: mockUserId, status: "DRAFT" },
        transaction: mockTransaction,
      });
      expect(sequelize.transaction).toHaveBeenCalledTimes(1);
      expect(Booking.create).toHaveBeenCalledTimes(1);
      expect(Booking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          status: "DRAFT",
          startTime: "10:00",
          duration: 2,
          total: 500,
        }),
        { transaction: mockTransaction },
      );
    });

    it("should fail if requested slots are occupied", async () => {
      // Mock existing booking at 11:00 (overlaps with 10:00-12:00)
      const mockExistingBooking = {
        userId: "other-user",
        status: "CONFIRMED",
        date: mockFutureDate,
        startTime: "09:00",
        duration: 1,
      };

      Booking.findAll.mockResolvedValue([mockExistingBooking]);

      const result = await createBookings(mockProperties);

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/no longer available/i);
    });

    it("should fail if the requested date is blocked by shared admin availability rules", async () => {
      DynamicConfig.findOne.mockResolvedValue({
        value: {
          dateOverrides: {
            [mockFutureDate]: {
              fullDayBlocked: true,
            },
          },
        },
      });

      const result = await createBookings(mockProperties);

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/blocked by admin calendar rules/i);
    });

    it("should fail if the requested slot overlaps a capacity-consuming calendar event", async () => {
      CalendarEvent.findAll.mockResolvedValue([
        {
          id: 51,
          businessDate: mockFutureDate,
          period: "morning",
          status: "ACTIVE",
          consumesCapacity: true,
        },
      ]);

      const result = await createBookings(mockProperties);

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/no longer available/i);
    });

    it("should return error if not authenticated", async () => {
      auth.mockResolvedValue(null);

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await createBookings(mockProperties);

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/Unauthorized/);

      consoleSpy.mockRestore();
    });
  });

  describe("createTransactionAndPaymentIntent", () => {
    it("should create transaction and stripe session", async () => {
      const mockBookingIds = [1];
      const mockBookings = [
        {
          id: 1,
          userId: mockUserId,
          total: 500,
          date: mockFutureDate,
          slot: 1,
          duration: 1,
        },
      ];

      Booking.findAll.mockImplementation(({ where }) => {
        // Need to simulate finding by IDs
        if (where.id) return Promise.resolve(mockBookings);
        // Need to simulate availability check (exclude current bookings)
        return Promise.resolve([]);
      });

      Transaction.create.mockResolvedValue({
        id: "txn-1",
        update: jest.fn(),
      });

      Booking.update.mockResolvedValue([1]);

      // Access the exposed mock function
      Stripe.mockCreateSession.mockResolvedValue({
        id: "sess-1",
        url: "http://stripe.com/checkout",
      });

      const result = await createTransactionAndPaymentIntent(
        mockBookingIds,
        "",
      );

      expect(result.success).toBe(true);
      expect(result.data.url).toBe("http://stripe.com/checkout");
      expect(Transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          amount: 500,
          bulkDeduction: 0,
          couponDeduction: 0,
          status: "pending",
        }),
      );
      expect(Booking.update).toHaveBeenCalled();
    });

    it("should apply the selected automatic promotion to the payable total", async () => {
      const mockBookingIds = [1];
      const mockBookings = [
        {
          id: 1,
          userId: mockUserId,
          total: 800,
          date: mockFutureDate,
          slot: 1,
          duration: 1,
        },
      ];

      Booking.findAll.mockImplementation(({ where }) => {
        if (where.id) return Promise.resolve(mockBookings);
        return Promise.resolve([]);
      });
      evaluateCheckoutPromotionPricing.mockResolvedValueOnce({
        eligibleSubtotal: 800,
        selectedPromotion: {
          promotionId: 21,
          kind: "AUTOMATIC",
          name: "First-Shoot Launch Credit",
          benefitAmount: 250,
          triggerSnapshot: {
            triggerType: "FIRST_PAID_BOOKING",
            triggerConfig: {},
          },
        },
        codeValidation: null,
      });

      Transaction.create.mockResolvedValue({
        id: "txn-2",
        update: jest.fn(),
      });

      Booking.update.mockResolvedValue([1]);
      Stripe.mockCreateSession.mockResolvedValue({
        id: "sess-2",
        url: "http://stripe.com/checkout-2",
      });

      const result = await createTransactionAndPaymentIntent(
        mockBookingIds,
        "",
      );

      expect(result.success).toBe(true);
      expect(evaluateCheckoutPromotionPricing).toHaveBeenCalledWith({
        userId: mockUserId,
        eligibleSubtotal: 800,
        enteredCode: "",
      });
      expect(Transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 550,
          bulkDeduction: 0,
          couponDeduction: 0,
        }),
      );
    });

    it("keeps the better automatic promotion when an entered code is weaker", async () => {
      const mockBookingIds = [1];
      const mockBookings = [
        {
          id: 1,
          userId: mockUserId,
          total: 1050,
          date: mockFutureDate,
          slot: 1,
          duration: 1,
        },
      ];

      Booking.findAll.mockImplementation(({ where }) => {
        if (where.id) return Promise.resolve(mockBookings);
        return Promise.resolve([]);
      });
      evaluateCheckoutPromotionPricing.mockResolvedValueOnce({
        eligibleSubtotal: 1050,
        selectedPromotion: {
          promotionId: 31,
          kind: "AUTOMATIC",
          name: "First-Shoot Launch Credit",
          benefitAmount: 500,
          triggerSnapshot: {
            triggerType: "FIRST_PAID_BOOKING",
            triggerConfig: {},
          },
        },
        codeValidation: {
          status: "SUPERSEDED",
          message: "A better promotion is already applied to this booking.",
        },
      });

      Transaction.create.mockResolvedValue({
        id: "txn-3",
        update: jest.fn(),
      });
      Booking.update.mockResolvedValue([1]);
      Stripe.mockCreateSession.mockResolvedValue({
        id: "sess-3",
        url: "http://stripe.com/checkout-3",
      });

      const result = await createTransactionAndPaymentIntent(
        mockBookingIds,
        "LOYAL10",
      );

      expect(result.success).toBe(true);
      expect(Transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 550,
          bulkDeduction: 0,
          couponDeduction: 0,
        }),
      );
    });

    it("reserves the selected promotion against the pending checkout transaction", async () => {
      const mockBookingIds = [1];
      const mockBookings = [
        {
          id: 1,
          userId: mockUserId,
          total: 900,
          date: mockFutureDate,
          slot: 1,
          duration: 1,
        },
      ];

      Booking.findAll.mockImplementation(({ where }) => {
        if (where.id) return Promise.resolve(mockBookings);
        return Promise.resolve([]);
      });
      evaluateCheckoutPromotionPricing.mockResolvedValueOnce({
        eligibleSubtotal: 900,
        selectedPromotion: {
          promotionId: 7,
          benefitAmount: 100,
          triggerSnapshot: {
            triggerType: "NONE",
            triggerConfig: {},
          },
        },
        codeValidation: {
          status: "APPLIED",
          message: "SAVE10 applied successfully",
        },
      });
      Transaction.create.mockResolvedValue({
        id: "txn-4",
        update: jest.fn(),
      });
      Booking.update.mockResolvedValue([1]);
      Stripe.mockCreateSession.mockResolvedValue({
        id: "sess-4",
        url: "http://stripe.com/checkout-4",
      });

      const result = await createTransactionAndPaymentIntent(
        mockBookingIds,
        "SAVE10",
      );

      expect(result.success).toBe(true);
      expect(reservePromotionForCheckoutTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionId: "txn-4",
          userId: mockUserId,
          bookingIds: mockBookingIds,
          eligibleSubtotal: 900,
          selectedPromotion: {
            promotionId: 7,
            benefitAmount: 100,
            triggerSnapshot: {
              triggerType: "NONE",
              triggerConfig: {},
            },
          },
          reservationExpiresAt: expect.any(Date),
        }),
      );
    });

    it("cleans up the pending checkout when promotion reservation fails", async () => {
      const mockBookingIds = [1];
      const mockBookings = [
        {
          id: 1,
          userId: mockUserId,
          total: 900,
          date: mockFutureDate,
          slot: 1,
          duration: 1,
        },
      ];

      Booking.findAll.mockImplementation(({ where }) => {
        if (where.id) return Promise.resolve(mockBookings);
        return Promise.resolve([]);
      });
      evaluateCheckoutPromotionPricing.mockResolvedValueOnce({
        eligibleSubtotal: 900,
        selectedPromotion: {
          promotionId: 7,
          benefitAmount: 100,
        },
        codeValidation: {
          status: "APPLIED",
          message: "SAVE10 applied successfully",
        },
      });
      Transaction.create.mockResolvedValue({
        id: "txn-5",
        update: jest.fn(),
      });
      Booking.update.mockResolvedValue([1]);
      reservePromotionForCheckoutTransaction.mockRejectedValue(
        new Error("Promotion total usage limit reached"),
      );

      const result = await createTransactionAndPaymentIntent(
        mockBookingIds,
        "SAVE10",
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe("Promotion total usage limit reached");
      expect(Transaction.update).toHaveBeenCalledWith(
        { status: "failed" },
        { where: { id: "txn-5", status: "pending" } },
      );
      expect(Booking.update).toHaveBeenCalledWith(
        { cancelledAt: null, status: "DRAFT" },
        {
          where: {
            transactionId: "txn-5",
            status: "DRAFT",
          },
        },
      );
      expect(Stripe.mockCreateSession).not.toHaveBeenCalled();
    });

    it("releases reserved promotions when Stripe session creation fails", async () => {
      const mockBookingIds = [1];
      const mockBookings = [
        {
          id: 1,
          userId: mockUserId,
          total: 900,
          date: mockFutureDate,
          slot: 1,
          duration: 1,
        },
      ];

      Booking.findAll.mockImplementation(({ where }) => {
        if (where.id) return Promise.resolve(mockBookings);
        return Promise.resolve([]);
      });
      evaluateCheckoutPromotionPricing.mockResolvedValueOnce({
        eligibleSubtotal: 900,
        selectedPromotion: {
          promotionId: 7,
          benefitAmount: 100,
          triggerSnapshot: {
            triggerType: "NONE",
            triggerConfig: {},
          },
        },
        codeValidation: {
          status: "APPLIED",
          message: "SAVE10 applied successfully",
        },
      });
      Transaction.create.mockResolvedValue({
        id: "txn-6",
        update: jest.fn(),
      });
      Booking.update.mockResolvedValue([1]);
      reservePromotionForCheckoutTransaction.mockResolvedValue({
        id: 3001,
      });
      Stripe.mockCreateSession.mockRejectedValue(
        new Error("Stripe unavailable"),
      );

      const result = await createTransactionAndPaymentIntent(
        mockBookingIds,
        "SAVE10",
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe("Stripe unavailable");
      expect(Transaction.update).toHaveBeenCalledWith(
        { status: "failed" },
        { where: { id: "txn-6", status: "pending" } },
      );
      expect(releasePromotionForCheckoutTransaction).toHaveBeenCalledWith({
        transactionId: "txn-6",
        reason: "checkout_session_create_failed",
      });
    });

    it("rejects invalid promo codes before creating a transaction", async () => {
      const mockBookingIds = [1];
      const mockBookings = [
        {
          id: 1,
          userId: mockUserId,
          total: 900,
          date: mockFutureDate,
          slot: 1,
          duration: 1,
        },
      ];

      Booking.findAll.mockImplementation(({ where }) => {
        if (where.id) return Promise.resolve(mockBookings);
        return Promise.resolve([]);
      });
      evaluateCheckoutPromotionPricing.mockResolvedValueOnce({
        eligibleSubtotal: 900,
        selectedPromotion: null,
        codeValidation: {
          status: "INVALID",
          message: "Invalid promo code",
        },
      });

      const result = await createTransactionAndPaymentIntent(
        mockBookingIds,
        "NOPE",
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe("Invalid promo code");
      expect(Transaction.create).not.toHaveBeenCalled();
      expect(Stripe.mockCreateSession).not.toHaveBeenCalled();
    });
  });

  describe("cancelBookingBySessionId", () => {
    it("restores draft selections when checkout is cancelled", async () => {
      const transaction = {
        id: "txn-3",
        status: "pending",
        update: jest.fn(),
      };
      Transaction.findOne.mockResolvedValue(transaction);
      Booking.update.mockResolvedValue([1]);

      const result = await cancelBookingBySessionId("sess-3");

      expect(result.success).toBe(true);
      expect(transaction.update).toHaveBeenCalledWith({ status: "failed" });
      expect(releasePromotionForCheckoutTransaction).toHaveBeenCalledWith({
        transactionId: "txn-3",
        reason: "checkout_cancelled",
      });
      expect(Booking.update).toHaveBeenCalledWith(
        { cancelledAt: null, status: "DRAFT" },
        {
          where: {
            transactionId: "txn-3",
            status: { [Op.in]: ["DRAFT", "CANCELLED"] },
          },
        },
      );
      expect(result.data).toEqual({
        restoredDrafts: true,
        alreadyPaid: false,
      });
    });

    it("does not downgrade already paid bookings", async () => {
      const transaction = {
        id: "txn-4",
        status: "success",
        update: jest.fn(),
      };
      Transaction.findOne.mockResolvedValue(transaction);

      const result = await cancelBookingBySessionId("sess-4");

      expect(result.success).toBe(true);
      expect(transaction.update).not.toHaveBeenCalled();
      expect(Booking.update).not.toHaveBeenCalled();
      expect(result.data).toEqual({
        restoredDrafts: false,
        alreadyPaid: true,
      });
    });
  });
});
