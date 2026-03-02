import {
  PRICING_CONFIG,
  SERVICES,
  VIDEOGRAPHY_SUB_CATEGORIES,
  VIDEOGRAPHY_SUB_SERVICES,
} from "@/lib/config/pricing";
import DynamicConfig from "@/lib/db/models/dynamicconfig";

const normalizeLongFormCategoryKeys = (longFormConfig) => {
  if (
    !longFormConfig ||
    typeof longFormConfig !== "object" ||
    Array.isArray(longFormConfig)
  ) {
    return longFormConfig;
  }

  // Commercial long-form uses direct { price, slots, allowEvening } shape.
  if ("price" in longFormConfig || "slots" in longFormConfig) {
    return longFormConfig;
  }

  const normalized = { ...longFormConfig };
  const categoryMap =
    VIDEOGRAPHY_SUB_CATEGORIES?.[VIDEOGRAPHY_SUB_SERVICES.LONG_FORM] || {};

  Object.entries(categoryMap).forEach(([legacyKey, label]) => {
    if (normalized[label] == null && normalized[legacyKey] != null) {
      normalized[label] = normalized[legacyKey];
    }
    if (legacyKey !== label && Object.hasOwn(normalized, legacyKey)) {
      delete normalized[legacyKey];
    }
  });

  return normalized;
};

export const normalizePricingConfig = (config) => {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return PRICING_CONFIG;
  }

  const normalizedConfig = {};

  Object.entries(config).forEach(([propertyType, typeConfig]) => {
    if (!typeConfig || typeof typeConfig !== "object") {
      normalizedConfig[propertyType] = typeConfig;
      return;
    }

    const sizes = Array.isArray(typeConfig.sizes)
      ? typeConfig.sizes.map((size) => {
          if (!size?.prices || typeof size.prices !== "object") {
            return size;
          }

          const prices = { ...size.prices };
          const videography = prices[SERVICES.VIDEOGRAPHY];

          if (
            videography &&
            typeof videography === "object" &&
            !Array.isArray(videography)
          ) {
            const longForm = videography[VIDEOGRAPHY_SUB_SERVICES.LONG_FORM];
            if (longForm) {
              prices[SERVICES.VIDEOGRAPHY] = {
                ...videography,
                [VIDEOGRAPHY_SUB_SERVICES.LONG_FORM]:
                  normalizeLongFormCategoryKeys(longForm),
              };
            }
          }

          return {
            ...size,
            prices,
          };
        })
      : typeConfig.sizes;

    normalizedConfig[propertyType] = {
      ...typeConfig,
      sizes,
    };
  });

  return normalizedConfig;
};

export async function getPricingConfig() {
  try {
    const config = await DynamicConfig.findOne({ where: { key: "pricing" } });
    if (config && config.value) {
      return normalizePricingConfig(config.value);
    }
    return PRICING_CONFIG;
  } catch (error) {
    console.error("Error fetching pricing config:", error);
    return PRICING_CONFIG;
  }
}
