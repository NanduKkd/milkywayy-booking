import { Camera, Globe, Video } from "lucide-react";
import { Controller } from "react-hook-form";

import { cn } from "@/lib/utils";

import { OptionCard } from "../OptionCard";
import { getPackageInfoLabelClassName } from "./utils";

const COMMERCIAL_TIER_META = {
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

export function PropertySizeSection({
  control,
  errorMessage,
  index,
  onSelectionComplete,
  packageInfo,
  pricingConfig,
  propertyType,
  setValue,
  updatePropertyField,
}) {
  const isCommercial = propertyType === "Commercial";
  const sizeOptions = pricingConfig?.[propertyType]?.sizes || [];

  if (!propertyType || !pricingConfig?.[propertyType]) return null;

  return (
    <div className="animate-in fade-in slide-in-from-top-4 duration-300">
      <p className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
        {isCommercial ? "Step 1 — Property Scale" : "PROPERTY SIZE"}
      </p>

      {isCommercial
        ? <p className="mb-3 text-2xs text-muted-foreground/60">
            Select property scale. Then choose services.
          </p>
        : null}

      <Controller
        name={`properties.${index}.propertySize`}
        control={control}
        render={({ field }) => (
          <div
            className={
              isCommercial
                ? "grid grid-cols-2 md:grid-cols-4 gap-3 w-full"
                : "grid grid-cols-3 lg:grid-cols-6 gap-2 w-full"
            }
          >
            {sizeOptions.map((sizeObj) => {
              if (isCommercial) {
                const isSelected = field.value === sizeObj.label;
                const meta = COMMERCIAL_TIER_META[sizeObj.label];

                return (
                  <button
                    type="button"
                    key={sizeObj.label}
                    onClick={() => {
                      if (field.value === sizeObj.label) {
                        return;
                      }

                      updatePropertyField(index, "propertySize", sizeObj.label);
                      setValue(`properties.${index}.services`, ["Photography"]);
                      onSelectionComplete?.();
                    }}
                    className={cn(
                      "relative cursor-pointer rounded-xl border transition-all duration-300 p-3 text-left flex flex-col items-start justify-center gap-1.5 min-h-[74px]",
                      isSelected
                        ? "border-white/30 bg-white/[0.07] shadow-sm"
                        : "border-border/40 bg-secondary/20 hover:bg-secondary/40 hover:border-border/60",
                    )}
                  >
                    {meta?.badge && (
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 py-0.5 text-2xs font-medium uppercase tracking-wider border rounded-full whitespace-nowrap z-10 bg-muted text-muted-foreground border-border/40">
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
                      {sizeObj.label === "Elite" ? "Executive" : sizeObj.label}
                    </div>

                    <div className="text-2xs md:text-xs text-muted-foreground leading-snug">
                      {meta?.subtitle}
                    </div>
                  </button>
                );
              }

              return (
                <OptionCard
                  isSelected={field.value === sizeObj.label}
                  key={sizeObj.label}
                  className="min-w-0 whitespace-nowrap rounded-xl px-1.5 py-2 text-xs font-medium text-center transition-all duration-200 active:scale-[0.98] md:px-1 md:py-[6px] md:text-sm"
                  selectedClassName="bg-foreground text-background"
                  unselectedClassName="bg-secondary text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => {
                    if (field.value === sizeObj.label) {
                      return;
                    }

                    updatePropertyField(index, "propertySize", sizeObj.label);
                    setValue(`properties.${index}.services`, ["Photography"]);
                    onSelectionComplete?.();
                  }}
                >
                  {sizeObj.label}
                </OptionCard>
              );
            })}
          </div>
        )}
      />

      {isCommercial && packageInfo && (
        <div className="mt-4 p-3 sm:p-4 rounded-xl bg-secondary/20 border border-border/30">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-2xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Camera className="w-4 h-4" />
              <span>
                <span
                  className={getPackageInfoLabelClassName(packageInfo.photos)}
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
                  className={getPackageInfoLabelClassName(packageInfo.reel)}
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
                  className={getPackageInfoLabelClassName(packageInfo.tour)}
                >
                  360 Tour:
                </span>{" "}
                {packageInfo.tour}
              </span>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <p className="text-red-500 text-xs mt-1">{errorMessage}</p>
      )}
    </div>
  );
}
