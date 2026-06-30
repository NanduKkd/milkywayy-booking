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
});
