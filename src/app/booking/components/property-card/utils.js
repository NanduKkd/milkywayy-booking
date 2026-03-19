import {
  VIDEOGRAPHY_SUB_CATEGORIES,
  VIDEOGRAPHY_SUB_SERVICES,
} from "@/lib/config/pricing";

import { SERVICE_ESTIMATES } from "./constants";

export const parseVideographySelections = (value) =>
  String(value || "")
    .split("|")
    .map((entry) => entry.trim())
    .filter(Boolean);

export const serializeVideographySelections = (values) =>
  [...new Set((Array.isArray(values) ? values : []).filter(Boolean))].join("|");

export const resolveVideographyPriceConfig = (
  servicePriceConfig,
  subService,
) => {
  if (!subService || !servicePriceConfig || typeof servicePriceConfig !== "object") {
    return servicePriceConfig;
  }

  if (subService.includes(".")) {
    const [mainService, category] = subService.split(".");
    const nested = servicePriceConfig?.[mainService]?.[category];

    if (nested !== undefined) return nested;

    const mainConfig = servicePriceConfig?.[mainService];

    if (
      mainConfig &&
      typeof mainConfig === "object" &&
      !Array.isArray(mainConfig) &&
      "price" in mainConfig
    ) {
      return mainConfig;
    }
  }

  const direct = servicePriceConfig?.[subService];

  if (direct !== undefined) return direct;

  return servicePriceConfig;
};

export const getPropertySizeConfig = (
  pricingConfig,
  propertyType,
  propertySize,
) =>
  pricingConfig?.[propertyType]?.sizes?.find((size) => size.label === propertySize);

export const formatDeliveryLabel = (value) => {
  if (!value) return "";

  return String(value).toLowerCase().startsWith("delivery:")
    ? value
    : `Delivery: ${value}`;
};

export const getPackageInfoLabelClassName = (value) =>
  value === "Not included" ? "text-muted-foreground" : "font-bold text-white";

export const getServiceDeliveryText = (_propertyType, serviceName) => {
  if (serviceName === "Photography") return "24h";
  if (serviceName === "Videography") return "24-48h";
  if (serviceName === "360\u00B0 Tour") return "48-72h";

  return SERVICE_ESTIMATES[serviceName] || "";
};

export const getLongFormDeliveryText = (propertyType, propertySize) => {
  if (propertyType === "Apartment") {
    if (["Studio", "1 Bed", "2 Bed"].includes(propertySize)) {
      return "24-48h";
    }

    return "48-72h";
  }

  if (
    propertyType === "Villa" ||
    propertyType === "Villa/Townhouse" ||
    propertyType === "Townhouse/Penthouse" ||
    propertyType === "Commercial"
  ) {
    return "48-72h";
  }

  return "48-72h";
};

export const getVideographyOptionDeliveryText = (
  propertyType,
  propertySize,
  subService,
) => {
  if (subService === VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM) {
    return "24-48h";
  }

  if (subService === VIDEOGRAPHY_SUB_SERVICES.LONG_FORM) {
    return getLongFormDeliveryText(propertyType, propertySize);
  }

  return "";
};

export const getVideographyBasePrice = ({
  pricingConfig,
  propertyType,
  propertySize,
  subService,
}) => {
  const servicePriceConfig =
    getPropertySizeConfig(pricingConfig, propertyType, propertySize)?.prices?.[
      "Videography"
    ]?.[subService];

  if (propertyType === "Commercial") {
    return servicePriceConfig?.price || 0;
  }

  if (subService === VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM) {
    return servicePriceConfig?.price || 0;
  }

  if (!servicePriceConfig || typeof servicePriceConfig !== "object") {
    return 0;
  }

  const values = Object.values(servicePriceConfig);
  const minimum = values.length
    ? Math.min(
        ...values.map((category) =>
          typeof category?.price === "number" ? category.price : Infinity,
        ),
      )
    : 0;

  return minimum === Infinity ? 0 : minimum;
};

export const getVideographySelectionPrice = (priceConfig, selection) => {
  const resolved = resolveVideographyPriceConfig(priceConfig, selection);
  const amount =
    typeof resolved === "object"
      ? Number(resolved?.price || 0)
      : Number(resolved || 0);

  return Number.isFinite(amount) ? amount : 0;
};

export const getVideographySelectionsTotal = (priceConfig, selections) =>
  selections.reduce(
    (sum, selection) => sum + getVideographySelectionPrice(priceConfig, selection),
    0,
  );

export const getSelectedLongForm = (selections) =>
  selections.find((selection) =>
    selection.startsWith(`${VIDEOGRAPHY_SUB_SERVICES.LONG_FORM}.`),
  ) ||
  (selections.includes(VIDEOGRAPHY_SUB_SERVICES.LONG_FORM)
    ? VIDEOGRAPHY_SUB_SERVICES.LONG_FORM
    : "");

export const getInitialLongFormSelection = (subService) => {
  const categories = VIDEOGRAPHY_SUB_CATEGORIES?.[subService];
  const firstCategoryLabel = categories ? Object.values(categories)[0] : undefined;

  return firstCategoryLabel ? `${subService}.${firstCategoryLabel}` : subService;
};

export const getPropertyTitleParts = (property) =>
  [property.propertyType, property.propertySize, property.community].filter(Boolean);
