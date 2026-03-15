"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { use, useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/contexts/auth";
import {
  LAUNCH_PROMO_CODE,
  LAUNCH_PROMO_DISCOUNT,
  LAUNCH_PROMO_LABEL,
  LAUNCH_PROMO_MIN_AMOUNT,
} from "@/lib/config/promo";
import {
  createBookings,
  createTransactionAndPaymentIntent,
  getDrafts,
  saveDrafts,
} from "@/lib/actions/bookings";
import { validateCoupon } from "@/lib/actions/coupons";
import { PRICING_CONFIG as STATIC_PRICING_CONFIG } from "@/lib/config/pricing";
import { calculateBookingDuration } from "@/lib/helpers/bookingUtils";
import { bookingSchema } from "@/lib/schema/booking.schema";
// Modular Components
import { PropertyCard } from "./components/PropertyCard";

export default function BookNew({ pricingsPromise, discountsPromise }) {
  const pricingsRes = use(pricingsPromise);
  use(discountsPromise);

  const pricings = pricingsRes?.success ? pricingsRes.data : null;

  const PRICING_CONFIG = pricings || STATIC_PRICING_CONFIG;
  const [openPropertyIndex, setOpenPropertyIndex] = useState(0);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isLaunchPromoApplied, setIsLaunchPromoApplied] = useState(true);
  const [couponInputValue, setCouponInputValue] = useState("");
  const [selectedCouponCode, setSelectedCouponCode] = useState("");
  const [selectedCouponDiscount, setSelectedCouponDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState("");
  const [couponError, setCouponError] = useState("");
  const { authState, login } = useAuth();

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
      properties: [
        {
          propertyType: "",
          propertySize: "",
          services: [],
          videographySubService: "",
          preferredDate: "",
          timeSlot: "",
          startTime: "",
          duration: 0,
          building: "",
          community: "",
          unitNumber: "",
          contactName: "",
          contactPhone: "+971",
          contactEmail: "",
        },
      ],
    },
  });

  const properties = useWatch({
    control,
    name: "properties",
  });

  const [isLoadingDrafts, setIsLoadingDrafts] = useState(true);

  // Load drafts on mount
  useEffect(() => {
    const loadDrafts = async () => {
      try {
        const res = await getDrafts();
        const drafts = res.success ? res.data : [];
        if (drafts && drafts.length > 0) {
          const mappedProperties = drafts.map((draft) => ({
            propertyType: draft.propertyDetails?.type || "",
            propertySize: draft.propertyDetails?.size || "",
            services: draft.shootDetails?.services || [],
            videographySubService:
              draft.shootDetails?.videographySubService || "",
            preferredDate: draft.date || "",
            timeSlot:
              draft.slot === 1
                ? "morning"
                : draft.slot === 2
                  ? "afternoon"
                  : draft.slot === 3
                    ? "evening"
                    : "",
            startTime:
              draft.startTime ||
              (draft.slot === 1
                ? "10:00"
                : draft.slot === 2
                  ? "13:00"
                  : draft.slot === 3
                    ? "16:00"
                    : ""),
            duration: draft.duration || 0,
            building: draft.propertyDetails?.building || "",
            community: draft.propertyDetails?.community || "",
            unitNumber: draft.propertyDetails?.unit || "",
            contactName: draft.contactDetails?.name || "",
            contactPhone: draft.contactDetails?.phone || "",
            contactEmail: draft.contactDetails?.email || "",
          }));
          setValue("properties", mappedProperties);
        }
      } catch (error) {
        console.error("Failed to load drafts", error);
      } finally {
        setIsLoadingDrafts(false);
      }
    };
    loadDrafts();
  }, [setValue]);

  // Auto-save drafts
  useEffect(() => {
    if (isLoadingDrafts) return;
    if (!authState?.isAuthenticated) return;

    const timer = setTimeout(async () => {
      try {
        if (properties?.length > 0) {
          await saveDrafts(properties);
        }
      } catch (err) {
        if (!String(err?.message || "").toLowerCase().includes("unauthorized")) {
          console.error("Auto-save failed", err);
        }
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [properties, isLoadingDrafts, authState?.isAuthenticated]);

  const addProperty = () => {
    const currentProperties = getValues("properties");
    const nextIndex = currentProperties.length;
    setValue(
      "properties",
      [
        ...currentProperties,
        {
          propertyType: "",
          propertySize: "",
          services: [],
          preferredDate: "",
          timeSlot: "",
          startTime: "",
          duration: 0,
          building: "",
          community: "",
          unitNumber: "",
          contactName: "",
          contactPhone: "",
          contactEmail: "",
        },
      ],
      { shouldValidate: false },
    );
    clearErrors(`properties.${nextIndex}`);
    setOpenPropertyIndex(nextIndex);
  };

  const duplicateProperty = (index) => {
    const currentProperties = getValues("properties");
    const propertyToDuplicate = {
      ...currentProperties[index],
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

  const updatePropertyField = (index, field, value) => {
    setValue(`properties.${index}.${field}`, value, { shouldValidate: true });

    // If changed field affects duration, recalculate it
    if (
      [
        "propertyType",
        "propertySize",
        "services",
        "videographySubService",
      ].includes(field)
    ) {
      const current = getValues(`properties.${index}`);
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

    setValue(`properties.${index}.services`, newServices, {
      shouldValidate: true,
      shouldDirty: true,
    });

    const property = getValues(`properties.${index}`);
    const hasVideography = newServices.includes("Videography");
    const nextVideographySubService = hasVideography
      ? property?.videographySubService || ""
      : "";

    if (!hasVideography) {
      setValue(`properties.${index}.videographySubService`, "", {
        shouldValidate: true,
        shouldDirty: true,
      });
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
    console.log("onContinue called with data:", data);
    if (!authState?.isAuthenticated) {
      toast.error("Please login to continue to payment");
      login();
      return;
    }

    setIsProcessingPayment(true);
    try {
      // Create bookings first
      const res = await createBookings(data.properties);
      console.log("Create bookings response:", res);

      if (!res.success) throw new Error(res.message);
      const bookingData = res.data;
      console.log("Booking data received:", bookingData);

      const newBookingIds = bookingData.map((b) => b.id);
      console.log("Extracted booking IDs:", newBookingIds);
      console.log(
        "Booking codes generated:",
        bookingData.map((b) => b.bookingCode),
      );

      const paymentRes = await createTransactionAndPaymentIntent(
        newBookingIds,
        selectedCouponCode || (isLaunchPromoApplied ? LAUNCH_PROMO_CODE : ""),
      );
      if (!paymentRes.success) throw new Error(paymentRes.message);

      const paymentUrl = paymentRes.data?.url;
      if (!paymentUrl) throw new Error("No payment URL returned");
      window.location.href = paymentUrl;
    } catch (error) {
      console.error("Booking submission error:", error);
      if (String(error?.message || "").toLowerCase().includes("unauthorized")) {
        toast.error("Please login to continue to payment");
        login();
        return;
      }
      toast.error(error.message || "Failed to process payment");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const totalAmount = calculateTotal();
  const launchPromoDiscount =
    isLaunchPromoApplied && totalAmount >= LAUNCH_PROMO_MIN_AMOUNT
      ? Math.min(LAUNCH_PROMO_DISCOUNT, totalAmount)
      : 0;
  const launchPromoRemaining = Math.max(0, LAUNCH_PROMO_MIN_AMOUNT - totalAmount);
  const activeCouponDiscount = selectedCouponCode ? selectedCouponDiscount : 0;
  const payableAmount = Math.max(
    0,
    totalAmount - activeCouponDiscount - launchPromoDiscount,
  );

  const applyCouponSelection = async (couponCode) => {
    setCouponError("");
    setCouponMessage("");

    const normalizedCode = String(couponCode || "").trim().toUpperCase();

    if (!normalizedCode) {
      setSelectedCouponCode("");
      setSelectedCouponDiscount(0);
      return;
    }

    const res = await validateCoupon(normalizedCode, totalAmount);
    const couponResult = res?.success ? res.data : null;

    if (!couponResult?.valid) {
      setSelectedCouponCode("");
      setSelectedCouponDiscount(0);
      setCouponError(couponResult?.message || "Unable to apply coupon");
      return;
    }

    setIsLaunchPromoApplied(false);
    setSelectedCouponCode(normalizedCode);
    setCouponInputValue(normalizedCode);
    setSelectedCouponDiscount(Number(couponResult.discount || 0));
    setCouponMessage(
      couponResult.coupon?.uiText ||
        `${normalizedCode} applied successfully`,
    );
  };

  useEffect(() => {
    if (!selectedCouponCode) return;

    applyCouponSelection(selectedCouponCode);
  }, [totalAmount]);

  // Validate launch promo on component mount
  useEffect(() => {
    const validateLaunchPromo = async () => {
      if (!isLaunchPromoApplied) return;
      
      const res = await validateCoupon(LAUNCH_PROMO_CODE, totalAmount);
      const couponResult = res?.success ? res.data : null;
      
      if (!couponResult?.valid) {
        setIsLaunchPromoApplied(false);
        setCouponError(couponResult?.message || "Launch promo not available");
      }
    };
    
    validateLaunchPromo();
  }, [totalAmount]);

  const primaryProperty = properties?.[0] || {};
  const primaryTitle = [
    primaryProperty.propertySize,
    primaryProperty.propertyType,
  ]
    .filter(Boolean)
    .join(" ");
  const primaryServices =
    primaryProperty.services?.length > 0
      ? primaryProperty.services.join(" + ")
      : "Select services";
  const primarySchedule = [primaryProperty.preferredDate, primaryProperty.startTime]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="relative min-h-screen">
      <div className="container mx-auto px-3 md:px-6 relative z-10">
        <div className="max-w-[360px] sm:max-w-[390px] md:max-w-6xl mx-auto">
          <div className="text-center mb-6 md:mb-10 fade-in pt-2 md:pt-6">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground mb-3">
              MILKYWAYY PORTAL
            </p>
            <h1 className="text-[2rem] md:text-4xl lg:text-5xl font-semibold mb-2 md:mb-3 tracking-tight text-foreground">
              Book Your Shoot
            </h1>
            <p className="text-[13px] md:text-base text-muted-foreground max-w-[19rem] md:max-w-md mx-auto">
              Premium property media for Dubai&apos;s finest real estate
            </p>
          </div>

      <form onSubmit={handleSubmit(onContinue)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 items-start">
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            {properties?.map((property, index) => (
              <PropertyCard
                key={`property-${index}`}
                index={index}
                property={property}
                isOpen={index === openPropertyIndex}
                onToggle={() =>
                  setOpenPropertyIndex(index === openPropertyIndex ? -1 : index)
                }
                onDuplicate={duplicateProperty}
                onRemove={removeProperty}
                control={control}
                setValue={setValue}
                errors={errors}
                pricingConfig={PRICING_CONFIG}
                getPropertyPrice={getPropertyPrice}
                getPropertyDurationAndEvening={getPropertyDurationAndEvening}
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
              className="w-full p-3.5 md:p-4 rounded-xl md:rounded-2xl border border-dashed border-border hover:border-muted-foreground/30 bg-secondary/10 hover:bg-secondary/20 transition-all duration-200 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <Plus size={18} className="shrink-0" />
              Add Another Property
            </Button>
          </div>

          <aside className="lg:col-span-1 glass rounded-xl md:rounded-2xl p-4 md:p-5 lg:sticky lg:top-24 mt-1 md:mt-0">
            <h3 className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground mb-2.5">
              Order Summary
            </h3>

            <div className="rounded-xl border border-white/8 bg-white/[0.025] px-3.5 py-3 mb-3.5 space-y-1">
              <div className="flex justify-between items-start gap-3">
                <p className="font-semibold text-[13px] leading-5 text-foreground">
                  {primaryTitle || "Property Summary"}
                </p>
                <span className="font-semibold text-[13px] whitespace-nowrap text-foreground">
                  AED {totalAmount.toLocaleString()}
                </span>
              </div>
              {primaryServices && primaryServices !== "Select services" && (
                <p className="text-[10px] leading-4 text-muted-foreground">
                  {primaryServices}
                </p>
              )}
              {primarySchedule && (
                <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground/80">
                  {primarySchedule}
                </p>
              )}
            </div>

            <div className="space-y-2.5 border-t border-white/8 pt-3.5 mb-3.5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[13px] font-medium text-muted-foreground">Subtotal</p>
                <p className="text-lg md:text-xl font-semibold tracking-tight text-foreground">
                  AED {totalAmount.toLocaleString()}
                </p>
              </div>

              {isLaunchPromoApplied && launchPromoDiscount > 0 && (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-white/6 bg-white/[0.02] px-3 py-2 text-[12px]">
                  <p className="text-muted-foreground">
                    {LAUNCH_PROMO_LABEL} ({LAUNCH_PROMO_CODE})
                  </p>
                  <p className="font-semibold text-emerald-300">
                    - AED {launchPromoDiscount.toLocaleString()}
                  </p>
                </div>
              )}

              {!selectedCouponCode && launchPromoRemaining > 0 && (
                <p className="text-[11px] leading-4 text-muted-foreground">
                  Add AED {launchPromoRemaining.toLocaleString()} more to unlock your AED {LAUNCH_PROMO_DISCOUNT.toLocaleString()} launch credit.
                </p>
              )}

              {selectedCouponCode && selectedCouponDiscount > 0 && (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-white/6 bg-white/[0.02] px-3 py-2 text-[12px]">
                  <p className="text-muted-foreground">
                    Coupon ({selectedCouponCode})
                  </p>
                  <p className="font-semibold text-emerald-300">
                    - AED {selectedCouponDiscount.toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] px-3.5 py-3 mb-3.5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Grand Total
                </p>
                <p className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
                  AED {payableAmount.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="mb-4 space-y-1.5">
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Coupon Code
              </p>
              <p className="text-[10px] leading-4 text-muted-foreground">
                Have a private coupon? Enter the code below.
              </p>
              <div className="flex items-center gap-2">
                <input
                  value={couponInputValue}
                  onChange={(e) => setCouponInputValue(e.target.value.toUpperCase())}
                  placeholder="Enter coupon code"
                  className="h-9 flex-1 rounded-lg border border-white/8 bg-white/[0.02] px-3 text-[12px] text-foreground placeholder:text-muted-foreground outline-none"
                />
                {selectedCouponCode ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 px-3 text-[11px] text-muted-foreground hover:text-foreground hover:bg-white/5"
                    onClick={() => {
                      setSelectedCouponCode("");
                      setSelectedCouponDiscount(0);
                      setCouponInputValue("");
                      setCouponMessage("");
                      setCouponError("");
                      setIsLaunchPromoApplied(true);
                    }}
                  >
                    Remove
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    className="h-9 px-3 text-[11px]"
                    onClick={() => applyCouponSelection(couponInputValue)}
                  >
                    Apply
                  </Button>
                )}
              </div>

              {couponError && (
                <p className="text-[10px] leading-4 text-destructive">
                  {couponError}
                </p>
              )}
              {couponMessage && (
                <p className="text-[10px] leading-4 text-emerald-300">
                  {couponMessage}
                </p>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting || isProcessingPayment}
              className="w-full btn-primary-premium py-2.5"
            >
              {isSubmitting || isProcessingPayment ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redirecting to Payment...
                </>
              ) : (
                "Continue to Payment"
              )}
            </Button>

            <p className="text-[9px] leading-4 text-muted-foreground mt-3">
              Media is licensed for client marketing use. Milkywayy may showcase
              selected work for portfolio and promotional purposes.
            </p>
          </aside>
        </div>
      </form>
        </div>
      </div>
    </section>
  );
}


