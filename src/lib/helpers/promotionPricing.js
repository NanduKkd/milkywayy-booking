export function calculateWalletCreditPreview(discounts, eligibleSubtotal) {
  const normalizedSubtotal = Number(eligibleSubtotal || 0);

  if (!Array.isArray(discounts) || normalizedSubtotal <= 0) {
    return {
      amount: 0,
      creditExpiresAt: null,
      appliedDiscounts: [],
    };
  }

  let amount = 0;
  let creditExpiresAt = null;
  const appliedDiscounts = [];

  discounts.forEach((discount) => {
    if (!discount?.isActive || discount.type !== "wallet") {
      return;
    }

    if (normalizedSubtotal < Number(discount.minAmount || 0)) {
      return;
    }

    const benefitAmount = Math.min(
      (normalizedSubtotal * Number(discount.percentage || 0)) / 100,
      Number(discount.maxDiscount || 0),
    );

    if (!Number.isFinite(benefitAmount) || benefitAmount <= 0) {
      return;
    }

    amount += benefitAmount;
    appliedDiscounts.push({
      ...discount,
      value: benefitAmount,
    });

    if (Number(discount.expiryDays || 0) > 0) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + Number(discount.expiryDays));

      if (!creditExpiresAt || expiresAt > creditExpiresAt) {
        creditExpiresAt = expiresAt;
      }
    }
  });

  return {
    amount,
    creditExpiresAt,
    appliedDiscounts,
  };
}
