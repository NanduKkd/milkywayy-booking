import { Building, Check } from "lucide-react";
import { Controller } from "react-hook-form";

import { PROPERTY_TYPE_ORDER } from "@/lib/config/pricing";
import { cn } from "@/lib/utils";

import { OptionCard } from "../OptionCard";
import { PROPERTY_TYPE_ICONS, PROPERTY_TYPE_META } from "./constants";

export function PropertyTypeSection({
  control,
  errorMessage,
  index,
  onSelectionComplete,
  pricingConfig,
  setValue,
  updatePropertyField,
}) {
  return (
    <div>
      <p className="block text-2xs md:text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2.5 md:mb-3">
        PROPERTY TYPE
      </p>

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
                    if (field.value === type) {
                      return;
                    }

                    updatePropertyField(index, "propertyType", type);
                    setValue(`properties.${index}.propertySize`, "");
                    setValue(`properties.${index}.services`, []);
                    onSelectionComplete?.();
                  }}
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl transition-colors md:h-10 md:w-10",
                      field.value === type ? "bg-accent/15" : "bg-secondary",
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
                        "text-xs font-medium transition-colors md:text-sm",
                        field.value === type
                          ? "text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      <span className="hidden md:inline">{typeMeta.label}</span>
                      <span className="md:hidden">{typeMeta.mobileLabel}</span>
                    </p>
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

      {errorMessage && (
        <p className="text-red-500 text-xs mt-1">{errorMessage}</p>
      )}
    </div>
  );
}
