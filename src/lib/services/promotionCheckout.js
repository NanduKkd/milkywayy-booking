import { sequelize } from "@/lib/db/db";
import models from "@/lib/db/models";
import { evaluateCheckoutPromotionPricing } from "./promotionPricing";
import {
  applyPromotionRedemption,
  expirePromotionRedemption,
  releasePromotionRedemption,
  reservePromotionRedemption,
} from "./promotionRedemptions";

export const PROMOTION_CHECKOUT_RESERVATION_WINDOW_MS = 24 * 60 * 60 * 1000;

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

function normalizeNonNegativeAmount(value, label) {
  const normalized = Number(value);

  if (!Number.isFinite(normalized) || normalized < 0) {
    throw new Error(`${label} must be a non-negative number`);
  }

  return normalized;
}

function normalizeReservationSelection(selectedPromotion) {
  if (!selectedPromotion) {
    return null;
  }

  return {
    promotionId: normalizeRequiredId(
      selectedPromotion.promotionId ?? selectedPromotion.id,
      "Promotion ID",
    ),
    benefitAmount: normalizeNonNegativeAmount(
      selectedPromotion.benefitAmount,
      "Promotion benefit amount",
    ),
    triggerSnapshot:
      selectedPromotion.triggerSnapshot &&
      typeof selectedPromotion.triggerSnapshot === "object"
        ? selectedPromotion.triggerSnapshot
        : null,
  };
}

async function findTransactionForUpdate(transactionId, transaction) {
  return models.Transaction.findByPk(
    normalizeRequiredId(transactionId, "Transaction ID"),
    {
      transaction,
      lock: transaction.LOCK.UPDATE,
    },
  );
}

async function findPromotionRedemptionForUpdate(redemptionId, transaction) {
  return models.PromotionRedemption.findByPk(
    normalizeRequiredId(redemptionId, "Promotion redemption ID"),
    {
      transaction,
      lock: transaction.LOCK.UPDATE,
    },
  );
}

function getSingleBookingId(bookingIds) {
  if (!Array.isArray(bookingIds) || bookingIds.length !== 1) {
    return null;
  }

  return normalizeRequiredId(bookingIds[0], "Booking ID");
}

function buildPromotionSnapshot({
  promotion,
  eligibleSubtotal,
  benefitAmount,
  triggerSnapshot,
}) {
  return {
    id: promotion.id,
    kind: promotion.kind,
    code: promotion.code || null,
    name: promotion.name,
    eligibleSubtotal,
    benefitType: promotion.benefitType,
    benefitValue: Number(promotion.benefitValue),
    benefitCap:
      promotion.benefitCap == null ? null : Number(promotion.benefitCap),
    minimumSpend: Number(promotion.minimumSpend || 0),
    triggerType: promotion.triggerType,
    triggerConfig: promotion.triggerConfig || {},
    triggerSnapshot: triggerSnapshot || {
      triggerType: promotion.triggerType,
      triggerConfig: promotion.triggerConfig || {},
    },
    benefitAmount,
    sourceMarkers: {
      legacySourceType: promotion.legacySourceType || null,
      legacySourceId: promotion.legacySourceId || null,
    },
  };
}

export async function reservePromotionForCheckoutTransaction({
  transactionId,
  userId,
  selectedPromotion = null,
  eligibleSubtotal,
  bookingIds = [],
  enteredCode = null,
  now = new Date(),
  reservationExpiresAt = new Date(
    Date.now() + PROMOTION_CHECKOUT_RESERVATION_WINDOW_MS,
  ),
  transaction = null,
}) {
  const normalizedSelection = normalizeReservationSelection(selectedPromotion);

  if (!normalizedSelection) {
    return null;
  }

  const normalizedUserId = normalizeRequiredId(userId, "User ID");
  const normalizedEligibleSubtotal = normalizeNonNegativeAmount(
    eligibleSubtotal,
    "Eligible subtotal",
  );

  return runInTransaction(transaction, async (activeTransaction) => {
    const checkoutTransaction = await findTransactionForUpdate(
      transactionId,
      activeTransaction,
    );

    if (!checkoutTransaction) {
      throw new Error("Transaction not found");
    }

    if (checkoutTransaction.promotionRedemptionId) {
      return {
        promotionRedemptionId: checkoutTransaction.promotionRedemptionId,
        promotionSnapshot: checkoutTransaction.promotionSnapshot || null,
      };
    }

    const promotion = await models.Promotion.findByPk(
      normalizedSelection.promotionId,
      {
        transaction: activeTransaction,
        lock: activeTransaction.LOCK.UPDATE,
      },
    );

    if (!promotion) {
      throw new Error("Promotion not found");
    }

    // A checkout preview is advisory only. Re-evaluate while the reservation
    // transaction is open so a customer cannot consume a promotion after an
    // operator pauses it, removes a personal assignment, changes a trigger,
    // reaches a limit, or lets its window end.
    const currentPricing = await evaluateCheckoutPromotionPricing({
      userId: normalizedUserId,
      eligibleSubtotal: normalizedEligibleSubtotal,
      // Programmatic checkout callers can supply a preselected generic
      // promotion without separately carrying its entered-code string.
      enteredCode:
        enteredCode ?? (promotion.kind === "GENERIC" ? promotion.code : null),
      now,
      transaction: activeTransaction,
    });
    const currentSelection = currentPricing.selectedPromotion;

    if (
      !currentSelection ||
      Number(currentSelection.promotionId) !== Number(promotion.id) ||
      Number(currentSelection.benefitAmount) !==
        Number(normalizedSelection.benefitAmount)
    ) {
      throw new Error("Promotion is no longer eligible for checkout");
    }

    const bookingId = getSingleBookingId(bookingIds);
    const redemption = await reservePromotionRedemption({
      promotionId: promotion.id,
      userId: normalizedUserId,
      transactionId: checkoutTransaction.id,
      bookingId,
      eligibleSubtotal: normalizedEligibleSubtotal,
      benefitAmount: currentSelection.benefitAmount,
      benefitTypeSnapshot: promotion.benefitType,
      triggerSnapshot: currentSelection.triggerSnapshot,
      reservationExpiresAt,
      transaction: activeTransaction,
    });
    const promotionSnapshot = buildPromotionSnapshot({
      promotion,
      eligibleSubtotal: normalizedEligibleSubtotal,
      benefitAmount: currentSelection.benefitAmount,
      triggerSnapshot: currentSelection.triggerSnapshot,
    });

    await checkoutTransaction.update(
      {
        promotionId: promotion.id,
        promotionRedemptionId: redemption.id,
        promotionSnapshot,
      },
      { transaction: activeTransaction },
    );

    return {
      promotionRedemptionId: redemption.id,
      promotionSnapshot,
    };
  });
}

export async function applyPromotionForCheckoutTransaction({
  transactionId,
  now = new Date(),
  transaction = null,
}) {
  return runInTransaction(transaction, async (activeTransaction) => {
    const checkoutTransaction = await findTransactionForUpdate(
      transactionId,
      activeTransaction,
    );

    if (!checkoutTransaction) {
      throw new Error("Transaction not found");
    }

    if (!checkoutTransaction.promotionRedemptionId) {
      return null;
    }

    const redemption = await findPromotionRedemptionForUpdate(
      checkoutTransaction.promotionRedemptionId,
      activeTransaction,
    );

    if (!redemption) {
      throw new Error("Promotion redemption not found");
    }

    if (redemption.state === "APPLIED") {
      return redemption;
    }

    if (redemption.state !== "RESERVED") {
      throw new Error(
        `Only reserved promotion redemptions can be applied from checkout; current state is ${redemption.state}`,
      );
    }

    if (
      redemption.reservationExpiresAt &&
      new Date(redemption.reservationExpiresAt).getTime() <= now.getTime()
    ) {
      await expirePromotionRedemption({
        redemptionId: redemption.id,
        now,
        transaction: activeTransaction,
      });
      throw new Error("Promotion reservation has expired");
    }

    return applyPromotionRedemption({
      redemptionId: redemption.id,
      now,
      transaction: activeTransaction,
    });
  });
}

/**
 * Records the customer-visible result of a paid checkout once. Stripe retries
 * are expected, so the first successful reconciliation owns promotion
 * finalization and booking confirmation; later deliveries only observe it.
 */
export async function finalizePaidPromotionCheckoutTransaction({
  transactionId,
  stripePaymentIntentId = null,
  paidAt = new Date(),
  transaction = null,
}) {
  return runInTransaction(transaction, async (activeTransaction) => {
    const checkoutTransaction = await findTransactionForUpdate(
      transactionId,
      activeTransaction,
    );

    if (!checkoutTransaction) {
      throw new Error("Transaction not found");
    }

    if (checkoutTransaction.status === "success") {
      return { transaction: checkoutTransaction, alreadyFinalized: true };
    }

    await applyPromotionForCheckoutTransaction({
      transactionId: checkoutTransaction.id,
      now: paidAt,
      transaction: activeTransaction,
    });

    await checkoutTransaction.update(
      {
        status: "success",
        ...(stripePaymentIntentId ? { stripePaymentIntentId } : {}),
        paidAt,
      },
      { transaction: activeTransaction },
    );
    await models.Booking.update(
      { status: "CONFIRMED" },
      {
        where: {
          transactionId: checkoutTransaction.id,
          status: "DRAFT",
        },
        transaction: activeTransaction,
      },
    );

    return { transaction: checkoutTransaction, alreadyFinalized: false };
  });
}

async function changePromotionCheckoutReservationState({
  transactionId,
  now,
  transaction,
  changeType,
  reason,
}) {
  return runInTransaction(transaction, async (activeTransaction) => {
    const checkoutTransaction = await findTransactionForUpdate(
      transactionId,
      activeTransaction,
    );

    if (!checkoutTransaction) {
      throw new Error("Transaction not found");
    }

    if (!checkoutTransaction.promotionRedemptionId) {
      return null;
    }

    const redemption = await findPromotionRedemptionForUpdate(
      checkoutTransaction.promotionRedemptionId,
      activeTransaction,
    );

    if (!redemption) {
      throw new Error("Promotion redemption not found");
    }

    if (redemption.state === "APPLIED") {
      return redemption;
    }

    if (redemption.state === "RELEASED" || redemption.state === "EXPIRED") {
      return redemption;
    }

    if (changeType === "expire") {
      return expirePromotionRedemption({
        redemptionId: redemption.id,
        now,
        transaction: activeTransaction,
      });
    }

    return releasePromotionRedemption({
      redemptionId: redemption.id,
      reason,
      now,
      transaction: activeTransaction,
    });
  });
}

export async function releasePromotionForCheckoutTransaction({
  transactionId,
  reason = "checkout_failed",
  now = new Date(),
  transaction = null,
}) {
  return changePromotionCheckoutReservationState({
    transactionId,
    reason,
    now,
    transaction,
    changeType: "release",
  });
}

export async function expirePromotionForCheckoutTransaction({
  transactionId,
  now = new Date(),
  transaction = null,
}) {
  return changePromotionCheckoutReservationState({
    transactionId,
    reason: "expired",
    now,
    transaction,
    changeType: "expire",
  });
}
