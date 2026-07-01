import {
  buildTransactionPaymentSummary,
  buildTransactionPromotionSummary,
  getTransactionGrossAmount,
} from "@/lib/helpers/transactionPricing";

describe("buildTransactionPromotionSummary", () => {
  it("uses the promotion code when one is present", () => {
    expect(
      buildTransactionPromotionSummary({
        promotionSnapshot: {
          id: 7,
          kind: "GENERIC",
          code: "save10",
          name: "Summer Savings",
          benefitAmount: 125,
        },
      }),
    ).toEqual({
      promotionId: 7,
      kind: "GENERIC",
      code: "SAVE10",
      name: "Summer Savings",
      label: "Promo Code (SAVE10)",
      amount: 125,
    });
  });

  it("falls back to the promotion name for automatic or personal offers", () => {
    expect(
      buildTransactionPromotionSummary({
        promotionSnapshot: {
          id: 21,
          kind: "AUTOMATIC",
          name: "First-Shoot Launch Credit",
          benefitAmount: 500,
        },
      }),
    ).toEqual({
      promotionId: 21,
      kind: "AUTOMATIC",
      code: null,
      name: "First-Shoot Launch Credit",
      label: "Promotion (First-Shoot Launch Credit)",
      amount: 500,
    });
  });

  it("returns null when no promotion benefit was stored", () => {
    expect(
      buildTransactionPromotionSummary({
        promotionSnapshot: {
          id: 21,
          benefitAmount: 0,
        },
      }),
    ).toBeNull();
  });
});

describe("getTransactionGrossAmount", () => {
  it("reconstructs the pre-discount subtotal for promotion-backed checkouts", () => {
    expect(
      getTransactionGrossAmount({
        amount: 550,
        couponDeduction: 0,
        bulkDeduction: 0,
        promotionSnapshot: {
          id: 21,
          name: "First-Shoot Launch Credit",
          benefitAmount: 500,
        },
      }),
    ).toBe(1050);
  });
});

describe("buildTransactionPaymentSummary", () => {
  it("prefers summed booking amounts for the displayed subtotal", () => {
    expect(
      buildTransactionPaymentSummary(
        {
          amount: 550,
          promotionSnapshot: {
            id: 21,
            name: "First-Shoot Launch Credit",
            benefitAmount: 500,
          },
        },
        [{ amount: 400 }, { amount: 650 }],
      ),
    ).toEqual({
      subtotal: 1050,
      promotion: {
        promotionId: 21,
        kind: null,
        code: null,
        name: "First-Shoot Launch Credit",
        label: "Promotion (First-Shoot Launch Credit)",
        amount: 500,
      },
      totalPaidAmount: 550,
    });
  });
});
