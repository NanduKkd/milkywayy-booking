import {
  Building,
  Building2,
  Calendar,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Globe,
  Hash,
  Home,
  MapPin,
  Trash2,
  Video,
} from "lucide-react";

import { Controller } from "react-hook-form";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import DateSlotPicker from "@/components/DateSlotPicker";

import PhoneNumberInput from "@/components/PhoneInput";

import { OptionCard } from "./OptionCard";

import { cn } from "@/lib/utils";

import {
  PROPERTY_TYPE_ORDER,
  SERVICE_ORDER,
  VIDEOGRAPHY_SUB_SERVICES,
  VIDEOGRAPHY_SUB_SERVICE_ORDER,
  VIDEOGRAPHY_SUB_CATEGORIES,
} from "@/lib/config/pricing";
import { isNightServiceSelected } from "@/lib/helpers/bookingUtils";

const TIER_PACKAGE_DETAILS = {
  Basic: {
    photos: "Up to 15",
    reel: "30–45s",
    walkthrough: "Not included",
    tour: "Not included",
  },
  Essential: {
    photos: "Up to 20",
    reel: "45–60s",
    walkthrough: "3–5 mins",
    tour: "8–10 hotspots",
  },
  Premium: {
    photos: "Up to 30",
    reel: "60–75s",
    walkthrough: "5–10 mins",
    tour: "Up to 15 hotspots",
  },
  Elite: {
    photos: "Up to 40",
    reel: "60–90s",
    walkthrough: "8–15 mins",
    tour: "Up to 20 hotspots",
  },
};

const SERVICE_ICONS = {
  Photography: Camera,

  Videography: Video,

  "360° Tour": Globe,
};

const PROPERTY_TYPE_ICONS = {
  Apartment: Building2,

  Villa: Home,

  "Townhouse/Penthouse": Home,

  "Villa/Townhouse": Home,

  Commercial: Building,
};

const PROPERTY_TYPE_META = {
  Apartment: {
    label: "Apartment",
    mobileLabel: "Apartment",
    description: "Apartments & studios",
  },
  "Villa/Townhouse": {
    label: "Villa / Townhouse",
    mobileLabel: "Villa/TH",
    description: "Villas, townhouses & penthouses",
  },
  Villa: {
    label: "Villa",
    mobileLabel: "Villa",
    description: "Standalone villas",
  },
  "Townhouse/Penthouse": {
    label: "Townhouse / Penthouse",
    mobileLabel: "TH / Penthouse",
    description: "Townhouses & penthouses",
  },
  Commercial: {
    label: "Commercial",
    mobileLabel: "Commercial",
    description: "Offices, retail & warehouses",
  },
};

const SERVICE_SUBTITLES = {
  // Videography: "30 - 90 secs walkthroughs",

  Videography: "Choose Options Below",

  // Videography: "Short-Form Walkthroughs (30-90s)",
};

const SERVICE_ESTIMATES = {
  Photography: "24h",
  Videography: "24-48h",
  "360° Tour": "48-72h",
};

const VIDEOGRAPHY_OPTION_META = {
  [VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM]: {
    title: "Short Form",
    subtitle: "Social Media Reels",
    delivery: "24-48h",
  },
  [VIDEOGRAPHY_SUB_SERVICES.LONG_FORM]: {
    title: "Long Form",
    subtitle: "YouTube Walkthrough",
    delivery: "48-72h",
  },
};

const LIGHTING_OPTION_ICONS = {
  Daylight: "\u2600",
  "Night Light": "\u263E",
  "Daylight + Night": "\u25CC",
};

const COMMERCIAL_SERVICE_AVAILABILITY = {
  Basic: ["Photography", "Videography"],
  Essential: ["Photography", "Videography", "360° Tour"],
  Premium: ["Photography", "Videography", "360° Tour"],
  Elite: ["Photography", "Videography", "360° Tour"],
};

const formatDeliveryLabel = (value) => {
  if (!value) return "";
  return String(value).toLowerCase().startsWith("delivery:")
    ? value
    : `Delivery: ${value}`;
};

const getPackageInfoLabelClassName = (value) =>
  value === "Not included" ? "text-muted-foreground" : "font-bold text-white";

const getServiceDeliveryText = (propertyType, serviceName) => {
  if (serviceName === "Photography") return "24h";
  if (serviceName === "Videography") return "24-48h";
  if (serviceName === "360° Tour") {
    return "48-72h";
  }
  return SERVICE_ESTIMATES[serviceName] || "";
};

const getLongFormDeliveryText = (propertyType, propertySize) => {
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

const getVideographyOptionDeliveryText = (
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

export function PropertyCard({
  index,

  property,

  isOpen,

  onToggle,

  onDuplicate,

  onRemove,

  control,

  setValue,

  errors,

  pricingConfig,

  getPropertyPrice,

  getPropertyDurationAndEvening,

  getOccupiedSlots,

  toggleService,

  updatePropertyField,

  isOnlyProperty,
}) {
  const parseVideographySelections = (value) =>
    String(value || "")
      .split("|")
      .map((v) => v.trim())
      .filter(Boolean);
  const serializeVideographySelections = (values) =>
    [...new Set((Array.isArray(values) ? values : []).filter(Boolean))].join(
      "|",
    );
  const resolveVideographyPriceConfig = (servicePriceConfig, subService) => {
    if (
      !subService ||
      !servicePriceConfig ||
      typeof servicePriceConfig !== "object"
    ) {
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
  const videographySelections = parseVideographySelections(
    property.videographySubService,
  );
  const hasShortFormSelection = videographySelections.includes(
    VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM,
  );
  const selectedLongForm =
    videographySelections.find((s) =>
      s.startsWith(`${VIDEOGRAPHY_SUB_SERVICES.LONG_FORM}.`),
    ) ||
    (videographySelections.includes(VIDEOGRAPHY_SUB_SERVICES.LONG_FORM)
      ? VIDEOGRAPHY_SUB_SERVICES.LONG_FORM
      : "");

  const price = getPropertyPrice(property);
  const tierKey =
    property.propertySize === "Executive" ? "Elite" : property.propertySize;

  const packageInfo =
    property?.propertyType === "Commercial" &&
    tierKey &&
    TIER_PACKAGE_DETAILS[tierKey]
      ? TIER_PACKAGE_DETAILS[tierKey]
      : null;
  const titleParts = [];

  if (property.propertyType) titleParts.push(property.propertyType);

  if (property.propertySize) titleParts.push(property.propertySize);

  if (property.community) titleParts.push(property.community);

  const { duration } = getPropertyDurationAndEvening(property);
  const isNightService = isNightServiceSelected(
    property.services || [],
    property.videographySubService || "",
  );

  const renderVideographySubServiceSelection = (className = "") => (
    <div
      className={cn(
        "animate-in fade-in slide-in-from-top-4 duration-300",
        className,
      )}
    >
      <label className="block text-[10px] md:text-[11px] tracking-[0.02em] md:tracking-[0.18em] font-medium text-muted-foreground/90 mb-2.5 md:mb-3">
          Video Format
      </label>

      <Controller
        name={`properties.${index}.videographySubService`}
        control={control}
        render={({ field }) => (
          <>
            <div
              className={
                property.propertyType === "Commercial" &&
                property.propertySize === "Basic"
                  ? "grid grid-cols-1 gap-2.5 w-full"
                  : "grid grid-cols-2 lg:grid-cols-2 gap-2.5 w-full"
              }
            >
              {VIDEOGRAPHY_SUB_SERVICE_ORDER.map((subService) => {
                const isCommercialBasic =
                  property.propertyType === "Commercial" &&
                  property.propertySize === "Basic";
                const isSubServiceAvailable =
                  !isCommercialBasic ||
                  subService === VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM;

                const typeConfig = pricingConfig[property.propertyType];
                const sizeConfig = typeConfig?.sizes?.find(
                  (s) => s.label === property.propertySize,
                );
                const servicePriceConfig =
                  sizeConfig?.prices?.["Videography"]?.[subService];

                let basePrice;
                if (property.propertyType === "Commercial") {
                  basePrice = servicePriceConfig?.price || 0;
                } else if (subService === VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM) {
                  basePrice = servicePriceConfig?.price || 0;
                } else if (
                  !servicePriceConfig ||
                  typeof servicePriceConfig !== "object"
                ) {
                  basePrice = 0;
                } else {
                  const values = Object.values(servicePriceConfig);
                  basePrice = values.length
                    ? Math.min(
                        ...values.map((cat) =>
                          typeof cat?.price === "number" ? cat.price : Infinity,
                        ),
                      )
                    : 0;
                  if (basePrice === Infinity) basePrice = 0;
                }

                return (
                  <OptionCard
                    key={subService}
                    className={cn(
                      "!rounded-[18px] !px-4 !py-3 md:!rounded-[20px] md:!px-5 md:!py-3.5",
                      !isSubServiceAvailable &&
                        "pointer-events-none opacity-60 hover:border-white/10",
                    )}
                    selectedClassName="border-white bg-white text-black"
                    unselectedClassName="border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/20 hover:text-white"
                    isSelected={
                      subService === VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM
                        ? hasShortFormSelection
                        : Boolean(selectedLongForm)
                    }
                    onClick={() => {
                      if (!isSubServiceAvailable) return;
                      const currentSelections = parseVideographySelections(
                        field.value,
                      );
                      const withoutLong = currentSelections.filter(
                        (v) =>
                          !v.startsWith(
                            `${VIDEOGRAPHY_SUB_SERVICES.LONG_FORM}.`,
                          ) && v !== VIDEOGRAPHY_SUB_SERVICES.LONG_FORM,
                      );
                      const hasLong = currentSelections.some(
                        (v) =>
                          v.startsWith(
                            `${VIDEOGRAPHY_SUB_SERVICES.LONG_FORM}.`,
                          ) || v === VIDEOGRAPHY_SUB_SERVICES.LONG_FORM,
                      );
                      const hasShort = currentSelections.includes(
                        VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM,
                      );

                      if (subService === VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM) {
                        const nextSelections = hasShort
                          ? []
                          : [VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM];
                        updatePropertyField(
                          index,
                          "videographySubService",
                          serializeVideographySelections(nextSelections),
                        );
                        return;
                      }

                      if (property.propertyType === "Commercial") {
                        const nextSelections = hasLong
                          ? withoutLong
                          : [
                              ...withoutLong,
                              VIDEOGRAPHY_SUB_SERVICES.LONG_FORM,
                            ];
                        updatePropertyField(
                          index,
                          "videographySubService",
                          serializeVideographySelections(nextSelections),
                        );
                        return;
                      }

                      if (hasLong) {
                        updatePropertyField(
                          index,
                          "videographySubService",
                          serializeVideographySelections(withoutLong),
                        );
                        return;
                      }

                      const categoriesObj =
                        VIDEOGRAPHY_SUB_CATEGORIES?.[subService];
                      const firstCategoryLabel = categoriesObj
                        ? Object.values(categoriesObj)[0]
                        : undefined;
                      const longSelection = firstCategoryLabel
                        ? `${subService}.${firstCategoryLabel}`
                        : subService;
                      updatePropertyField(
                        index,
                        "videographySubService",
                        serializeVideographySelections([longSelection]),
                      );
                    }}
                  >
                    <div className="flex flex-col w-full text-left gap-1.5">
                      {/* Title + Price */}
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[13px] font-semibold md:text-sm">
                          {VIDEOGRAPHY_OPTION_META[subService]?.title ||
                            subService}
                        </span>

                        <span className="text-[13px] font-semibold md:text-sm">
                          AED{" "}
                          {(() => {
                            if (
                              subService !== VIDEOGRAPHY_SUB_SERVICES.LONG_FORM
                            ) {
                              return basePrice;
                            }

                            const typeConfig =
                              pricingConfig[property.propertyType];
                            const sizeConfig = typeConfig?.sizes?.find(
                              (s) => s.label === property.propertySize,
                            );

                            const videographyPriceConfig =
                              sizeConfig?.prices?.["Videography"];

                            const resolved = resolveVideographyPriceConfig(
                              videographyPriceConfig,
                              selectedLongForm ||
                                VIDEOGRAPHY_SUB_SERVICES.LONG_FORM,
                            );

                            const amount =
                              typeof resolved === "object"
                                ? Number(resolved?.price || 0)
                                : Number(resolved || 0);

                            return amount || basePrice;
                          })()}
                        </span>
                      </div>

                      {/* Subtitle */}
                      {property.propertyType !== "Commercial" && (
                        <div className="text-[10px] text-muted-foreground md:text-xs">
                          {VIDEOGRAPHY_OPTION_META[subService]?.subtitle}
                        </div>
                      )}

                      {/* Delivery */}
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground/80 md:text-xs">
                        <Clock className="h-3 w-3" />
                        {formatDeliveryLabel(
                          getVideographyOptionDeliveryText(
                            property.propertyType,
                            property.propertySize,
                            subService,
                          ),
                        )}
                      </div>
                    </div>
                  </OptionCard>
                );
              })}
            </div>

            {/* <div className="mt-1 text-2xl font-bold text-foreground">
              {(() => {
                const typeConfig = pricingConfig[property.propertyType];
                const sizeConfig = typeConfig?.sizes?.find(
                  (s) => s.label === property.propertySize,
                );
                const videographyPriceConfig = sizeConfig?.prices?.["Videography"];
                if (!videographyPriceConfig) return "AED 0";

                const selectedSelections = parseVideographySelections(field.value);
                const effectiveSelections =
                  selectedSelections.length > 0
                    ? selectedSelections
                    : [VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM];

                const total = effectiveSelections.reduce((sum, selection) => {
                  const resolved = resolveVideographyPriceConfig(
                    videographyPriceConfig,
                    selection,
                  );
                  const amount =
                    typeof resolved === "object"
                      ? Number(resolved?.price || 0)
                      : Number(resolved || 0);
                  return sum + (Number.isFinite(amount) ? amount : 0);
                }, 0);

                return `AED ${total}`;
              })()}
            </div> */}

            {selectedLongForm?.startsWith(
              `${VIDEOGRAPHY_SUB_SERVICES.LONG_FORM}.`,
            ) &&
              property.propertyType !== "Commercial" && (
                <div className="mt-4">
                  <label className="block text-[10px] md:text-[11px] tracking-[0.02em] md:tracking-[0.18em] font-medium text-muted-foreground/90 mb-2.5 md:mb-3">
                    Lighting Preference
                  </label>

                  <div className="grid grid-cols-3 gap-2.5">
                    {(() => {
                      const [mainService, selectedCategoryLabel] =
                        selectedLongForm.split(".") || [];
                      const categories =
                        VIDEOGRAPHY_SUB_CATEGORIES[mainService];
                      if (!categories) return null;

                      const currentCategory =
                        selectedCategoryLabel || Object.values(categories)[0];

                      return Object.entries(categories).map(
                        ([categoryKey, categoryName]) => (
                          <OptionCard
                            key={categoryKey}
                            className="relative !rounded-[18px] !px-4 !py-3 md:!rounded-[20px] md:!py-3.5"
                            selectedClassName="border-white/35 bg-white/[0.06] text-white"
                            unselectedClassName="border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/25 hover:text-white"
                            isSelected={currentCategory === categoryName}
                            onClick={() => {
                              const currentSelections =
                                parseVideographySelections(field.value);
                              const withoutLong = currentSelections.filter(
                                (v) =>
                                  !v.startsWith(
                                    `${VIDEOGRAPHY_SUB_SERVICES.LONG_FORM}.`,
                                  ) && v !== VIDEOGRAPHY_SUB_SERVICES.LONG_FORM,
                              );
                              updatePropertyField(
                                index,
                                "videographySubService",
                                serializeVideographySelections([
                                  ...withoutLong,
                                  `${mainService}.${categoryName}`,
                                ]),
                              );
                            }}
                          >
                            <div className="flex items-center justify-center gap-1">
                              <div className="text-[10px] md:text-xs text-muted-foreground/80">
                                {LIGHTING_OPTION_ICONS[categoryName] ||
                                  "\u2022"}
                              </div>
                              <div className="font-medium text-[10px] md:text-[13px]">
                                {categoryName}
                              </div>
                              {currentCategory === categoryName && (
                                <span className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 rounded-full bg-white text-black flex items-center justify-end">
                                  <Check className="h-3 w-3" />
                                </span>
                              )}
                            </div>
                          </OptionCard>
                        ),
                      );
                    })()}
                  </div>
                </div>
              )}
          </>
        )}
      />

      {errors.properties?.[index]?.videographySubService && (
        <p className="text-red-500 text-xs mt-1">
          {errors.properties[index].videographySubService.message}
        </p>
      )}
    </div>
  );

  return (
    <div
      className={cn(
        "premium-card rounded-xl md:rounded-2xl overflow-hidden card-hover-lift border border-border transition-all duration-300",

        isOpen ? "relative z-10 ring-2 ring-primary/20" : "relative z-0",
      )}
    >
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        className="w-full flex flex-row justify-between items-center p-4 md:p-6 text-left hover:bg-muted/20 transition-colors cursor-pointer"
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-muted/40 flex items-center justify-center text-[11px] md:text-xs font-semibold text-muted-foreground shrink-0">
            {index + 1}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] md:text-sm font-semibold text-foreground">
              Property {index + 1}
            </p>
            {!isOpen && titleParts.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {titleParts.join(" · ")}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {price > 0 && (
            <span className="text-[12px] md:text-sm font-semibold text-foreground mr-1">
              AED {price.toLocaleString()}
            </span>
          )}
          {isOpen ? (
            <ChevronUp size={20} className="text-muted-foreground" />
          ) : (
            <ChevronDown size={20} className="text-muted-foreground" />
          )}
        </div>
      </div>

      {isOpen && (
        <>
          <div className="border-t border-border" />

          <div className="pt-4 md:pt-6 px-4 md:px-6 pb-5 md:pb-6 space-y-6 md:space-y-8 overflow-visible">
            {/* Property Type Selection */}

            <div>
              <label className="block text-[10px] md:text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2.5 md:mb-3">
                PROPERTY TYPE
              </label>

              <Controller
                name={`properties.${index}.propertyType`}
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-3 gap-3">
                    {PROPERTY_TYPE_ORDER.map((type) => {
                      if (!pricingConfig[type]) return null;

                      const Icon = PROPERTY_TYPE_ICONS[type] || Building;
                      const typeMeta = PROPERTY_TYPE_META[type] || {
                        label: String(type).replace("/", " / "),
                        mobileLabel: String(type).replace("/", " / "),
                        description: "",
                      };

                      return (
                        <OptionCard
                          key={type}
                          className="group relative flex min-h-[82px] flex-col items-center justify-center gap-1.5 rounded-xl p-3 text-center transition-all duration-300 md:min-h-[102px] md:gap-2.5 md:p-4"
                          selectedClassName="premium-card-selected"
                          unselectedClassName="premium-card"
                          isSelected={field.value === type}
                          onClick={() => {
                            updatePropertyField(index, "propertyType", type);

                            setValue(`properties.${index}.propertySize`, "");

                            setValue(`properties.${index}.services`, []);
                          }}
                        >
                          <div
                            className={cn(
                              "flex h-9 w-9 items-center justify-center rounded-xl transition-colors md:h-10 md:w-10",
                              field.value === type
                                ? "bg-accent/15"
                                : "bg-secondary",
                            )}
                          >
                            <Icon
                              className={cn(
                                "h-4 w-4 transition-colors md:h-[18px] md:w-[18px]",
                                field.value === type
                                  ? "text-accent"
                                  : "text-muted-foreground",
                              )}
                              strokeWidth={1.5}
                            />
                          </div>

                          <div>
                            <p
                              className={cn(
                                "text-[11px] font-medium transition-colors md:text-sm",
                                field.value === type
                                  ? "text-foreground"
                                  : "text-muted-foreground",
                              )}
                            >
                              <span className="hidden md:inline">
                                {typeMeta.label}
                              </span>
                              <span className="md:hidden">
                                {typeMeta.mobileLabel}
                              </span>
                            </p>
                            {/*
                            <p className="mt-0.5 hidden text-[10px] text-muted-foreground md:block">
                              {typeMeta.description}
                            </p>
			    */}
                          </div>

                          {field.value === type && (
                            <span className="absolute right-2 top-2 h-4 w-4 rounded-full bg-white text-black flex items-center justify-center md:h-5 md:w-5">
                              <Check className="h-3 w-3" />
                            </span>
                          )}
                        </OptionCard>
                      );
                    })}
                  </div>
                )}
              />

              {errors.properties?.[index]?.propertyType && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.properties[index].propertyType.message}
                </p>
              )}
            </div>

            {property.propertyType && (
              <>
                {/* Property Size Selection */}

                {pricingConfig?.[property.propertyType] && (
                  <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                    <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                      {property.propertyType === "Commercial"
                        ? "Step 1 — Property Scale"
                        : "PROPERTY SIZE"}
                    </label>
                    {property.propertyType === "Commercial" ? (
                      <p className="mb-3 text-[10px] text-muted-foreground/60">
                        Select property scale. Then choose services.
                      </p>
                    ) : null}

                    <Controller
                      name={`properties.${index}.propertySize`}
                      control={control}
                      render={({ field }) => (
                        <div
                          className={
                            property.propertyType === "Commercial"
                              ? "grid grid-cols-2 md:grid-cols-4 gap-3 w-full"
                              : "grid grid-cols-3 lg:grid-cols-6 gap-2 w-full"
                          }
                        >
                          {pricingConfig[property.propertyType].sizes.map(
                            (sizeObj) => {
                              if (property.propertyType === "Commercial") {
                                const isSelected =
                                  field.value === sizeObj.label;

                                const TIER_META = {
                                  Basic: {
                                    subtitle: "Small spaces",
                                  },
                                  Essential: {
                                    subtitle: "Most offices",
                                    badge: "Most Popular",
                                  },
                                  Premium: {
                                    subtitle: "Large commercial spaces",
                                  },
                                  Elite: {
                                    subtitle: "HQ / Warehouses",
                                  },
                                };

                                const meta = TIER_META[sizeObj.label];

                                return (
                                  <div
                                    key={sizeObj.label}
                                    onClick={() => {
                                      updatePropertyField(
                                        index,
                                        "propertySize",
                                        sizeObj.label,
                                      );

                                      setValue(
                                        `properties.${index}.services`,
                                        [],
                                      );
                                    }}
                                    className={cn(
                                      "relative cursor-pointer rounded-xl border transition-all duration-300 p-3 text-left flex flex-col items-start justify-center gap-1.5 min-h-[74px]",

                                      isSelected
                                        ? "border-foreground/20 bg-secondary/60 shadow-sm"
                                        : "border-border/40 bg-secondary/20 hover:bg-secondary/40 hover:border-border/60",
                                    )}
                                  >
                                    {/* Badge */}

                                    {meta?.badge && (
                                      <div
                                        className={cn(
                                          "absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 py-0.5 text-[8px] font-medium uppercase tracking-wider border rounded-full whitespace-nowrap z-10",
                                          "bg-muted text-muted-foreground border-border/40",
                                        )}
                                      >
                                        {meta.badge}
                                      </div>
                                    )}

                                    <div
                                      className={cn(
                                        "font-semibold text-sm md:text-base",
                                        isSelected
                                          ? "text-foreground"
                                          : " text-muted-foreground",
                                      )}
                                    >
                                      {sizeObj.label === "Elite"
                                        ? "Executive"
                                        : sizeObj.label}
                                    </div>

                                    <div className="text-[9px] md:text-[11px] text-muted-foreground leading-snug">
                                      {meta?.subtitle}
                                    </div>
                                  </div>
                                );
                              } else {
                                return (
                                  <OptionCard
                                    isSelected={field.value === sizeObj.label}
                                    key={sizeObj.label}
                                    className="min-w-0 whitespace-nowrap rounded-xl px-1.5 py-1 text-[10px] font-medium text-center transition-all duration-200 active:scale-[0.98] md:px-1 md:py-[6px] md:text-[13px]"
                                    selectedClassName="bg-foreground text-background"
                                    unselectedClassName="bg-secondary text-muted-foreground hover:bg-muted hover:text-foreground"
                                    onClick={() => {
                                      updatePropertyField(
                                        index,

                                        "propertySize",

                                        sizeObj.label,
                                      );

                                      setValue(
                                        `properties.${index}.services`,
                                        [],
                                      );
                                    }}
                                  >
                                    {sizeObj.label}
                                  </OptionCard>
                                );
                              }
                            },
                          )}
                        </div>
                      )}
                    />
                    {property.propertyType === "Commercial" && packageInfo && (
                      <div className="mt-4 p-3 sm:p-4 rounded-xl bg-secondary/20 border border-border/30">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Camera className="w-4 h-4" />
                            <span>
                              <span
                                className={getPackageInfoLabelClassName(
                                  packageInfo.photos,
                                )}
                              >
                                Photos:
                              </span>{" "}
                              {packageInfo.photos}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <Video className="w-4 h-4" />
                            <span>
                              <span
                                className={getPackageInfoLabelClassName(
                                  packageInfo.reel,
                                )}
                              >
                                Reel:
                              </span>{" "}
                              {packageInfo.reel}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <Video className="w-4 h-4" />
                            <span>
                              <span
                                className={getPackageInfoLabelClassName(
                                  packageInfo.walkthrough,
                                )}
                              >
                                Walkthrough:
                              </span>{" "}
                              {packageInfo.walkthrough}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            <span>
                              <span
                                className={getPackageInfoLabelClassName(
                                  packageInfo.tour,
                                )}
                              >
                                360 Tour:
                              </span>{" "}
                              {packageInfo.tour}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {errors.properties?.[index]?.propertySize && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.properties[index].propertySize.message}
                      </p>
                    )}
                  </div>
                )}

                {/* Services Selection */}

                {property.propertySize &&
                  pricingConfig?.[property.propertyType] && (
                    <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                      <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
                        {property.propertyType === "Commercial"
                          ? "Step 2 — Select Services"
                          : "SERVICES"}
                      </label>
                      <p className="mb-4 text-[10px] text-muted-foreground/60">
                        {property.propertyType === "Commercial"
                          ? "Service availability depends on the selected commercial scale."
                          : "Choose one or more services. Videography opens format and lighting options."}
                      </p>

                      <Controller
                        name={`properties.${index}.services`}
                        control={control}
                        render={({ field }) => (
                          <div className="grid grid-cols-1 gap-2.5 md:gap-4 md:grid-cols-3 xl:grid-cols-3 w-full">
                            {(() => {
                              const typeConfig =
                                pricingConfig[property.propertyType];

                              const sizeConfig = typeConfig.sizes.find(
                                (s) => s.label === property.propertySize,
                              );

                              if (!sizeConfig) return null;

                              return SERVICE_ORDER.map((serviceName) => {
                                const isCommercial =
                                  property.propertyType === "Commercial";
                                const availableServices = isCommercial
                                  ? COMMERCIAL_SERVICE_AVAILABILITY[
                                      property.propertySize
                                    ] || []
                                  : SERVICE_ORDER;
                                const isTourIncluded =
                                  serviceName !== "360° Tour" ||
                                  packageInfo?.tour !== "Not included";
                                const isServiceAvailable =
                                  !isCommercial ||
                                  (availableServices.includes(serviceName) &&
                                    isTourIncluded);

                                let priceConfig =
                                  sizeConfig.prices[serviceName];

                                if (priceConfig === undefined) return null;

                                // Handle videography sub-service pricing

                                let price;

                                if (
                                  serviceName === "Videography" &&
                                  property.videographySubService &&
                                  typeof priceConfig === "object"
                                ) {
                                  price = videographySelections.reduce(
                                    (sum, selection) => {
                                      const resolved =
                                        resolveVideographyPriceConfig(
                                          priceConfig,
                                          selection,
                                        );
                                      const val =
                                        typeof resolved === "object"
                                          ? Number(resolved?.price || 0)
                                          : Number(resolved || 0);
                                      return (
                                        sum + (Number.isFinite(val) ? val : 0)
                                      );
                                    },
                                    0,
                                  );
                                } else {
                                  price =
                                    typeof priceConfig === "object"
                                      ? priceConfig.price || 0
                                      : priceConfig || 0;
                                }

                                const Icon =
                                  SERVICE_ICONS[serviceName] || Camera;

                                const isSelected =
                                  field.value?.includes(serviceName);

                                return [
                                  <OptionCard
                                    key={serviceName}
                                    isSelected={isSelected}
                                    className="relative min-h-[76px] px-3.5 py-3 md:min-h-[108px] md:px-4 md:py-3.5"
                                    selectedClassName="border-white/30 bg-white/[0.07] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
                                    unselectedClassName={cn(
                                      "border-white/10 bg-white/[0.03] text-muted-foreground",
                                      isServiceAvailable
                                        ? "hover:border-white/20 hover:text-white"
                                        : "cursor-not-allowed opacity-60",
                                    )}
                                    onClick={() => {
                                      if (!isServiceAvailable) return;
                                      toggleService(
                                        index,
                                        serviceName,
                                        field.value || [],
                                      );
                                    }}
                                  >
                                    <div className="flex w-full flex-row items-start gap-2 md:flex-col md:gap-2.5 text-left">
                                      <div className="mt-0.5 shrink-0 rounded-full border border-white/8 bg-white/[0.03] p-1.5">
                                        <Icon
                                          size={11}
                                          className={
                                            isSelected
                                              ? "text-foreground"
                                              : "text-muted-foreground"
                                          }
                                        />
                                      </div>
                                      <div className="flex w-full items-start justify-between gap-2.5 md:block">
                                        <div className="min-w-0">
                                          <div className="mb-0.5 text-[11px] font-semibold leading-4 md:mb-1 md:text-sm">
                                            {serviceName}
                                          </div>

                                          <div className="mb-0.5 text-[9px] leading-3 text-muted-foreground md:mb-1 md:text-[10px]">
                                            {property.propertyType ===
                                            "Commercial"
                                              ? isServiceAvailable
                                                ? formatDeliveryLabel(
                                                    getServiceDeliveryText(
                                                      property.propertyType,
                                                      serviceName,
                                                    ),
                                                  )
                                                : "Unavailable for selected scale"
                                              : serviceName === "Videography"
                                                ? SERVICE_SUBTITLES[serviceName]
                                                : formatDeliveryLabel(
                                                    getServiceDeliveryText(
                                                      property.propertyType,
                                                      serviceName,
                                                    ),
                                                  )}
                                          </div>
                                        </div>

                                        {property.propertyType ===
                                        "Commercial" ? (
                                          <div className="shrink-0 text-[11px] md:text-sm font-medium text-foreground/90">
                                            {serviceName !== "Videography" &&
                                              isServiceAvailable &&
                                              `AED ${price}`}
                                          </div>
                                        ) : (
                                          serviceName !== "Videography" && (
                                            <div className="shrink-0 text-[11px] md:text-sm font-medium text-foreground/90">
                                              AED {price}
                                            </div>
                                          )
                                        )}
                                      </div>
                                      {isSelected && (
                                        <span className="absolute right-2.5 top-2.5 h-5 w-5 rounded-full bg-white text-black flex items-center justify-center">
                                          <Check className="h-3 w-3" />
                                        </span>
                                      )}
                                    </div>
                                  </OptionCard>,
                                  serviceName === "Videography" &&
                                  isSelected ? (
                                    <div
                                      key={`${serviceName}-mobile-options`}
                                      className="lg:hidden"
                                    >
                                      {renderVideographySubServiceSelection()}
                                    </div>
                                  ) : null,
                                ];
                              });
                            })()}
                          </div>
                        )}
                      />

                      {errors.properties?.[index]?.services && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors.properties[index].services.message}
                        </p>
                      )}
                    </div>
                  )}

                {/* Videography Sub-Service Selection */}

                {property.services?.includes("Videography") && (
                  <div className="hidden lg:block animate-in fade-in slide-in-from-top-4 duration-300">
                    <label className="block text-[11px] tracking-[0.18em] uppercase font-medium text-muted-foreground/90 mb-3">
                      Video Format
                    </label>

                    <Controller
                      name={`properties.${index}.videographySubService`}
                      control={control}
                      render={({ field }) => (
                        <>

                          <div
                            className={
                              property.propertyType === "Commercial" &&
                              property.propertySize === "Basic"
                                ? "grid grid-cols-1 gap-2.5 w-full"
                                : "grid grid-cols-1 lg:grid-cols-2 gap-2.5 w-full"
                            }
                          >
                            {VIDEOGRAPHY_SUB_SERVICE_ORDER.map((subService) => {
                              // Filter videography sub-services for commercial Basic tier

                              if (
                                property.propertyType === "Commercial" &&
                                property.propertySize === "Basic"
                              ) {
                                if (
                                  subService !==
                                  VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM
                                ) {
                                  return null;
                                }
                              }

                              const typeConfig =
                                pricingConfig[property.propertyType];

                              const sizeConfig = typeConfig?.sizes?.find(
                                (s) => s.label === property.propertySize,
                              );

                              const servicePriceConfig =
                                sizeConfig?.prices?.["Videography"]?.[
                                  subService
                                ];

                              // Calculate base price for display

                              let basePrice;

                              if (property.propertyType === "Commercial") {
                                // For commercial, use simplified pricing

                                basePrice = servicePriceConfig?.price || 0;
                              } else {
                                // For non-commercial, keep existing logic

                                if (
                                  subService ===
                                  VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM
                                ) {
                                  basePrice = servicePriceConfig?.price || 0;
                                } else {
                                  // For Long Form, show minimum of subcategories ("From")

                                  if (
                                    !servicePriceConfig ||
                                    typeof servicePriceConfig !== "object"
                                  ) {
                                    basePrice = 0;
                                  } else {
                                    const values =
                                      Object.values(servicePriceConfig);

                                    const count = values.length;

                                    basePrice = count
                                      ? Math.min(
                                          ...values.map((cat) =>
                                            typeof cat?.price === "number"
                                              ? cat.price
                                              : Infinity,
                                          ),
                                        )
                                      : 0;

                                    if (basePrice === Infinity) basePrice = 0;
                                  }
                                }
                              }

                              return (
                                <OptionCard
                                  key={subService}
                                  className="!px-4 !py-3 md:!px-5 md:!py-3.5"
                                  selectedClassName="border-white bg-white text-black"
                                  unselectedClassName="border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/20 hover:text-white"
                                  isSelected={
                                    subService ===
                                    VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM
                                      ? hasShortFormSelection
                                      : Boolean(selectedLongForm)
                                  }
                                  onClick={() => {
                                    const currentSelections =
                                      parseVideographySelections(field.value);
                                    const withoutLong =
                                      currentSelections.filter(
                                        (v) =>
                                          !v.startsWith(
                                            `${VIDEOGRAPHY_SUB_SERVICES.LONG_FORM}.`,
                                          ) &&
                                          v !==
                                            VIDEOGRAPHY_SUB_SERVICES.LONG_FORM,
                                      );
                                    const hasLong = currentSelections.some(
                                      (v) =>
                                        v.startsWith(
                                          `${VIDEOGRAPHY_SUB_SERVICES.LONG_FORM}.`,
                                        ) ||
                                        v ===
                                          VIDEOGRAPHY_SUB_SERVICES.LONG_FORM,
                                    );
                                    const hasShort = currentSelections.includes(
                                      VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM,
                                    );

                                    if (
                                      subService ===
                                      VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM
                                    ) {
                                      const nextSelections = hasShort
                                        ? currentSelections.filter(
                                            (v) =>
                                              v !==
                                              VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM,
                                          )
                                        : [
                                            ...currentSelections,
                                            VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM,
                                          ];
                                      updatePropertyField(
                                        index,
                                        "videographySubService",
                                        serializeVideographySelections(
                                          nextSelections,
                                        ),
                                      );
                                      return;
                                    }

                                    if (
                                      property.propertyType === "Commercial"
                                    ) {
                                      const nextSelections = hasLong
                                        ? withoutLong
                                        : [
                                            ...withoutLong,
                                            VIDEOGRAPHY_SUB_SERVICES.LONG_FORM,
                                          ];
                                      updatePropertyField(
                                        index,
                                        "videographySubService",
                                        serializeVideographySelections(
                                          nextSelections,
                                        ),
                                      );
                                      return;
                                    }

                                    if (hasLong) {
                                      updatePropertyField(
                                        index,
                                        "videographySubService",
                                        serializeVideographySelections(
                                          withoutLong,
                                        ),
                                      );
                                      return;
                                    }

                                    const categoriesObj =
                                      VIDEOGRAPHY_SUB_CATEGORIES?.[subService];
                                    const firstCategoryLabel = categoriesObj
                                      ? Object.values(categoriesObj)[0]
                                      : undefined;
                                    const longSelection = firstCategoryLabel
                                      ? `${subService}.${firstCategoryLabel}`
                                      : subService;
                                    updatePropertyField(
                                      index,
                                      "videographySubService",
                                      serializeVideographySelections([
                                        ...currentSelections,
                                        longSelection,
                                      ]),
                                    );
                                  }}
                                >
                                  <div className="flex flex-col w-full text-left gap-1.5">
                                    {/* Title + Price */}
                                    <div className="flex items-center justify-between w-full">
                                      <span className="text-[13px] font-semibold md:text-sm">
                                        {VIDEOGRAPHY_OPTION_META[subService]
                                          ?.title || subService}
                                      </span>

                                      <span className="text-[13px] font-semibold md:text-sm">
                                        AED{" "}
                                        {(() => {
                                          if (
                                            subService !==
                                            VIDEOGRAPHY_SUB_SERVICES.LONG_FORM
                                          ) {
                                            return basePrice;
                                          }

                                          const typeConfig =
                                            pricingConfig[
                                              property.propertyType
                                            ];
                                          const sizeConfig =
                                            typeConfig?.sizes?.find(
                                              (s) =>
                                                s.label ===
                                                property.propertySize,
                                            );

                                          const videographyPriceConfig =
                                            sizeConfig?.prices?.["Videography"];

                                          const resolved =
                                            resolveVideographyPriceConfig(
                                              videographyPriceConfig,
                                              selectedLongForm ||
                                                VIDEOGRAPHY_SUB_SERVICES.LONG_FORM,
                                            );

                                          const amount =
                                            typeof resolved === "object"
                                              ? Number(resolved?.price || 0)
                                              : Number(resolved || 0);

                                          return amount || basePrice;
                                        })()}
                                      </span>
                                    </div>

                                    {/* Subtitle */}
                                    <div className="text-muted-foreground text-xs">
                                      {
                                        VIDEOGRAPHY_OPTION_META[subService]
                                          ?.subtitle
                                      }
                                    </div>

                                    {/* Delivery */}
                                    <div className="flex items-center gap-1 text-muted-foreground/80 md:text-xs">
                                      <Clock className="h-3 w-3" />
                                      {formatDeliveryLabel(
                                        getVideographyOptionDeliveryText(
                                          property.propertyType,
                                          property.propertySize,
                                          subService,
                                        ),
                                      )}
                                    </div>
                                  </div>
                                </OptionCard>
                              );
                            })}
                          </div>
                          {/* <div className="mt-1 text-2xl font-bold text-foreground">
                        {(() => {
                          const typeConfig = pricingConfig[property.propertyType];
                          const sizeConfig = typeConfig?.sizes?.find(
                            (s) => s.label === property.propertySize,
                          );
                          const videographyPriceConfig =
                            sizeConfig?.prices?.["Videography"];
                          if (!videographyPriceConfig) return "AED 0";

                          const selectedSelections = parseVideographySelections(field.value);
                          const effectiveSelections =
                            selectedSelections.length > 0
                              ? selectedSelections
                              : [VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM];

                          const total = effectiveSelections.reduce((sum, selection) => {
                            const resolved = resolveVideographyPriceConfig(
                              videographyPriceConfig,
                              selection,
                            );
                            const amount =
                              typeof resolved === "object"
                                ? Number(resolved?.price || 0)
                                : Number(resolved || 0);
                            return sum + (Number.isFinite(amount) ? amount : 0);
                          }, 0);

                          return `AED ${total}`;
                        })()}
                      </div> */}

                          {/* Lighting Preference Selection - Show when Long Form category is selected */}

                          {selectedLongForm?.startsWith(
                            `${VIDEOGRAPHY_SUB_SERVICES.LONG_FORM}.`,
                          ) &&
                            property.propertyType !== "Commercial" && (
                              <div className="mt-4">
                                <label className="block text-[11px] tracking-[0.18em] uppercase font-medium text-muted-foreground/90 mb-3">
                                  Lighting Preference
                                </label>

                                <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
                                  {(() => {
                                    const [mainService, selectedCategoryLabel] =
                                      selectedLongForm.split(".") || [];

                                    const categories =
                                      VIDEOGRAPHY_SUB_CATEGORIES[mainService];

                                    if (!categories) return null;

                                    const currentCategory =
                                      selectedCategoryLabel ||
                                      Object.values(categories)[0];

                                    return Object.entries(categories).map(
                                      ([categoryKey, categoryName]) => {
                                        const typeConfig =
                                          pricingConfig[property.propertyType];

                                        const sizeConfig =
                                          typeConfig?.sizes?.find(
                                            (s) =>
                                              s.label === property.propertySize,
                                          );

                                        const priceConfig =
                                          sizeConfig?.prices?.["Videography"]?.[
                                            mainService
                                          ]?.[categoryName];

                                        return (
                                          <OptionCard
                                            key={categoryKey}
                                            className="relative !rounded-[18px] !px-4 !py-3 md:!rounded-[20px] md:!py-3.5"
                                            selectedClassName="border-white/40 bg-white/[0.08] text-white"
                                            unselectedClassName="border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/25 hover:text-white"
                                            isSelected={
                                              currentCategory === categoryName
                                            }
                                            onClick={() => {
                                              const currentSelections =
                                                parseVideographySelections(
                                                  field.value,
                                                );
                                              const withoutLong =
                                                currentSelections.filter(
                                                  (v) =>
                                                    !v.startsWith(
                                                      `${VIDEOGRAPHY_SUB_SERVICES.LONG_FORM}.`,
                                                    ) &&
                                                    v !==
                                                      VIDEOGRAPHY_SUB_SERVICES.LONG_FORM,
                                                );
                                              updatePropertyField(
                                                index,
                                                "videographySubService",
                                                serializeVideographySelections([
                                                  ...withoutLong,
                                                  `${mainService}.${categoryName}`,
                                                ]),
                                              );
                                            }}
                                          >
                                            <div className="flex items-center justify-center gap-2">
                                              <div className="text-[13px] font-medium">
                                                {categoryName}
                                              </div>
                                              {currentCategory ===
                                                categoryName && (
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-white text-black flex items-center justify-center">
                                                  <Check className="h-3 w-3" />
                                                </span>
                                              )}
                                            </div>
                                          </OptionCard>
                                        );
                                      },
                                    );
                                  })()}
                                </div>
                              </div>
                            )}
                        </>
                      )}
                    />

                    {errors.properties?.[index]?.videographySubService && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.properties[index].videographySubService.message}
                      </p>
                    )}
                  </div>
                )}

                {/* Location Details - order: Community/Area, Building/Tower, Unit */}
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-3">
                    LOCATION
                  </label>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
                    <Controller
                      name={`properties.${index}.community`}
                      control={control}
                      render={({ field, fieldState }) => (
                        <div className="flex flex-col gap-1.5">
                          <label className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                            <MapPin className="w-3 h-3" />
                            Community / Area
                          </label>
                          <Input
                            {...field}
                            placeholder="e.g., Dubai Marina"
                            className="bg-secondary/50 border-border hover:border-muted-foreground/20 input-glow h-10 rounded-xl text-xs"
                          />
                          {fieldState.error && (
                            <p className="text-red-500 text-xs">
                              {fieldState.error.message}
                            </p>
                          )}
                        </div>
                      )}
                    />
                    <Controller
                      name={`properties.${index}.building`}
                      control={control}
                      render={({ field, fieldState }) => (
                        <div className="flex flex-col gap-1.5">
                          <label className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                            <Building className="w-3 h-3" />
                            Building / Tower
                          </label>
                          <Input
                            {...field}
                            placeholder="e.g., Marina Heights"
                            className="bg-secondary/50 border-border hover:border-muted-foreground/20 input-glow h-10 rounded-xl text-xs"
                          />
                          {fieldState.error && (
                            <p className="text-red-500 text-xs">
                              {fieldState.error.message}
                            </p>
                          )}
                        </div>
                      )}
                    />
                    <Controller
                      name={`properties.${index}.unitNumber`}
                      control={control}
                      render={({ field, fieldState }) => (
                        <div className="flex flex-col gap-1.5">
                          <label className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                            <Hash className="w-3 h-3" />
                            Unit Number
                          </label>
                          <Input
                            {...field}
                            placeholder="e.g., 1205"
                            className="bg-secondary/50 border-border hover:border-muted-foreground/20 input-glow h-10 rounded-xl text-xs"
                          />
                          {fieldState.error && (
                            <p className="text-red-500 text-xs">
                              {fieldState.error.message}
                            </p>
                          )}
                        </div>
                      )}
                    />
                  </div>
                </div>

                {/* Date and Time Details */}
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-3">
                    DATE & TIME
                  </label>
                  {!property.community?.trim() ? (
                    <div className="rounded-xl border border-border bg-secondary/20 px-4 py-4 text-center">
                      <p className="text-sm text-muted-foreground">
                        Enter a location above to unlock date & time selection.
                      </p>
                    </div>
                  ) : (
                    <DateSlotPicker
                      date={property.preferredDate}
                      slot={property.startTime}
                      duration={property.duration || 1}
                      isNightService={isNightService}
                      blockedSlotsMap={getOccupiedSlots(index)}
                      propertyType={property.propertyType}
                      propertySize={property.propertySize}
                      serviceType={property.services?.[0] || ""}
                      onDateChange={(d) =>
                        updatePropertyField(index, "preferredDate", d)
                      }
                      onSlotChange={(s) =>
                        updatePropertyField(index, "startTime", s)
                      }
                      error={
                        errors.properties?.[index]?.preferredDate?.message ||
                        errors.properties?.[index]?.startTime?.message
                      }
                    />
                  )}
                </div>
              </>
            )}

            {/* Card footer: Duplicate + Subtotal */}
            <div className="flex items-center justify-between pt-4 border-t border-border/50">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground text-xs"
                  onClick={() => onDuplicate(index)}
                >
                  <Copy size={14} className="mr-1.5" />
                  Duplicate
                </Button>
                {!isOnlyProperty && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive text-xs"
                    onClick={() => onRemove(index)}
                  >
                    <Trash2 size={14} className="mr-1.5" />
                    Remove
                  </Button>
                )}
              </div>
              {price > 0 && (
                <p className="text-sm font-semibold text-foreground">
                  Subtotal: AED {price.toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
