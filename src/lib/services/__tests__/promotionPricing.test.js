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
});
