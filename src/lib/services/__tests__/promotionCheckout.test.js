import { sequelize } from "@/lib/db/db";
import models from "@/lib/db/models";
import {
  applyPromotionForCheckoutTransaction,
  expirePromotionForCheckoutTransaction,
  releasePromotionForCheckoutTransaction,
  reservePromotionForCheckoutTransaction,
} from "../promotionCheckout";
import {
  applyPromotionRedemption,
  expirePromotionRedemption,
  releasePromotionRedemption,
  reservePromotionRedemption,
} from "../promotionRedemptions";

const mockTransaction = {
  LOCK: {
    UPDATE: "UPDATE",
  },
};

jest.mock("@/lib/db/db", () => ({
  sequelize: {
    transaction: jest.fn((callback) => callback(mockTransaction)),
  },
}));

jest.mock("@/lib/db/models", () => ({
  __esModule: true,
  default: {
    Transaction: {
      findByPk: jest.fn(),
    },
    Promotion: {
      findByPk: jest.fn(),
    },
    PromotionRedemption: {
      findByPk: jest.fn(),
    },
  },
}));

jest.mock("../promotionRedemptions", () => ({
  applyPromotionRedemption: jest.fn(),
  expirePromotionRedemption: jest.fn(),
  releasePromotionRedemption: jest.fn(),
  reservePromotionRedemption: jest.fn(),
}));

describe("promotionCheckout service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("attaches a reserved promotion redemption and snapshot to a checkout transaction", async () => {
    const checkoutTransaction = {
      id: 91,
      promotionRedemptionId: null,
      promotionSnapshot: null,
      update: jest.fn(),
    };
    const promotion = {
      id: 7,
      kind: "GENERIC",
      code: "VIP25",
      name: "VIP 25",
      benefitType: "PERCENTAGE",
      benefitValue: "25.00",
      benefitCap: "250.00",
      minimumSpend: "400.00",
      triggerType: "NONE",
      triggerConfig: {},
      legacySourceType: "coupon",
      legacySourceId: "9",
    };
    const redemption = { id: 3001 };
    const reservationExpiresAt = new Date("2026-07-02T10:00:00.000Z");

    models.Transaction.findByPk.mockResolvedValue(checkoutTransaction);
    models.Promotion.findByPk.mockResolvedValue(promotion);
    reservePromotionRedemption.mockResolvedValue(redemption);

    const result = await reservePromotionForCheckoutTransaction({
      transactionId: 91,
      userId: 12,
      bookingIds: [44],
      eligibleSubtotal: "950.00",
      reservationExpiresAt,
      selectedPromotion: {
        promotionId: 7,
        benefitAmount: "237.50",
        triggerSnapshot: {
          triggerType: "NONE",
          triggerConfig: {},
        },
      },
    });

    expect(sequelize.transaction).toHaveBeenCalledTimes(1);
    expect(models.Transaction.findByPk).toHaveBeenCalledWith(91, {
      transaction: mockTransaction,
      lock: mockTransaction.LOCK.UPDATE,
    });
    expect(models.Promotion.findByPk).toHaveBeenCalledWith(7, {
      transaction: mockTransaction,
      lock: mockTransaction.LOCK.UPDATE,
    });
    expect(reservePromotionRedemption).toHaveBeenCalledWith({
      promotionId: 7,
      userId: 12,
      transactionId: 91,
      bookingId: 44,
      eligibleSubtotal: 950,
      benefitAmount: 237.5,
      benefitTypeSnapshot: "PERCENTAGE",
      triggerSnapshot: {
        triggerType: "NONE",
        triggerConfig: {},
      },
      reservationExpiresAt,
      transaction: mockTransaction,
    });
    expect(checkoutTransaction.update).toHaveBeenCalledWith(
      {
        promotionId: 7,
        promotionRedemptionId: 3001,
        promotionSnapshot: {
          id: 7,
          kind: "GENERIC",
          code: "VIP25",
          name: "VIP 25",
          eligibleSubtotal: 950,
          benefitType: "PERCENTAGE",
          benefitValue: 25,
          benefitCap: 250,
          minimumSpend: 400,
          triggerType: "NONE",
          triggerConfig: {},
          triggerSnapshot: {
            triggerType: "NONE",
            triggerConfig: {},
          },
          benefitAmount: 237.5,
          sourceMarkers: {
            legacySourceType: "coupon",
            legacySourceId: "9",
          },
        },
      },
      { transaction: mockTransaction },
    );
    expect(result).toEqual({
      promotionRedemptionId: 3001,
      promotionSnapshot: expect.objectContaining({
        id: 7,
        benefitAmount: 237.5,
      }),
    });
  });

  it("returns null when no promotion was selected for checkout", async () => {
    const result = await reservePromotionForCheckoutTransaction({
      transactionId: 91,
      userId: 12,
      eligibleSubtotal: 950,
      selectedPromotion: null,
    });

    expect(result).toBeNull();
    expect(models.Transaction.findByPk).not.toHaveBeenCalled();
    expect(reservePromotionRedemption).not.toHaveBeenCalled();
  });

  it("returns the existing checkout reservation when a retry sees an attached redemption", async () => {
    models.Transaction.findByPk.mockResolvedValue({
      id: 91,
      promotionRedemptionId: 3001,
      promotionSnapshot: {
        id: 7,
        benefitAmount: 237.5,
      },
    });

    const result = await reservePromotionForCheckoutTransaction({
      transactionId: 91,
      userId: 12,
      eligibleSubtotal: 950,
      selectedPromotion: {
        promotionId: 7,
        benefitAmount: "237.50",
      },
    });

    expect(models.Promotion.findByPk).not.toHaveBeenCalled();
    expect(reservePromotionRedemption).not.toHaveBeenCalled();
    expect(result).toEqual({
      promotionRedemptionId: 3001,
      promotionSnapshot: {
        id: 7,
        benefitAmount: 237.5,
      },
    });
  });

  it("applies the reserved redemption attached to a paid transaction", async () => {
    const checkoutTransaction = {
      id: 91,
      promotionRedemptionId: 3001,
    };
    const redemption = { id: 3001, state: "RESERVED" };

    models.Transaction.findByPk.mockResolvedValue(checkoutTransaction);
    models.PromotionRedemption.findByPk.mockResolvedValue(redemption);
    applyPromotionRedemption.mockResolvedValue({
      ...redemption,
      state: "APPLIED",
    });

    const result = await applyPromotionForCheckoutTransaction({
      transactionId: 91,
      now: new Date("2026-07-01T10:10:00.000Z"),
    });

    expect(applyPromotionRedemption).toHaveBeenCalledWith({
      redemptionId: 3001,
      now: new Date("2026-07-01T10:10:00.000Z"),
      transaction: mockTransaction,
    });
    expect(result).toEqual({
      id: 3001,
      state: "APPLIED",
    });
  });

  it("returns the existing applied redemption on duplicate payment finalization", async () => {
    const checkoutTransaction = {
      id: 91,
      promotionRedemptionId: 3001,
    };
    const redemption = { id: 3001, state: "APPLIED" };

    models.Transaction.findByPk.mockResolvedValue(checkoutTransaction);
    models.PromotionRedemption.findByPk.mockResolvedValue(redemption);

    const result = await applyPromotionForCheckoutTransaction({
      transactionId: 91,
    });

    expect(applyPromotionRedemption).not.toHaveBeenCalled();
    expect(result).toBe(redemption);
  });

  it("releases a reserved redemption when checkout fails", async () => {
    const checkoutTransaction = {
      id: 91,
      promotionRedemptionId: 3001,
    };
    const redemption = { id: 3001, state: "RESERVED" };
    const now = new Date("2026-07-01T10:15:00.000Z");

    models.Transaction.findByPk.mockResolvedValue(checkoutTransaction);
    models.PromotionRedemption.findByPk.mockResolvedValue(redemption);
    releasePromotionRedemption.mockResolvedValue({
      ...redemption,
      state: "RELEASED",
    });

    const result = await releasePromotionForCheckoutTransaction({
      transactionId: 91,
      reason: "checkout_cancelled",
      now,
    });

    expect(releasePromotionRedemption).toHaveBeenCalledWith({
      redemptionId: 3001,
      reason: "checkout_cancelled",
      now,
      transaction: mockTransaction,
    });
    expect(result).toEqual({
      id: 3001,
      state: "RELEASED",
    });
  });

  it("returns the existing released redemption when checkout failure cleanup is retried", async () => {
    const checkoutTransaction = {
      id: 91,
      promotionRedemptionId: 3001,
    };
    const redemption = { id: 3001, state: "RELEASED" };

    models.Transaction.findByPk.mockResolvedValue(checkoutTransaction);
    models.PromotionRedemption.findByPk.mockResolvedValue(redemption);

    const result = await releasePromotionForCheckoutTransaction({
      transactionId: 91,
      reason: "checkout_cancelled",
    });

    expect(releasePromotionRedemption).not.toHaveBeenCalled();
    expect(result).toBe(redemption);
  });

  it("expires a reserved redemption when the checkout window closes", async () => {
    const checkoutTransaction = {
      id: 91,
      promotionRedemptionId: 3001,
    };
    const redemption = { id: 3001, state: "RESERVED" };
    const now = new Date("2026-07-02T10:15:00.000Z");

    models.Transaction.findByPk.mockResolvedValue(checkoutTransaction);
    models.PromotionRedemption.findByPk.mockResolvedValue(redemption);
    expirePromotionRedemption.mockResolvedValue({
      ...redemption,
      state: "EXPIRED",
    });

    const result = await expirePromotionForCheckoutTransaction({
      transactionId: 91,
      now,
    });

    expect(expirePromotionRedemption).toHaveBeenCalledWith({
      redemptionId: 3001,
      now,
      transaction: mockTransaction,
    });
    expect(result).toEqual({
      id: 3001,
      state: "EXPIRED",
    });
  });

  it("returns the existing expired redemption when session expiry cleanup is retried", async () => {
    const checkoutTransaction = {
      id: 91,
      promotionRedemptionId: 3001,
    };
    const redemption = { id: 3001, state: "EXPIRED" };

    models.Transaction.findByPk.mockResolvedValue(checkoutTransaction);
    models.PromotionRedemption.findByPk.mockResolvedValue(redemption);

    const result = await expirePromotionForCheckoutTransaction({
      transactionId: 91,
    });

    expect(expirePromotionRedemption).not.toHaveBeenCalled();
    expect(result).toBe(redemption);
  });
});
