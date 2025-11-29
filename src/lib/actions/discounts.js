"use server";

import DynamicConfig from "@/lib/db/models/dynamicconfig";
import { revalidatePath } from "next/cache";

const CONFIG_KEY = "discounts";

export async function getDiscounts() {
  try {
    const config = await DynamicConfig.findOne({
      where: { key: CONFIG_KEY },
    });
    return config ? config.value : [];
  } catch (error) {
    console.error("Error fetching discounts:", error);
    return [];
  }
}

export async function saveDiscounts(discounts) {
  try {
    // Basic validation
    if (!Array.isArray(discounts)) {
      throw new Error("Invalid format");
    }

    const validDiscounts = discounts.map((d) => ({
      id: d.id || crypto.randomUUID(),
      name: d.name,
      type: d.type, // 'direct' or 'wallet'
      minAmount: parseFloat(d.minAmount) || 0,
      percentage: parseFloat(d.percentage) || 0,
      maxDiscount: parseFloat(d.maxDiscount) || 0,
      expiryDays: parseInt(d.expiryDays) || 0, // 0 means no expiry
      isActive: d.isActive ?? true,
    }));

    const [config, created] = await DynamicConfig.findOrCreate({
      where: { key: CONFIG_KEY },
      defaults: { value: validDiscounts },
    });

    if (!created) {
      await config.update({ value: validDiscounts });
    }

    revalidatePath("/admin/discounts");
    revalidatePath("/booking"); // Revalidate booking page to reflect changes
    return { success: true };
  } catch (error) {
    console.error("Error saving discounts:", error);
    return { success: false, error: error.message };
  }
}
