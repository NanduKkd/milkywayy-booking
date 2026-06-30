const ACTIVE_PROMOTION_STATUS = "ACTIVE";
const DUBAI_TIME_ZONE = "Asia/Dubai";

const PROMOTION_KINDS = new Set(["GENERIC", "PERSONAL", "AUTOMATIC"]);
const BENEFIT_TYPES = new Set(["FIXED", "PERCENTAGE"]);
const TRIGGER_TYPES = new Set([
  "NONE",
  "FIRST_PAID_BOOKING",
  "SECOND_PAID_BOOKING",
  "ANY_PAID_BOOKING",
  "DATE_RANGE",
]);

const normalizeMoneyToCents = (value) => {
  const normalized = Number(value || 0);

  if (!Number.isFinite(normalized)) {
    return 0;
  }

  return Math.round(normalized * 100);
};

const centsToAmount = (value) => Number((value / 100).toFixed(2));

const normalizeCount = (value) => {
  const normalized = Number(value || 0);
  return Number.isFinite(normalized) && normalized > 0 ? normalized : 0;
};

const compareIsoDates = (left, right) =>
  String(left).localeCompare(String(right));

const normalizeAssignmentSet = (assignedPromotionIds) =>
  new Set(
    Array.isArray(assignedPromotionIds)
      ? assignedPromotionIds
          .map((value) => Number(value))
          .filter(Number.isInteger)
      : [],
  );

const getUsageCounts = (usageCountsByPromotionId, promotionId) => {
  if (usageCountsByPromotionId instanceof Map) {
    return usageCountsByPromotionId.get(promotionId) || {};
  }

  if (
    usageCountsByPromotionId &&
    typeof usageCountsByPromotionId === "object"
  ) {
    return usageCountsByPromotionId[promotionId] || {};
  }

  return {};
};

const getDateFormatterParts = (value) =>
  Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: DUBAI_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(value)
      .map((part) => [part.type, part.value]),
  );

const getConfiguredDate = (config, keys) => {
  for (const key of keys) {
    const value = config?.[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
};

const getConfiguredBoolean = (config, keys, defaultValue) => {
  for (const key of keys) {
    const value = config?.[key];
    if (typeof value === "boolean") {
      return value;
    }
  }

  return defaultValue;
};

const buildEvaluation = (promotion, overrides = {}) => ({
  promotionId: promotion?.id ?? null,
  kind: promotion?.kind ?? null,
  code: promotion?.code ?? null,
  name: promotion?.name ?? null,
  priority: Number(promotion?.priority || 0),
  status: promotion?.status ?? null,
  benefitType: promotion?.benefitType ?? null,
  benefitAmount: 0,
  eligible: false,
  reason: null,
  triggerType: promotion?.triggerType ?? "NONE",
  triggerSnapshot: {
    triggerType: promotion?.triggerType ?? "NONE",
    triggerConfig: promotion?.triggerConfig || {},
  },
  totalActiveCount: 0,
  userActiveCount: 0,
  ...overrides,
});

export function getDubaiBusinessDate(value = new Date()) {
  const parts = getDateFormatterParts(value);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function calculatePromotionBenefit(promotion, eligibleSubtotal) {
  if (!promotion || !BENEFIT_TYPES.has(promotion.benefitType)) {
    throw new Error("Promotion benefit type must be FIXED or PERCENTAGE");
  }

  const subtotalCents = normalizeMoneyToCents(eligibleSubtotal);
  if (subtotalCents <= 0) {
    return 0;
  }

  if (promotion.benefitType === "FIXED") {
    return centsToAmount(
      Math.min(normalizeMoneyToCents(promotion.benefitValue), subtotalCents),
    );
  }

  const uncappedCents = Math.round(
    subtotalCents * (Number(promotion.benefitValue) / 100),
  );
  const capCents =
    promotion.benefitCap == null
      ? subtotalCents
      : normalizeMoneyToCents(promotion.benefitCap);

  return centsToAmount(Math.min(uncappedCents, capCents, subtotalCents));
}

export function evaluatePromotion({
  promotion,
  eligibleSubtotal,
  now = new Date(),
  paidBookingCount = 0,
  enteredCode = null,
  assignedPromotionIds = [],
  usageCountsByPromotionId = {},
  dubaiBusinessDate = getDubaiBusinessDate(now),
}) {
  if (!promotion || !PROMOTION_KINDS.has(promotion.kind)) {
    return buildEvaluation(promotion, {
      reason: "UNSUPPORTED_PROMOTION_KIND",
    });
  }

  if (!TRIGGER_TYPES.has(promotion.triggerType)) {
    return buildEvaluation(promotion, {
      reason: "UNSUPPORTED_TRIGGER_TYPE",
    });
  }

  const assignmentSet = normalizeAssignmentSet(assignedPromotionIds);
  const usageCounts = getUsageCounts(usageCountsByPromotionId, promotion.id);
  const totalActiveCount = normalizeCount(usageCounts.totalActiveCount);
  const userActiveCount = normalizeCount(usageCounts.userActiveCount);
  const evaluation = buildEvaluation(promotion, {
    totalActiveCount,
    userActiveCount,
  });
  const normalizedSubtotal = Number(eligibleSubtotal || 0);
  const normalizedCode = String(enteredCode || "")
    .trim()
    .toUpperCase();

  if (promotion.status !== ACTIVE_PROMOTION_STATUS) {
    return {
      ...evaluation,
      reason: "PROMOTION_NOT_ACTIVE",
    };
  }

  if (promotion.startsAt && new Date(promotion.startsAt) > now) {
    return {
      ...evaluation,
      reason: "PROMOTION_NOT_STARTED",
    };
  }

  if (promotion.endsAt && new Date(promotion.endsAt) < now) {
    return {
      ...evaluation,
      reason: "PROMOTION_ENDED",
    };
  }

  if (normalizedSubtotal < Number(promotion.minimumSpend || 0)) {
    return {
      ...evaluation,
      reason: "MINIMUM_SPEND_NOT_MET",
    };
  }

  if (
    promotion.totalLimit != null &&
    totalActiveCount >= Number(promotion.totalLimit)
  ) {
    return {
      ...evaluation,
      reason: "TOTAL_LIMIT_REACHED",
    };
  }

  if (
    promotion.perUserLimit != null &&
    userActiveCount >= Number(promotion.perUserLimit)
  ) {
    return {
      ...evaluation,
      reason: "PER_USER_LIMIT_REACHED",
    };
  }

  if (
    promotion.kind === "PERSONAL" &&
    !assignmentSet.has(Number(promotion.id))
  ) {
    return {
      ...evaluation,
      reason: "PERSONAL_PROMOTION_NOT_ASSIGNED",
    };
  }

  if (promotion.kind === "GENERIC") {
    if (!normalizedCode) {
      return {
        ...evaluation,
        reason: "GENERIC_CODE_NOT_REQUESTED",
      };
    }

    if (
      String(promotion.code || "")
        .trim()
        .toUpperCase() !== normalizedCode
    ) {
      return {
        ...evaluation,
        reason: "GENERIC_CODE_MISMATCH",
      };
    }
  }

  if (promotion.triggerType === "FIRST_PAID_BOOKING") {
    if (normalizeCount(paidBookingCount) !== 0) {
      return {
        ...evaluation,
        reason: "FIRST_BOOKING_ONLY",
      };
    }
  }

  if (promotion.triggerType === "SECOND_PAID_BOOKING") {
    if (normalizeCount(paidBookingCount) !== 1) {
      return {
        ...evaluation,
        reason: "SECOND_BOOKING_ONLY",
      };
    }
  }

  if (promotion.triggerType === "DATE_RANGE") {
    const startDate = getConfiguredDate(promotion.triggerConfig, [
      "startDate",
      "startBusinessDate",
    ]);
    const endDate = getConfiguredDate(promotion.triggerConfig, [
      "endDate",
      "endBusinessDate",
    ]);
    const includeStart = getConfiguredBoolean(
      promotion.triggerConfig,
      ["includeStart", "inclusiveStart"],
      true,
    );
    const includeEnd = getConfiguredBoolean(
      promotion.triggerConfig,
      ["includeEnd", "inclusiveEnd"],
      true,
    );

    if (startDate) {
      const startsAfterBusinessDate = includeStart
        ? compareIsoDates(dubaiBusinessDate, startDate) < 0
        : compareIsoDates(dubaiBusinessDate, startDate) <= 0;

      if (startsAfterBusinessDate) {
        return {
          ...evaluation,
          reason: "DATE_RANGE_NOT_STARTED",
          triggerSnapshot: {
            triggerType: promotion.triggerType,
            triggerConfig: promotion.triggerConfig || {},
            businessDate: dubaiBusinessDate,
          },
        };
      }
    }

    if (endDate) {
      const endedBeforeBusinessDate = includeEnd
        ? compareIsoDates(dubaiBusinessDate, endDate) > 0
        : compareIsoDates(dubaiBusinessDate, endDate) >= 0;

      if (endedBeforeBusinessDate) {
        return {
          ...evaluation,
          reason: "DATE_RANGE_ENDED",
          triggerSnapshot: {
            triggerType: promotion.triggerType,
            triggerConfig: promotion.triggerConfig || {},
            businessDate: dubaiBusinessDate,
          },
        };
      }
    }
  }

  const benefitAmount = calculatePromotionBenefit(
    promotion,
    normalizedSubtotal,
  );

  if (benefitAmount <= 0) {
    return {
      ...evaluation,
      reason: "NO_DISCOUNT_VALUE",
    };
  }

  return {
    ...evaluation,
    eligible: true,
    benefitAmount,
    triggerSnapshot: {
      triggerType: promotion.triggerType,
      triggerConfig: promotion.triggerConfig || {},
      ...(promotion.triggerType === "DATE_RANGE"
        ? { businessDate: dubaiBusinessDate }
        : {}),
      ...(promotion.triggerType === "FIRST_PAID_BOOKING" ||
      promotion.triggerType === "SECOND_PAID_BOOKING"
        ? { paidBookingCount: normalizeCount(paidBookingCount) }
        : {}),
    },
  };
}

const compareCandidateWithinKind = (left, right) => {
  const benefitDelta = right.benefitAmount - left.benefitAmount;
  if (benefitDelta !== 0) return benefitDelta;

  const priorityDelta = right.priority - left.priority;
  if (priorityDelta !== 0) return priorityDelta;

  return (
    (left.promotionId ?? Number.MAX_SAFE_INTEGER) -
    (right.promotionId ?? Number.MAX_SAFE_INTEGER)
  );
};

const pickBestEligibleCandidate = (evaluations) =>
  evaluations
    .filter((evaluation) => evaluation.eligible)
    .sort(compareCandidateWithinKind)[0] || null;

export function selectPromotionForCheckout({
  promotions = [],
  eligibleSubtotal,
  now = new Date(),
  paidBookingCount = 0,
  enteredCode = null,
  assignedPromotionIds = [],
  usageCountsByPromotionId = {},
  dubaiBusinessDate = getDubaiBusinessDate(now),
}) {
  const evaluations = promotions.map((promotion) =>
    evaluatePromotion({
      promotion,
      eligibleSubtotal,
      now,
      paidBookingCount,
      enteredCode,
      assignedPromotionIds,
      usageCountsByPromotionId,
      dubaiBusinessDate,
    }),
  );

  const automaticCandidate = pickBestEligibleCandidate(
    evaluations.filter((evaluation) => evaluation.kind === "AUTOMATIC"),
  );
  const personalCandidate = pickBestEligibleCandidate(
    evaluations.filter((evaluation) => evaluation.kind === "PERSONAL"),
  );

  let genericCandidate = pickBestEligibleCandidate(
    evaluations.filter((evaluation) => evaluation.kind === "GENERIC"),
  );

  if (enteredCode && !genericCandidate) {
    const matchingGenericPromotion = promotions.find(
      (promotion) =>
        promotion?.kind === "GENERIC" &&
        String(promotion.code || "")
          .trim()
          .toUpperCase() === String(enteredCode).trim().toUpperCase(),
    );

    if (matchingGenericPromotion) {
      genericCandidate =
        evaluations.find(
          (evaluation) =>
            evaluation.promotionId === matchingGenericPromotion.id,
        ) || null;
    } else {
      genericCandidate = {
        promotionId: null,
        kind: "GENERIC",
        code: String(enteredCode).trim().toUpperCase(),
        name: null,
        priority: 0,
        status: null,
        benefitType: null,
        benefitAmount: 0,
        eligible: false,
        reason: "GENERIC_CODE_NOT_FOUND",
        triggerType: "NONE",
        triggerSnapshot: {
          triggerType: "NONE",
          triggerConfig: {},
        },
        totalActiveCount: 0,
        userActiveCount: 0,
      };
    }
  }

  let selectedPromotion = automaticCandidate;

  if (personalCandidate) {
    selectedPromotion = personalCandidate;
  }

  if (!selectedPromotion && genericCandidate?.eligible) {
    selectedPromotion = genericCandidate;
  } else if (
    selectedPromotion &&
    genericCandidate?.eligible &&
    genericCandidate.benefitAmount > selectedPromotion.benefitAmount
  ) {
    selectedPromotion = genericCandidate;
  }

  return {
    evaluations,
    automaticCandidate,
    personalCandidate,
    genericCandidate,
    selectedPromotion,
  };
}
