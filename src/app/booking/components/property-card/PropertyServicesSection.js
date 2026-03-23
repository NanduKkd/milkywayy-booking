import { Camera, Check } from "lucide-react";
import { Controller } from "react-hook-form";

import { cn } from "@/lib/utils";

import { SERVICE_ORDER } from "@/lib/config/pricing";

import { OptionCard } from "../OptionCard";
import {
  COMMERCIAL_SERVICE_AVAILABILITY,
  SERVICE_ICONS,
  SERVICE_SUBTITLES,
} from "./constants";
import {
  formatDeliveryLabel,
  getPropertySizeConfig,
  getServiceDeliveryText,
  getVideographySelectionsTotal,
} from "./utils";

export function PropertyServicesSection({
  control,
  errorMessage,
  index,
  mobileVideographyOptions,
  packageInfo,
  pricingConfig,
  property,
  toggleService,
  videographySelections,
}) {
  if (!property.propertySize || !pricingConfig?.[property.propertyType]) {
    return null;
  }

  return (
    <div className="animate-in fade-in slide-in-from-top-4 duration-300">
      <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
        {property.propertyType === "Commercial" ? "Step 2 — Select Services" : "SERVICES"}
      </label>

      <Controller
        name={`properties.${index}.services`}
        control={control}
        render={({ field }) => {
          const sizeConfig = getPropertySizeConfig(
            pricingConfig,
            property.propertyType,
            property.propertySize,
          );

          if (!sizeConfig) return null;

          return (
            <div className="grid grid-cols-1 gap-2.5 md:gap-4 md:grid-cols-3 xl:grid-cols-3 w-full">
              {SERVICE_ORDER.map((serviceName) => {
                const isCommercial = property.propertyType === "Commercial";
                const availableServices = isCommercial
                  ? COMMERCIAL_SERVICE_AVAILABILITY[property.propertySize] || []
                  : SERVICE_ORDER;
                const isTourIncluded =
                  serviceName !== "360° Tour" || packageInfo?.tour !== "Not included";
                const isServiceAvailable =
                  !isCommercial ||
                  (availableServices.includes(serviceName) && isTourIncluded);

                const priceConfig = sizeConfig.prices[serviceName];

                if (priceConfig === undefined) return null;

                const price =
                  serviceName === "Videography" &&
                  property.videographySubService &&
                  typeof priceConfig === "object"
                    ? getVideographySelectionsTotal(priceConfig, videographySelections)
                    : typeof priceConfig === "object"
                      ? priceConfig.price || 0
                      : priceConfig || 0;

                const Icon = SERVICE_ICONS[serviceName] || Camera;
                const isSelected = field.value?.includes(serviceName);

                return [
                  <OptionCard
                    key={serviceName}
                    isSelected={isSelected}
                    className="relative px-3.5 py-3 md:min-h-[108px] md:px-4 md:py-3.5"
                    selectedClassName="border-white/30 bg-white/[0.07] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
                    unselectedClassName={cn(
                      "border-white/10 bg-white/[0.03] text-muted-foreground",
                      isServiceAvailable
                        ? "hover:border-white/20 hover:text-white"
                        : "cursor-not-allowed opacity-60",
                    )}
                    onClick={() => {
                      if (!isServiceAvailable) return;
                      toggleService(index, serviceName, field.value || []);
                    }}
                  >
                    <div className="flex w-full flex-row items-start gap-2 md:flex-col md:gap-2.5 text-left">
                      <div className="mt-0.5 shrink-0 rounded-full border border-white/8 bg-white/[0.03] p-1.5">
                        <Icon
                          size={14}
                          className={
                            isSelected ? "text-foreground" : "text-muted-foreground"
                          }
                        />
                      </div>
                      <div className="flex w-full items-center justify-between gap-2.5 md:block">
                        <div className="min-w-0">
                          <div className="mb-0.5 text-sm font-semibold leading-4 md:mb-1 md:text-sm">
                            {serviceName}
                          </div>

                          <div className="mb-0.5 text-2xs mt-1 leading-3 text-muted-foreground md:mb-1 md:text-2xs">
                            {property.propertyType === "Commercial"
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

                        <div className="shrink-0 text-sm md:text-sm font-bold text-foreground/90">
                          {property.propertyType === "Commercial" ? (
                              serviceName !== "Videography" &&
                                isServiceAvailable &&
                                `AED ${price}`
                          ) : (
                            serviceName !== "Videography" && (
                                `AED ${price}`
                            )
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <span className="absolute right-1.5 top-1.5 h-4 w-4 rounded-full bg-white text-black flex items-center justify-center">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                  </OptionCard>,
                  serviceName === "Videography" && isSelected ? (
                    <div key={`${serviceName}-mobile-options`} className="lg:hidden">
                      {mobileVideographyOptions}
                    </div>
                  ) : null,
                ];
              })}
            </div>
          );
        }}
      />

      {errorMessage && <p className="text-red-500 text-xs mt-1">{errorMessage}</p>}
    </div>
  );
}
