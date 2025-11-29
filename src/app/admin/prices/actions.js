"use server";

import { getPricingConfig as fetchPricingConfig } from "@/lib/helpers/pricing";
import { DynamicConfig } from "@/lib/db/models";
import { actionWrapper } from "@/lib/actions/utils";

const getPricingConfigHandler = async () => {
  return fetchPricingConfig();
};
export const getPricingConfig = actionWrapper(getPricingConfigHandler);

const savePricingConfigHandler = async (newConfig) => {
  const [config, created] = await DynamicConfig.findOrCreate({
    where: { key: "pricing" },
    defaults: { value: newConfig },
  });

  if (!created) {
    config.value = newConfig;
    await config.save();
  }

  return { success: true };
};
export const savePricingConfig = actionWrapper(savePricingConfigHandler);
