import { Op } from "sequelize";
import { sequelize } from "@/lib/db/db";
import models from "@/lib/db/models";

export const ACTIVE_PROMOTION_REDEMPTION_STATES = Object.freeze([
  "RESERVED",
  "APPLIED",
]);

const BENEFIT_TYPES = new Set(["FIXED", "PERCENTAGE"]);

function runInTransaction(transaction, callback) {
  if (transaction) {
    return callback(transaction);
  }

  return sequelize.transaction(callback);
}

function normalizeRequiredId(value, label) {
  const normalized = Number(value);

  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new Error(`${label} is required`);
  }

  return normalized;
}

function normalizeOptionalId(value, label) {
  if (value == null) return null;
  return normalizeRequiredId(value, label);
}

function normalizeNonNegativeAmount(value, label) {
  const normalized = Number(value);

  if (!Number.isFinite(normalized) || normalized < 0) {
    throw new Error(`${label} must be a non-negative number`);
  }

  return normalized;
}

function assertBenefitType(value) {
  if (!BENEFIT_TYPES.has(value)) {
    throw new Error("Benefit type snapshot must be FIXED or PERCENTAGE");
  }
}

function buildActiveRedemptionWhere({ promotionId, userId = null }) {
  return {
    promotionId,
    ...(userId == null ? {} : { userId }),
    state: {
      [Op.in]: ACTIVE_PROMOTION_REDEMPTION_STATES,
    },
  };
}

async function countActivePromotionRedemptions({
  promotionId,
  userId = null,
  transaction,
}) {
  return models.PromotionRedemption.count({
    where: buildActiveRedemptionWhere({ promotionId, userId }),
    transaction,
  });
}

function buildTriggerSnapshot(promotion, triggerSnapshot) {
  if (triggerSnapshot && typeof triggerSnapshot === "object") {
    return triggerSnapshot;
  }

  return {
    triggerType: promotion.triggerType,
    triggerConfig: promotion.triggerConfig || {},
  };
}

async function findPromotionRedemptionForUpdate({
  redemptionId = null,
  transactionId = null,
  transaction,
}) {
  const where = {};

  if (redemptionId != null) {
    where.id = normalizeRequiredId(redemptionId, "Promotion redemption ID");
  }

  if (transactionId != null) {
    where.transactionId = normalizeRequiredId(transactionId, "Transaction ID");
  }

  if (Object.keys(where).length === 0) {
    throw new Error(
      "Promotion redemption lookup requires a redemption ID or transaction ID",
    );
  }

  return models.PromotionRedemption.findOne({
    where,
    transaction,
    lock: transaction.LOCK.UPDATE,
    order: [["id", "DESC"]],
  });
}

export async function getActivePromotionRedemptionCounts({
  promotionId,
  userId = null,
  transaction = null,
}) {
  const normalizedPromotionId = normalizeRequiredId(
    promotionId,
    "Promotion ID",
  );
  const normalizedUserId = normalizeOptionalId(userId, "User ID");

  const totalActiveCount = await countActivePromotionRedemptions({
    promotionId: normalizedPromotionId,
    transaction,
  });

  const userActiveCount =
    normalizedUserId == null
      ? null
      : await countActivePromotionRedemptions({
          promotionId: normalizedPromotionId,
          userId: normalizedUserId,
          transaction,
        });

  return {
    totalActiveCount,
    userActiveCount,
  };
}

export async function reservePromotionRedemption({
  promotionId,
  userId,
  transactionId,
  bookingId = null,
  eligibleSubtotal,
  benefitAmount,
  benefitTypeSnapshot,
  triggerSnapshot = null,
  reservationExpiresAt = null,
  now = new Date(),
  transaction = null,
}) {
  const normalizedPromotionId = normalizeRequiredId(
    promotionId,
    "Promotion ID",
  );
  const normalizedUserId = normalizeRequiredId(userId, "User ID");
  const normalizedTransactionId = normalizeRequiredId(
    transactionId,
    "Transaction ID",
  );
  const normalizedBookingId = normalizeOptionalId(bookingId, "Booking ID");
  const normalizedEligibleSubtotal = normalizeNonNegativeAmount(
    eligibleSubtotal,
    "Eligible subtotal",
  );
  const normalizedBenefitAmount = normalizeNonNegativeAmount(
    benefitAmount,
    "Benefit amount",
  );

  assertBenefitType(benefitTypeSnapshot);

  return runInTransaction(transaction, async (activeTransaction) => {
    const promotion = await models.Promotion.findByPk(normalizedPromotionId, {
      transaction: activeTransaction,
      lock: activeTransaction.LOCK.UPDATE,
    });

    if (!promotion) {
      throw new Error("Promotion not found");
    }

    if (promotion.status !== "ACTIVE") {
      throw new Error("Only active promotions can be reserved");
    }

    const existingRedemption = await models.PromotionRedemption.findOne({
      where: {
        transactionId: normalizedTransactionId,
        state: {
          [Op.in]: ACTIVE_PROMOTION_REDEMPTION_STATES,
        },
      },
      transaction: activeTransaction,
      lock: activeTransaction.LOCK.UPDATE,
      order: [["id", "DESC"]],
    });

    if (existingRedemption) {
      throw new Error("Transaction already has an active promotion redemption");
    }

    const { totalActiveCount, userActiveCount } =
      await getActivePromotionRedemptionCounts({
        promotionId: normalizedPromotionId,
        userId: normalizedUserId,
        transaction: activeTransaction,
      });

    if (
      promotion.totalLimit != null &&
      totalActiveCount >= Number(promotion.totalLimit)
    ) {
      throw new Error("Promotion total usage limit reached");
    }

    if (
      promotion.perUserLimit != null &&
      userActiveCount >= Number(promotion.perUserLimit)
    ) {
      throw new Error("Promotion per-user usage limit reached");
    }

    return models.PromotionRedemption.create(
      {
        promotionId: normalizedPromotionId,
        userId: normalizedUserId,
        transactionId: normalizedTransactionId,
        bookingId: normalizedBookingId,
        eligibleSubtotal: normalizedEligibleSubtotal,
        benefitAmount: normalizedBenefitAmount,
        benefitTypeSnapshot,
        triggerSnapshot: buildTriggerSnapshot(promotion, triggerSnapshot),
        state: "RESERVED",
        reservedAt: now,
        reservationExpiresAt,
      },
      { transaction: activeTransaction },
    );
  });
}

export async function applyPromotionRedemption({
  redemptionId = null,
  transactionId = null,
  now = new Date(),
  transaction = null,
}) {
  return runInTransaction(transaction, async (activeTransaction) => {
    const redemption = await findPromotionRedemptionForUpdate({
      redemptionId,
      transactionId,
      transaction: activeTransaction,
    });

    if (!redemption) {
      throw new Error("Promotion redemption not found");
    }

    if (redemption.state === "APPLIED") {
      return redemption;
    }

    if (redemption.state !== "RESERVED") {
      throw new Error("Only reserved promotion redemptions can be applied");
    }

    await redemption.update(
      {
        state: "APPLIED",
        appliedAt: now,
      },
      { transaction: activeTransaction },
    );

    return redemption;
  });
}

export async function releasePromotionRedemption({
  redemptionId = null,
  transactionId = null,
  reason = "released",
  now = new Date(),
  transaction = null,
}) {
  return runInTransaction(transaction, async (activeTransaction) => {
    const redemption = await findPromotionRedemptionForUpdate({
      redemptionId,
      transactionId,
      transaction: activeTransaction,
    });

    if (!redemption) {
      throw new Error("Promotion redemption not found");
    }

    if (redemption.state === "RELEASED") {
      return redemption;
    }

    if (redemption.state !== "RESERVED") {
      throw new Error("Only reserved promotion redemptions can be released");
    }

    await redemption.update(
      {
        state: "RELEASED",
        releasedAt: now,
        releaseReason: reason,
      },
      { transaction: activeTransaction },
    );

    return redemption;
  });
}

export async function expirePromotionRedemption({
  redemptionId = null,
  transactionId = null,
  now = new Date(),
  transaction = null,
}) {
  return runInTransaction(transaction, async (activeTransaction) => {
    const redemption = await findPromotionRedemptionForUpdate({
      redemptionId,
      transactionId,
      transaction: activeTransaction,
    });

    if (!redemption) {
      throw new Error("Promotion redemption not found");
    }

    if (redemption.state === "EXPIRED") {
      return redemption;
    }

    if (redemption.state !== "RESERVED") {
      throw new Error("Only reserved promotion redemptions can expire");
    }

    await redemption.update(
      {
        state: "EXPIRED",
        releasedAt: now,
        releaseReason: "expired",
      },
      { transaction: activeTransaction },
    );

    return redemption;
  });
}
