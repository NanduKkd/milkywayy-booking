import { useRef } from "react";
import { VIDEOGRAPHY_SUB_SERVICES } from "@/lib/config/pricing";
import { isNightServiceSelected } from "@/lib/helpers/bookingUtils";
import { cn } from "@/lib/utils";

import { TIER_PACKAGE_DETAILS } from "./property-card/constants";
import { PropertyCardFooter } from "./property-card/PropertyCardFooter";
import { PropertyCardHeader } from "./property-card/PropertyCardHeader";
import { PropertyLocationSection } from "./property-card/PropertyLocationSection";
import { PropertyScheduleSection } from "./property-card/PropertyScheduleSection";
import { PropertyServicesSection } from "./property-card/PropertyServicesSection";
import { PropertySizeSection } from "./property-card/PropertySizeSection";
import { PropertyTypeSection } from "./property-card/PropertyTypeSection";
import {
  getPropertyTitleParts,
  getSelectedLongForm,
  parseVideographySelections,
} from "./property-card/utils";
import { VideographyOptionsSection } from "./property-card/VideographyOptionsSection";

function isMobileViewport() {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return false;
  }

  return window.matchMedia("(max-width: 767px)").matches;
}

function scrollSectionIntoView(sectionRef) {
  if (!isMobileViewport()) {
    return;
  }

  const scrollToSection = () => {
    sectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  if (typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(scrollToSection);
    });
    return;
  }

  window.setTimeout(scrollToSection, 32);
}

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
  const propertySizeSectionRef = useRef(null);
  const servicesSectionRef = useRef(null);
  const mobileVideographySectionRef = useRef(null);
  const locationSectionRef = useRef(null);
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

  const handlePropertyTypeSelectionComplete = () => {
    scrollSectionIntoView(propertySizeSectionRef);
  };

  const handlePropertySizeSelectionComplete = () => {
    scrollSectionIntoView(servicesSectionRef);
  };

  /*
  const handleServiceSelectionComplete = (serviceName) => {
    if (serviceName === "Videography") {
      scrollSectionIntoView(mobileVideographySectionRef);
      return;
    }

    scrollSectionIntoView(locationSectionRef);
  };

  const handleVideographySelectionComplete = () => {
    scrollSectionIntoView(locationSectionRef);
  };
  */

  const videographyOptionsProps = {
    control,
    errorMessage: propertyErrors.videographySubService?.message,
    hasShortFormSelection,
    index,
    // onSelectionComplete: handleVideographySelectionComplete,
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
              onSelectionComplete={handlePropertyTypeSelectionComplete}
              pricingConfig={pricingConfig}
              setValue={setValue}
              updatePropertyField={updatePropertyField}
            />

            {property.propertyType && (
              <>
                <div ref={propertySizeSectionRef} className="scroll-mt-24">
                  <PropertySizeSection
                    control={control}
                    errorMessage={propertyErrors.propertySize?.message}
                    index={index}
                    onSelectionComplete={handlePropertySizeSelectionComplete}
                    packageInfo={packageInfo}
                    pricingConfig={pricingConfig}
                    propertyType={property.propertyType}
                    setValue={setValue}
                    updatePropertyField={updatePropertyField}
                  />
                </div>

                <div ref={servicesSectionRef} className="scroll-mt-24">
                  <PropertyServicesSection
                    control={control}
                    errorMessage={propertyErrors.services?.message}
                    index={index}
                    mobileVideographyOptions={
                      <div
                        ref={mobileVideographySectionRef}
                        className="scroll-mt-24"
                      >
                        <VideographyOptionsSection
                          {...videographyOptionsProps}
                          variant="mobile"
                        />
                      </div>
                    }
                    /* onSelectionComplete={handleServiceSelectionComplete} */
                    packageInfo={packageInfo}
                    pricingConfig={pricingConfig}
                    property={property}
                    toggleService={toggleService}
                    videographySelections={videographySelections}
                  />
                </div>

                {property.services?.includes("Videography") && (
                  <VideographyOptionsSection
                    {...videographyOptionsProps}
                    variant="desktop"
                  />
                )}

                <div ref={locationSectionRef} className="scroll-mt-24">
                  <PropertyLocationSection control={control} index={index} />
                </div>

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
