"use server";

import Coupon from "@/lib/db/models/coupon";
import { revalidatePath } from "next/cache";

export async function getCoupons() {
  try {
    const coupons = await Coupon.findAll({
      order: [["createdAt", "DESC"]],
    });
    // Serialize to plain objects to avoid serialization issues with Client Components
    return coupons.map((c) => c.get({ plain: true }));
  } catch (error) {
    console.error("Error fetching coupons:", error);
    throw new Error("Failed to fetch coupons");
  }
}

export async function createCoupon(data) {
  try {
    // Basic validation
    if (
      !data.code ||
      !data.minimumAmount ||
      !data.percentDiscount ||
      !data.maxDiscount
    ) {
      throw new Error("Missing required fields");
    }

    await Coupon.create({
      code: data.code.toUpperCase(),
      perUser: data.perUser || 1,
      minimumAmount: data.minimumAmount,
      percentDiscount: data.percentDiscount,
      maxDiscount: data.maxDiscount,
      activatedAt: data.isActive ? new Date() : null,
    });

    revalidatePath("/admin/coupons");
    return { success: true };
  } catch (error) {
    console.error("Error creating coupon:", error);
    return { success: false, error: error.message };
  }
}

export async function toggleCouponStatus(id, isActive) {
  try {
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
  } catch (error) {
    console.error("Error updating coupon status:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteCoupon(id) {
  try {
    const coupon = await Coupon.findByPk(id);
    if (!coupon) throw new Error("Coupon not found");
    await coupon.destroy();
    revalidatePath("/admin/coupons");
    return { success: true };
  } catch (error) {
    console.error("Error deleting coupon:", error);
    return { success: false, error: error.message };
  }
}

export async function validateCoupon(code, amount) {
  try {
    const coupon = await Coupon.findOne({
      where: { code: code.toUpperCase() },
    });

    if (!coupon) {
      return { valid: false, message: "Invalid coupon code" };
    }

    if (!coupon.isActive) {
      return { valid: false, message: "Coupon is inactive or expired" };
    }

    if (amount < coupon.minimumAmount) {
      return {
        valid: false,
        message: `Minimum spend of AED ${coupon.minimumAmount} required`,
      };
    }

    const discount = Math.min(
      (amount * coupon.percentDiscount) / 100,
      coupon.maxDiscount,
    );

    return {
      valid: true,
      discount,
      coupon: {
        code: coupon.code,
        percentDiscount: coupon.percentDiscount,
        maxDiscount: coupon.maxDiscount,
      },
    };
  } catch (error) {
    console.error("Error validating coupon:", error);
    return { valid: false, message: "Failed to validate coupon" };
  }
}
