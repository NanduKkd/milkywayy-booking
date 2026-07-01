import { calculateWalletCreditPreview } from "@/lib/helpers/promotionPricing";
import { selectPromotionForCheckout } from "@/lib/services/promotionEngine";

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

describe("calculateWalletCreditPreview", () => {
  it("keeps wallet rewards separate from the single selected promotion", () => {
    const selection = selectPromotionForCheckout({
      eligibleSubtotal: 1000,
      assignedPromotionIds: [11],
      promotions: [
        buildPromotion({
          id: 10,
          kind: "AUTOMATIC",
          name: "Automatic launch credit",
          benefitType: "PERCENTAGE",
          benefitValue: 15,
        }),
        buildPromotion({
          id: 11,
          kind: "PERSONAL",
          name: "Assigned VIP offer",
          triggerType: "NONE",
          benefitValue: 100,
        }),
      ],
    });

    const walletPreview = calculateWalletCreditPreview(
      [
        {
          id: "wallet-5",
          isActive: true,
          type: "wallet",
          minAmount: 500,
          percentage: 5,
          maxDiscount: 80,
          expiryDays: 30,
        },
        {
          id: "wallet-3",
          isActive: true,
          type: "wallet",
          minAmount: 900,
          percentage: 3,
          maxDiscount: 40,
          expiryDays: 60,
        },
      ],
      1000,
    );

    expect(selection.selectedPromotion).toEqual(
      expect.objectContaining({
        promotionId: 11,
        kind: "PERSONAL",
        benefitAmount: 100,
      }),
    );
    expect(walletPreview).toEqual(
      expect.objectContaining({
        amount: 80,
        appliedDiscounts: [
          expect.objectContaining({
            id: "wallet-5",
            value: 50,
          }),
          expect.objectContaining({
            id: "wallet-3",
            value: 30,
          }),
        ],
      }),
    );
    expect(walletPreview.creditExpiresAt).toBeInstanceOf(Date);
  });
});
