import { jwtVerify, SignJWT } from "jose";
import { getDiscounts } from "@/lib/actions/discounts";
import { sequelize } from "@/lib/db/db";
import Booking from "@/lib/db/models/booking";
import Transaction from "@/lib/db/models/transaction";
import User from "@/lib/db/models/user";
import WalletTransaction from "@/lib/db/models/wallettransaction";
import { calculateWalletCreditPreview } from "@/lib/helpers/promotionPricing";
import {
  createAdminBookingHandoff,
  createAdminBookingHandoffCheckout,
  sendAdminBookingHandoffOtp,
  verifyAdminBookingHandoffOtp,
} from "../adminBookingHandoffs";
import { previewAdminBookingPreparation } from "../adminBookingPreparation";
import { sendCustomerOtp, verifyCustomerOtp } from "../customerAuth";
import { releasePromotionForCheckoutTransaction } from "../promotionCheckout";
import { evaluateCheckoutPromotionPricing } from "../promotionPricing";

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
  });

  it("initializes model relations at the handoff service boundary", () => {
    expect(globalThis.__adminBookingHandoffRelationsInitializationCount).toBe(
      1,
    );
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
});
