"use server";

import { revalidatePath } from "next/cache";
import { actionWrapper } from "@/lib/actions/utils";
import { DynamicConfig } from "@/lib/db/models";
import { requireSuperadminActor } from "@/lib/helpers/authorization";
import { getPricingConfig as fetchPricingConfig } from "@/lib/helpers/pricing";

const getPricingConfigHandler = async () => {
  return fetchPricingConfig();
};
export const getPricingConfig = actionWrapper(getPricingConfigHandler);

const savePricingConfigHandler = async (newConfig) => {
  await requireSuperadminActor();

  const [config, created] = await DynamicConfig.findOrCreate({
    where: { key: "pricing" },
    defaults: { value: newConfig },
  });

  if (!created) {
    config.value = newConfig;
    await config.save();
  }

  revalidatePath("/booking");
  revalidatePath("/admin/prices");

  return { success: true };
};
export const savePricingConfig = actionWrapper(savePricingConfigHandler);
