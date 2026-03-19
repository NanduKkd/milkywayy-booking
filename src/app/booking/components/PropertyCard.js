import { isNightServiceSelected } from "@/lib/helpers/bookingUtils";
import { cn } from "@/lib/utils";

import { VIDEOGRAPHY_SUB_SERVICES } from "@/lib/config/pricing";

import { TIER_PACKAGE_DETAILS } from "./property-card/constants";
import { PropertyCardFooter } from "./property-card/PropertyCardFooter";
import { PropertyCardHeader } from "./property-card/PropertyCardHeader";
import { PropertyLocationSection } from "./property-card/PropertyLocationSection";
import { PropertyScheduleSection } from "./property-card/PropertyScheduleSection";
import { PropertyServicesSection } from "./property-card/PropertyServicesSection";
import { PropertySizeSection } from "./property-card/PropertySizeSection";
import { PropertyTypeSection } from "./property-card/PropertyTypeSection";
import { VideographyOptionsSection } from "./property-card/VideographyOptionsSection";
import {
  getPropertyTitleParts,
  getSelectedLongForm,
  parseVideographySelections,
} from "./property-card/utils";

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
  getOccupiedSlots,
  toggleService,
  updatePropertyField,
  isOnlyProperty,
}) {
  const propertyErrors = errors.properties?.[index] || {};
  const videographySelections = parseVideographySelections(
    property.videographySubService,
  );
  const hasShortFormSelection = videographySelections.includes(
    VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM,
  );
  const selectedLongForm = getSelectedLongForm(videographySelections);
  const price = getPropertyPrice(property);
  const tierKey =
    property.propertySize === "Executive" ? "Elite" : property.propertySize;
  const packageInfo =
    property.propertyType === "Commercial" &&
    tierKey &&
    TIER_PACKAGE_DETAILS[tierKey]
      ? TIER_PACKAGE_DETAILS[tierKey]
      : null;
  const titleParts = getPropertyTitleParts(property);
  const isNightService = isNightServiceSelected(
    property.services || [],
    property.videographySubService || "",
  );

  const videographyOptionsProps = {
    control,
    errorMessage: propertyErrors.videographySubService?.message,
    hasShortFormSelection,
    index,
    pricingConfig,
    property,
    selectedLongForm,
    updatePropertyField,
  };

  return (
    <div
      className={cn(
        "premium-card rounded-xl md:rounded-2xl overflow-hidden card-hover-lift border border-border transition-all duration-300",
        isOpen ? "relative z-10 ring-2 ring-primary/20" : "relative z-0",
      )}
    >
      <PropertyCardHeader
        index={index}
        isOpen={isOpen}
        onToggle={onToggle}
        price={price}
        titleParts={titleParts}
      />

      {isOpen && (
        <>
          <div className="border-t border-border" />

          <div className="pt-4 md:pt-6 px-4 md:px-6 pb-5 md:pb-6 space-y-6 md:space-y-8 overflow-visible">
            <PropertyTypeSection
              control={control}
              errorMessage={propertyErrors.propertyType?.message}
              index={index}
              pricingConfig={pricingConfig}
              setValue={setValue}
              updatePropertyField={updatePropertyField}
            />

            {property.propertyType && (
              <>
                <PropertySizeSection
                  control={control}
                  errorMessage={propertyErrors.propertySize?.message}
                  index={index}
                  packageInfo={packageInfo}
                  pricingConfig={pricingConfig}
                  propertyType={property.propertyType}
                  setValue={setValue}
                  updatePropertyField={updatePropertyField}
                />

                <PropertyServicesSection
                  control={control}
                  errorMessage={propertyErrors.services?.message}
                  index={index}
                  mobileVideographyOptions={
                    <VideographyOptionsSection
                      {...videographyOptionsProps}
                      variant="mobile"
                    />
                  }
                  packageInfo={packageInfo}
                  pricingConfig={pricingConfig}
                  property={property}
                  toggleService={toggleService}
                  videographySelections={videographySelections}
                />

                {property.services?.includes("Videography") && (
                  <VideographyOptionsSection
                    {...videographyOptionsProps}
                    variant="desktop"
                  />
                )}

                <PropertyLocationSection control={control} index={index} />

                <PropertyScheduleSection
                  errorMessage={
                    propertyErrors.preferredDate?.message ||
                    propertyErrors.startTime?.message
                  }
                  getOccupiedSlots={getOccupiedSlots}
                  index={index}
                  isNightService={isNightService}
                  property={property}
                  updatePropertyField={updatePropertyField}
                />
              </>
            )}

            <PropertyCardFooter
              index={index}
              isOnlyProperty={isOnlyProperty}
              onDuplicate={onDuplicate}
              onRemove={onRemove}
              price={price}
            />
          </div>
        </>
      )}
    </div>
  );
}
