import { Check, Clock } from "lucide-react";
import { Controller } from "react-hook-form";

import {
  VIDEOGRAPHY_SUB_CATEGORIES,
  VIDEOGRAPHY_SUB_SERVICE_ORDER,
  VIDEOGRAPHY_SUB_SERVICES,
} from "@/lib/config/pricing";
import {
  getBookingLoadBreakdown,
  getDynamicTwilightSlotLabel,
} from "@/lib/helpers/bookingUtils";
import { cn } from "@/lib/utils";

import { OptionCard } from "../OptionCard";
import { VIDEOGRAPHY_OPTION_META } from "./constants";
import {
  formatDeliveryLabel,
  getInitialLongFormSelection,
  getPropertySizeConfig,
  getVideographyBasePrice,
  getVideographyOptionDeliveryText,
  getVideographySelectionPrice,
  parseVideographySelections,
  serializeVideographySelections,
} from "./utils";

const MOBILE_LABEL_CLASS =
  "block text-2xs md:text-xs tracking-[0.02em] md:tracking-[0.18em] font-medium text-muted-foreground/90 mb-2.5 md:mb-3";

const DESKTOP_LABEL_CLASS =
  "block text-xs tracking-[0.18em] uppercase font-medium text-muted-foreground/90 mb-3";

const SUBCATEGORY_TITLES = Object.freeze({
  DAYLIGHT: "Daylight",
  NIGHT_LIGHT: "Night",
  DAYLIGHT_NIGHT: "Day + Night",
});

const EVENING_LIGHTING_HELPER_TEXT =
  "Evening slots ensure optimal lighting and twilight shots.";
const AFTERNOON_TWILIGHT_HELPER_TEXT =
  "Afternoon slot selected for extended shoot and twilight transition.";

function getVideographyOptionMeta(subService) {
  if (subService === VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM) {
    return VIDEOGRAPHY_OPTION_META.shortForm;
  }

  if (subService === VIDEOGRAPHY_SUB_SERVICES.LONG_FORM) {
    return VIDEOGRAPHY_OPTION_META.longForm;
  }

  return null;
}

function getNextVideographySelections({
  currentSelections,
  propertyType,
  subService,
  variant,
}) {
  const withoutLong = currentSelections.filter(
    (value) =>
      !value.startsWith(`${VIDEOGRAPHY_SUB_SERVICES.LONG_FORM}.`) &&
      value !== VIDEOGRAPHY_SUB_SERVICES.LONG_FORM,
  );
  const hasLong = currentSelections.some(
    (value) =>
      value.startsWith(`${VIDEOGRAPHY_SUB_SERVICES.LONG_FORM}.`) ||
      value === VIDEOGRAPHY_SUB_SERVICES.LONG_FORM,
  );
  const hasShort = currentSelections.includes(
    VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM,
  );

  if (subService === VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM) {
    if (variant === "mobile") {
      return hasShort ? [] : [VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM];
    }

    return hasShort
      ? currentSelections.filter(
          (value) => value !== VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM,
        )
      : [...currentSelections, VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM];
  }

  if (propertyType === "Commercial") {
    return hasLong
      ? withoutLong
      : [...withoutLong, VIDEOGRAPHY_SUB_SERVICES.LONG_FORM];
  }

  if (hasLong) {
    return withoutLong;
  }

  const initialLongFormSelection = getInitialLongFormSelection(subService);

  return variant === "mobile"
    ? [initialLongFormSelection]
    : [...currentSelections, initialLongFormSelection];
}

function getSelectedLightingCategory(selectedLongForm, mainService) {
  const [, selectedCategoryLabel] = selectedLongForm.split(".") || [];
  const categories = VIDEOGRAPHY_SUB_CATEGORIES[mainService];

  if (!categories) return "";

  return selectedCategoryLabel || Object.values(categories)[0];
}

export function VideographyOptionsSection({
  control,
  errorMessage,
  hasShortFormSelection,
  index,
  onSelectionComplete,
  pricingConfig,
  property,
  selectedLongForm,
  updatePropertyField,
  variant = "desktop",
}) {
  const isMobile = variant === "mobile";
  const isCommercialBasic =
    property.propertyType === "Commercial" && property.propertySize === "Basic";
  const videographyLoad = getBookingLoadBreakdown({
    propertyType: property.propertyType,
    propertySize: property.propertySize,
    services: ["Videography"],
    videographySubService: [
      selectedLongForm,
      hasShortFormSelection ? VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM : "",
    ]
      .filter(Boolean)
      .join("|"),
  });
  const dynamicTwilightSlotLabel = getDynamicTwilightSlotLabel(
    videographyLoad.totalLoad,
  );
  const lightingHelperText =
    dynamicTwilightSlotLabel === "Afternoon"
      ? AFTERNOON_TWILIGHT_HELPER_TEXT
      : EVENING_LIGHTING_HELPER_TEXT;

  const containerClassName = cn(
    "animate-in fade-in slide-in-from-top-4 duration-300 border rounded-xl p-4 bg-secondary/40",
    isMobile ? "" : "hidden lg:block",
  );

  const gridClassName = isMobile
    ? isCommercialBasic
      ? "grid grid-cols-1 gap-2.5 w-full"
      : "grid grid-cols-2 lg:grid-cols-2 gap-2.5 w-full"
    : isCommercialBasic
      ? "grid grid-cols-1 lg:grid-cols-2 gap-2.5 w-full"
      : "grid grid-cols-1 lg:grid-cols-2 gap-2.5 w-full";

  return (
    <div className={containerClassName}>
      <p className={isMobile ? MOBILE_LABEL_CLASS : DESKTOP_LABEL_CLASS}>
        Video Format
      </p>

      <Controller
        name={`properties.${index}.videographySubService`}
        control={control}
        render={({ field }) => (
          <>
            <div className={gridClassName}>
              {VIDEOGRAPHY_SUB_SERVICE_ORDER.map((subService) => {
                const isSubServiceAvailable =
                  !isCommercialBasic ||
                  subService === VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM;
                const optionMeta = getVideographyOptionMeta(subService);

                const basePrice = getVideographyBasePrice({
                  pricingConfig,
                  propertyType: property.propertyType,
                  propertySize: property.propertySize,
                  subService,
                });
                const videographyPriceConfig = getPropertySizeConfig(
                  pricingConfig,
                  property.propertyType,
                  property.propertySize,
                )?.prices?.Videography;
                const resolvedLongFormPrice = getVideographySelectionPrice(
                  videographyPriceConfig,
                  selectedLongForm || VIDEOGRAPHY_SUB_SERVICES.LONG_FORM,
                );
                const displayPrice =
                  subService === VIDEOGRAPHY_SUB_SERVICES.LONG_FORM &&
                  resolvedLongFormPrice
                    ? resolvedLongFormPrice
                    : basePrice;

                return (
                  <OptionCard
                    key={subService}
                    className={cn(
                      isMobile
                        ? "!rounded-[18px] !px-4 !py-3 md:!rounded-[20px] md:!px-5 md:!py-3.5"
                        : "!px-4 !py-3 md:!px-5 md:!py-3.5",
                      !isSubServiceAvailable &&
                        "cursor-not-allowed opacity-60 hover:border-white/10 hover:text-muted-foreground",
                    )}
                    selectedClassName="border-white bg-white text-black"
                    unselectedClassName={cn(
                      "border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/20 hover:text-white",
                      !isSubServiceAvailable &&
                        "border-white/10 bg-white/[0.015] text-muted-foreground hover:border-white/10 hover:text-muted-foreground",
                    )}
                    isSelected={
                      isSubServiceAvailable &&
                      (subService === VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM
                        ? hasShortFormSelection
                        : Boolean(selectedLongForm))
                    }
                    onClick={() => {
                      if (!isSubServiceAvailable) return;

                      const nextSelections = getNextVideographySelections({
                        currentSelections: parseVideographySelections(
                          field.value,
                        ),
                        propertyType: property.propertyType,
                        subService,
                        variant,
                      });
                      const nextValue =
                        serializeVideographySelections(nextSelections);

                      updatePropertyField(
                        index,
                        "videographySubService",
                        nextValue,
                      );

                      if (field.value !== nextValue) {
                        onSelectionComplete?.();
                      }
                    }}
                  >
                    <div className="flex flex-col w-full text-left gap-1.5">
                      <div className="flex items-start justify-between w-full gap-3">
                        <span className="text-xs font-semibold md:text-sm">
                          {optionMeta?.title || subService}
                        </span>

                        {isSubServiceAvailable && (
                          <span className="text-sm font-semibold md:text-sm whitespace-nowrap">
                            AED {displayPrice}
                          </span>
                        )}
                      </div>

                      {(!isMobile ||
                        property.propertyType !== "Commercial") && (
                        <div
                          className={
                            isMobile
                              ? "text-2xs text-muted-foreground md:text-xs"
                              : "text-muted-foreground text-xs"
                          }
                        >
                          {isSubServiceAvailable
                            ? optionMeta?.subtitle
                            : "Not available"}
                        </div>
                      )}

                      {isSubServiceAvailable && (
                        <div
                          className={
                            isMobile
                              ? "flex items-center gap-1 text-2xs text-muted-foreground/80 md:text-xs"
                              : "flex items-center gap-1 text-muted-foreground/80 md:text-xs"
                          }
                        >
                          <Clock className="h-3 w-3" />
                          {formatDeliveryLabel(
                            getVideographyOptionDeliveryText(
                              property.propertyType,
                              property.propertySize,
                              subService,
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  </OptionCard>
                );
              })}
            </div>

            {selectedLongForm?.startsWith(
              `${VIDEOGRAPHY_SUB_SERVICES.LONG_FORM}.`,
            ) &&
              property.propertyType !== "Commercial" && (
                <div className="mt-4">
                  <p
                    className={
                      isMobile ? MOBILE_LABEL_CLASS : DESKTOP_LABEL_CLASS
                    }
                  >
                    Lighting Preference
                  </p>

                  {(() => {
                    const [mainService] = selectedLongForm.split(".") || [];
                    const categories = VIDEOGRAPHY_SUB_CATEGORIES[mainService];

                    if (!categories) return null;

                    const currentCategory = getSelectedLightingCategory(
                      selectedLongForm,
                      mainService,
                    );
                    const showEveningHelperText =
                      currentCategory ===
                        VIDEOGRAPHY_SUB_CATEGORIES[mainService]?.NIGHT_LIGHT ||
                      currentCategory ===
                        VIDEOGRAPHY_SUB_CATEGORIES[mainService]?.DAYLIGHT_NIGHT;

                    return (
                      <>
                        <div
                          className={
                            isMobile
                              ? "grid grid-cols-3 gap-2.5"
                              : "grid grid-cols-1 gap-2.5 md:grid-cols-3"
                          }
                        >
                          {Object.entries(categories).map(
                            ([categoryKey, categoryName]) => {
                              const categoryTitle =
                                SUBCATEGORY_TITLES[categoryKey] || categoryName;

                              return (
                                <OptionCard
                                  key={categoryKey}
                                  className={cn(
                                    "relative",
                                    isMobile
                                      ? "!rounded-[18px] !rounded-lg py-2 px-1 md:!py-3.5"
                                      : "!px-4 !py-3 md:!py-3.5",
                                  )}
                                  selectedClassName={
                                    isMobile
                                      ? "border-white/35 bg-white/[0.06] text-white"
                                      : "border-white/40 bg-white/[0.08] text-white"
                                  }
                                  unselectedClassName="border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/25 hover:text-white"
                                  isSelected={currentCategory === categoryName}
                                  onClick={() => {
                                    const currentSelections =
                                      parseVideographySelections(field.value);
                                    const withoutLong =
                                      currentSelections.filter(
                                        (value) =>
                                          !value.startsWith(
                                            `${VIDEOGRAPHY_SUB_SERVICES.LONG_FORM}.`,
                                          ) &&
                                          value !==
                                            VIDEOGRAPHY_SUB_SERVICES.LONG_FORM,
                                      );

                                    const nextValue =
                                      serializeVideographySelections([
                                        ...withoutLong,
                                        `${mainService}.${categoryName}`,
                                      ]);

                                    updatePropertyField(
                                      index,
                                      "videographySubService",
                                      nextValue,
                                    );

                                    if (field.value !== nextValue) {
                                      onSelectionComplete?.();
                                    }
                                  }}
                                >
                                  {isMobile
                                    ? <div className="flex items-center justify-center gap-1">
                                        <div className="font-medium text-2xs md:text-sm">
                                          {categoryTitle}
                                        </div>
                                        {currentCategory === categoryName && (
                                          <span className="absolute right-1 top-1.2 h-4 w-4 md:h-5 md:w-5 rounded-full bg-white text-black flex items-center justify-center">
                                            <Check className="h-3 w-3" />
                                          </span>
                                        )}
                                      </div>
                                    : <div className="flex items-center justify-center gap-2">
                                        <div className="text-sm font-medium">
                                          {categoryTitle}
                                        </div>
                                        {currentCategory === categoryName && (
                                          <span className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-white text-black flex items-center justify-center">
                                            <Check className="h-3 w-3" />
                                          </span>
                                        )}
                                      </div>}
                                </OptionCard>
                              );
                            },
                          )}
                        </div>

                        {showEveningHelperText && (
                          <p className="mt-3 text-[11px] text-center text-muted-foreground/70">
                            {lightingHelperText}
                          </p>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
          </>
        )}
      />

      {errorMessage && (
        <p className="text-red-500 text-xs mt-1">{errorMessage}</p>
      )}
    </div>
  );
}
