"use client";
import {
  ArrowLeft,
  Building,
  Building2,
  Calendar,
  Camera,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Globe,
  Home,
  MapPin,
  Plus,
  Trash2,
  Video,
} from "lucide-react";
import { use, useEffect, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import DateSlotPicker from "@/components/DateSlotPicker";
import { useAuth } from "@/lib/contexts/auth";
import PhoneNumberInput from "@/components/PhoneInput";
import StarBackground from "@/components/StarBackground";
import { michroma } from "@/fonts";
import {
  createBookings,
  createTransactionAndPaymentIntent,
  getDrafts,
  saveDrafts,
} from "@/lib/actions/bookings";
import { validateCoupon } from "@/lib/actions/coupons";
import {
  PROPERTY_TYPE_ORDER,
  SERVICE_ORDER,
  PRICING_CONFIG as STATIC_PRICING_CONFIG,
} from "@/lib/config/pricing";
import { bookingSchema } from "@/lib/schema/booking.schema";

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

export default function BookNew({
  bookingsPromise,
  pricingsPromise,
  discountsPromise,
}) {
  const bookings = use(bookingsPromise);
  const pricingsRes = use(pricingsPromise);
  const discountsRes = use(discountsPromise);

  const pricings = pricingsRes?.success ? pricingsRes.data : null;
  const discountsConfig = (discountsRes?.success ? discountsRes.data : []) || [];

  const PRICING_CONFIG = pricings || STATIC_PRICING_CONFIG;
  const [openPropertyIndex, setOpenPropertyIndex] = useState(0);
  const [step, setStep] = useState("details");
  const [couponCode, setCouponCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");
  const [bookingIds, setBookingIds] = useState([]);
  const { authState, login } = useAuth();

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    trigger,
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
          preferredDate: "",
          timeSlot: "",
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
            preferredDate: draft.date || "",
            timeSlot:
              draft.slot === 1
                ? "morning"
                : draft.slot === 2
                  ? "afternoon"
                  : draft.slot === 3
                    ? "evening"
                    : "",
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
    if (isLoadingDrafts || step !== "details") return;

    const timer = setTimeout(async () => {
      try {
        // Basic check to ensure we don't save completely empty/initial state if not needed,
        // but user asked to save if they fill details.
        // We can just save whatever is in properties.
        if (properties?.length > 0) {
          await saveDrafts(properties);
        }
      } catch (err) {
        console.error("Auto-save failed", err);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [properties, isLoadingDrafts, step]);

  const addProperty = () => {
    const currentProperties = getValues("properties");
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
          building: "",
          community: "",
          unitNumber: "",
          contactName: "",
          contactPhone: "",
          contactEmail: "",
        },
      ],
      { shouldValidate: true },
    );
    setOpenPropertyIndex(currentProperties.length);
  };

  const duplicateProperty = (index) => {
    const currentProperties = getValues("properties");
    const propertyToDuplicate = {
      ...currentProperties[index],
      preferredDate: "",
      timeSlot: "",
    };
    setValue("properties", [...currentProperties, propertyToDuplicate], {
      shouldValidate: true,
    });
    setOpenPropertyIndex(currentProperties.length);
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

  const toggleService = async (index, serviceName, currentServices) => {
    const newServices = currentServices.includes(serviceName)
      ? currentServices.filter((s) => s !== serviceName)
      : [...currentServices, serviceName];
    setValue(`properties.${index}.services`, newServices, {
      shouldValidate: true,
    });
    // await trigger(`properties.${index}.services`);
  };

  const onContinue = async (data) => {
    if (!authState.isAuthenticated) {
      login();
      return;
    }
    try {
      // Save bookings to DB
      const res = await createBookings(data.properties);
      if (!res.success) throw new Error(res.message);
      const ids = res.data;
      setBookingIds(ids);
      setStep("payment");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      alert(error.message || "Failed to save bookings");
    }
  };

  const handleFinalSubmit = async () => {
    try {
      const res = await createTransactionAndPaymentIntent(
        bookingIds,
        couponCode,
      );
      if (!res.success) throw new Error(res.message);
      const result = res.data;
      if (result.url) {
        window.location.href = result.url;
      } else {
        throw new Error("No payment URL returned");
      }
    } catch (error) {
      alert(error.message || "Failed to process payment");
    }
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

    return property.services.reduce((total, service) => {
      const priceConfig = sizeConfig.prices[service];
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

    property.services.forEach((service) => {
      const config = sizeConfig.prices[service];
      if (config && typeof config === "object") {
        const sDuration = config.slots || 1;
        if (sDuration > duration) duration = sDuration;
        if (config.allowEvening) allowEvening = true;
      }
    });

    return { duration, allowEvening };
  };

  const calculateAutomaticDiscounts = (amount) => {
    let currentAmount = amount; // This is the payable amount
    let calculationBasis = amount; // This is the basis for calculating percentages
    let directDiscount = 0;
    let walletCredits = 0;
    const applied = [];

    discountsConfig.forEach((d) => {
      if (!d.isActive) return;
      // Check eligibility based on original amount
      if (amount < d.minAmount) return;

      // Calculate discount based on calculationBasis (sequential application)
      const val = Math.min(
        (calculationBasis * d.percentage) / 100,
        d.maxDiscount,
      );

      if (d.type === "direct") {
        directDiscount += val;
        currentAmount -= val;
        calculationBasis -= val;
      } else if (d.type === "wallet") {
        walletCredits += val;
        calculationBasis -= val; // Wallet credits also reduce the basis for next discounts
      }
      applied.push({ ...d, value: val });
    });

    return {
      finalAmount: currentAmount,
      directDiscount,
      walletCredits,
      applied,
    };
  };

  const getOccupiedSlots = (currentIndex) => {
    const occupied = {}; // { "YYYY-MM-DD": ["morning", "afternoon"] }
    const TIME_SLOT_VALUES = ["morning", "afternoon", "evening"];

    properties.forEach((p, idx) => {
      if (idx === currentIndex) return; // Don't block self
      if (!p.preferredDate || !p.timeSlot) return;

      const { duration } = getPropertyDurationAndEvening(p);
      const startIndex = TIME_SLOT_VALUES.indexOf(p.timeSlot);

      if (startIndex === -1) return;

      if (!occupied[p.preferredDate]) occupied[p.preferredDate] = [];

      for (let i = 0; i < duration; i++) {
        const slotIndex = startIndex + i;
        if (slotIndex < TIME_SLOT_VALUES.length) {
          occupied[p.preferredDate].push(TIME_SLOT_VALUES[slotIndex]);
        }
      }
    });
    return occupied;
  };

  const handleApplyCoupon = async () => {
    setCouponError("");
    setCouponSuccess("");
    setDiscountAmount(0);

    if (!couponCode) return;

    const total = calculateTotal();
    const { finalAmount } = calculateAutomaticDiscounts(total);

    // Validate coupon against the amount AFTER automatic discounts?
    // Or original? Usually coupons have min spend requirements.
    // Let's use the amount the user has to pay (finalAmount) for validation to be safe/conservative,
    // or pass both. For now, passing finalAmount seems safer for "min spend" checks.
    const res = await validateCoupon(couponCode, finalAmount);
    const result = res.success
      ? res.data
      : { valid: false, message: res.message };

    if (result.valid) {
      setDiscountAmount(result.discount);
      setCouponSuccess(`Coupon applied! You saved AED ${result.discount}`);
    } else {
      setCouponError(result.message);
    }
  };

  useEffect(() => {
    console.log("Errors", errors);
  }, [errors]);

  const totalAmount = calculateTotal();
  const {
    finalAmount: amountAfterAuto,
    directDiscount: autoDirectDiscount,
    walletCredits: autoWalletCredits,
    applied: appliedAutoDiscounts,
  } = calculateAutomaticDiscounts(totalAmount);

  useEffect(() => {
    if (couponCode && discountAmount > 0) {
      // Re-validate with new amount
      validateCoupon(couponCode, amountAfterAuto).then((res) => {
        const result = res.success
          ? res.data
          : { valid: false, message: res.message };
        if (result.valid) {
          setDiscountAmount(result.discount);
        } else {
          setDiscountAmount(0);
          setCouponError(result.message);
          setCouponSuccess("");
        }
      });
    }
  }, [amountAfterAuto]);

  return (
    <div className="min-h-screen bg-[#121212] pt-24 text-white py-8 relative">
      <StarBackground />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mb-8 text-center">
          <h1
            className={`text-2xl md:text-3xl font-bold text-white mb-2 ${michroma.className}`}
          >
            Book Your Property Shoot
          </h1>
          <p className="text-gray-400">
            Add your property details and preferred schedule
          </p>
        </div>

        {step === "details"
          ? <form onSubmit={handleSubmit(onContinue)} className="space-y-6">
            <div className="space-y-6">
              {properties?.map((property, index) => {
                const price = getPropertyPrice(property);
                const titleParts = [];
                if (property.community) titleParts.push(property.community);
                if (property.propertyType)
                  titleParts.push(property.propertyType);
                if (property.propertySize)
                  titleParts.push(property.propertySize);

                return (
                  <Card
                    key={index}
                    className={cn(
                      "bg-[#181818bb] border border-zinc-800 shadow-none overflow-visible",
                      index === openPropertyIndex
                        ? "relative z-10"
                        : "relative z-0",
                    )}
                  >
                    <CardHeader
                      className="flex flex-row justify-between items-center pb-4 cursor-pointer space-y-0"
                      onClick={() =>
                        setOpenPropertyIndex(
                          index === openPropertyIndex ? -1 : index,
                        )
                      }
                    >
                      <div className="flex flex-1 min-w-0 flex-wrap items-center gap-2 text-base md:text-xl font-semibold text-white">
                        {index !== openPropertyIndex && titleParts.length > 0
                          ? titleParts.map((part, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 whitespace-nowrap"
                            >
                              <span>{part}</span>
                              {idx < titleParts.length - 1 && (
                                <span className="w-1 h-1 rounded-full bg-gray-500"></span>
                              )}
                            </div>
                          ))
                          : <span>Property {index + 1}</span>}
                        {price > 0 && (
                          <div className="w-full md:hidden mt-1">
                            <span className="bg-zinc-800 px-3 py-1 rounded-md text-sm font-medium text-white">
                              AED {price}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {price > 0 && (
                          <div className="hidden md:block bg-zinc-800 px-3 py-1 rounded-md text-sm font-medium text-white mr-2">
                            AED {price}
                          </div>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-gray-400 hover:text-white h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateProperty(index);
                          }}
                          title="Duplicate"
                        >
                          <Copy size={18} />
                        </Button>
                        {properties.length > 1 && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10 h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeProperty(index);
                            }}
                            title="Remove"
                          >
                            <Trash2 size={18} />
                          </Button>
                        )}
                        <div className="ml-2">
                          {index === openPropertyIndex
                            ? <ChevronUp
                              size={20}
                              className="text-gray-400"
                            />
                            : <ChevronDown
                              size={20}
                              className="text-gray-400"
                            />}
                        </div>
                      </div>
                    </CardHeader>

                    {index !== openPropertyIndex && (
                      <CardContent className="pt-0 pb-4 space-y-4">
                        {/* Date & Time */}
                        <div className="flex items-center gap-6 text-gray-400 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar size={16} />
                            <span>
                              {property.preferredDate || "Select Date"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock size={16} />
                            <span className="capitalize">
                              {property.timeSlot || "Select Time"}
                            </span>
                          </div>
                        </div>

                        {/* Services */}
                        <div>
                          <div className="text-md text-white mb-2">
                            Services:
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {property.services?.length > 0
                              ? property.services.map((s) => (
                                <span
                                  key={s}
                                  className="bg-zinc-800 text-gray-300 px-3 py-1 rounded-full text-xs"
                                >
                                  {s}
                                </span>
                              ))
                              : <span className="text-gray-500 text-sm italic">
                                No services selected
                              </span>}
                          </div>
                        </div>

                        {errors.properties?.[index] && (
                          <p className="text-red-500 text-xs mt-2">
                            Please fill all fields
                          </p>
                        )}
                      </CardContent>
                    )}

                    {index === openPropertyIndex && (
                      <>
                        <Separator className="bg-zinc-800" />
                        <CardContent className="pt-6 space-y-8 overflow-visible">
                          {/* Property Type Selection */}
                          <div>
                            <label className="block text-sm font-medium text-gray-400 mb-3">
                              Property Type
                            </label>
                            <Controller
                              name={`properties.${index}.propertyType`}
                              control={control}
                              render={({ field }) => (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  {PROPERTY_TYPE_ORDER.map((type) => {
                                    if (!PRICING_CONFIG[type]) return null;
                                    const Icon =
                                      PROPERTY_TYPE_ICONS[type] || Building;
                                    return (
                                      <div
                                        key={type}
                                        className={cn(
                                          "cursor-pointer rounded-xl border p-4 text-center transition-all flex flex-col items-center justify-center gap-3 min-h-24",
                                          field.value === type
                                            ? "border-white bg-[#272727] text-white"
                                            : "border-zinc-700 bg-[#272727] text-gray-400 hover:border-zinc-500",
                                        )}
                                        onClick={() => {
                                          setValue(
                                            `properties.${index}.propertyType`,
                                            type,
                                            { shouldValidate: true },
                                          );
                                          setValue(
                                            `properties.${index}.propertySize`,
                                            "",
                                          );
                                          setValue(
                                            `properties.${index}.services`,
                                            [],
                                          );
                                        }}
                                      >
                                        <Icon size={24} />
                                        <span className="text-sm font-medium">
                                          {type}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            />
                            {errors.properties?.[index]?.propertyType && (
                              <p className="text-red-500 text-xs mt-1">
                                {
                                  errors.properties[index].propertyType
                                    .message
                                }
                              </p>
                            )}
                          </div>

                          {/* Property Size Selection - Conditional */}
                          {property.propertyType &&
                            PRICING_CONFIG[property.propertyType] && (
                              <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                                <label className="block text-sm font-medium text-gray-400 mb-3">
                                  Property Size
                                </label>
                                <Controller
                                  name={`properties.${index}.propertySize`}
                                  control={control}
                                  render={({ field }) => (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                      {PRICING_CONFIG[
                                        property.propertyType
                                      ].sizes.map((sizeObj) => (
                                        <div
                                          key={sizeObj.label}
                                          className={cn(
                                            "cursor-pointer rounded-lg border px-4 py-3 text-sm text-center transition-all",
                                            field.value === sizeObj.label
                                              ? "border-white bg-[#272727] text-white font-medium"
                                              : "border-zinc-700 bg-[#272727] text-gray-400 hover:border-zinc-500",
                                          )}
                                          onClick={() => {
                                            setValue(
                                              `properties.${index}.propertySize`,
                                              sizeObj.label,
                                              { shouldValidate: true },
                                            );
                                            setValue(
                                              `properties.${index}.services`,
                                              [],
                                            );
                                          }}
                                        >
                                          {sizeObj.label}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                />
                                {errors.properties?.[index]?.propertySize && (
                                  <p className="text-red-500 text-xs mt-1">
                                    {
                                      errors.properties[index].propertySize
                                        .message
                                    }
                                  </p>
                                )}
                              </div>
                            )}

                          {/* Services Selection - Conditional */}
                          {property.propertySize && property.propertyType && (
                            <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                              <label className="block text-sm font-medium text-gray-400 mb-3">
                                Services (Multiple Selection)
                              </label>
                              <Controller
                                name={`properties.${index}.services`}
                                control={control}
                                render={({ field }) => (
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {(() => {
                                      const typeConfig =
                                        PRICING_CONFIG[property.propertyType];
                                      const sizeConfig =
                                        typeConfig.sizes.find(
                                          (s) =>
                                            s.label === property.propertySize,
                                        );
                                      if (!sizeConfig) return null;

                                      return SERVICE_ORDER.map(
                                        (serviceName) => {
                                          const priceConfig =
                                            sizeConfig.prices[serviceName];
                                          if (priceConfig === undefined)
                                            return null;

                                          const price =
                                            typeof priceConfig === "object"
                                              ? priceConfig.price || 0
                                              : priceConfig || 0;

                                          const Icon =
                                            SERVICE_ICONS[serviceName] ||
                                            Camera;
                                          const isSelected =
                                            field.value?.includes(
                                              serviceName,
                                            );
                                          return (
                                            <div
                                              key={serviceName}
                                              className={cn(
                                                "cursor-pointer rounded-xl border p-6 text-center transition-all",
                                                isSelected
                                                  ? "border-white bg-[#272727] text-white"
                                                  : "border-zinc-700 bg-[#272727] text-gray-400 hover:border-zinc-500",
                                              )}
                                              onClick={() =>
                                                toggleService(
                                                  index,
                                                  serviceName,
                                                  field.value || [],
                                                )
                                              }
                                            >
                                              <div className="flex flex-col items-center gap-3">
                                                <Icon
                                                  size={32}
                                                  className={
                                                    isSelected
                                                      ? "text-white"
                                                      : "text-gray-400"
                                                  }
                                                />
                                                <div>
                                                  <div className="font-semibold mb-1">
                                                    {serviceName}
                                                  </div>
                                                  <div className="text-sm text-gray-500">
                                                    AED {price}
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        },
                                      );
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

                          {/* Date and Time Details */}
                          <div>
                            <DateSlotPicker
                              date={property.preferredDate}
                              slot={property.timeSlot}
                              duration={
                                getPropertyDurationAndEvening(property)
                                  .duration
                              }
                              allowEvening={
                                getPropertyDurationAndEvening(property)
                                  .allowEvening
                              }
                              blockedSlotsMap={getOccupiedSlots(index)}
                              onDateChange={(d) =>
                                setValue(
                                  `properties.${index}.preferredDate`,
                                  d,
                                  {
                                    shouldValidate: true,
                                  },
                                )
                              }
                              onSlotChange={(s) =>
                                setValue(`properties.${index}.timeSlot`, s, {
                                  shouldValidate: true,
                                })
                              }
                              error={
                                errors.properties?.[index]?.preferredDate
                                  ?.message ||
                                errors.properties?.[index]?.timeSlot?.message
                              }
                            />
                          </div>

                          <Separator className="bg-zinc-800 my-2" />

                          {/* Location Details */}
                          {/* Location Details */}
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {/* Building / Tower Name */}
                            <Controller
                              name={`properties.${index}.building`}
                              control={control}
                              render={({ field, fieldState }) => (
                                <div className="group flex flex-col gap-1.5">
                                  <label className="text-sm text-gray-400">
                                    Building / Tower Name
                                  </label>
                                  <Input
                                    {...field}
                                    placeholder="eg. Burj Khalifa"
                                    className="bg-[#272727] border-zinc-700 hover:border-zinc-500 focus-visible:border-white text-white"
                                  />
                                  {fieldState.error && (
                                    <div className="text-red-500 text-xs ml-1 mt-1">
                                      {fieldState.error.message}
                                    </div>
                                  )}
                                </div>
                              )}
                            />

                            {/* Community / Area */}
                            <Controller
                              name={`properties.${index}.community`}
                              control={control}
                              render={({ field, fieldState }) => (
                                <div className="group flex flex-col gap-1.5">
                                  <label className="text-sm text-gray-400">
                                    Community / Area
                                  </label>
                                  <Input
                                    {...field}
                                    placeholder="eg. Downtown"
                                    className="bg-[#272727] border-zinc-700 hover:border-zinc-500 focus-visible:border-white text-white"
                                  />
                                  {fieldState.error && (
                                    <div className="text-red-500 text-xs ml-1 mt-1">
                                      {fieldState.error.message}
                                    </div>
                                  )}
                                </div>
                              )}
                            />

                            {/* Unit Number */}
                            <Controller
                              name={`properties.${index}.unitNumber`}
                              control={control}
                              render={({ field, fieldState }) => (
                                <div className="group flex flex-col gap-1.5">
                                  <label className="text-sm text-gray-400">
                                    Unit Number (Optional)
                                  </label>
                                  <Input
                                    {...field}
                                    placeholder="eg. 1205"
                                    className="bg-[#272727] border-zinc-700 hover:border-zinc-500 focus-visible:border-white text-white"
                                  />
                                  {fieldState.error && (
                                    <div className="text-red-500 text-xs ml-1 mt-1">
                                      {fieldState.error.message}
                                    </div>
                                  )}
                                </div>
                              )}
                            />
                          </div>

                          <Separator className="bg-zinc-800 my-2" />

                          {/* Point of Contact */}
                          <div>
                            <h3 className="text-md font-medium text-white mb-4">
                              Point of Contact
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                              {/* Name */}
                              <Controller
                                name={`properties.${index}.contactName`}
                                control={control}
                                render={({ field, fieldState }) => (
                                  <div className="group flex flex-col gap-1.5">
                                    <label className="text-sm text-gray-400">
                                      Name
                                    </label>
                                    <Input
                                      {...field}
                                      placeholder="Enter contact name"
                                      className="bg-[#272727] border-zinc-700 hover:border-zinc-500 focus-visible:border-white text-white"
                                    />
                                    {fieldState.error && (
                                      <div className="text-red-500 text-xs ml-1 mt-1">
                                        {fieldState.error.message}
                                      </div>
                                    )}
                                  </div>
                                )}
                              />

                              {/* Phone */}
                              <Controller
                                name={`properties.${index}.contactPhone`}
                                control={control}
                                render={({ field, fieldState }) => (
                                  <div className="group flex flex-col gap-1.5">
                                    <label className="block text-sm text-gray-400">
                                      Phone Number
                                    </label>
                                    <PhoneNumberInput
                                      value={field.value}
                                      onChange={(v) => field.onChange(v)}
                                      name={field.name}
                                      classNames={{
                                        inputWrapper:
                                          "flex items-center w-full px-3 rounded-xl bg-[#272727] border-2 border-zinc-700 hover:border-zinc-500 focus-within:!border-white transition-colors h-10",
                                        input:
                                          "bg-transparent border-none outline-none text-white w-full placeholder:text-gray-500 text-sm h-full",
                                        countryIcon:
                                          "mr-2 flex items-center h-full",
                                      }}
                                    />
                                    {fieldState.error
                                      ? <div className="text-red-500 text-xs ml-1 mt-1">
                                        {fieldState.error.message}
                                      </div>
                                      : null}
                                  </div>
                                  /*
                            <HeroTelInput
                              {...field}
                              label="Phone Number"
                              labelPlacement="outside"
                              placeholder="Enter phone number"
                              defaultCountry="AE"
                              variant="bordered"
                              errorMessage={fieldState.error?.message}
                              isInvalid={!!fieldState.error}
                              excludedCountries={['TA', 'AC']}
                              classNames={{
                                input: {
                                  inputWrapper: "bg-[#272727] border-zinc-700 hover:border-zinc-500 group-data-[focus=true]:border-white",
                                  label: "!text-gray-400",
                                  input: "text-white",
                                },
                                dialog: '!max-h-200',
                                modal: '!max-h-200',
                                overlay: 'overflow-hidden',
                                dialogContent: "bg-[#181818] border border-zinc-800 text-white !max-h-200",
                                menuItem: "text-white hover:bg-zinc-800 data-[selected=true]:bg-zinc-800",
                                searchInput: "bg-[#272727] text-white border-zinc-700 placeholder:text-gray-500",
                              }}
                            />
                            */
                                )}
                              />

                              {/* Email */}
                              <Controller
                                name={`properties.${index}.contactEmail`}
                                control={control}
                                render={({ field, fieldState }) => (
                                  <div className="group flex flex-col gap-1.5">
                                    <label className="text-sm text-gray-400">
                                      Email Address (Optional)
                                    </label>
                                    <Input
                                      {...field}
                                      type="email"
                                      placeholder="Enter email address"
                                      className="bg-[#272727] border-zinc-700 hover:border-zinc-500 focus-visible:border-white text-white"
                                    />
                                    {fieldState.error && (
                                      <div className="text-red-500 text-xs ml-1 mt-1">
                                        {fieldState.error.message}
                                      </div>
                                    )}
                                  </div>
                                )}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </>
                    )}
                  </Card>
                );
              })}

              {/* Add Property Button */}
              <Button
                type="button"
                variant="ghost"
                onClick={addProperty}
                className="w-full text-white hover:bg-zinc-800"
              >
                <Plus size={20} className="mr-2" />
                Add Another Property
              </Button>
            </div>

            {/* Pricing Summary */}
            <Card className="bg-[#181818bb] border border-zinc-800 shadow-none">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      Pricing Summary
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                      {properties.length}{" "}
                      {properties.length === 1 ? "Property" : "Properties"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">Grand Total</p>
                    <p className="text-2xl font-bold text-white">
                      AED {calculateTotal().toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="px-8 w-full bg-white text-black hover:bg-gray-200"
              >
                {isSubmitting ? "Submitting..." : "Continue to Payment"}
              </Button>
            </div>
          </form>
          : <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
            <Button
              variant="ghost"
              onClick={() => setStep("details")}
              className="mb-4 text-gray-400 hover:text-white pl-0 hover:bg-transparent"
            >
              <ArrowLeft size={20} className="mr-2" />
              Back to Details
            </Button>

            <h2
              className={`text-2xl font-bold text-white mb-6 ${michroma.className}`}
            >
              Payment Verification
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                {properties.map((property, index) => (
                  <Card
                    key={index}
                    className="bg-[#181818bb] border border-zinc-800"
                  >
                    <CardHeader className="flex flex-row justify-between items-start pb-2 space-y-0">
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {property.community || "Unknown Location"} -{" "}
                          {property.propertyType || "Unknown Type"}
                        </h3>
                        <p className="text-sm text-gray-400">
                          {property.building}{" "}
                          {property.unitNumber && `- ${property.unitNumber}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="bg-zinc-800 px-3 py-1 rounded-md text-sm font-medium text-white">
                          AED {getPropertyPrice(property)}
                        </div>
                      </div>
                    </CardHeader>
                    <Separator className="bg-zinc-800 my-2" />
                    <CardContent className="space-y-3 text-sm text-gray-300">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Size</span>
                        <span>{property.propertySize}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Date & Time</span>
                        <span>
                          {property.preferredDate} | {property.timeSlot}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Services</span>
                        <div className="flex gap-2 flex-wrap justify-end">
                          {property.services?.map((s) => (
                            <span
                              key={s}
                              className="bg-zinc-800 px-2 py-0.5 rounded text-xs"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Contact</span>
                        <span>
                          {property.contactName} ({property.contactPhone})
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="space-y-6">
                <Card className="bg-[#181818bb] border border-zinc-800">
                  <CardContent className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">
                      Order Summary
                    </h3>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-gray-400">
                        <span>Subtotal</span>
                        <span className="whitespace-nowrap">
                          AED {calculateTotal().toLocaleString()}
                        </span>
                      </div>

                      {appliedAutoDiscounts
                        .filter((d) => d.type !== "wallet")
                        .map((d, i) => (
                          <div
                            key={i}
                            className="flex justify-between items-center text-sm"
                          >
                            <span className="text-green-500">
                              {d.name} (Discount)
                            </span>
                            <span
                              className={cn(
                                "whitespace-nowrap",
                                "text-green-500",
                              )}
                            >
                              - AED {d.value.toLocaleString()}
                            </span>
                          </div>
                        ))}

                      {discountAmount > 0 && (
                        <div className="flex justify-between items-center text-gray-400">
                          <span>Coupon Discount</span>
                          <span className="text-green-500 whitespace-nowrap">
                            - AED {discountAmount.toLocaleString()}
                          </span>
                        </div>
                      )}

                      <Separator className="bg-zinc-800 my-2" />
                      <div className="flex justify-between items-center text-xl font-bold text-white">
                        <span>Total Payable</span>
                        <span className="whitespace-nowrap">
                          AED{" "}
                          {(
                            amountAfterAuto - discountAmount
                          ).toLocaleString()}
                        </span>
                      </div>
                      {autoWalletCredits > 0 && (
                        <div className="text-xs text-purple-400 text-right mt-1">
                          You will earn AED{" "}
                          {autoWalletCredits.toLocaleString()} in wallet
                          credits
                        </div>
                      )}
                    </div>

                    <div className="pt-4">
                      <div className="space-y-1">
                        <div className="relative">
                          <Input
                            placeholder="Coupon Code"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value)}
                            className="bg-[#272727] border-zinc-700 hover:border-zinc-500 focus-visible:border-white text-white pr-20"
                          />
                          <div className="absolute right-1 top-1/2 -translate-y-1/2">
                            <Button
                              size="sm"
                              className="bg-white text-black font-semibold h-8 hover:bg-gray-200"
                              onClick={handleApplyCoupon}
                              type="button"
                            >
                              Apply
                            </Button>
                          </div>
                        </div>
                        {couponError && <p className="text-red-500 text-xs">{couponError}</p>}
                        {couponSuccess && <p className="text-green-500 text-xs">{couponSuccess}</p>}
                      </div>
                    </div>

                    <Button
                      size="lg"
                      className="w-full font-semibold bg-white text-black hover:bg-gray-200"
                      onClick={handleFinalSubmit}
                    >
                      Make Payment
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>}
      </div>
    </div>
  );
}
