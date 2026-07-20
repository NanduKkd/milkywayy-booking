import { Op } from "sequelize";
import models from "@/lib/db/models";
import Booking from "@/lib/db/models/booking";
import Transaction from "@/lib/db/models/transaction";
import { selectPromotionForCheckout } from "./promotionEngine";
import { getActivePromotionRedemptionCounts } from "./promotionRedemptions";

const SUCCESSFUL_TRANSACTION_STATUS = "success";
const CODE_VALIDATION_SUCCESS_STATES = new Set(["APPLIED", "SUPERSEDED"]);

function normalizeSubtotal(value) {
  const normalized = Number(value || 0);
  return Number.isFinite(normalized) && normalized > 0 ? normalized : 0;
}

function normalizePromotionCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function serializeSelectedPromotion(selectedPromotion, promotion) {
  if (!selectedPromotion || !promotion) {
    return null;
  }

  return {
    promotionId: Number(selectedPromotion.promotionId),
    code: selectedPromotion.code || null,
    name: selectedPromotion.name || null,
    kind: selectedPromotion.kind || null,
    benefitAmount: Number(selectedPromotion.benefitAmount || 0),
    triggerSnapshot: selectedPromotion.triggerSnapshot || {
      triggerType: promotion.triggerType,
      triggerConfig: promotion.triggerConfig || {},
    },
    customerMessage: promotion.customerMessage || null,
    minimumSpend: Number(promotion.minimumSpend || 0),
    sourceMarkers: {
      legacySourceType: promotion.legacySourceType || null,
      legacySourceId: promotion.legacySourceId || null,
    },
  };
}

function buildCodeValidationMessage({
  code,
  genericCandidate,
  selectedPromotion,
  promotion,
}) {
  if (!code || !genericCandidate) {
    return null;
  }

  if (genericCandidate.eligible) {
    if (selectedPromotion?.promotionId === genericCandidate.promotionId) {
      return {
        status: "APPLIED",
        message:
          promotion?.customerMessage?.trim() || `${code} applied successfully`,
      };
    }

    return {
      status: "SUPERSEDED",
      message: "A better promotion is already applied to this booking.",
    };
  }

  switch (genericCandidate.reason) {
    case "GENERIC_CODE_NOT_FOUND":
      return {
        status: "INVALID",
        message: "Invalid promo code",
      };
    case "PROMOTION_NOT_ACTIVE":
    case "PROMOTION_ENDED":
      return {
        status: "INACTIVE",
        message: "Promo code is inactive or expired",
      };
    case "PROMOTION_NOT_STARTED":
      return {
        status: "NOT_STARTED",
        message: "Promo code is not active yet",
      };
    case "MINIMUM_SPEND_NOT_MET":
      return {
        status: "MINIMUM_SPEND_NOT_MET",
        message: `Minimum spend of AED ${Number(promotion?.minimumSpend || 0)} required`,
      };
    case "TOTAL_LIMIT_REACHED":
    case "PER_USER_LIMIT_REACHED":
      return {
        status: "LIMIT_REACHED",
        message: "Promo code usage limit reached",
      };
    default:
      return {
        status: "UNAVAILABLE",
        message: "Promo code is unavailable for this booking",
      };
  }
}

async function loadPromotionEvaluationContext({
  userId,
  normalizedCode,
  transaction = null,
  excludeTransactionId = null,
}) {
  const promotions = [];

  const automaticAndPersonalPromotions = await models.Promotion.findAll({
    where: {
      kind: {
        [Op.in]: ["AUTOMATIC", "PERSONAL"],
      },
      status: "ACTIVE",
    },
    order: [
      ["priority", "DESC"],
      ["id", "ASC"],
    ],
    transaction,
  });
  promotions.push(...automaticAndPersonalPromotions);

  if (normalizedCode) {
    const genericPromotion = await models.Promotion.findOne({
      where: {
        kind: "GENERIC",
        code: normalizedCode,
      },
      transaction,
    });

    if (
      genericPromotion &&
      !promotions.some(
        (promotion) => Number(promotion.id) === Number(genericPromotion.id),
      )
    ) {
      promotions.push(genericPromotion);
    }
  }

  const assignedPromotionIds =
    userId == null
      ? []
      : (
          await models.PromotionAssignment.findAll({
            where: {
              userId,
              unassignedAt: null,
            },
            attributes: ["promotionId"],
            transaction,
          })
        ).map((assignment) => Number(assignment.promotionId));

  const paidBookingCount =
    userId == null ||
    !promotions.some((promotion) =>
      [
        "FIRST_PAID_BOOKING",
        "SECOND_PAID_BOOKING",
        "ANY_PAID_BOOKING",
      ].includes(promotion.triggerType),
    )
      ? 0
      : await Booking.count({
          where: {
            userId,
          },
          include: [
            {
              model: Transaction,
              as: "transaction",
              required: true,
              where: {
                status: SUCCESSFUL_TRANSACTION_STATUS,
                ...(excludeTransactionId == null
                  ? {}
                  : { id: { [Op.ne]: excludeTransactionId } }),
              },
            },
          ],
          transaction,
        });

  const usageCountsByPromotionId = {};

  await Promise.all(
    promotions.map(async (promotion) => {
      const counts = await getActivePromotionRedemptionCounts({
        promotionId: promotion.id,
        userId,
        transaction,
      });

      usageCountsByPromotionId[promotion.id] = {
        totalActiveCount: Number(counts.totalActiveCount || 0),
        userActiveCount: Number(counts.userActiveCount || 0),
      };
    }),
  );

  return {
    promotions,
    assignedPromotionIds,
    paidBookingCount,
    usageCountsByPromotionId,
  };
}

export async function evaluateCheckoutPromotionPricing({
  userId = null,
  eligibleSubtotal,
  enteredCode = null,
  now = new Date(),
  transaction = null,
  excludeTransactionId = null,
}) {
  const normalizedSubtotal = normalizeSubtotal(eligibleSubtotal);
  const normalizedCode = normalizePromotionCode(enteredCode);
  const {
    promotions,
    assignedPromotionIds,
    paidBookingCount,
    usageCountsByPromotionId,
  } = await loadPromotionEvaluationContext({
    userId,
    normalizedCode,
    transaction,
    excludeTransactionId,
  });

  const evaluation = selectPromotionForCheckout({
    promotions,
    eligibleSubtotal: normalizedSubtotal,
    enteredCode: normalizedCode,
    paidBookingCount,
    assignedPromotionIds,
    usageCountsByPromotionId,
    now,
  });

  const promotionById = new Map(
    promotions.map((promotion) => [Number(promotion.id), promotion]),
  );
  const selectedPromotion = serializeSelectedPromotion(
    evaluation.selectedPromotion,
    promotionById.get(Number(evaluation.selectedPromotion?.promotionId)),
  );
  const genericPromotion = promotionById.get(
    Number(evaluation.genericCandidate?.promotionId),
  );
  const codeValidation = buildCodeValidationMessage({
    code: normalizedCode,
    genericCandidate: evaluation.genericCandidate,
    selectedPromotion: evaluation.selectedPromotion,
    promotion: genericPromotion,
  });

  return {
    eligibleSubtotal: normalizedSubtotal,
    enteredCode: normalizedCode,
    selectedPromotion,
    codeValidation,
    evaluations: evaluation.evaluations,
  };
}

export function isPromotionCodeValidationSuccessful(codeValidation) {
  return CODE_VALIDATION_SUCCESS_STATES.has(codeValidation?.status);
}
