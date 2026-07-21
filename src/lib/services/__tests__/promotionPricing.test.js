import { evaluateCheckoutPromotionPricing } from "../promotionPricing";

jest.mock("@/lib/db/models/booking", () => ({
  count: jest.fn(),
}));

jest.mock("@/lib/db/models/transaction", () => ({}));

jest.mock("@/lib/db/models", () => ({
  Promotion: {
    findAll: jest.fn(),
    findOne: jest.fn(),
  },
  PromotionAssignment: {
    findAll: jest.fn(),
  },
}));

jest.mock("../promotionRedemptions", () => ({
  getActivePromotionRedemptionCounts: jest.fn(),
}));

describe("promotionPricing service", () => {
  const Booking = require("@/lib/db/models/booking");
  const models = require("@/lib/db/models");
  const {
    getActivePromotionRedemptionCounts,
  } = require("../promotionRedemptions");

  const buildPromotion = (overrides = {}) => ({
    id: 1,
    kind: "AUTOMATIC",
    code: null,
    name: "Automatic promotion",
    customerMessage: null,
    priority: 0,
    status: "ACTIVE",
    benefitType: "PERCENTAGE",
    benefitValue: 10,
    benefitCap: null,
    minimumSpend: 0,
    startsAt: null,
    endsAt: null,
    perUserLimit: null,
    totalLimit: null,
    triggerType: "ANY_PAID_BOOKING",
    triggerConfig: {},
    legacySourceType: null,
    legacySourceId: null,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    models.Promotion.findAll.mockResolvedValue([]);
    models.Promotion.findOne.mockResolvedValue(null);
    models.PromotionAssignment.findAll.mockResolvedValue([]);
    Booking.count.mockResolvedValue(0);
    getActivePromotionRedemptionCounts.mockResolvedValue({
      totalActiveCount: 0,
      userActiveCount: 0,
    });
  });

  it("keeps the better automatic promotion when a generic code is weaker", async () => {
    models.Promotion.findAll.mockResolvedValue([
      buildPromotion({
        id: 11,
        name: "Launch credit",
        benefitValue: 20,
      }),
    ]);
    models.Promotion.findOne.mockResolvedValue(
      buildPromotion({
        id: 22,
        kind: "GENERIC",
        code: "SAVE10",
        name: "SAVE10",
        benefitValue: 10,
        triggerType: "NONE",
      }),
    );

    const result = await evaluateCheckoutPromotionPricing({
      userId: 7,
      eligibleSubtotal: 1000,
      enteredCode: "save10",
    });

    expect(result.selectedPromotion).toEqual(
      expect.objectContaining({
        promotionId: 11,
        kind: "AUTOMATIC",
        benefitAmount: 200,
      }),
    );
    expect(result.codeValidation).toEqual({
      status: "SUPERSEDED",
      message: "A better promotion is already applied to this booking.",
    });
  });

  it("applies a stronger generic code and returns its customer-facing message", async () => {
    models.Promotion.findAll.mockResolvedValue([
      buildPromotion({
        id: 11,
        name: "Launch credit",
        benefitValue: 10,
      }),
    ]);
    models.Promotion.findOne.mockResolvedValue(
      buildPromotion({
        id: 22,
        kind: "GENERIC",
        code: "SAVE20",
        name: "SAVE20",
        customerMessage: "SAVE20 applied successfully",
        benefitValue: 20,
        triggerType: "NONE",
      }),
    );

    const result = await evaluateCheckoutPromotionPricing({
      userId: 7,
      eligibleSubtotal: 1000,
      enteredCode: "SAVE20",
    });

    expect(result.selectedPromotion).toEqual(
      expect.objectContaining({
        promotionId: 22,
        kind: "GENERIC",
        code: "SAVE20",
        benefitAmount: 200,
      }),
    );
    expect(result.codeValidation).toEqual({
      status: "APPLIED",
      message: "SAVE20 applied successfully",
    });
  });

  it("returns an invalid-code response without exposing assignment details", async () => {
    models.Promotion.findAll.mockResolvedValue([
      buildPromotion({
        id: 11,
        name: "Launch credit",
        benefitValue: 15,
      }),
    ]);

    const result = await evaluateCheckoutPromotionPricing({
      userId: 7,
      eligibleSubtotal: 1000,
      enteredCode: "MISSING",
    });

    expect(result.selectedPromotion).toEqual(
      expect.objectContaining({
        promotionId: 11,
        kind: "AUTOMATIC",
        benefitAmount: 150,
      }),
    );
    expect(result.codeValidation).toEqual({
      status: "INVALID",
      message: "Invalid promo code",
    });
  });

  it("selects an assigned personal promotion ahead of an eligible automatic promotion", async () => {
    models.Promotion.findAll.mockResolvedValue([
      buildPromotion({ id: 11, benefitValue: 20 }),
      buildPromotion({
        id: 33,
        kind: "PERSONAL",
        name: "Synthetic partner benefit",
        benefitValue: 15,
        triggerType: "NONE",
      }),
    ]);
    models.PromotionAssignment.findAll.mockResolvedValue([{ promotionId: 33 }]);

    const result = await evaluateCheckoutPromotionPricing({
      userId: 7,
      eligibleSubtotal: 1000,
    });

    expect(result.selectedPromotion).toEqual(
      expect.objectContaining({
        promotionId: 33,
        kind: "PERSONAL",
        benefitAmount: 150,
      }),
    );
  });

  it.each([
    [
      "inactive",
      { status: "PAUSED" },
      { status: "INACTIVE", message: "Promo code is inactive or expired" },
    ],
    [
      "below minimum spend",
      { minimumSpend: 1200 },
      {
        status: "MINIMUM_SPEND_NOT_MET",
        message: "Minimum spend of AED 1200 required",
      },
    ],
  ])(
    "returns normal code feedback when a generic code is %s",
    async (_, overrides, expected) => {
      models.Promotion.findOne.mockResolvedValue(
        buildPromotion({
          id: 22,
          kind: "GENERIC",
          code: "SAVE20",
          name: "SAVE20",
          benefitValue: 20,
          triggerType: "NONE",
          ...overrides,
        }),
      );

      const result = await evaluateCheckoutPromotionPricing({
        userId: 7,
        eligibleSubtotal: 1000,
        enteredCode: "SAVE20",
      });

      expect(result.selectedPromotion).toBeNull();
      expect(result.codeValidation).toEqual(expected);
    },
  );
});
