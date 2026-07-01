import { Op } from "sequelize";
import { sequelize } from "@/lib/db/db";
import models from "@/lib/db/models";
import {
  ACTIVE_PROMOTION_REDEMPTION_STATES,
  applyPromotionRedemption,
  expirePromotionRedemption,
  getActivePromotionRedemptionCounts,
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
    Promotion: {
      findByPk: jest.fn(),
    },
    PromotionRedemption: {
      count: jest.fn(),
      create: jest.fn(),
      findOne: jest.fn(),
    },
  },
}));

describe("promotionRedemptions service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reserves a promotion redemption inside a locked transaction", async () => {
    const now = new Date("2026-07-01T10:00:00.000Z");
    const reservationExpiresAt = new Date("2026-07-01T10:15:00.000Z");
    const promotion = {
      id: 7,
      status: "ACTIVE",
      totalLimit: 5,
      perUserLimit: 2,
      triggerType: "FIRST_PAID_BOOKING",
      triggerConfig: { message: "First booking" },
    };
    const createdRedemption = { id: 91 };

    models.Promotion.findByPk.mockResolvedValue(promotion);
    models.PromotionRedemption.findOne.mockResolvedValue(null);
    models.PromotionRedemption.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);
    models.PromotionRedemption.create.mockResolvedValue(createdRedemption);

    const result = await reservePromotionRedemption({
      promotionId: promotion.id,
      userId: 12,
      transactionId: 33,
      bookingId: 44,
      eligibleSubtotal: "650.00",
      benefitAmount: "120.00",
      benefitTypeSnapshot: "FIXED",
      reservationExpiresAt,
      now,
    });

    expect(result).toBe(createdRedemption);
    expect(sequelize.transaction).toHaveBeenCalledTimes(1);
    expect(models.Promotion.findByPk).toHaveBeenCalledWith(7, {
      transaction: mockTransaction,
      lock: mockTransaction.LOCK.UPDATE,
    });
    expect(models.PromotionRedemption.findOne).toHaveBeenCalledWith({
      where: {
        transactionId: 33,
        state: {
          [Op.in]: ACTIVE_PROMOTION_REDEMPTION_STATES,
        },
      },
      transaction: mockTransaction,
      lock: mockTransaction.LOCK.UPDATE,
      order: [["id", "DESC"]],
    });

    const totalUsageWhere =
      models.PromotionRedemption.count.mock.calls[0][0].where;
    expect(totalUsageWhere.promotionId).toBe(7);
    expect(totalUsageWhere.state[Op.in]).toEqual(
      ACTIVE_PROMOTION_REDEMPTION_STATES,
    );

    const perUserUsageWhere =
      models.PromotionRedemption.count.mock.calls[1][0].where;
    expect(perUserUsageWhere.promotionId).toBe(7);
    expect(perUserUsageWhere.userId).toBe(12);
    expect(perUserUsageWhere.state[Op.in]).toEqual(
      ACTIVE_PROMOTION_REDEMPTION_STATES,
    );

    expect(models.PromotionRedemption.create).toHaveBeenCalledWith(
      {
        promotionId: 7,
        userId: 12,
        transactionId: 33,
        bookingId: 44,
        eligibleSubtotal: 650,
        benefitAmount: 120,
        benefitTypeSnapshot: "FIXED",
        triggerSnapshot: {
          triggerType: "FIRST_PAID_BOOKING",
          triggerConfig: { message: "First booking" },
        },
        state: "RESERVED",
        reservedAt: now,
        reservationExpiresAt,
      },
      { transaction: mockTransaction },
    );
  });

  it("rejects reservations once the total limit is exhausted", async () => {
    models.Promotion.findByPk.mockResolvedValue({
      id: 3,
      status: "ACTIVE",
      totalLimit: 2,
      perUserLimit: null,
      triggerType: "NONE",
      triggerConfig: {},
    });
    models.PromotionRedemption.findOne.mockResolvedValue(null);
    models.PromotionRedemption.count.mockResolvedValueOnce(2);

    await expect(
      reservePromotionRedemption({
        promotionId: 3,
        userId: 10,
        transactionId: 11,
        eligibleSubtotal: 500,
        benefitAmount: 50,
        benefitTypeSnapshot: "FIXED",
      }),
    ).rejects.toThrow("Promotion total usage limit reached");

    expect(models.PromotionRedemption.create).not.toHaveBeenCalled();
  });

  it("rejects duplicate active reservations for the same transaction", async () => {
    models.Promotion.findByPk.mockResolvedValue({
      id: 7,
      status: "ACTIVE",
      totalLimit: null,
      perUserLimit: null,
      triggerType: "NONE",
      triggerConfig: {},
    });
    models.PromotionRedemption.findOne.mockResolvedValue({
      id: 77,
      state: "RESERVED",
    });

    await expect(
      reservePromotionRedemption({
        promotionId: 7,
        userId: 12,
        transactionId: 33,
        eligibleSubtotal: 500,
        benefitAmount: 50,
        benefitTypeSnapshot: "FIXED",
      }),
    ).rejects.toThrow("Transaction already has an active promotion redemption");

    expect(models.PromotionRedemption.count).not.toHaveBeenCalled();
    expect(models.PromotionRedemption.create).not.toHaveBeenCalled();
  });

  it("rejects reservations once the per-user limit is exhausted", async () => {
    models.Promotion.findByPk.mockResolvedValue({
      id: 3,
      status: "ACTIVE",
      totalLimit: 5,
      perUserLimit: 1,
      triggerType: "NONE",
      triggerConfig: {},
    });
    models.PromotionRedemption.findOne.mockResolvedValue(null);
    models.PromotionRedemption.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);

    await expect(
      reservePromotionRedemption({
        promotionId: 3,
        userId: 10,
        transactionId: 11,
        eligibleSubtotal: 500,
        benefitAmount: 50,
        benefitTypeSnapshot: "FIXED",
      }),
    ).rejects.toThrow("Promotion per-user usage limit reached");

    expect(models.PromotionRedemption.create).not.toHaveBeenCalled();
  });

  it("marks reserved redemptions as applied", async () => {
    const now = new Date("2026-07-01T12:00:00.000Z");
    const redemption = {
      id: 5,
      state: "RESERVED",
      update: jest.fn(async (values) => Object.assign(redemption, values)),
    };
    models.PromotionRedemption.findOne.mockResolvedValue(redemption);

    const result = await applyPromotionRedemption({
      redemptionId: 5,
      now,
    });

    expect(result.state).toBe("APPLIED");
    expect(redemption.update).toHaveBeenCalledWith(
      {
        state: "APPLIED",
        appliedAt: now,
      },
      { transaction: mockTransaction },
    );
  });

  it("releases reserved redemptions by transaction id", async () => {
    const now = new Date("2026-07-01T12:05:00.000Z");
    const redemption = {
      id: 6,
      state: "RESERVED",
      update: jest.fn(async (values) => Object.assign(redemption, values)),
    };
    models.PromotionRedemption.findOne.mockResolvedValue(redemption);

    const result = await releasePromotionRedemption({
      transactionId: 45,
      reason: "payment_failed",
      now,
    });

    expect(result.state).toBe("RELEASED");
    expect(redemption.update).toHaveBeenCalledWith(
      {
        state: "RELEASED",
        releasedAt: now,
        releaseReason: "payment_failed",
      },
      { transaction: mockTransaction },
    );
  });

  it("returns usage counts scoped to a promotion and user", async () => {
    models.PromotionRedemption.count
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(1);

    const counts = await getActivePromotionRedemptionCounts({
      promotionId: 7,
      userId: 12,
    });

    expect(counts).toEqual({
      totalActiveCount: 4,
      userActiveCount: 1,
    });
  });

  it("expires reserved redemptions and records the release reason", async () => {
    const now = new Date("2026-07-01T12:10:00.000Z");
    const redemption = {
      id: 7,
      state: "RESERVED",
      update: jest.fn(async (values) => Object.assign(redemption, values)),
    };
    models.PromotionRedemption.findOne.mockResolvedValue(redemption);

    const result = await expirePromotionRedemption({
      redemptionId: 7,
      now,
    });

    expect(result.state).toBe("EXPIRED");
    expect(redemption.update).toHaveBeenCalledWith(
      {
        state: "EXPIRED",
        releasedAt: now,
        releaseReason: "expired",
      },
      { transaction: mockTransaction },
    );
  });
});
