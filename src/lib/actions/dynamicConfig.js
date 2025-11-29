"use server";
import models from "@/lib/db/models";
import { breakCustomFormData } from "@/lib/actions/customFormData";

const wait = async (ms) => new Promise((res) => setTimeout(res, ms));

/*
export const savePricings = async({ sections }) => {
  await wait(3000);
}
*/
export const savePricings = async (form) => {
  const { sections } = await breakCustomFormData(form);
  const existing = await models.DynamicConfig.findOne({
    where: { key: "pricings" },
  });
  if (existing) existing.update({ value: sections });
  else {
    await models.DynamicConfig.create({
      key: "pricings",
      value: sections,
    });
  }
};

export const getPricings = async () => {
  // await wait(3000);
  const configEntry = await models.DynamicConfig.findOne({
    where: { key: "pricings" },
  });
  return configEntry.value;
};
