"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info, Loader2, Plus } from "lucide-react";
import { use, useCallback, useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  createBookings,
  createTransactionAndPaymentIntent,
  getDrafts,
  previewPromotionPricing,
  saveDrafts,
} from "@/lib/actions/bookings";
import {
  SERVICES,
  PRICING_CONFIG as STATIC_PRICING_CONFIG,
  VIDEOGRAPHY_SUB_SERVICES,
} from "@/lib/config/pricing";
import { MINIMUM_ORDER_AMOUNT } from "@/lib/config/promo";
import { useAuth } from "@/lib/contexts/auth";
import {
  calculateBookingDuration,
  getBookingArrivalWindowFromDetails,
  getBookingStartTime,
} from "@/lib/helpers/bookingUtils";
import { calculateWalletCreditPreview } from "@/lib/helpers/promotionPricing";
import { bookingSchema } from "@/lib/schema/booking.schema";
// Modular Components
import {
  createEmptyBookingProperty,
  mapDraftsToBookingProperties,
} from "./bookingFormAdapters";
import { PropertyCard } from "./components/PropertyCard";

const formatScheduleLabel = (property) => {
  const slotLabel =
    getBookingArrivalWindowFromDetails({
      startTime: property.startTime,
      slot: property.timeSlot,
      propertyType: property.propertyType,
      propertySize: property.propertySize,
      services: property.services,
      videographySubService: property.videographySubService,
    }) ||
    getBookingStartTime({
      startTime: property.startTime,
      slot: property.timeSlot,
    });

  return [property.preferredDate, slotLabel].filter(Boolean).join(" · ");
};

const buildSummaryLabel = (property) =>
  [property.propertySize, property.propertyType].filter(Boolean).join(" ");

const buildServicesLabel = (property) =>
  property.services?.length > 0 ? property.services.join(" + ") : "";

const buildLocationLabel = (property) =>
  [property.unitNumber, property.building, property.community]
    .filter(Boolean)
    .join(", ");

const EMPTY_PROMOTION_PREVIEW = {
  selectedPromotion: null,
  codeValidation: null,
  enteredCode: "",
};

const SUCCESSFUL_CODE_VALIDATION_STATUSES = new Set(["APPLIED", "SUPERSEDED"]);

const formatPromotionSummaryLabel = (promotion) => {
  if (!promotion) return "";
  if (promotion.code) {
    return `Promo Code (${promotion.code})`;
  }
  return promotion.name || "Promotion";
};

const formatPromotionBadgeLabel = (promotion) =>
  promotion?.name || promotion?.code || "Promotion";

export function SharedBookingForm({
  pricingConfig = STATIC_PRICING_CONFIG,
  discounts = [],
  initialProperties = null,
  loadInitialProperties = null,
  autosaveProperties = null,
  submitBooking,
  previewPricing = null,
  isAuthenticated = true,
  requestLogin = null,
  mode = "normal",
}) {
  const PRICING_CONFIG = pricingConfig || STATIC_PRICING_CONFIG;
  const [openPropertyIndex, setOpenPropertyIndex] = useState(0);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [couponInputValue, setCouponInputValue] = useState("");
  const [appliedPromotionCode, setAppliedPromotionCode] = useState("");
  const [promotionPreview, setPromotionPreview] = useState(
    EMPTY_PROMOTION_PREVIEW,
  );
  const [promotionPreviewError, setPromotionPreviewError] = useState("");

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    trigger,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(bookingSchema),
    mode: "all",
    defaultValues: {
      properties:
        initialProperties?.length > 0
          ? initialProperties
          : [createEmptyBookingProperty()],
    },
  });

  const properties = useWatch({
    control,
    name: "properties",
  });

  const [isLoadingInitialProperties, setIsLoadingInitialProperties] = useState(
    Boolean(loadInitialProperties),
  );

  useEffect(() => {
    if (!loadInitialProperties) {
      return undefined;
    }

    let isCancelled = false;

    const loadProperties = async () => {
      try {
        const loadedProperties = await loadInitialProperties();
        if (!isCancelled && loadedProperties?.length > 0) {
          setValue("properties", loadedProperties);
        }
      } catch (error) {
        console.error("Failed to load booking properties", error);
      } finally {
        if (!isCancelled) {
          setIsLoadingInitialProperties(false);
        }
      }
    };
    loadProperties();

    return () => {
      isCancelled = true;
    };
  }, [loadInitialProperties, setValue]);

  useEffect(() => {
    if (isLoadingInitialProperties || !autosaveProperties || !isAuthenticated) {
      return undefined;
    }

    const timer = setTimeout(async () => {
      try {
        if (properties?.length > 0) {
          await autosaveProperties(properties);
        }
      } catch (err) {
        if (
          !String(err?.message || "")
            .toLowerCase()
            .includes("unauthorized")
        ) {
          console.error("Auto-save failed", err);
        }
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [
    properties,
    isLoadingInitialProperties,
    autosaveProperties,
    isAuthenticated,
  ]);

  const addProperty = () => {
    const currentProperties = getValues("properties");
    const nextIndex = currentProperties.length;
    setValue(
      "properties",
      [...currentProperties, createEmptyBookingProperty()],
      {
        shouldValidate: false,
      },
    );
    clearErrors(`properties.${nextIndex}`);
    setOpenPropertyIndex(nextIndex);
  };

  const duplicateProperty = (index) => {
    const currentProperties = getValues("properties");
    const propertyToDuplicate = {
      ...currentProperties[index],
      localId: createEmptyBookingProperty().localId,
      preferredDate: "",
      timeSlot: "",
      startTime: "",
      duration: 0,
    };
    const nextIndex = currentProperties.length;
    setValue("properties", [...currentProperties, propertyToDuplicate], {
      shouldValidate: false,
    });
    clearErrors(`properties.${nextIndex}`);
    setOpenPropertyIndex(nextIndex);
  };

  const removeProperty = (index) => {
    const currentProperties = getValues("properties");
    if (currentProperties.length > 1) {
      setValue(
        "properties",
        currentProperties.filter((_, i) => i !== index),
      );
      if (index === openPropertyIndex) {
        setOpenPropertyIndex(index > 0 ? index - 1 : 0);
      } else if (index < openPropertyIndex) {
        setOpenPropertyIndex(openPropertyIndex - 1);
      }
    }
  };

  const hasValueChanged = (previousValue, nextValue) => {
    if (Array.isArray(previousValue) && Array.isArray(nextValue)) {
      if (previousValue.length !== nextValue.length) return true;
      return previousValue.some((value, idx) => value !== nextValue[idx]);
    }

    return previousValue !== nextValue;
  };

  const resetPropertySchedule = (index) => {
    setValue(`properties.${index}.preferredDate`, "", {
      shouldValidate: false,
      shouldDirty: true,
    });
    setValue(`properties.${index}.startTime`, "", {
      shouldValidate: false,
      shouldDirty: true,
    });
    setValue(`properties.${index}.timeSlot`, "", {
      shouldValidate: false,
      shouldDirty: true,
    });
  };

  const updatePropertyField = (index, field, value) => {
    const current = getValues(`properties.${index}`);
    const previousValue = current?.[field];
    const didChange = hasValueChanged(previousValue, value);

    setValue(`properties.${index}.${field}`, value, { shouldValidate: true });

    if (
      didChange &&
      [
        "propertyType",
        "propertySize",
        "services",
        "videographySubService",
      ].includes(field)
    ) {
      resetPropertySchedule(index);
    }

    // If changed field affects duration, recalculate it
    if (
      [
        "propertyType",
        "propertySize",
        "services",
        "videographySubService",
      ].includes(field)
    ) {
      const property = { ...current, [field]: value };
      // Only calculate if we have the minimum required info
      if (
        property.propertyType &&
        property.propertySize &&
        property.services?.length > 0
      ) {
        const duration = calculateBookingDuration(
          { id: property.services }, // Simulating service object
          {
            type: property.propertyType,
            size: property.propertySize,
            videographySubService: property.videographySubService,
          },
          { community: property.community },
        );
        setValue(`properties.${index}.duration`, duration);
      } else {
        setValue(`properties.${index}.duration`, 0);
      }
    }
  };

  const toggleService = async (index, serviceName, currentServices) => {
    const newServices = currentServices.includes(serviceName)
      ? currentServices.filter((s) => s !== serviceName)
      : [...currentServices, serviceName];

    if (hasValueChanged(currentServices, newServices)) {
      resetPropertySchedule(index);
    }

    setValue(`properties.${index}.services`, newServices, {
      shouldValidate: true,
      shouldDirty: true,
    });

    const property = getValues(`properties.${index}`);
    const hasVideography = newServices.includes(SERVICES.VIDEOGRAPHY);
    const nextVideographySubService = hasVideography
      ? property?.videographySubService || VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM
      : "";

    if (property?.videographySubService !== nextVideographySubService) {
      setValue(
        `properties.${index}.videographySubService`,
        nextVideographySubService,
        {
          shouldValidate: true,
          shouldDirty: true,
        },
      );
    }

    if (
      property?.propertyType &&
      property?.propertySize &&
      newServices.length > 0
    ) {
      const duration = calculateBookingDuration(
        { id: newServices },
        {
          type: property.propertyType,
          size: property.propertySize,
          videographySubService: nextVideographySubService,
        },
        { community: property.community },
      );
      setValue(`properties.${index}.duration`, duration);
    } else {
      setValue(`properties.${index}.duration`, 0);
    }

    await trigger(`properties.${index}.services`);
  };

  const calculateTotal = () => {
    return properties.reduce((total, property) => {
      return total + getPropertyPrice(property);
    }, 0);
  };

  const getPropertyPrice = (property) => {
    if (!property.propertyType || !property.propertySize || !property.services)
      return 0;
    const typeConfig = PRICING_CONFIG[property.propertyType];
    if (!typeConfig) return 0;

    const sizeConfig = typeConfig.sizes.find(
      (s) => s.label === property.propertySize,
    );
    if (!sizeConfig) return 0;

    const videographySelections = String(property.videographySubService || "")
      .split("|")
      .map((v) => v.trim())
      .filter(Boolean);

    return property.services.reduce((total, service) => {
      const priceConfig = sizeConfig.prices[service];

      // Handle videography sub-services
      if (
        service === "Videography" &&
        property.videographySubService &&
        typeof priceConfig === "object"
      ) {
        const videographyTotal = videographySelections.reduce(
          (sum, selection) => {
            let selectionConfig = priceConfig;
            if (selection.includes(".")) {
              const [mainService, category] = selection.split(".");
              selectionConfig =
                selectionConfig?.[mainService]?.[category] ||
                selectionConfig?.[mainService];
            } else {
              selectionConfig = selectionConfig?.[selection];
            }
            const val =
              typeof selectionConfig === "object"
                ? Number(selectionConfig?.price || 0)
                : Number(selectionConfig || 0);
            return sum + (Number.isFinite(val) ? val : 0);
          },
          0,
        );
        return total + videographyTotal;
      }

      const price =
        typeof priceConfig === "object"
          ? priceConfig.price || 0
          : priceConfig || 0;
      return total + price;
    }, 0);
  };

  const getPropertyDurationAndEvening = (property) => {
    if (!property.propertyType || !property.propertySize || !property.services)
      return { duration: 1, allowEvening: false };

    const typeConfig = PRICING_CONFIG[property.propertyType];
    if (!typeConfig) return { duration: 1, allowEvening: false };

    const sizeConfig = typeConfig.sizes.find(
      (s) => s.label === property.propertySize,
    );
    if (!sizeConfig) return { duration: 1, allowEvening: false };

    let duration = 1;
    let allowEvening = false;

    const videographySelections = String(property.videographySubService || "")
      .split("|")
      .map((v) => v.trim())
      .filter(Boolean);

    property.services.forEach((service) => {
      const config = sizeConfig.prices[service];

      // Handle videography sub-services
      if (
        service === "Videography" &&
        property.videographySubService &&
        typeof config === "object"
      ) {
        videographySelections.forEach((selection) => {
          let selectionConfig = config;
          if (selection.includes(".")) {
            const [mainService, category] = selection.split(".");
            selectionConfig =
              selectionConfig?.[mainService]?.[category] ||
              selectionConfig?.[mainService];
          } else {
            selectionConfig = selectionConfig?.[selection];
          }
          if (selectionConfig && typeof selectionConfig === "object") {
            const sDuration = selectionConfig.slots || 1;
            if (sDuration > duration) duration = sDuration;
            if (selectionConfig.allowEvening) allowEvening = true;
          }
        });
        return;
      }

      if (config && typeof config === "object") {
        const sDuration = config.slots || 1;
        if (sDuration > duration) duration = sDuration;
        if (config.allowEvening) allowEvening = true;
      }
    });

    return { duration, allowEvening };
  };

  const getOccupiedSlots = (currentIndex) => {
    const occupied = {};
    const HOURLY_SLOTS = [
      "10:00",
      "10:30",
      "11:00",
      "11:30",
      "12:00",
      "12:30",
      "13:00",
      "13:30",
      "14:00",
      "14:30",
      "15:00",
      "15:30",
      "16:00",
      "16:30",
      "17:00",
      "17:30",
    ];

    properties.forEach((p, idx) => {
      if (idx === currentIndex) return;
      if (!p.preferredDate) return;

      const slotValue = p.startTime || p.timeSlot;
      if (!slotValue) return;

      const duration = p.duration || 1;
      // Handle legacy slots for local blocking
      if (slotValue === "morning") {
        if (!occupied[p.preferredDate]) occupied[p.preferredDate] = [];
        occupied[p.preferredDate].push("morning");
        return;
      }
      if (slotValue === "afternoon") {
        if (!occupied[p.preferredDate]) occupied[p.preferredDate] = [];
        occupied[p.preferredDate].push("afternoon");
        return;
      }
      if (slotValue === "evening") {
        if (!occupied[p.preferredDate]) occupied[p.preferredDate] = [];
        occupied[p.preferredDate].push("evening");
        return;
      }

      const startIndex = HOURLY_SLOTS.indexOf(slotValue);
      if (startIndex === -1) return;

      if (!occupied[p.preferredDate]) occupied[p.preferredDate] = [];

      // Duration is in hours, so * 2 for 30-min slots
      const numSlots = duration * 2;
      for (let i = 0; i < numSlots; i++) {
        const slotIndex = startIndex + i;
        if (slotIndex < HOURLY_SLOTS.length) {
          occupied[p.preferredDate].push(HOURLY_SLOTS[slotIndex]);
        }
      }
    });
    return occupied;
  };

  const onContinue = async (data) => {
    if (!isAuthenticated) {
      toast.error("Please login to continue to payment");
      requestLogin?.();
      return;
    }

    setIsProcessingPayment(true);
    try {
      if (
        previewPricing &&
        appliedPromotionCode &&
        !SUCCESSFUL_CODE_VALIDATION_STATUSES.has(
          promotionPreview.codeValidation?.status,
        )
      ) {
        throw new Error(
          promotionPreview.codeValidation?.message ||
            "Unable to apply promo code",
        );
      }

      if (previewPricing && promotionPreviewError) {
        throw new Error(promotionPreviewError);
      }

      await submitBooking({
        properties: data.properties,
        promotionCode: appliedPromotionCode,
      });
    } catch (error) {
      console.error("Booking submission error:", error);
      if (
        String(error?.message || "")
          .toLowerCase()
          .includes("unauthorized")
      ) {
        toast.error("Please login to continue to payment");
        requestLogin?.();
        return;
      }
      toast.error(error.message || "Failed to process payment");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const totalAmount = calculateTotal();
  const selectedPromotion = promotionPreview.selectedPromotion;
  const selectedPromotionDiscount = Number(
    selectedPromotion?.benefitAmount || 0,
  );
  const walletCreditPreview = calculateWalletCreditPreview(
    discounts,
    totalAmount,
  );
  const minimumOrderError =
    totalAmount > 0 && totalAmount < MINIMUM_ORDER_AMOUNT
      ? `Minimum order value is AED ${MINIMUM_ORDER_AMOUNT}`
      : "";
  const payableAmount = Math.max(0, totalAmount - selectedPromotionDiscount);
  const appliedDiscount = totalAmount - payableAmount;
  const appliedOfferName = selectedPromotion
    ? formatPromotionBadgeLabel(selectedPromotion)
    : "";
  const codeValidation = promotionPreview.codeValidation;
  const previewAuthState = isAuthenticated ? "authenticated" : "guest";
  const couponMessage =
    promotionPreviewError ||
    !SUCCESSFUL_CODE_VALIDATION_STATUSES.has(codeValidation?.status)
      ? ""
      : codeValidation.message;
  const couponError = promotionPreviewError
    ? promotionPreviewError
    : SUCCESSFUL_CODE_VALIDATION_STATUSES.has(codeValidation?.status)
      ? ""
      : codeValidation?.message || "";

  const applyPromotionSelection = (promotionCode) => {
    const normalizedCode = String(promotionCode || "")
      .trim()
      .toUpperCase();

    if (!normalizedCode) {
      setAppliedPromotionCode("");
      setPromotionPreviewError("");
      return;
    }

    setCouponInputValue(normalizedCode);
    setAppliedPromotionCode(normalizedCode);
  };

  useEffect(() => {
    let isCancelled = false;

    const loadPromotionPreview = async () => {
      if (totalAmount <= 0) {
        setPromotionPreview(EMPTY_PROMOTION_PREVIEW);
        setPromotionPreviewError(
          previewAuthState === "authenticated" ? "" : "",
        );
        return;
      }

      if (!previewPricing) {
        setPromotionPreview({
          ...EMPTY_PROMOTION_PREVIEW,
          enteredCode: appliedPromotionCode,
        });
        setPromotionPreviewError("");
        return;
      }

      let res;
      try {
        res = await previewPricing(totalAmount, appliedPromotionCode);
      } catch (error) {
        res = {
          success: false,
          message: error?.message || "Unable to load promotion pricing",
        };
      }

      if (isCancelled) return;

      if (!res?.success) {
        setPromotionPreview(EMPTY_PROMOTION_PREVIEW);
        setPromotionPreviewError(
          res?.message || "Unable to load promotion pricing",
        );
        return;
      }

      setPromotionPreview(res.data || EMPTY_PROMOTION_PREVIEW);
      setPromotionPreviewError("");
    };

    loadPromotionPreview();

    return () => {
      isCancelled = true;
    };
  }, [totalAmount, appliedPromotionCode, previewAuthState, previewPricing]);

  const summaryItems = properties
    .map((property, index) => ({
      index,
      amount: getPropertyPrice(property),
      title: buildSummaryLabel(property),
      services: buildServicesLabel(property),
      location: buildLocationLabel(property),
      schedule: formatScheduleLabel(property),
    }))
    .filter((item) => item.amount > 0);
  const isContinueDisabled =
    summaryItems.length === 0 ||
    totalAmount < MINIMUM_ORDER_AMOUNT ||
    isSubmitting ||
    isProcessingPayment;

  return (
    <section
      className="relative min-h-[90vh] pt-12 md:pt-16 pb-16"
      data-booking-mode={mode}
      data-testid="shared-booking-form"
    >
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 fade-in">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground mb-3">
              MILKYWAYY PORTAL
            </p>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold mb-3 tracking-tight text-foreground">
              Book Your Shoot
            </h1>
            <p className="text-sm md:text-base text-muted-foreground max-w-md mx-auto">
              Premium property media for Dubai&apos;s finest real estate
            </p>
          </div>

          <form onSubmit={handleSubmit(onContinue)}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              <div className="lg:col-span-2 space-y-4">
                {properties?.map((property, index) => (
                  <PropertyCard
                    key={property.localId || `property-${index}`}
                    index={index}
                    property={property}
                    isOpen={index === openPropertyIndex}
                    onToggle={() =>
                      setOpenPropertyIndex(
                        index === openPropertyIndex ? -1 : index,
                      )
                    }
                    onDuplicate={duplicateProperty}
                    onRemove={removeProperty}
                    control={control}
                    setValue={setValue}
                    errors={errors}
                    pricingConfig={PRICING_CONFIG}
                    getPropertyPrice={getPropertyPrice}
                    getPropertyDurationAndEvening={
                      getPropertyDurationAndEvening
                    }
                    getOccupiedSlots={getOccupiedSlots}
                    toggleService={toggleService}
                    updatePropertyField={updatePropertyField}
                    isOnlyProperty={properties.length === 1}
                  />
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addProperty}
                  data-testid="add-property"
                  className="hidden w-full p-4 rounded-2xl border border-dashed border-border hover:border-muted-foreground/30 bg-secondary/10 hover:bg-secondary/20 transition-all duration-200 lg:flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  <Plus size={18} className="shrink-0" />
                  Add Another Property
                </Button>
              </div>

              <aside className="lg:col-span-1 glass rounded-xl md:rounded-2xl p-4 md:p-5 lg:sticky lg:top-24 mt-1 md:mt-0">
                <h3 className="text-2xs font-medium uppercase tracking-[0.2em] text-muted-foreground mb-2.5">
                  Order Summary
                </h3>

                {summaryItems.length === 0
                  ? <p className="text-xs text-muted-foreground py-4 text-center">
                      Select services to see your summary
                    </p>
                  : <div className="space-y-3 mb-3.5">
                      {summaryItems.map(
                        ({
                          index,
                          title,
                          amount,
                          services,
                          location,
                          schedule,
                        }) => (
                          <div
                            key={`summary-${index}`}
                            className="rounded-xl border border-white/8 bg-white/[0.025] px-3.5 py-3 space-y-1"
                          >
                            <div className="flex justify-between items-start gap-3">
                              <p className="font-semibold text-sm leading-5 text-foreground">
                                {title || `Property ${index + 1}`}
                              </p>
                              <span className="font-semibold text-sm whitespace-nowrap text-foreground">
                                AED {amount.toLocaleString()}
                              </span>
                            </div>
                            {location && (
                              <p className="text-xs leading-4 text-muted-foreground">
                                {location}
                              </p>
                            )}
                            {services && (
                              <p className="text-xs leading-4 text-muted-foreground">
                                {services}
                              </p>
                            )}
                            {schedule && (
                              <p className="text-xs uppercase text-muted-foreground/80">
                                {schedule}
                              </p>
                            )}
                          </div>
                        ),
                      )}
                    </div>}

                <div className="space-y-2.5 px-3 border-t border-white/8 pt-3.5 mb-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-muted-foreground">
                      Subtotal
                    </p>
                    <p className="text-sm md:text-sm font-semibold text-foreground">
                      AED {totalAmount.toLocaleString()}
                    </p>
                  </div>

                  {selectedPromotionDiscount > 0 && (
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-muted-foreground text-sm">
                        {formatPromotionSummaryLabel(selectedPromotion)}
                      </p>
                      <p className="text-sm md:text-sm font-semibold text-emerald-300">
                        - AED {selectedPromotionDiscount.toLocaleString()}
                      </p>
                    </div>
                  )}

                  {walletCreditPreview.amount > 0 && (
                    <div className="rounded-lg border border-sky-400/15 bg-sky-400/5 px-3 py-2 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sky-100">Wallet credit earned</p>
                        <p className="font-semibold text-sky-300">
                          AED {walletCreditPreview.amount.toLocaleString()}
                        </p>
                      </div>
                      <p className="mt-1 text-2xs leading-4 text-sky-200/80">
                        Activates after project completion and does not reduce
                        today&apos;s payment total.
                      </p>
                    </div>
                  )}
                </div>

                <div className="px-3.5 py-3 mb-3.5 border-t">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Grand Total
                    </p>
                    <p className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
                      AED {payableAmount.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="mb-4 space-y-1.5">
                  <p className="text-2xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    Promo Code
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      value={couponInputValue}
                      onChange={(e) =>
                        setCouponInputValue(e.target.value.toUpperCase())
                      }
                      placeholder="Enter promo code"
                      className="h-9 flex-1 rounded-lg border border-white/8 bg-white/[0.02] px-3 text-xs text-foreground placeholder:text-muted-foreground outline-none"
                    />
                    {appliedPromotionCode
                      ? <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-9 px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-white/5"
                          onClick={() => {
                            setAppliedPromotionCode("");
                            setCouponInputValue("");
                            setPromotionPreviewError("");
                          }}
                        >
                          Remove
                        </Button>
                      : <Button
                          type="button"
                          size="sm"
                          className="h-9 px-3 text-xs"
                          onClick={() =>
                            applyPromotionSelection(couponInputValue)
                          }
                        >
                          Apply
                        </Button>}
                  </div>

                  {couponError && (
                    <p className="text-2xs leading-4 text-destructive">
                      {couponError}
                    </p>
                  )}
                  {couponMessage && (
                    <p className="text-2xs leading-4 text-emerald-300">
                      {couponMessage}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={isContinueDisabled}
                  className="hidden w-full btn-primary-premium py-2.5 lg:inline-flex"
                >
                  {isSubmitting || isProcessingPayment
                    ? <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Redirecting to Payment...
                      </>
                    : "Continue to Payment"}
                </Button>

                {minimumOrderError && (
                  <p className="mt-2 text-2xs leading-4 text-destructive">
                    {minimumOrderError}
                  </p>
                )}

                <div className="flex items-start gap-1.5 mt-3">
                  <Info className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-2xs leading-4 text-muted-foreground">
                    Media is licensed for client marketing use. Milkywayy may
                    showcase selected work for portfolio and promotional
                    purposes.
                  </p>
                </div>
              </aside>
            </div>

            <div
              data-testid="mobile-booking-footer"
              className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-background/95 px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-10px_30px_rgba(0,0,0,0.3)] backdrop-blur-xl lg:hidden"
            >
              <Button
                type="button"
                variant="outline"
                onClick={addProperty}
                data-testid="mobile-add-property"
                className="h-10 w-full rounded-xl border-dashed border-white/10 bg-transparent text-xs font-normal text-muted-foreground hover:bg-white/[0.03] hover:text-foreground"
              >
                <Plus className="h-4 w-4" />
                Add Another Property
              </Button>

              <div className="mt-2.5 flex items-end justify-between gap-4">
                <div className="flex min-w-0 flex-1 flex-col leading-tight">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Total
                    </span>
                    {appliedDiscount > 0 && (
                      <span className="rounded-full border border-primary/20 bg-primary/15 px-1.5 py-[1px] text-[9px] font-medium uppercase tracking-wider text-primary">
                        {appliedOfferName}
                      </span>
                    )}
                  </div>
                  <span
                    data-testid="mobile-booking-total"
                    className="price-update text-base text-foreground"
                  >
                    {appliedDiscount > 0 && (
                      <span className="mr-1.5 text-muted-foreground line-through">
                        AED {totalAmount.toLocaleString()}
                      </span>
                    )}
                    <span
                      className={
                        appliedDiscount > 0 ? "font-bold" : "font-semibold"
                      }
                    >
                      AED {payableAmount.toLocaleString()}
                    </span>
                  </span>
                </div>

                <Button
                  type="submit"
                  disabled={isContinueDisabled}
                  data-testid="mobile-continue"
                  className="btn-primary-premium h-11 rounded-xl px-5 text-xs font-medium"
                >
                  {isSubmitting || isProcessingPayment
                    ? <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Redirecting...
                      </>
                    : "Continue →"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

async function loadNormalBookingProperties() {
  const res = await getDrafts();
  return mapDraftsToBookingProperties(res?.success ? res.data : []);
}

async function autosaveNormalBookingProperties(properties) {
  return saveDrafts(properties);
}

async function submitNormalBooking({ properties, promotionCode }) {
  const bookingResult = await createBookings(properties);
  if (!bookingResult.success) {
    throw new Error(bookingResult.message);
  }

  const bookingIds = bookingResult.data.map((booking) => booking.id);
  const paymentResult = await createTransactionAndPaymentIntent(
    bookingIds,
    promotionCode,
  );
  if (!paymentResult.success) {
    throw new Error(paymentResult.message);
  }

  const paymentUrl = paymentResult.data?.url;
  if (!paymentUrl) {
    throw new Error("No payment URL returned");
  }

  window.location.href = paymentUrl;
}

export default function BookNew({ pricingsPromise, discountsPromise }) {
  const pricingsRes = use(pricingsPromise);
  const discountsRes = use(discountsPromise);
  const { authState, login } = useAuth();
  const isAuthenticated = Boolean(authState?.isAuthenticated);
  const requestLogin = useCallback(() => login(), [login]);

  return (
    <SharedBookingForm
      pricingConfig={
        pricingsRes?.success ? pricingsRes.data : STATIC_PRICING_CONFIG
      }
      discounts={discountsRes?.success ? discountsRes.data : []}
      loadInitialProperties={loadNormalBookingProperties}
      autosaveProperties={autosaveNormalBookingProperties}
      submitBooking={submitNormalBooking}
      previewPricing={previewPromotionPricing}
      isAuthenticated={isAuthenticated}
      requestLogin={requestLogin}
      mode="normal"
    />
  );
}
