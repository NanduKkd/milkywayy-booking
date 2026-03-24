export const LAUNCH_PROMO_CODE = "LAUNCH500";
export const LAUNCH_PROMO_DISCOUNT = 500;
export const LAUNCH_PROMO_MIN_AMOUNT = 449;
export const LAUNCH_PROMO_LABEL = "First-Shoot Launch Credit";
export const LAUNCH_PROMO_BASE_DISCOUNT = 250;
export const LAUNCH_PROMO_BONUS_THRESHOLD = 1000;
export const LAUNCH_PROMO_NUDGE_MIN_AMOUNT = 751;
export const MINIMUM_ORDER_AMOUNT = 449;

export const getLaunchPromoDiscount = (subtotal) => {
  const safeSubtotal = Number(subtotal || 0);

  if (safeSubtotal < MINIMUM_ORDER_AMOUNT) return 0;
  if (safeSubtotal >= LAUNCH_PROMO_BONUS_THRESHOLD) {
    return LAUNCH_PROMO_DISCOUNT;
  }

  return LAUNCH_PROMO_BASE_DISCOUNT;
};

export const getLaunchPromoNudgeAmount = (subtotal) => {
  const safeSubtotal = Number(subtotal || 0);

  if (
    safeSubtotal < LAUNCH_PROMO_NUDGE_MIN_AMOUNT ||
    safeSubtotal >= LAUNCH_PROMO_BONUS_THRESHOLD
  ) {
    return 0;
  }

  return LAUNCH_PROMO_BONUS_THRESHOLD - safeSubtotal;
};
