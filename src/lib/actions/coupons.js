"use server";

import { revalidatePath } from "next/cache";
import { Op } from "sequelize";
import { actionWrapper } from "@/lib/actions/utils";
import {
  LAUNCH_PROMO_CODE,
  LAUNCH_PROMO_DISCOUNT,
  LAUNCH_PROMO_MIN_AMOUNT,
} from "@/lib/config/promo";
import Booking from "@/lib/db/models/booking";
import Coupon from "@/lib/db/models/coupon";
import { auth } from "@/lib/helpers/auth";

const buildLaunchPromoCoupon = () => ({
  id: `system-${LAUNCH_PROMO_CODE}`,
  code: LAUNCH_PROMO_CODE,
  perUser: 1,
  minimumAmount: LAUNCH_PROMO_MIN_AMOUNT,
  percentDiscount: null,
  maxDiscount: LAUNCH_PROMO_DISCOUNT,
  uiText: "AED 500 welcome credit on your first booking.",
  isActive: true,
  isSystem: true,
  eligibilityLabel: "First booking only",
});

const getPublicLaunchPromoHandler = async () => {
  const coupon = await Coupon.findOne({
    where: { code: LAUNCH_PROMO_CODE },
  });

  if (coupon && !coupon.isActive) {
    return null;
  }

  const launchPromo = coupon?.get
    ? coupon.get({ plain: true })
    : buildLaunchPromoCoupon();

  return {
    code: launchPromo.code,
    minimumAmount: LAUNCH_PROMO_MIN_AMOUNT,
    maxDiscount: LAUNCH_PROMO_DISCOUNT,
    uiText:
      launchPromo.uiText?.trim() ||
      "AED 500 welcome credit on your first booking.",
  };
};
export const getPublicLaunchPromo = actionWrapper(getPublicLaunchPromoHandler);

const getCouponsHandler = async () => {
  const coupons = await Coupon.findAll({
    order: [["createdAt", "DESC"]],
  });
  const serializedCoupons = coupons.map((c) => c.get({ plain: true }));
  const hasLaunchPromo = serializedCoupons.some(
    (coupon) => coupon.code === LAUNCH_PROMO_CODE,
  );

  return hasLaunchPromo
    ? serializedCoupons
    : [buildLaunchPromoCoupon(), ...serializedCoupons];
};
export const getCoupons = actionWrapper(getCouponsHandler);

const createCouponHandler = async (data) => {
  const normalizedCode = String(data.code || "")
    .trim()
    .toUpperCase();

  // Basic validation
  if (
    !normalizedCode ||
    !data.minimumAmount ||
    !data.percentDiscount ||
    !data.maxDiscount
  ) {
    throw new Error("Missing required fields");
  }

  if (normalizedCode === LAUNCH_PROMO_CODE) {
    throw new Error("This promo code is system-managed and already available");
  }

  await Coupon.create({
    code: normalizedCode,
    perUser: data.perUser || 1,
    minimumAmount: data.minimumAmount,
    percentDiscount: data.percentDiscount,
    maxDiscount: data.maxDiscount,
    uiText: data.uiText?.trim() || null,
    activatedAt: data.isActive ? new Date() : null,
  });

  revalidatePath("/admin/coupons");
  return { success: true };
};
export const createCoupon = actionWrapper(createCouponHandler);

const toggleCouponStatusHandler = async (id, isActive) => {
  const coupon = await Coupon.findByPk(id);
  if (!coupon) throw new Error("Coupon not found");

  if (isActive) {
    // Activate
    await coupon.update({
      activatedAt: new Date(),
      deactivatedAt: null,
    });
  } else {
    // Deactivate
    await coupon.update({
      deactivatedAt: new Date(),
    });
  }

  revalidatePath("/admin/coupons");
  return { success: true };
};
export const toggleCouponStatus = actionWrapper(toggleCouponStatusHandler);

const deleteCouponHandler = async (id) => {
  const coupon = await Coupon.findByPk(id);
  if (!coupon) throw new Error("Coupon not found");
  await coupon.destroy();
  revalidatePath("/admin/coupons");
  return { success: true };
};
export const deleteCoupon = actionWrapper(deleteCouponHandler);

const validateCouponHandler = async (code, amount) => {
  const normalizedCode = String(code || "")
    .trim()
    .toUpperCase();
  const safeAmount = Number(amount || 0);

  if (!normalizedCode) {
    return { valid: false, message: "Enter a coupon code" };
  }

  if (normalizedCode === LAUNCH_PROMO_CODE) {
    const session = await auth();
    if (!session?.id) {
      return {
        valid: false,
        message: "Please log in to apply this promo code",
      };
    }

    const existingBookings = await Booking.count({
      where: {
        userId: session.id,
        status: { [Op.ne]: "DRAFT" },
      },
    });

    if (existingBookings > 0) {
      return {
        valid: false,
        message: "Launch credit is valid only for your first booking",
      };
    }

    if (safeAmount < LAUNCH_PROMO_MIN_AMOUNT) {
      return {
        valid: false,
        message: `Minimum spend of AED ${LAUNCH_PROMO_MIN_AMOUNT} required`,
      };
    }

    return {
      valid: true,
      discount: Math.min(LAUNCH_PROMO_DISCOUNT, safeAmount),
      coupon: {
        code: LAUNCH_PROMO_CODE,
        percentDiscount: null,
        maxDiscount: LAUNCH_PROMO_DISCOUNT,
        uiText: "AED 500 welcome credit on your first booking.",
      },
    };
  }

  const coupon = await Coupon.findOne({
    where: { code: normalizedCode },
  });

  if (!coupon) {
    return { valid: false, message: "Invalid coupon code" };
  }

  if (!coupon.isActive) {
    return { valid: false, message: "Coupon is inactive or expired" };
  }

  if (safeAmount < Number(coupon.minimumAmount)) {
    return {
      valid: false,
      message: `Minimum spend of AED ${coupon.minimumAmount} required`,
    };
  }

  const discount = Math.min(
    (safeAmount * Number(coupon.percentDiscount)) / 100,
    Number(coupon.maxDiscount),
  );

  return {
    valid: true,
    discount,
    coupon: {
      code: coupon.code,
      percentDiscount: coupon.percentDiscount,
      maxDiscount: coupon.maxDiscount,
      uiText: coupon.uiText,
    },
  };
};
export const validateCoupon = actionWrapper(validateCouponHandler);
