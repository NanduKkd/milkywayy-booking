import { jwtVerify, SignJWT } from "jose";
import { getDiscounts } from "@/lib/actions/discounts";
import { sequelize } from "@/lib/db/db";
import Booking from "@/lib/db/models/booking";
import Transaction from "@/lib/db/models/transaction";
import User from "@/lib/db/models/user";
import WalletTransaction from "@/lib/db/models/wallettransaction";
import { getPricingConfig } from "@/lib/helpers/pricing";
import { calculateWalletCreditPreview } from "@/lib/helpers/promotionPricing";
import { consumeRateLimit } from "@/lib/services/oauthRateLimits";
import {
  createAdminBookingHandoff,
  createAdminBookingHandoffCheckout,
  getAdminBookingHandoffByToken,
  previewAdminBookingHandoffPromotionPricing,
  sendAdminBookingHandoffOtp,
  verifyAdminBookingHandoffOtp,
} from "../adminBookingHandoffs";
import { previewAdminBookingPreparation } from "../adminBookingPreparation";
import { buildPreparedPropertySummary } from "../bookingPreparation";
import { sendCustomerOtp, verifyCustomerOtp } from "../customerAuth";
import {
  releasePromotionForCheckoutTransaction,
  reservePromotionForCheckoutTransaction,
} from "../promotionCheckout";
import { evaluateCheckoutPromotionPricing } from "../promotionPricing";
import { loadSchedulingConflictContext } from "../schedulingConflictRevalidation";

const mockTransaction = {
  LOCK: {
    UPDATE: "UPDATE",
  },
};

const mockSign = jest.fn().mockResolvedValue("replacement-handoff-token");

jest.mock("jose", () => ({
  jwtVerify: jest.fn(),
  SignJWT: jest.fn(() => ({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setIssuer: jest.fn().mockReturnThis(),
    setAudience: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    sign: mockSign,
  })),
}));

jest.mock("stripe", () => {
  globalThis.__adminBookingHandoffStripeCheckoutCreate = jest.fn();
  globalThis.__adminBookingHandoffStripeCheckoutExpire = jest.fn();

  return jest.fn(() => ({
    checkout: {
      sessions: {
        create: globalThis.__adminBookingHandoffStripeCheckoutCreate,
        expire: globalThis.__adminBookingHandoffStripeCheckoutExpire,
      },
    },
  }));
});

jest.mock("@/lib/actions/discounts", () => ({
  getDiscounts: jest.fn(),
}));

jest.mock("@/lib/db/db", () => ({
  sequelize: {
    transaction: jest.fn((callback) => callback(mockTransaction)),
  },
}));

jest.mock("@/lib/db/relations", () => {
  globalThis.__adminBookingHandoffRelationsInitializationCount =
    (globalThis.__adminBookingHandoffRelationsInitializationCount || 0) + 1;
  return {};
});

jest.mock("@/lib/db/models/booking", () => ({
  create: jest.fn(),
  destroy: jest.fn(),
  findAll: jest.fn(),
}));

jest.mock("@/lib/db/models/transaction", () => ({
  create: jest.fn(),
  findByPk: jest.fn(),
}));

jest.mock("@/lib/db/models/user", () => ({
  create: jest.fn(),
  findByPk: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock("@/lib/db/models/wallettransaction", () => ({
  create: jest.fn(),
  destroy: jest.fn(),
}));

jest.mock("@/lib/helpers/promotionPricing", () => ({
  calculateWalletCreditPreview: jest.fn(),
}));

jest.mock("@/lib/helpers/pricing", () => ({
  getPricingConfig: jest.fn(),
}));

jest.mock("@/lib/services/oauthRateLimits", () => ({
  consumeRateLimit: jest.fn(),
  RateLimitExceededError: class RateLimitExceededError extends Error {},
}));

jest.mock("../adminBookingPreparation", () => ({
  previewAdminBookingPreparation: jest.fn(),
}));

jest.mock("../adminBookingHandoffNotifications", () => ({
  sendAdminBookingHandoffWhatsApp: jest.fn(),
}));

jest.mock("../bookingPreparation", () => ({
  buildPreparedPropertySummary: jest.fn(),
  START_TIME_TO_SLOT: {},
}));

jest.mock("../customerAuth", () => ({
  sendCustomerOtp: jest.fn(),
  verifyCustomerOtp: jest.fn(),
}));

jest.mock("../promotionCheckout", () => ({
  releasePromotionForCheckoutTransaction: jest.fn(),
  reservePromotionForCheckoutTransaction: jest.fn(),
}));

jest.mock("../promotionPricing", () => ({
  evaluateCheckoutPromotionPricing: jest.fn(),
  isPromotionCodeValidationSuccessful: jest.fn(),
}));

jest.mock("../schedulingConflictRevalidation", () => ({
  loadSchedulingConflictContext: jest.fn(),
}));

function buildCustomer() {
  return {
    id: 12,
    accountType: "INDIVIDUAL",
    fullName: "Synthetic Customer",
    companyName: null,
    billingAddress: null,
    trn: null,
    email: "synthetic@example.test",
    phone: "+971500000099",
    role: "CUSTOMER",
    update: jest.fn(),
  };
}

function buildTransactionRecord(customer) {
  return {
    id: 91,
    userId: customer.id,
    user: customer,
    amount: 450,
    status: "pending",
    stripePaymentIntentId: null,
    metadata: {
      bookingIds: [],
      adminBookingHandoff: {
        version: "handoff-v1",
        customerMode: "new",
        requiresRegistration: true,
        registrationVerifiedAt: null,
        createdByUserId: 1,
        generatedAt: "2026-07-21T08:00:00.000Z",
        expiresAt: "2099-07-21T12:00:00.000Z",
      },
    },
    update: jest.fn(),
  };
}

function expectScopedTransactionLock() {
  expect(Transaction.findByPk).toHaveBeenCalledWith(91, {
    include: [{ model: User, as: "user" }],
    transaction: mockTransaction,
    lock: {
      level: mockTransaction.LOCK.UPDATE,
      of: Transaction,
    },
  });
}

describe("adminBookingHandoffs transaction locks", () => {
  let customer;
  let transactionRecord;

  beforeEach(() => {
    jest.clearAllMocks();
    customer = buildCustomer();
    transactionRecord = buildTransactionRecord(customer);

    jwtVerify.mockResolvedValue({
      payload: {
        transactionId: 91,
        version: "handoff-v1",
      },
    });
    Transaction.findByPk.mockResolvedValue(transactionRecord);
    User.findOne.mockResolvedValue(null);
    Booking.findAll.mockResolvedValue([]);
    WalletTransaction.destroy.mockResolvedValue(0);
    releasePromotionForCheckoutTransaction.mockResolvedValue(null);
    reservePromotionForCheckoutTransaction.mockResolvedValue(null);
    consumeRateLimit.mockResolvedValue({ remaining: 10 });
    evaluateCheckoutPromotionPricing.mockResolvedValue({
      selectedPromotion: null,
    });
    getDiscounts.mockResolvedValue({ success: true, data: [] });
    calculateWalletCreditPreview.mockReturnValue({
      amount: 0,
      appliedDiscounts: [],
      creditExpiresAt: null,
    });
    globalThis.__adminBookingHandoffStripeCheckoutCreate.mockResolvedValue({
      id: "cs_synthetic_checkout",
      url: "https://stripe.example.test/synthetic-checkout",
    });
    previewAdminBookingPreparation.mockResolvedValue({
      totalAmount: 450,
      properties: [],
    });
    getPricingConfig.mockResolvedValue({});
    loadSchedulingConflictContext.mockResolvedValue({ timeSlotConfig: {} });
    buildPreparedPropertySummary.mockImplementation((property) => ({
      ...property,
      total: 450,
    }));
  });

  it("initializes model relations at the handoff service boundary", () => {
    expect(globalThis.__adminBookingHandoffRelationsInitializationCount).toBe(
      1,
    );
  });

  it("returns duration-derived and legacy slot values for shared-form initialization", async () => {
    Booking.findAll.mockResolvedValueOnce([
      {
        id: 301,
        bookingReference: "SYNTHETIC-301",
        propertyDetails: {
          type: "Apartment",
          size: "2 Bed",
          building: "Synthetic Tower",
          community: "Test District",
          unit: "1402",
        },
        shootDetails: {
          services: ["Photography"],
          videographySubService: "",
        },
        date: "2026-08-04",
        slot: 1,
        startTime: "10:00",
        duration: 2,
      },
    ]);

    const result = await getAdminBookingHandoffByToken({
      token: "synthetic-handoff-token",
    });

    expect(result.properties).toEqual([
      expect.objectContaining({
        propertyType: "Apartment",
        propertySize: "2 Bed",
        services: ["Photography"],
        preferredDate: "2026-08-04",
        timeSlot: "morning",
        startTime: "10:00",
        duration: 2,
        building: "Synthetic Tower",
        community: "Test District",
        unitNumber: "1402",
      }),
    ]);
  });

  it("scopes the OTP-send lock to Transaction while retaining the joined customer", async () => {
    sendCustomerOtp.mockResolvedValue({ verificationId: "verify-1" });

    const result = await sendAdminBookingHandoffOtp({
      token: "synthetic-handoff-token",
      customer: {
        accountType: "INDIVIDUAL",
        fullName: "Updated Synthetic Customer",
        email: "synthetic@example.test",
        phone: "+971500000099",
      },
      requestSource: "test-suite",
    });

    expect(sequelize.transaction).toHaveBeenCalledTimes(1);
    expectScopedTransactionLock();
    expect(customer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: "Updated Synthetic Customer",
        phone: "+971500000099",
      }),
      { transaction: mockTransaction },
    );
    expect(User.create).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        verificationId: "verify-1",
        customer: expect.objectContaining({ id: 12 }),
      }),
    );
  });

  it("accepts persisted null optional fields for an Individual OTP request", async () => {
    sendCustomerOtp.mockResolvedValue({ verificationId: "verify-nullable" });

    await sendAdminBookingHandoffOtp({
      token: "synthetic-handoff-token",
      customer: {
        accountType: "INDIVIDUAL",
        fullName: "Nullable Synthetic Customer",
        companyName: null,
        billingAddress: null,
        trn: null,
        email: null,
        phone: "+971500000099",
      },
      requestSource: "test-suite",
    });

    expectScopedTransactionLock();
    expect(customer.update).toHaveBeenCalledWith(
      {
        accountType: "INDIVIDUAL",
        fullName: "Nullable Synthetic Customer",
        companyName: null,
        billingAddress: null,
        trn: null,
        email: null,
        phone: "+971500000099",
        role: "CUSTOMER",
      },
      { transaction: mockTransaction },
    );
    expect(sendCustomerOtp).toHaveBeenCalledWith({
      phone: "+971500000099",
      requestSource: "test-suite",
    });
  });

  it("continues to require applicable Company fields for an OTP request", async () => {
    await expect(
      sendAdminBookingHandoffOtp({
        token: "synthetic-handoff-token",
        customer: {
          accountType: "COMPANY",
          fullName: "Company Contact",
          companyName: null,
          billingAddress: null,
          trn: null,
          email: null,
          phone: "+971500000099",
        },
        requestSource: "test-suite",
      }),
    ).rejects.toThrow("Company name is required");

    expect(customer.update).not.toHaveBeenCalled();
    expect(sendCustomerOtp).not.toHaveBeenCalled();
  });

  it("uses the same scoped Transaction lock during OTP verification", async () => {
    verifyCustomerOtp.mockResolvedValue({
      id: 12,
      phone: "+971500000099",
      role: "CUSTOMER",
    });

    await verifyAdminBookingHandoffOtp({
      token: "synthetic-handoff-token",
      verificationId: "verify-1",
      otp: "123456",
      requestSource: "test-suite",
    });

    expectScopedTransactionLock();
    expect(transactionRecord.update).toHaveBeenCalledWith(
      {
        metadata: expect.objectContaining({
          adminBookingHandoff: expect.objectContaining({
            registrationVerifiedAt: expect.any(String),
          }),
        }),
      },
      { transaction: mockTransaction },
    );
  });

  it("scopes the regeneration reload lock to Transaction", async () => {
    const result = await createAdminBookingHandoff({
      actorUser: { id: 1, role: "SUPERADMIN" },
      input: {
        customerMode: "new",
        customer: {
          accountType: "INDIVIDUAL",
          fullName: "Synthetic Customer",
          email: "synthetic@example.test",
          phone: "+971500000099",
        },
        properties: [],
      },
      transactionId: 91,
    });

    expect(Transaction.findByPk).toHaveBeenNthCalledWith(2, 91, {
      include: [{ model: User, as: "user" }],
      transaction: mockTransaction,
      lock: {
        level: mockTransaction.LOCK.UPDATE,
        of: Transaction,
      },
    });
    expect(customer.update).toHaveBeenCalled();
    expect(User.create).not.toHaveBeenCalled();
    expect(SignJWT).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
      expect.objectContaining({
        token: "replacement-handoff-token",
        transactionId: 91,
        customer: expect.objectContaining({ id: 12 }),
      }),
    );
  });

  it("scopes the checkout reload lock to Transaction", async () => {
    transactionRecord.metadata.adminBookingHandoff.registrationVerifiedAt =
      "2026-07-21T08:30:00.000Z";

    const result = await createAdminBookingHandoffCheckout({
      token: "synthetic-handoff-token",
      properties: [],
    });

    expect(Transaction.findByPk).toHaveBeenNthCalledWith(2, 91, {
      include: [{ model: User, as: "user" }],
      transaction: mockTransaction,
      lock: {
        level: mockTransaction.LOCK.UPDATE,
        of: Transaction,
      },
    });
    expect(result).toEqual({
      url: "https://stripe.example.test/synthetic-checkout",
    });
  });

  it("previews promotions for the token-resolved customer without accepting a caller user ID", async () => {
    transactionRecord.metadata.adminBookingHandoff.registrationVerifiedAt =
      "2026-07-21T08:30:00.000Z";
    evaluateCheckoutPromotionPricing.mockResolvedValueOnce({
      eligibleSubtotal: 820,
      selectedPromotion: {
        promotionId: 44,
        kind: "PERSONAL",
        benefitAmount: 125,
      },
    });

    const result = await previewAdminBookingHandoffPromotionPricing({
      token: "synthetic-handoff-token",
      eligibleSubtotal: 820,
      enteredCode: "save10",
      requestSource: "127.0.0.1",
      userId: 999,
      now: new Date("2026-07-21T09:00:00.000Z"),
    });

    expect(consumeRateLimit).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        bucketType: "booking-handoff-preview-token",
        key: "token:synthetic-handoff-token",
      }),
    );
    expect(consumeRateLimit).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        bucketType: "booking-handoff-preview-source",
        key: "source:127.0.0.1",
      }),
    );
    expect(evaluateCheckoutPromotionPricing).toHaveBeenCalledWith({
      userId: 12,
      eligibleSubtotal: 820,
      enteredCode: "save10",
      now: new Date("2026-07-21T09:00:00.000Z"),
      excludeTransactionId: 91,
    });
    expect(result.selectedPromotion.kind).toBe("PERSONAL");
  });

  it.each([
    [
      "registration-unverified",
      () => {},
      "Phone verification is required before pricing or payment",
    ],
    [
      "expired",
      () => {
        transactionRecord.metadata.adminBookingHandoff.expiresAt =
          "2020-01-01T00:00:00.000Z";
      },
      "This booking handoff link has expired",
    ],
    [
      "already-paid",
      () => {
        transactionRecord.status = "success";
      },
      "This booking handoff has already been paid",
    ],
  ])("rejects %s handoff promotion previews", async (_, arrange, message) => {
    arrange();

    await expect(
      previewAdminBookingHandoffPromotionPricing({
        token: "synthetic-handoff-token",
        eligibleSubtotal: 820,
        requestSource: "test-suite",
      }),
    ).rejects.toThrow(message);

    expect(evaluateCheckoutPromotionPricing).not.toHaveBeenCalled();
  });

  it("revalidates the token version after acquiring the checkout lock", async () => {
    transactionRecord.metadata.adminBookingHandoff.registrationVerifiedAt =
      "2026-07-21T08:30:00.000Z";
    const supersededTransaction = buildTransactionRecord(customer);
    supersededTransaction.metadata.adminBookingHandoff.version = "handoff-v2";
    supersededTransaction.metadata.adminBookingHandoff.registrationVerifiedAt =
      "2026-07-21T08:30:00.000Z";
    Transaction.findByPk
      .mockResolvedValueOnce(transactionRecord)
      .mockResolvedValueOnce(supersededTransaction);

    await expect(
      createAdminBookingHandoffCheckout({
        token: "synthetic-handoff-token",
        properties: [],
      }),
    ).rejects.toThrow("This booking handoff link is no longer active");

    expect(previewAdminBookingPreparation).not.toHaveBeenCalled();
    expect(
      globalThis.__adminBookingHandoffStripeCheckoutCreate,
    ).not.toHaveBeenCalled();
  });

  it("synchronizes edited, duplicated, and added properties on the existing transaction", async () => {
    transactionRecord.metadata.adminBookingHandoff.registrationVerifiedAt =
      "2026-07-21T08:30:00.000Z";
    const existingBookings = [301, 302].map((id) => ({
      id,
      update: jest.fn(),
    }));
    const createdBooking = { id: 303, update: jest.fn() };
    Booking.findAll.mockResolvedValueOnce(existingBookings);
    Booking.create.mockResolvedValueOnce(createdBooking);
    previewAdminBookingPreparation.mockResolvedValueOnce({
      totalAmount: 900,
      properties: [
        { total: 300, durationHours: 1 },
        { total: 300, durationHours: 1 },
        { total: 300, durationHours: 1 },
      ],
    });

    await createAdminBookingHandoffCheckout({
      token: "synthetic-handoff-token",
      properties: [{}, {}, {}],
    });

    expect(existingBookings[0].update).toHaveBeenCalledWith(
      expect.objectContaining({ transactionId: 91, total: 300 }),
      { transaction: mockTransaction },
    );
    expect(existingBookings[1].update).toHaveBeenCalled();
    expect(Booking.create).toHaveBeenCalledWith(
      expect.objectContaining({ transactionId: 91, total: 300 }),
      { transaction: mockTransaction },
    );
    expect(Booking.destroy).not.toHaveBeenCalled();
    expect(Transaction.create).not.toHaveBeenCalled();
    expect(transactionRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ bookingIds: [301, 302, 303] }),
      }),
      { transaction: mockTransaction },
    );
  });

  it("removes stale handoff bookings in the same checkout transaction", async () => {
    transactionRecord.metadata.adminBookingHandoff.registrationVerifiedAt =
      "2026-07-21T08:30:00.000Z";
    const existingBookings = [301, 302, 303].map((id) => ({
      id,
      update: jest.fn(),
    }));
    Booking.findAll.mockResolvedValueOnce(existingBookings);
    previewAdminBookingPreparation.mockResolvedValueOnce({
      totalAmount: 450,
      properties: [{ total: 450, durationHours: 1 }],
    });

    await createAdminBookingHandoffCheckout({
      token: "synthetic-handoff-token",
      properties: [{}],
    });

    expect(Booking.destroy).toHaveBeenCalledWith({
      where: { id: [302, 303] },
      transaction: mockTransaction,
    });
    expect(Transaction.create).not.toHaveBeenCalled();
  });

  it("keeps verified new-customer promotion, wallet, transaction, and Stripe amounts aligned", async () => {
    transactionRecord.metadata.adminBookingHandoff.registrationVerifiedAt =
      "2026-07-21T08:30:00.000Z";
    previewAdminBookingPreparation.mockResolvedValueOnce({
      totalAmount: 1000,
      properties: [],
    });
    evaluateCheckoutPromotionPricing.mockResolvedValueOnce({
      selectedPromotion: {
        promotionId: 55,
        benefitAmount: 200,
      },
      codeValidation: { status: "SUPERSEDED" },
    });
    const {
      isPromotionCodeValidationSuccessful,
    } = require("../promotionPricing");
    isPromotionCodeValidationSuccessful.mockReturnValueOnce(true);
    calculateWalletCreditPreview.mockReturnValueOnce({
      amount: 50,
      appliedDiscounts: [{ id: "wallet-synthetic", value: 50 }],
      creditExpiresAt: new Date("2099-08-01T00:00:00.000Z"),
    });

    await createAdminBookingHandoffCheckout({
      token: "synthetic-handoff-token",
      properties: [],
      enteredCode: "save10",
    });

    expect(reservePromotionForCheckoutTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionId: 91,
        userId: 12,
        eligibleSubtotal: 1000,
        enteredCode: "SAVE10",
        transaction: mockTransaction,
      }),
    );
    expect(WalletTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 50, transactionId: 91 }),
      { transaction: mockTransaction },
    );
    expect(transactionRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 800 }),
      { transaction: mockTransaction },
    );
    expect(
      globalThis.__adminBookingHandoffStripeCheckoutCreate,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({ unit_amount: 80000 }),
          }),
        ],
      }),
    );
    expect(Transaction.create).not.toHaveBeenCalled();
    expect(reservePromotionForCheckoutTransaction).toHaveBeenCalledTimes(1);
  });

  it("sends an existing-customer handoff to Stripe with one transaction and reservation set", async () => {
    transactionRecord.metadata.adminBookingHandoff = {
      ...transactionRecord.metadata.adminBookingHandoff,
      customerMode: "existing",
      requiresRegistration: false,
      registrationVerifiedAt: "2026-07-21T08:30:00.000Z",
    };
    const existingBooking = { id: 301, update: jest.fn() };
    Booking.findAll.mockResolvedValueOnce([existingBooking]);
    previewAdminBookingPreparation.mockResolvedValueOnce({
      totalAmount: 600,
      properties: [{ total: 600, durationHours: 1 }],
    });
    evaluateCheckoutPromotionPricing.mockResolvedValueOnce({
      selectedPromotion: { promotionId: 66, benefitAmount: 100 },
    });

    const result = await createAdminBookingHandoffCheckout({
      token: "synthetic-handoff-token",
      properties: [{}],
    });

    expect(previewAdminBookingPreparation).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          customerMode: "existing",
          customerId: 12,
        }),
        transaction: mockTransaction,
      }),
    );
    expect(
      globalThis.__adminBookingHandoffStripeCheckoutCreate,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({ unit_amount: 50000 }),
          }),
        ],
      }),
    );
    expect(result).toEqual({
      url: "https://stripe.example.test/synthetic-checkout",
    });
    expect(Transaction.create).not.toHaveBeenCalled();
    expect(reservePromotionForCheckoutTransaction).toHaveBeenCalledTimes(1);
  });

  it("does not create Stripe checkout when availability or promotion reservation changes", async () => {
    transactionRecord.metadata.adminBookingHandoff.registrationVerifiedAt =
      "2026-07-21T08:30:00.000Z";
    previewAdminBookingPreparation.mockRejectedValueOnce(
      new Error("Selected time is no longer available"),
    );

    await expect(
      createAdminBookingHandoffCheckout({
        token: "synthetic-handoff-token",
        properties: [{}],
      }),
    ).rejects.toThrow("Selected time is no longer available");
    expect(
      globalThis.__adminBookingHandoffStripeCheckoutCreate,
    ).not.toHaveBeenCalled();

    previewAdminBookingPreparation.mockResolvedValueOnce({
      totalAmount: 450,
      properties: [],
    });
    evaluateCheckoutPromotionPricing.mockResolvedValueOnce({
      selectedPromotion: { promotionId: 55, benefitAmount: 100 },
    });
    reservePromotionForCheckoutTransaction.mockRejectedValueOnce(
      new Error("Promotion is no longer eligible for checkout"),
    );

    await expect(
      createAdminBookingHandoffCheckout({
        token: "synthetic-handoff-token",
        properties: [],
      }),
    ).rejects.toThrow("Promotion is no longer eligible for checkout");
    expect(
      globalThis.__adminBookingHandoffStripeCheckoutCreate,
    ).not.toHaveBeenCalled();
  });

  it("expires a newly created Stripe session when the database transaction cannot finish", async () => {
    transactionRecord.metadata.adminBookingHandoff.registrationVerifiedAt =
      "2026-07-21T08:30:00.000Z";
    transactionRecord.update.mockImplementation((values) => {
      if (values?.stripePaymentIntentId === "cs_synthetic_checkout") {
        throw new Error("Synthetic transaction commit failure");
      }
      return Promise.resolve(transactionRecord);
    });

    await expect(
      createAdminBookingHandoffCheckout({
        token: "synthetic-handoff-token",
        properties: [],
      }),
    ).rejects.toThrow("Synthetic transaction commit failure");

    expect(
      globalThis.__adminBookingHandoffStripeCheckoutExpire,
    ).toHaveBeenCalledWith("cs_synthetic_checkout");
  });
});
