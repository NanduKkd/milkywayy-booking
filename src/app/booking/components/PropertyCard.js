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

  Home,

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

import { PROPERTY_TYPE_ORDER, SERVICE_ORDER, VIDEOGRAPHY_SUB_SERVICES, VIDEOGRAPHY_SUB_SERVICE_ORDER, VIDEOGRAPHY_SUB_CATEGORIES } from "@/lib/config/pricing";
import { isNightServiceSelected } from "@/lib/helpers/bookingUtils";



const SERVICE_ICONS = {

  Photography: Camera,

  Videography: Video,

  "360° Tour": Globe,

};



const PROPERTY_TYPE_ICONS = {

  Apartment: Building2,

  Villa: Home,

  "Townhouse/Penthouse": Home,

  Commercial: Building,

};



const SERVICE_SUBTITLES = {

  // Videography: "30 - 90 secs walkthroughs",

  Videography: "Walkthrough Reels",

  // Videography: "Short-Form Walkthroughs (30-90s)",

};

const SERVICE_ESTIMATES = {
  Photography: "Est - 24 hrs",
  Videography: "Est - 48-72 hrs",
  "360Â° Tour": "Est - 48-72 hrs",
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

  console.log(`PropertyCard[${index}]: property data:`, property);
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

  const titleParts = [];

  if (property.community) titleParts.push(property.community);

  if (property.propertyType) titleParts.push(property.propertyType);

  if (property.propertySize) titleParts.push(property.propertySize);



  const { duration } = getPropertyDurationAndEvening(property);
  const isNightService = isNightServiceSelected(
    property.services || [],
    property.videographySubService || "",
  );

  const renderVideographySubServiceSelection = (className = "") => (
    <div className={cn("animate-in fade-in slide-in-from-top-4 duration-300", className)}>
      <label className="block text-[11px] tracking-[0.18em] uppercase font-medium text-muted-foreground/90 mb-3">
        {property.propertyType === "Commercial" ? "Videography Package" : "Videography Duration"}
      </label>

      <Controller
        name={`properties.${index}.videographySubService`}
        control={control}
        render={({ field }) => (
          <div className="space-y-3 rounded-2xl border border-white/10 bg-[#14161a]/80 p-3 md:p-4">
            <div className={property.propertyType === "Commercial" && property.propertySize === "Basic" ? "grid grid-cols-1 gap-4 w-full" : "grid grid-cols-1 lg:grid-cols-2 gap-4 w-full"}>
              {VIDEOGRAPHY_SUB_SERVICE_ORDER.map((subService) => {
                if (property.propertyType === "Commercial" && property.propertySize === "Basic") {
                  if (subService !== VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM) return null;
                }

                const typeConfig = pricingConfig[property.propertyType];
                const sizeConfig = typeConfig?.sizes?.find((s) => s.label === property.propertySize);
                const servicePriceConfig = sizeConfig?.prices?.["Videography"]?.[subService];

                let basePrice;
                if (property.propertyType === "Commercial") {
                  basePrice = servicePriceConfig?.price || 0;
                } else if (subService === VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM) {
                  basePrice = servicePriceConfig?.price || 0;
                } else if (!servicePriceConfig || typeof servicePriceConfig !== "object") {
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
                    className="py-3"
                    selectedClassName="border-white bg-white text-black"
                    unselectedClassName="border-white/10 bg-[#1a1d22] text-muted-foreground hover:border-white/20 hover:text-white"
                    isSelected={
                      subService === VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM
                        ? hasShortFormSelection
                        : Boolean(selectedLongForm)
                    }
                    onClick={() => {
                      const currentSelections = parseVideographySelections(field.value);
                      const withoutLong = currentSelections.filter(
                        (v) =>
                          !v.startsWith(`${VIDEOGRAPHY_SUB_SERVICES.LONG_FORM}.`) &&
                          v !== VIDEOGRAPHY_SUB_SERVICES.LONG_FORM,
                      );
                      const hasLong = currentSelections.some(
                        (v) =>
                          v.startsWith(`${VIDEOGRAPHY_SUB_SERVICES.LONG_FORM}.`) ||
                          v === VIDEOGRAPHY_SUB_SERVICES.LONG_FORM,
                      );
                      const hasShort = currentSelections.includes(
                        VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM,
                      );

                      if (subService === VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM) {
                        const nextSelections = hasShort
                          ? currentSelections.filter(
                              (v) => v !== VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM,
                            )
                          : [...currentSelections, VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM];
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
                          : [...withoutLong, VIDEOGRAPHY_SUB_SERVICES.LONG_FORM];
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

                      const categoriesObj = VIDEOGRAPHY_SUB_CATEGORIES?.[subService];
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
                    <div className="flex flex-col items-center gap-1">
                      <div className="font-semibold">{subService}</div>
                      {property.propertyType === "Commercial" ? (
                        <div className="text-sm text-muted-foreground">AED {basePrice}</div>
                      ) : (
                        subService === VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM && (
                          <div className="text-sm text-muted-foreground">AED {basePrice}</div>
                        )
                      )}
                    </div>
                  </OptionCard>
                );
              })}
            </div>

            <div className="mt-1 text-2xl font-bold text-foreground">
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
            </div>

            {selectedLongForm?.startsWith(`${VIDEOGRAPHY_SUB_SERVICES.LONG_FORM}.`) && property.propertyType !== "Commercial" && (
              <div className="mt-4">
                <label className="block text-[11px] tracking-[0.18em] uppercase font-medium text-muted-foreground/90 mb-3">
                  Lighting Preference
                </label>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(() => {
                    const [mainService, selectedCategoryLabel] = selectedLongForm.split('.') || [];
                    const categories = VIDEOGRAPHY_SUB_CATEGORIES[mainService];
                    if (!categories) return null;

                    const currentCategory =
                      selectedCategoryLabel || Object.values(categories)[0];

                    return Object.entries(categories).map(([categoryKey, categoryName]) => (
                      <OptionCard
                        key={categoryKey}
                        className="relative py-3"
                        selectedClassName="border-white/40 bg-[#1f232a] text-white"
                        unselectedClassName="border-white/10 bg-[#15181d] text-muted-foreground hover:border-white/25 hover:text-white"
                        isSelected={currentCategory === categoryName}
                        onClick={() => {
                          const currentSelections = parseVideographySelections(field.value);
                          const withoutLong = currentSelections.filter(
                            (v) =>
                              !v.startsWith(`${VIDEOGRAPHY_SUB_SERVICES.LONG_FORM}.`) &&
                              v !== VIDEOGRAPHY_SUB_SERVICES.LONG_FORM,
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
                          <div className="font-medium text-sm">{categoryName}</div>
                          {currentCategory === categoryName && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-white text-black flex items-center justify-center">
                              <Check className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                      </OptionCard>
                    ));
                  })()}
                </div>
              </div>
            )}
          </div>
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

        "premium-card rounded-2xl overflow-hidden card-hover-lift border border-border transition-all duration-300",

        isOpen ? "relative z-10 ring-2 ring-primary/20" : "relative z-0",

      )}

    >

      <div
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        className="w-full flex flex-row justify-between items-center p-5 md:p-6 text-left hover:bg-muted/20 transition-colors cursor-pointer"
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
      >

        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-muted/40 flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0">
            {index + 1}
          </div>
          <div className="min-w-0">
            {!isOpen && titleParts.length > 0 ? (
              <p className="text-sm font-semibold text-foreground truncate">
                {titleParts.join(" · ")}
              </p>
            ) : (
              <p className="text-sm font-semibold text-foreground">
                Property {index + 1}
              </p>
            )}
            {!isOpen && titleParts.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {property.services?.length ? property.services.join(", ") : "Select services"}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {price > 0 && (
            <span className="text-sm font-semibold text-foreground mr-1">
              AED {price.toLocaleString()}
            </span>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="text-muted-foreground hover:text-foreground hover:bg-muted h-8 w-8 rounded-lg"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate(index);
            }}
            title="Duplicate"
          >
            <Copy size={16} />
          </Button>
          {!isOnlyProperty && (
            <Button
              size="icon"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 h-8 w-8 rounded-lg"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(index);
              }}
              title="Remove"
            >
              <Trash2 size={16} />
            </Button>
          )}
          {isOpen ? (
            <ChevronUp size={20} className="text-muted-foreground" />
          ) : (
            <ChevronDown size={20} className="text-muted-foreground" />
          )}
        </div>
      </div>



      {!isOpen && (

        <div className="px-5 md:px-6 pb-5 pt-0 space-y-4 border-t border-border/50">

          <div className="flex items-center gap-6 text-muted-foreground text-sm">

            <div className="flex items-center gap-2">

              <Calendar size={16} />

              <span>{property.preferredDate || "Select Date"}</span>

            </div>

            <div className="flex items-center gap-2">

              <Clock size={16} />

              <span className="capitalize">

                {property.startTime || property.timeSlot || "Select Time"}

              </span>

            </div>

          </div>



          <div>

            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">SERVICES</div>

            <div className="flex flex-wrap gap-2">

              {property.services?.length > 0 ? (

                property.services.map((s) => (

                  <span

                    key={s}

                    className="bg-secondary text-muted-foreground px-3 py-1 rounded-full text-xs"

                  >

                    {s}

                  </span>

                ))

              ) : (

                <span className="text-muted-foreground text-sm italic">

                  No services selected

                </span>

              )}

            </div>

          </div>



          {errors.properties?.[index] && (

            <p className="text-red-500 text-xs mt-2">Please fill all required fields</p>

          )}

        </div>

      )}



      {isOpen && (

        <>

          <div className="border-t border-border" />

          <div className="pt-6 px-5 md:px-6 pb-6 space-y-8 overflow-visible">

            {/* Property Type Selection */}

            <div>

              <label className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-3">
                PROPERTY TYPE
              </label>

              <Controller

                name={`properties.${index}.propertyType`}

                control={control}

                render={({ field }) => (

                  <div className="grid grid-cols-3 gap-3 md:gap-4">

                    {PROPERTY_TYPE_ORDER.map((type) => {

                      if (!pricingConfig[type]) return null;

                      const Icon = PROPERTY_TYPE_ICONS[type] || Building;

                      return (

                        <OptionCard

                          key={type}

                          className="relative p-2.5 md:p-4 text-center flex flex-col items-center justify-center gap-2 md:gap-3 min-h-[92px] md:min-h-24"
                          selectedClassName="border-white/30 bg-white/[0.06] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
                          unselectedClassName="border-white/10 bg-[#17191d] text-muted-foreground hover:border-white/20 hover:text-white"

                          isSelected={field.value === type}

                          onClick={() => {

                            updatePropertyField(index, "propertyType", type);

                            setValue(`properties.${index}.propertySize`, "");

                            setValue(`properties.${index}.services`, []);

                          }}

                        >

                          <Icon size={18} className="md:h-6 md:w-6" />

                          <span className="text-[11px] md:text-sm font-medium whitespace-nowrap">{String(type).replace("/", " / ")}</span>
                          {field.value === type && (
                            <span className="absolute right-3 top-3 h-5 w-5 rounded-full bg-white text-black flex items-center justify-center">
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



            {/* Property Size Selection */}

            {property.propertyType && pricingConfig && pricingConfig[property.propertyType] && (

              <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                {property.propertyType === "Commercial" && (
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-foreground">Commercial Property Booking</h3>
                    <p className="text-xs md:text-sm text-muted-foreground mt-1">Select property scale. Then choose services.</p>
                  </div>
                )}

                <label className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-3">
                  {property.propertyType === "Commercial" ? "Step 1 — Property Scale" : "PROPERTY SIZE"}
                </label>

                <Controller

                  name={`properties.${index}.propertySize`}

                  control={control}

                  render={({ field }) => (

                    <div className={property.propertyType === "Commercial" ? "grid grid-cols-2 gap-3 w-full lg:grid-cols-2 xl:grid-cols-4" : "grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2 w-full"}>

                      {pricingConfig[property.propertyType].sizes.map((sizeObj) => {

                        if (property.propertyType === "Commercial") {

                          const isSelected = field.value === sizeObj.label;

                          

                          const TIER_META = {

                            Basic: {

                              icon: Building,

                              subtitle: "Small offices / retail units",

                            },

                            Essential: {

                              icon: Building2,

                              subtitle: "Showrooms / partitioned offices",

                              badge: "Most Popular",

                            },

                            Premium: {

                              icon: Video,

                              subtitle: "Full floors / larger commercial spaces",

                            },

                            Elite: {

                              icon: Calendar,

                              subtitle: "HQs / Warehouses / Corporate facilities",

                              badge: "Priority Delivery",

                            },

                          };



                          const meta = TIER_META[sizeObj.label];

                          return (

                            <div

                              key={sizeObj.label}

                              onClick={() => {

                                updatePropertyField(index, "propertySize", sizeObj.label);

                                setValue(`properties.${index}.services`, []);

                              }}

                              className={cn(

                                "relative cursor-pointer rounded-xl border transition-all duration-300 p-3 md:p-4 text-left flex flex-col items-start justify-center gap-1.5 min-h-[74px] md:min-h-[86px]",

                                isSelected

                                  ? "border-white/35 bg-white/[0.06]"

                                  : "border-white/12 bg-[#17191d] hover:border-white/25"

                              )}

                            >

                              {/* Badge */}

                              {meta?.badge && (

                                <div

                                  className={cn(

                                    "absolute top-2 right-2 px-2 py-0.5 text-[9px] tracking-[0.08em] uppercase font-semibold rounded-full",

                                    meta.badge === "Most Popular"

                                      ? "bg-yellow-500 text-black"

                                      : "bg-red-600 text-white"

                                  )}

                                >

                                  {meta.badge}

                                </div>

                              )}



                              <div className="font-semibold text-sm md:text-base text-foreground">

                                {sizeObj.label === "Elite" ? "Executive" : sizeObj.label}

                              </div>



                              <div className="text-[10px] md:text-xs text-muted-foreground leading-snug">

                                {meta?.subtitle}

                              </div>

                            </div>

                          );

                        } else {

                          return (

                            <OptionCard

                              isSelected={field.value === sizeObj.label}

                              key={sizeObj.label}

                              className="px-4 py-2.5 min-h-[42px] text-sm font-medium"
                              selectedClassName="border-white bg-white text-black shadow-none"
                              unselectedClassName="border-white/10 bg-[#1b1d21] text-muted-foreground hover:border-white/25 hover:text-white"

                              onClick={() => {

                                updatePropertyField(

                                  index,

                                  "propertySize",

                                  sizeObj.label,

                                );

                                setValue(`properties.${index}.services`, []);

                              }}

                            >

                              {sizeObj.label}

                            </OptionCard>

                          );

                        }

                      })}

                    </div>

                  )}

                />

                {errors.properties?.[index]?.propertySize && (

                  <p className="text-red-500 text-xs mt-1">

                    {errors.properties[index].propertySize.message}

                  </p>

                )}

              </div>

            )}



            {/* Services Selection */}

            {property.propertySize && property.propertyType && pricingConfig && pricingConfig[property.propertyType] && (

              <div className="animate-in fade-in slide-in-from-top-4 duration-300">

                <label className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-3">
                  {property.propertyType === "Commercial" ? "Step 2 — Select Services" : "SERVICES"}
                </label>

                <Controller

                  name={`properties.${index}.services`}

                  control={control}

                  render={({ field }) => (

                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 w-full">

                      {(() => {

                        const typeConfig = pricingConfig[property.propertyType];

                        const sizeConfig = typeConfig.sizes.find(

                          (s) => s.label === property.propertySize,

                        );

                        if (!sizeConfig) return null;



                        return SERVICE_ORDER.map((serviceName) => {

                          // Filter services based on commercial tier

                          if (property.propertyType === "Commercial") {

                            const availableServices = {

                              "Basic": ["Photography", "Videography"],

                              "Essential": ["Photography", "Videography", "360° Tour"],

                              "Premium": ["Photography", "Videography", "360° Tour"],

                              "Elite": ["Photography", "Videography", "360° Tour"]

                            };

                            

                            if (!availableServices[property.propertySize]?.includes(serviceName)) {

                              return null;

                            }

                          }

                          

                          let priceConfig = sizeConfig.prices[serviceName];

                          if (priceConfig === undefined) return null;



                          // Handle videography sub-service pricing

                          let price;

                          if (

                            serviceName === "Videography" &&

                            property.videographySubService &&

                            typeof priceConfig === "object"

                          ) {
                            price = videographySelections.reduce((sum, selection) => {
                              const resolved = resolveVideographyPriceConfig(
                                priceConfig,
                                selection,
                              );
                              const val =
                                typeof resolved === "object"
                                  ? Number(resolved?.price || 0)
                                  : Number(resolved || 0);
                              return sum + (Number.isFinite(val) ? val : 0);
                            }, 0);

                          } else {

                            price = typeof priceConfig === "object"

                              ? priceConfig.price || 0

                              : priceConfig || 0;

                          }



                          const Icon = SERVICE_ICONS[serviceName] || Camera;

                          const isSelected = field.value?.includes(serviceName);

                          return [
                            <OptionCard
                              key={serviceName}
                              isSelected={isSelected}
                              className="relative min-h-[132px] px-4 py-4"
                              selectedClassName="border-white/30 bg-white/[0.07] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
                              unselectedClassName="border-white/10 bg-[#17191d] text-muted-foreground hover:border-white/20 hover:text-white"
                              onClick={() =>
                                toggleService(
                                  index,
                                  serviceName,
                                  field.value || [],
                                )
                              }
                            >
                              <div className="flex flex-col items-start gap-3 text-left">
                                <Icon
                                  size={20}
                                  className={
                                    isSelected
                                      ? "text-foreground"
                                      : "text-muted-foreground"
                                  }
                                />
                                <div className="w-full">
                                  <div className="font-semibold mb-1 text-sm">
                                    {serviceName}
                                  </div>

                                  <div className="text-[11px] text-muted-foreground mb-1">
                                    {property.propertyType === "Commercial"
                                      ? SERVICE_ESTIMATES[serviceName]
                                      : SERVICE_SUBTITLES[serviceName] || SERVICE_ESTIMATES[serviceName]}
                                  </div>

                                  {property.propertyType === "Commercial" ? (
                                    <div className="text-sm text-foreground/90">
                                      {serviceName !== "Videography" && `AED ${price}`}
                                    </div>
                                  ) : serviceName !== "Videography" && (
                                    <div className="text-sm text-foreground/90">
                                      AED {price}
                                    </div>
                                  )}
                                </div>
                                {isSelected && (
                                  <span className="absolute right-3 top-3 h-5 w-5 rounded-full bg-white text-black flex items-center justify-center">
                                    <Check className="h-3 w-3" />
                                  </span>
                                )}
                              </div>
                            </OptionCard>,
                            serviceName === "Videography" && isSelected
                              ? (
                                <div
                                  key={`${serviceName}-mobile-options`}
                                  className="lg:hidden"
                                >
                                  {renderVideographySubServiceSelection()}
                                </div>
                              )
                              : null,
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

                  {property.propertyType === "Commercial" ? "Videography Package" : "Videography Duration"}

                </label>

                <Controller

                  name={`properties.${index}.videographySubService`}

                  control={control}

                  render={({ field }) => (

                    <div className="space-y-3 rounded-2xl border border-white/10 bg-[#14161a]/80 p-3 md:p-4">

                      {/* Main Service Selection */}

                      <div className={property.propertyType === "Commercial" && property.propertySize === "Basic" ? "grid grid-cols-1 gap-4 w-full" : "grid grid-cols-1 lg:grid-cols-2 gap-4 w-full"}>

                        {VIDEOGRAPHY_SUB_SERVICE_ORDER.map((subService) => {

                          // Filter videography sub-services for commercial Basic tier

                          if (property.propertyType === "Commercial" && property.propertySize === "Basic") {

                            if (subService !== VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM) {

                              return null;

                            }

                          }

                          

                          const typeConfig = pricingConfig[property.propertyType];

                          const sizeConfig = typeConfig?.sizes?.find(

                            (s) => s.label === property.propertySize,

                          );

                          const servicePriceConfig = sizeConfig?.prices?.["Videography"]?.[subService];

                          

                          // Calculate base price for display

                          let basePrice;

                          if (property.propertyType === "Commercial") {

                            // For commercial, use simplified pricing

                            basePrice = servicePriceConfig?.price || 0;

                          } else {

                            // For non-commercial, keep existing logic

                            if (subService === VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM) {

                              basePrice = servicePriceConfig?.price || 0;

                            } else {

                              // For Long Form, show minimum of subcategories ("From")

                              if (!servicePriceConfig || typeof servicePriceConfig !== "object") {

                                basePrice = 0;

                              } else {

                                const values = Object.values(servicePriceConfig);

                                const count = values.length;

                                basePrice = count

                                  ? Math.min(

                                      ...values.map((cat) =>

                                        typeof cat?.price === "number" ? cat.price : Infinity,

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
                              className="py-3"
                              selectedClassName="border-white bg-white text-black"
                              unselectedClassName="border-white/10 bg-[#1a1d22] text-muted-foreground hover:border-white/20 hover:text-white"

                              isSelected={
                                subService === VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM
                                  ? hasShortFormSelection
                                  : Boolean(selectedLongForm)
                              }

                              onClick={() => {

                                const currentSelections = parseVideographySelections(field.value);
                                const withoutLong = currentSelections.filter(
                                  (v) =>
                                    !v.startsWith(`${VIDEOGRAPHY_SUB_SERVICES.LONG_FORM}.`) &&
                                    v !== VIDEOGRAPHY_SUB_SERVICES.LONG_FORM,
                                );
                                const hasLong = currentSelections.some(
                                  (v) =>
                                    v.startsWith(`${VIDEOGRAPHY_SUB_SERVICES.LONG_FORM}.`) ||
                                    v === VIDEOGRAPHY_SUB_SERVICES.LONG_FORM,
                                );
                                const hasShort = currentSelections.includes(
                                  VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM,
                                );

                                if (subService === VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM) {
                                  const nextSelections = hasShort
                                    ? currentSelections.filter(
                                        (v) => v !== VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM,
                                      )
                                    : [...currentSelections, VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM];
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
                                    : [...withoutLong, VIDEOGRAPHY_SUB_SERVICES.LONG_FORM];
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

                                const categoriesObj = VIDEOGRAPHY_SUB_CATEGORIES?.[subService];
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

                              <div className="flex flex-col items-center gap-1">

                                <div className="font-semibold">{subService}</div>

                                {property.propertyType === "Commercial" ? (

                                  <div className="text-sm text-muted-foreground">

                                    AED {basePrice}

                                  </div>

                                ) : (

                                  subService === VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM && (

                                    <div className="text-sm text-muted-foreground">

                                      AED {basePrice}

                                    </div>

                                  )

                                )}

                              </div>

                            </OptionCard>

                          );

                        })}

                      </div>
                      <div className="mt-1 text-2xl font-bold text-foreground">
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
                      </div>



                      {/* Lighting Preference Selection - Show when Long Form category is selected */}

                      {selectedLongForm?.startsWith(`${VIDEOGRAPHY_SUB_SERVICES.LONG_FORM}.`) && property.propertyType !== "Commercial" && (

                        <div className="mt-4">

                          <label className="block text-[11px] tracking-[0.18em] uppercase font-medium text-muted-foreground/90 mb-3">

                            Lighting Preference

                          </label>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

                            {(() => {

                              const [mainService, selectedCategoryLabel] = selectedLongForm.split('.') || [];

                              const categories = VIDEOGRAPHY_SUB_CATEGORIES[mainService];

                              

                              if (!categories) return null;



                              const currentCategory =

                                selectedCategoryLabel || Object.values(categories)[0];

                               

                              return Object.entries(categories).map(([categoryKey, categoryName]) => {

                                const typeConfig = pricingConfig[property.propertyType];

                                const sizeConfig = typeConfig?.sizes?.find(

                                  (s) => s.label === property.propertySize,

                                );

                                const priceConfig = sizeConfig?.prices?.["Videography"]?.[mainService]?.[categoryName];



                                return (

                                  <OptionCard

                                    key={categoryKey}
                                    className="relative py-3"
                                    selectedClassName="border-white/40 bg-[#1f232a] text-white"
                                    unselectedClassName="border-white/10 bg-[#15181d] text-muted-foreground hover:border-white/25 hover:text-white"

                                    isSelected={currentCategory === categoryName}

                                    onClick={() => {

                                      const currentSelections = parseVideographySelections(field.value);
                                      const withoutLong = currentSelections.filter(
                                        (v) =>
                                          !v.startsWith(`${VIDEOGRAPHY_SUB_SERVICES.LONG_FORM}.`) &&
                                          v !== VIDEOGRAPHY_SUB_SERVICES.LONG_FORM,
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
                                      <div className="font-medium text-sm">{categoryName}</div>
                                      {currentCategory === categoryName && (
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-white text-black flex items-center justify-center">
                                          <Check className="h-3 w-3" />
                                        </span>
                                      )}
                                    </div>

                                  </OptionCard>

                                );

                              });

                            })()}

                          </div>
                        </div>

                      )}

                    </div>

                  )}

                />

                {errors.properties?.[index]?.videographySubService && (

                  <p className="text-red-500 text-xs mt-1">

                    {errors.properties[index].videographySubService.message}

                  </p>

                )}

              </div>

            )}



            {/* Location Details — order: Community/Area, Building/Tower, Unit */}
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-3">
                LOCATION
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Controller
                  name={`properties.${index}.community`}
                  control={control}
                  render={({ field, fieldState }) => (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-muted-foreground">Community / Area</label>
                      <Input
                        {...field}
                        placeholder="e.g., Dubai Marina"
                        className="bg-secondary border-border hover:border-muted focus-visible:ring-ring text-foreground rounded-xl h-10"
                      />
                      {fieldState.error && (
                        <p className="text-red-500 text-xs">{fieldState.error.message}</p>
                      )}
                    </div>
                  )}
                />
                <Controller
                  name={`properties.${index}.building`}
                  control={control}
                  render={({ field, fieldState }) => (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-muted-foreground">Building / Tower</label>
                      <Input
                        {...field}
                        placeholder="e.g., Marina Heights"
                        className="bg-secondary border-border hover:border-muted focus-visible:ring-ring text-foreground rounded-xl h-10"
                      />
                      {fieldState.error && (
                        <p className="text-red-500 text-xs">{fieldState.error.message}</p>
                      )}
                    </div>
                  )}
                />
                <Controller
                  name={`properties.${index}.unitNumber`}
                  control={control}
                  render={({ field, fieldState }) => (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-muted-foreground">Unit Number</label>
                      <Input
                        {...field}
                        placeholder="e.g., 1205"
                        className="bg-secondary border-border hover:border-muted focus-visible:ring-ring text-foreground rounded-xl h-10"
                      />
                      {fieldState.error && (
                        <p className="text-red-500 text-xs">{fieldState.error.message}</p>
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
                  serviceType={property.services?.[0] || ''}
                  onDateChange={(d) => updatePropertyField(index, "preferredDate", d)}
                  onSlotChange={(s) => updatePropertyField(index, "startTime", s)}
                  error={
                    errors.properties?.[index]?.preferredDate?.message ||
                    errors.properties?.[index]?.startTime?.message
                  }
                />
              )}
            </div>

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





