import DynamicConfig from "@/lib/db/models/dynamicconfig";
import { PRICING_CONFIG } from "@/lib/config/pricing";

export async function getPricingConfig() {
  try {
    const config = await DynamicConfig.findOne({ where: { key: "pricing" } });
    if (config && config.value) {
      return config.value;
    }
    return PRICING_CONFIG;
  } catch (error) {
    console.error("Error fetching pricing config:", error);
    return PRICING_CONFIG;
  }
}
