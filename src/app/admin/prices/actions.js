"use server";

import { getPricingConfig as fetchPricingConfig } from "@/lib/helpers/pricing";
import { DynamicConfig } from "@/lib/db/models";

export async function getPricingConfig() {
  return fetchPricingConfig();
}

export async function savePricingConfig(newConfig) {
  try {
    const [config, created] = await DynamicConfig.findOrCreate({
      where: { key: "pricing" },
      defaults: { value: newConfig },
    });

    if (!created) {
      config.value = newConfig;
      await config.save();
    }

    return { success: true };
  } catch (error) {
    console.error("Error saving pricing config:", error);
    return { success: false, error: error.message };
  }
}
