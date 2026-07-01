import {
  getLaunchPromoDiscount,
  LAUNCH_PROMO_BASE_DISCOUNT,
  LAUNCH_PROMO_BONUS_THRESHOLD,
  LAUNCH_PROMO_CODE,
  LAUNCH_PROMO_LABEL,
} from "@/lib/config/promo";
import { calculateWalletCreditPreview } from "@/lib/helpers/promotionPricing";
import { selectPromotionForCheckout } from "../promotionEngine";

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
  legacySourceType: null,
  legacySourceId: null,
  ...overrides,
});

const buildWalletRule = (overrides = {}) => ({
  id: "wallet-rule",
  name: "Wallet rule",
  type: "wallet",
  minAmount: 0,
  percentage: 10,
  maxDiscount: 100,
  expiryDays: 0,
  isActive: true,
  ...overrides,
});

const buildLaunchTierPromotions = () => [
  buildPromotion({
    id: 201,
    kind: "AUTOMATIC",
    name: LAUNCH_PROMO_LABEL,
    benefitType: "FIXED",
    benefitValue: LAUNCH_PROMO_BASE_DISCOUNT,
    minimumSpend: 449,
    triggerType: "FIRST_PAID_BOOKING",
    legacySourceType: "system_coupon",
    legacySourceId: `${LAUNCH_PROMO_CODE}:base`,
  }),
  buildPromotion({
    id: 202,
    kind: "AUTOMATIC",
    name: LAUNCH_PROMO_LABEL,
    benefitType: "FIXED",
    benefitValue: 500,
    minimumSpend: LAUNCH_PROMO_BONUS_THRESHOLD,
    triggerType: "FIRST_PAID_BOOKING",
    priority: 1,
    legacySourceType: "system_coupon",
    legacySourceId: `${LAUNCH_PROMO_CODE}:bonus`,
  }),
];

function calculateLegacyCouponDiscount(coupon, subtotal) {
  if (!coupon?.isActive || subtotal < Number(coupon.minimumAmount || 0)) {
    return 0;
  }

  return Math.min(
    (subtotal * Number(coupon.percentDiscount || 0)) / 100,
    Number(coupon.maxDiscount || 0),
  );
}

function calculateLegacyLaunchDiscount(subtotal, paidBookingCount) {
  if (Number(paidBookingCount || 0) !== 0) {
    return 0;
  }

  return getLaunchPromoDiscount(subtotal);
}

function calculateLegacyDirectDiscountTotal(discounts, subtotal) {
  let currentAmount = Number(subtotal || 0);
  let totalDiscount = 0;

  discounts.forEach((discount) => {
    if (!discount?.isActive || discount.type !== "direct") {
      return;
    }

    if (currentAmount < Number(discount.minAmount || 0)) {
      return;
    }

    const appliedDiscount = Math.min(
      (currentAmount * Number(discount.percentage || 0)) / 100,
      Number(discount.maxDiscount || 0),
    );

    if (!Number.isFinite(appliedDiscount) || appliedDiscount <= 0) {
      return;
    }

    totalDiscount += appliedDiscount;
    currentAmount -= appliedDiscount;
  });

  totalDiscount = Number(totalDiscount.toFixed(2));
  currentAmount = Number(currentAmount.toFixed(2));

  return {
    totalDiscount,
    finalAmount: currentAmount,
  };
}

describe("promotion migration parity fixtures", () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-07-01T00:00:00.000Z"));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it("preserves generic coupon benefit caps and minimum spend after migration", () => {
    const coupon = {
      code: "SAVE20",
      minimumAmount: 500,
      percentDiscount: 20,
      maxDiscount: 180,
      isActive: true,
    };
    const promotions = [
      buildPromotion({
        id: 101,
        kind: "GENERIC",
        code: coupon.code,
        name: coupon.code,
        benefitType: "PERCENTAGE",
        benefitValue: coupon.percentDiscount,
        benefitCap: coupon.maxDiscount,
        minimumSpend: coupon.minimumAmount,
        triggerType: "NONE",
        legacySourceType: "coupon",
        legacySourceId: "save20",
      }),
    ];

    const legacyDiscount = calculateLegacyCouponDiscount(coupon, 900);
    const result = selectPromotionForCheckout({
      promotions,
      eligibleSubtotal: 900,
      enteredCode: coupon.code,
      paidBookingCount: 2,
    });

    expect(legacyDiscount).toBe(180);
    expect(result.selectedPromotion).toEqual(
      expect.objectContaining({
        promotionId: 101,
        kind: "GENERIC",
        code: "SAVE20",
        benefitAmount: 180,
      }),
    );
  });

  it("preserves the lower launch-credit tier on a first paid booking", () => {
    const legacyDiscount = calculateLegacyLaunchDiscount(700, 0);
    const result = selectPromotionForCheckout({
      promotions: buildLaunchTierPromotions(),
      eligibleSubtotal: 700,
      paidBookingCount: 0,
    });

    expect(legacyDiscount).toBe(250);
    expect(result.selectedPromotion).toEqual(
      expect.objectContaining({
        promotionId: 201,
        kind: "AUTOMATIC",
        name: LAUNCH_PROMO_LABEL,
        benefitAmount: 250,
      }),
    );
  });

  it("preserves the higher launch-credit tier once the subtotal reaches AED 1000", () => {
    const legacyDiscount = calculateLegacyLaunchDiscount(1050, 0);
    const result = selectPromotionForCheckout({
      promotions: buildLaunchTierPromotions(),
      eligibleSubtotal: 1050,
      paidBookingCount: 0,
    });

    expect(legacyDiscount).toBe(500);
    expect(result.selectedPromotion).toEqual(
      expect.objectContaining({
        promotionId: 202,
        kind: "AUTOMATIC",
        name: LAUNCH_PROMO_LABEL,
        benefitAmount: 500,
      }),
    );
  });

  it("preserves launch-credit exhaustion after the first successful paid booking", () => {
    const legacyDiscount = calculateLegacyLaunchDiscount(700, 1);
    const result = selectPromotionForCheckout({
      promotions: buildLaunchTierPromotions(),
      eligibleSubtotal: 700,
      paidBookingCount: 1,
    });

    expect(legacyDiscount).toBe(0);
    expect(result.selectedPromotion).toBeNull();
  });

  it("keeps wallet rewards separate while preserving launch-credit selection", () => {
    const walletRules = [
      buildWalletRule({
        id: "wallet-base",
        minAmount: 500,
        percentage: 10,
        maxDiscount: 100,
        expiryDays: 7,
      }),
      buildWalletRule({
        id: "wallet-bonus",
        minAmount: 1000,
        percentage: 5,
        maxDiscount: 90,
        expiryDays: 30,
      }),
    ];

    const promotionResult = selectPromotionForCheckout({
      promotions: buildLaunchTierPromotions(),
      eligibleSubtotal: 1200,
      paidBookingCount: 0,
    });
    const walletPreview = calculateWalletCreditPreview(walletRules, 1200);

    expect(promotionResult.selectedPromotion).toEqual(
      expect.objectContaining({
        promotionId: 202,
        benefitAmount: 500,
      }),
    );
    expect(walletPreview.amount).toBe(160);
    expect(
      walletPreview.appliedDiscounts.map((discount) => discount.id),
    ).toEqual(["wallet-base", "wallet-bonus"]);
    expect(walletPreview.creditExpiresAt?.toISOString()).toBe(
      "2026-07-31T00:00:00.000Z",
    );
  });

  it("records the intentional cutover from sequential direct stacking to one best promotion", () => {
    const legacyDiscounts = [
      {
        id: "direct-10",
        type: "direct",
        minAmount: 500,
        percentage: 10,
        maxDiscount: 100,
        isActive: true,
      },
      {
        id: "direct-20",
        type: "direct",
        minAmount: 500,
        percentage: 20,
        maxDiscount: 150,
        isActive: true,
      },
    ];
    const promotions = [
      buildPromotion({
        id: 301,
        kind: "AUTOMATIC",
        name: "10% capped direct rule",
        benefitType: "PERCENTAGE",
        benefitValue: 10,
        benefitCap: 100,
        minimumSpend: 500,
        triggerType: "ANY_PAID_BOOKING",
        legacySourceType: "discount_config",
        legacySourceId: "direct-10",
      }),
      buildPromotion({
        id: 302,
        kind: "AUTOMATIC",
        name: "20% capped direct rule",
        benefitType: "PERCENTAGE",
        benefitValue: 20,
        benefitCap: 150,
        minimumSpend: 500,
        triggerType: "ANY_PAID_BOOKING",
        legacySourceType: "discount_config",
        legacySourceId: "direct-20",
      }),
    ];

    const legacyOutcome = calculateLegacyDirectDiscountTotal(
      legacyDiscounts,
      1000,
    );
    const result = selectPromotionForCheckout({
      promotions,
      eligibleSubtotal: 1000,
      paidBookingCount: 3,
    });

    expect(legacyOutcome).toEqual({
      totalDiscount: 250,
      finalAmount: 750,
    });
    expect(result.selectedPromotion).toEqual(
      expect.objectContaining({
        promotionId: 302,
        kind: "AUTOMATIC",
        benefitAmount: 150,
      }),
    );
  });
});
