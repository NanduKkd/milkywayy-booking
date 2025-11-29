"use server";
import models from "@/lib/db/models";
import { breakCustomFormData } from "@/lib/actions/customFormData";
import { actionWrapper } from "@/lib/actions/utils";

const savePricingsHandler = async (form) => {
  const { sections } = await breakCustomFormData(form);
  const existing = await models.DynamicConfig.findOne({
    where: { key: "pricings" },
  });
  if (existing) await existing.update({ value: sections });
  else {
    await models.DynamicConfig.create({
      key: "pricings",
      value: sections,
    });
  }
};
export const savePricings = actionWrapper(savePricingsHandler);

const getPricingsHandler = async () => {
  const configEntry = await models.DynamicConfig.findOne({
    where: { key: "pricings" },
  });
  return configEntry ? configEntry.value : null;
};
export const getPricings = actionWrapper(getPricingsHandler);
