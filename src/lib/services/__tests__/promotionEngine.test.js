import {
  calculatePromotionBenefit,
  evaluatePromotion,
  getDubaiBusinessDate,
  selectPromotionForCheckout,
} from "../promotionEngine";

const buildPromotion = (overrides = {}) => ({
  id: 1,
  kind: "AUTOMATIC",
  code: null,
  name: "Promotion",
  status: "ACTIVE",
  benefitType: "FIXED",
  benefitValue: 100,
  benefitCap: null,
  minimumSpend: 0,
  startsAt: null,
  endsAt: null,
  priority: 0,
  perUserLimit: null,
  totalLimit: null,
  triggerType: "ANY_PAID_BOOKING",
  triggerConfig: {},
  ...overrides,
});

describe("promotionEngine service", () => {
  it("calculates capped percentage benefits on the same eligible subtotal", () => {
    const amount = calculatePromotionBenefit(
      buildPromotion({
        benefitType: "PERCENTAGE",
        benefitValue: 25,
        benefitCap: 180,
      }),
      900,
    );

    expect(amount).toBe(180);
  });

  it("uses priority and id as deterministic tiebreakers within one kind", () => {
    const result = selectPromotionForCheckout({
      eligibleSubtotal: 800,
      promotions: [
        buildPromotion({
          id: 8,
          name: "Lower priority",
          benefitValue: 150,
          priority: 1,
        }),
        buildPromotion({
          id: 4,
          name: "Higher priority",
          benefitValue: 150,
          priority: 3,
        }),
        buildPromotion({
          id: 2,
          name: "Same priority lower id",
          benefitValue: 150,
          priority: 3,
        }),
      ],
    });

    expect(result.automaticCandidate?.promotionId).toBe(2);
    expect(result.selectedPromotion?.promotionId).toBe(2);
  });

  it("lets a personal promotion replace a better automatic promotion", () => {
    const result = selectPromotionForCheckout({
      eligibleSubtotal: 1000,
      assignedPromotionIds: [20],
      promotions: [
        buildPromotion({
          id: 10,
          name: "Automatic winner",
          benefitValue: 200,
        }),
        buildPromotion({
          id: 20,
          kind: "PERSONAL",
          name: "Assigned VIP offer",
          benefitValue: 120,
          triggerType: "NONE",
        }),
      ],
    });

    expect(result.automaticCandidate?.promotionId).toBe(10);
    expect(result.personalCandidate?.promotionId).toBe(20);
    expect(result.selectedPromotion?.promotionId).toBe(20);
  });

  it("lets a generic code replace the selected candidate only when strictly better", () => {
    const result = selectPromotionForCheckout({
      eligibleSubtotal: 1000,
      assignedPromotionIds: [20],
      enteredCode: "SAVE20",
      promotions: [
        buildPromotion({
          id: 10,
          name: "Automatic winner",
          benefitValue: 250,
        }),
        buildPromotion({
          id: 20,
          kind: "PERSONAL",
          name: "Assigned VIP offer",
          benefitValue: 100,
          triggerType: "NONE",
        }),
        buildPromotion({
          id: 30,
          kind: "GENERIC",
          code: "SAVE20",
          name: "Coupon",
          benefitType: "PERCENTAGE",
          benefitValue: 15,
          benefitCap: 180,
          triggerType: "NONE",
        }),
      ],
    });

    expect(result.personalCandidate?.promotionId).toBe(20);
    expect(result.genericCandidate?.promotionId).toBe(30);
    expect(result.genericCandidate?.benefitAmount).toBe(150);
    expect(result.selectedPromotion?.promotionId).toBe(30);
  });

  it("keeps the earlier selected promotion on generic benefit ties", () => {
    const result = selectPromotionForCheckout({
      eligibleSubtotal: 1000,
      enteredCode: "SAVE10",
      assignedPromotionIds: [22],
      promotions: [
        buildPromotion({
          id: 22,
          kind: "PERSONAL",
          name: "Assigned offer",
          benefitValue: 100,
          triggerType: "NONE",
        }),
        buildPromotion({
          id: 31,
          kind: "GENERIC",
          code: "SAVE10",
          name: "Coupon tie",
          benefitValue: 100,
          triggerType: "NONE",
        }),
      ],
    });

    expect(result.selectedPromotion?.promotionId).toBe(22);
  });

  it("captures a missing generic code as a deterministic ineligible result", () => {
    const result = selectPromotionForCheckout({
      eligibleSubtotal: 900,
      enteredCode: "NOPE",
      promotions: [buildPromotion({ id: 40, kind: "GENERIC", code: "REAL" })],
    });

    expect(result.genericCandidate).toEqual(
      expect.objectContaining({
        eligible: false,
        reason: "GENERIC_CODE_NOT_FOUND",
        code: "NOPE",
      }),
    );
    expect(result.selectedPromotion).toBeNull();
  });

  it("uses Dubai business dates for date-range triggers", () => {
    const businessDate = getDubaiBusinessDate(
      new Date("2026-07-01T22:30:00.000Z"),
    );
    const evaluation = evaluatePromotion({
      eligibleSubtotal: 800,
      now: new Date("2026-07-01T22:30:00.000Z"),
      promotion: buildPromotion({
        id: 50,
        triggerType: "DATE_RANGE",
        triggerConfig: {
          startDate: "2026-07-02",
          endDate: "2026-07-02",
        },
      }),
    });

    expect(businessDate).toBe("2026-07-02");
    expect(evaluation.eligible).toBe(true);
    expect(evaluation.triggerSnapshot).toEqual(
      expect.objectContaining({
        businessDate: "2026-07-02",
      }),
    );
  });

  it("enforces first and second paid booking triggers from the supplied count", () => {
    const firstBookingEvaluation = evaluatePromotion({
      eligibleSubtotal: 700,
      paidBookingCount: 0,
      promotion: buildPromotion({
        id: 60,
        triggerType: "FIRST_PAID_BOOKING",
      }),
    });
    const secondBookingEvaluation = evaluatePromotion({
      eligibleSubtotal: 700,
      paidBookingCount: 1,
      promotion: buildPromotion({
        id: 61,
        triggerType: "SECOND_PAID_BOOKING",
      }),
    });
    const blockedFirstBookingEvaluation = evaluatePromotion({
      eligibleSubtotal: 700,
      paidBookingCount: 2,
      promotion: buildPromotion({
        id: 62,
        triggerType: "FIRST_PAID_BOOKING",
      }),
    });

    expect(firstBookingEvaluation.eligible).toBe(true);
    expect(secondBookingEvaluation.eligible).toBe(true);
    expect(blockedFirstBookingEvaluation).toEqual(
      expect.objectContaining({
        eligible: false,
        reason: "FIRST_BOOKING_ONLY",
      }),
    );
  });

  it("blocks personal promotions without assignment and exhausted limits", () => {
    const personalEvaluation = evaluatePromotion({
      eligibleSubtotal: 700,
      promotion: buildPromotion({
        id: 70,
        kind: "PERSONAL",
        triggerType: "NONE",
      }),
    });
    const limitedEvaluation = evaluatePromotion({
      eligibleSubtotal: 700,
      assignedPromotionIds: [71],
      usageCountsByPromotionId: {
        71: {
          totalActiveCount: 3,
          userActiveCount: 1,
        },
      },
      promotion: buildPromotion({
        id: 71,
        kind: "PERSONAL",
        triggerType: "NONE",
        totalLimit: 3,
        perUserLimit: 2,
      }),
    });

    expect(personalEvaluation).toEqual(
      expect.objectContaining({
        eligible: false,
        reason: "PERSONAL_PROMOTION_NOT_ASSIGNED",
      }),
    );
    expect(limitedEvaluation).toEqual(
      expect.objectContaining({
        eligible: false,
        reason: "TOTAL_LIMIT_REACHED",
      }),
    );
  });

  it.each([
    {
      name: "future promotions before their start timestamp",
      promotion: buildPromotion({
        id: 80,
        startsAt: "2026-07-03T00:00:00.000Z",
      }),
      now: new Date("2026-07-02T12:00:00.000Z"),
      reason: "PROMOTION_NOT_STARTED",
    },
    {
      name: "expired promotions after their end timestamp",
      promotion: buildPromotion({
        id: 81,
        endsAt: "2026-07-01T23:59:59.000Z",
      }),
      now: new Date("2026-07-02T00:00:00.000Z"),
      reason: "PROMOTION_ENDED",
    },
    {
      name: "amount thresholds below the configured minimum spend",
      promotion: buildPromotion({
        id: 82,
        minimumSpend: 900,
      }),
      eligibleSubtotal: 899,
      reason: "MINIMUM_SPEND_NOT_MET",
    },
    {
      name: "customer-targeted personal promotions without assignment",
      promotion: buildPromotion({
        id: 83,
        kind: "PERSONAL",
        triggerType: "NONE",
      }),
      reason: "PERSONAL_PROMOTION_NOT_ASSIGNED",
    },
    {
      name: "generic codes that do not match the requested code",
      promotion: buildPromotion({
        id: 84,
        kind: "GENERIC",
        code: "SAVE20",
        triggerType: "NONE",
      }),
      enteredCode: "SAVE10",
      reason: "GENERIC_CODE_MISMATCH",
    },
    {
      name: "date-range promotions before the Dubai business-date window",
      promotion: buildPromotion({
        id: 85,
        triggerType: "DATE_RANGE",
        triggerConfig: {
          startDate: "2026-07-02",
        },
      }),
      now: new Date("2026-07-01T12:00:00.000Z"),
      reason: "DATE_RANGE_NOT_STARTED",
    },
    {
      name: "date-range promotions after an exclusive Dubai business-date end",
      promotion: buildPromotion({
        id: 86,
        triggerType: "DATE_RANGE",
        triggerConfig: {
          endDate: "2026-07-02",
          includeEnd: false,
        },
      }),
      now: new Date("2026-07-01T22:30:00.000Z"),
      reason: "DATE_RANGE_ENDED",
    },
  ])(
    "returns a deterministic ineligible reason for $name",
    ({
      promotion,
      eligibleSubtotal = 700,
      now = new Date("2026-07-01T12:00:00.000Z"),
      enteredCode = null,
      assignedPromotionIds = [],
      reason,
    }) => {
      const evaluation = evaluatePromotion({
        promotion,
        eligibleSubtotal,
        now,
        enteredCode,
        assignedPromotionIds,
      });

      expect(evaluation).toEqual(
        expect.objectContaining({
          eligible: false,
          reason,
        }),
      );
    },
  );

  it.each([
    {
      name: "customer-assigned personal promotions",
      promotion: buildPromotion({
        id: 90,
        kind: "PERSONAL",
        triggerType: "NONE",
      }),
      assignedPromotionIds: [90],
      expectedTriggerSnapshot: {
        triggerType: "NONE",
        triggerConfig: {},
      },
    },
    {
      name: "generic code matches",
      promotion: buildPromotion({
        id: 91,
        kind: "GENERIC",
        code: "SAVE20",
        triggerType: "NONE",
        benefitValue: 20,
        benefitType: "PERCENTAGE",
      }),
      eligibleSubtotal: 1000,
      enteredCode: "save20",
      expectedBenefitAmount: 200,
      expectedTriggerSnapshot: {
        triggerType: "NONE",
        triggerConfig: {},
      },
    },
    {
      name: "second paid-booking automatic triggers",
      promotion: buildPromotion({
        id: 92,
        triggerType: "SECOND_PAID_BOOKING",
      }),
      paidBookingCount: 1,
      expectedTriggerSnapshot: {
        triggerType: "SECOND_PAID_BOOKING",
        triggerConfig: {},
        paidBookingCount: 1,
      },
    },
    {
      name: "date-range windows on the inclusive Dubai boundary",
      promotion: buildPromotion({
        id: 93,
        triggerType: "DATE_RANGE",
        triggerConfig: {
          startDate: "2026-07-02",
          endDate: "2026-07-02",
        },
      }),
      now: new Date("2026-07-01T22:30:00.000Z"),
      expectedTriggerSnapshot: {
        triggerType: "DATE_RANGE",
        triggerConfig: {
          startDate: "2026-07-02",
          endDate: "2026-07-02",
        },
        businessDate: "2026-07-02",
      },
    },
  ])(
    "marks $name as eligible when every gating condition is met",
    ({
      promotion,
      eligibleSubtotal = 700,
      now = new Date("2026-07-01T12:00:00.000Z"),
      enteredCode = null,
      assignedPromotionIds = [],
      paidBookingCount = 0,
      expectedBenefitAmount = 100,
      expectedTriggerSnapshot,
    }) => {
      const evaluation = evaluatePromotion({
        promotion,
        eligibleSubtotal,
        now,
        enteredCode,
        assignedPromotionIds,
        paidBookingCount,
      });

      expect(evaluation).toEqual(
        expect.objectContaining({
          eligible: true,
          benefitAmount: expectedBenefitAmount,
          triggerSnapshot: expectedTriggerSnapshot,
        }),
      );
    },
  );
});
