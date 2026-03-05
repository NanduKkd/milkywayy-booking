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

const mergeMissingDefaultSizes = (propertyType, normalizedSizes) => {
  const defaultSizes = PRICING_CONFIG?.[propertyType]?.sizes;
  if (!Array.isArray(defaultSizes)) return normalizedSizes;

  const currentSizes = Array.isArray(normalizedSizes) ? normalizedSizes : [];
  const byLabel = new Map();

  currentSizes.forEach((size) => {
    const label = String(size?.label || "").trim();
    if (!label) return;
    byLabel.set(label, size);
  });

  defaultSizes.forEach((size) => {
    const label = String(size?.label || "").trim();
    if (!label || byLabel.has(label)) return;
    byLabel.set(label, size);
  });

  const ordered = [];
  const used = new Set();

  defaultSizes.forEach((size) => {
    const label = String(size?.label || "").trim();
    if (!label) return;
    const resolved = byLabel.get(label);
    if (!resolved) return;
    ordered.push(resolved);
    used.add(label);
  });

  currentSizes.forEach((size) => {
    const label = String(size?.label || "").trim();
    if (!label || used.has(label)) return;
    ordered.push(size);
  });

  return ordered;
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

    const normalizedSizes = Array.isArray(typeConfig.sizes)
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
      sizes: mergeMissingDefaultSizes(propertyType, normalizedSizes),
    };
  });

  Object.entries(PRICING_CONFIG).forEach(([propertyType, defaultTypeConfig]) => {
    if (!normalizedConfig[propertyType]) {
      normalizedConfig[propertyType] = defaultTypeConfig;
      return;
    }

    normalizedConfig[propertyType] = {
      ...defaultTypeConfig,
      ...normalizedConfig[propertyType],
      sizes: mergeMissingDefaultSizes(
        propertyType,
        normalizedConfig[propertyType]?.sizes,
      ),
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
