"use client";

import {
  Building2,
  CalendarDays,
  CreditCard,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import {
  PRICING_CONFIG,
  PROPERTY_TYPE_ORDER,
  SERVICE_ORDER,
  VIDEOGRAPHY_SUB_CATEGORIES,
  VIDEOGRAPHY_SUB_SERVICES,
} from "@/lib/config/pricing";
import { BUSINESS_DAY_TIME_OPTIONS } from "@/lib/services/schedulingAvailability";

const VIDEOGRAPHY_OPTIONS = [
  VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM,
  `${VIDEOGRAPHY_SUB_SERVICES.LONG_FORM}.${VIDEOGRAPHY_SUB_CATEGORIES.LONG_FORM.DAYLIGHT}`,
  `${VIDEOGRAPHY_SUB_SERVICES.LONG_FORM}.${VIDEOGRAPHY_SUB_CATEGORIES.LONG_FORM.NIGHT_LIGHT}`,
  `${VIDEOGRAPHY_SUB_SERVICES.LONG_FORM}.${VIDEOGRAPHY_SUB_CATEGORIES.LONG_FORM.DAYLIGHT_NIGHT}`,
];
const PROPERTY_TYPES = PROPERTY_TYPE_ORDER.filter(
  (propertyType) => PRICING_CONFIG[propertyType],
);
const SERVICE_OPTIONS = SERVICE_ORDER.filter(Boolean);
const OTP_RESEND_COOLDOWN_SECONDS = 30;
const EMPTY_CUSTOMER = {
  accountType: "INDIVIDUAL",
  fullName: "",
  companyName: "",
  phone: "+971",
  billingAddress: "",
  email: "",
  trn: "",
};

function formatMoney(amount) {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
}

function getPropertySizeOptions(propertyType) {
  return PRICING_CONFIG[propertyType]?.sizes?.map((size) => size.label) || [];
}

function formatVideoLabel(value) {
  return String(value || "").replace(".", " - ");
}

function calculatePropertyTotal(property) {
  if (!property?.propertyType || !property?.propertySize) {
    return 0;
  }

  const typeConfig = PRICING_CONFIG[property.propertyType];
  const sizeConfig = typeConfig?.sizes?.find(
    (size) => size.label === property.propertySize,
  );
  if (!sizeConfig) {
    return 0;
  }

  const selections = String(property.videographySubService || "")
    .split("|")
    .map((value) => value.trim())
    .filter(Boolean);

  return (Array.isArray(property.services) ? property.services : []).reduce(
    (sum, service) => {
      const priceConfig = sizeConfig.prices?.[service];
      if (
        service === "Videography" &&
        typeof priceConfig === "object" &&
        selections.length > 0
      ) {
        return (
          sum +
          selections.reduce((nestedSum, selection) => {
            const direct = priceConfig?.[selection];
            const dotted = selection.includes(".")
              ? priceConfig?.[selection.split(".")[0]]?.[
                  selection.split(".")[1]
                ]
              : null;
            const candidate = dotted ?? direct ?? priceConfig;
            const amount =
              typeof candidate === "object"
                ? Number(candidate?.price || 0)
                : Number(candidate || 0);
            return nestedSum + (Number.isFinite(amount) ? amount : 0);
          }, 0)
        );
      }

      const amount =
        typeof priceConfig === "object"
          ? Number(priceConfig?.price || 0)
          : Number(priceConfig || 0);
      return sum + (Number.isFinite(amount) ? amount : 0);
    },
    0,
  );
}

function buildCustomerDisplayName(customer) {
  if (!customer) return "Customer";
  if (customer.accountType === "COMPANY") {
    return (
      customer.companyName ||
      customer.fullName ||
      customer.email ||
      customer.phone
    );
  }

  return customer.fullName || customer.email || customer.phone || "Customer";
}

export default function BookingHandoffPageClient({ token }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [handoff, setHandoff] = useState(null);
  const [customer, setCustomer] = useState(EMPTY_CUSTOMER);
  const [properties, setProperties] = useState([]);
  const [verificationId, setVerificationId] = useState("");
  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [promotionCode, setPromotionCode] = useState("");

  const loadHandoff = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/booking-handoffs/${token}`, {
        method: "GET",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to load booking handoff");
      }

      setHandoff(payload);
      setCustomer(payload.customer || EMPTY_CUSTOMER);
      setProperties(
        Array.isArray(payload.properties) ? payload.properties : [],
      );
    } catch (requestError) {
      setError(requestError.message || "Failed to load booking handoff");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadHandoff();
  }, [loadHandoff]);

  useEffect(() => {
    if (resendCooldown <= 0) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [resendCooldown]);

  const totalAmount = useMemo(
    () =>
      properties.reduce(
        (sum, property) => sum + calculatePropertyTotal(property),
        0,
      ),
    [properties],
  );

  const requiresOtp =
    Boolean(handoff?.requiresRegistration) && !handoff?.registrationVerifiedAt;
  const isExpired = Boolean(handoff?.isExpired);
  const isCompleted = handoff?.paymentStatus === "success";
  const isOtpAttemptActive = Boolean(verificationId);

  const updateCustomerField = (field, value) => {
    setCustomer((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updatePropertyField = (index, field, value) => {
    setProperties((current) =>
      current.map((property, propertyIndex) => {
        if (propertyIndex !== index) {
          return property;
        }

        const nextProperty = {
          ...property,
          [field]: value,
        };

        if (field === "propertyType") {
          nextProperty.propertySize = "";
          nextProperty.services = [];
          nextProperty.videographySubService = "";
        }

        if (field === "services" && !value.includes("Videography")) {
          nextProperty.videographySubService = "";
        }

        return nextProperty;
      }),
    );
  };

  const toggleService = (index, service) => {
    const currentServices = Array.isArray(properties[index]?.services)
      ? properties[index].services
      : [];
    const nextServices = currentServices.includes(service)
      ? currentServices.filter((currentService) => currentService !== service)
      : [...currentServices, service];

    updatePropertyField(index, "services", nextServices);
  };

  const sendOtp = async () => {
    setSubmitting(true);

    try {
      const response = await fetch(`/api/booking-handoffs/${token}/otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ customer }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to send OTP");
      }

      if (!payload.verificationId) {
        throw new Error("Failed to start phone verification");
      }

      setVerificationId(payload.verificationId);
      setOtp("");
      setResendCooldown(OTP_RESEND_COOLDOWN_SECONDS);
      toast.success("OTP sent");
    } catch (requestError) {
      toast.error(requestError.message || "Failed to send OTP");
    } finally {
      setSubmitting(false);
    }
  };

  const changeDetails = () => {
    setVerificationId("");
    setOtp("");
    setResendCooldown(0);
  };

  const verifyOtp = async () => {
    setSubmitting(true);

    try {
      const response = await fetch(
        `/api/booking-handoffs/${token}/verify-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            verificationId,
            otp,
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to verify OTP");
      }

      toast.success("Phone verified");
      setOtp("");
      setVerificationId("");
      await loadHandoff();
    } catch (requestError) {
      toast.error(requestError.message || "Failed to verify OTP");
    } finally {
      setSubmitting(false);
    }
  };

  const startCheckout = async () => {
    setSubmitting(true);

    try {
      const response = await fetch(`/api/booking-handoffs/${token}/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          properties,
          promotionCode,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to continue to payment");
      }

      if (!payload?.url) {
        throw new Error("No payment URL returned");
      }

      window.location.href = payload.url;
    } catch (requestError) {
      toast.error(requestError.message || "Failed to continue to payment");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading booking handoff...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Booking handoff unavailable</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {error}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="rounded-full border border-white/10 p-3">
              {requiresOtp ? (
                <ShieldCheck className="h-5 w-5" />
              ) : (
                <CreditCard className="h-5 w-5" />
              )}
            </div>
            <div>
              <CardTitle>Booking handoff</CardTitle>
              <p className="text-sm text-muted-foreground">
                {buildCustomerDisplayName(customer)}
                {handoff?.expiresAt
                  ? ` • Expires ${new Date(handoff.expiresAt).toLocaleString("en-GB")}`
                  : ""}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isCompleted ? (
            <p className="text-sm text-muted-foreground">
              This booking handoff has already been completed. Your payment has
              been received.
            </p>
          ) : isExpired ? (
            <p className="text-sm text-muted-foreground">
              This secure link has expired. Please ask Milkywayy to generate a
              new one.
            </p>
          ) : requiresOtp ? (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="handoff-account-type">Account type</Label>
                  <select
                    id="handoff-account-type"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={customer.accountType || "INDIVIDUAL"}
                    disabled={isOtpAttemptActive}
                    onChange={(event) =>
                      updateCustomerField("accountType", event.target.value)
                    }
                  >
                    <option value="INDIVIDUAL">Individual</option>
                    <option value="COMPANY">Company</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="handoff-phone">Phone</Label>
                  <Input
                    id="handoff-phone"
                    value={customer.phone || ""}
                    disabled={isOtpAttemptActive}
                    onChange={(event) =>
                      updateCustomerField("phone", event.target.value)
                    }
                  />
                </div>
                {customer.accountType === "COMPANY" ? (
                  <div className="space-y-2">
                    <Label htmlFor="handoff-company">Company name</Label>
                    <Input
                      id="handoff-company"
                      value={customer.companyName || ""}
                      disabled={isOtpAttemptActive}
                      onChange={(event) =>
                        updateCustomerField("companyName", event.target.value)
                      }
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="handoff-full-name">Full name</Label>
                    <Input
                      id="handoff-full-name"
                      value={customer.fullName || ""}
                      disabled={isOtpAttemptActive}
                      onChange={(event) =>
                        updateCustomerField("fullName", event.target.value)
                      }
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="handoff-email">Email</Label>
                  <Input
                    id="handoff-email"
                    type="email"
                    value={customer.email || ""}
                    disabled={isOtpAttemptActive}
                    onChange={(event) =>
                      updateCustomerField("email", event.target.value)
                    }
                  />
                </div>
                {customer.accountType === "COMPANY" ? (
                  <>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="handoff-billing-address">
                        Billing address
                      </Label>
                      <Input
                        id="handoff-billing-address"
                        value={customer.billingAddress || ""}
                        disabled={isOtpAttemptActive}
                        onChange={(event) =>
                          updateCustomerField(
                            "billingAddress",
                            event.target.value,
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="handoff-trn">TRN</Label>
                      <Input
                        id="handoff-trn"
                        value={customer.trn || ""}
                        disabled={isOtpAttemptActive}
                        onChange={(event) =>
                          updateCustomerField("trn", event.target.value)
                        }
                      />
                    </div>
                  </>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-3">
                {isOtpAttemptActive ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={submitting}
                      onClick={changeDetails}
                    >
                      Change details
                    </Button>
                    <Button
                      type="button"
                      disabled={submitting || resendCooldown > 0}
                      onClick={sendOtp}
                    >
                      {submitting
                        ? "Sending..."
                        : resendCooldown > 0
                          ? `Resend code in ${resendCooldown}s`
                          : "Resend code"}
                    </Button>
                  </>
                ) : (
                  <Button type="button" disabled={submitting} onClick={sendOtp}>
                    {submitting ? "Sending..." : "Send verification code"}
                  </Button>
                )}
              </div>

              {isOtpAttemptActive ? (
                <div className="space-y-4 rounded-2xl border border-white/10 p-4">
                  <div className="space-y-1">
                    <output className="font-medium">
                      Code sent to {customer.phone || "your phone"}
                    </output>
                    <p className="text-sm text-muted-foreground">
                      Your details are locked while this code is active. Enter
                      the code to continue to property review.
                    </p>
                  </div>
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={otp}
                      disabled={submitting}
                      onChange={setOtp}
                      render={({ slots }) => {
                        const [slot0, slot1, slot2, slot3, slot4, slot5] =
                          slots;

                        return (
                          <InputOTPGroup>
                            <InputOTPSlot
                              index={0}
                              char={slot0?.char ?? ""}
                              hasFakeCaret={slot0?.isActive}
                            />
                            <InputOTPSlot
                              index={1}
                              char={slot1?.char ?? ""}
                              hasFakeCaret={slot1?.isActive}
                            />
                            <InputOTPSlot
                              index={2}
                              char={slot2?.char ?? ""}
                              hasFakeCaret={slot2?.isActive}
                            />
                            <InputOTPSlot
                              index={3}
                              char={slot3?.char ?? ""}
                              hasFakeCaret={slot3?.isActive}
                            />
                            <InputOTPSlot
                              index={4}
                              char={slot4?.char ?? ""}
                              hasFakeCaret={slot4?.isActive}
                            />
                            <InputOTPSlot
                              index={5}
                              char={slot5?.char ?? ""}
                              hasFakeCaret={slot5?.isActive}
                            />
                          </InputOTPGroup>
                        );
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    disabled={submitting}
                    onClick={verifyOtp}
                  >
                    {submitting ? "Verifying..." : "Verify code"}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-2xl border border-white/10 p-4">
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4" />
                  <div>
                    <p className="font-medium">
                      {buildCustomerDisplayName(customer)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {[customer.email, customer.phone]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {properties.map((property, index) => (
                  <Card
                    key={`${property.preferredDate}-${property.startTime}-${index}`}
                  >
                    <CardHeader>
                      <CardTitle className="text-base">
                        Property {index + 1}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`handoff-property-type-${index}`}>
                            Property type
                          </Label>
                          <select
                            id={`handoff-property-type-${index}`}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={property.propertyType}
                            onChange={(event) =>
                              updatePropertyField(
                                index,
                                "propertyType",
                                event.target.value,
                              )
                            }
                          >
                            <option value="">Select property type</option>
                            {PROPERTY_TYPES.map((propertyType) => (
                              <option key={propertyType} value={propertyType}>
                                {propertyType}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`handoff-property-size-${index}`}>
                            Property size
                          </Label>
                          <select
                            id={`handoff-property-size-${index}`}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={property.propertySize}
                            onChange={(event) =>
                              updatePropertyField(
                                index,
                                "propertySize",
                                event.target.value,
                              )
                            }
                          >
                            <option value="">Select property size</option>
                            {getPropertySizeOptions(property.propertyType).map(
                              (propertySize) => (
                                <option key={propertySize} value={propertySize}>
                                  {propertySize}
                                </option>
                              ),
                            )}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label>Services</Label>
                        <div className="grid gap-2 sm:grid-cols-3">
                          {SERVICE_OPTIONS.map((service) => (
                            <label
                              key={service}
                              className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={property.services.includes(service)}
                                onChange={() => toggleService(index, service)}
                              />
                              <span>{service}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {property.services.includes("Videography") ? (
                        <div className="space-y-2">
                          <Label htmlFor={`handoff-video-${index}`}>
                            Videography option
                          </Label>
                          <select
                            id={`handoff-video-${index}`}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={property.videographySubService || ""}
                            onChange={(event) =>
                              updatePropertyField(
                                index,
                                "videographySubService",
                                event.target.value,
                              )
                            }
                          >
                            <option value="">Select videography option</option>
                            {VIDEOGRAPHY_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {formatVideoLabel(option)}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`handoff-date-${index}`}>
                            Preferred date
                          </Label>
                          <Input
                            id={`handoff-date-${index}`}
                            type="date"
                            value={property.preferredDate || ""}
                            onChange={(event) =>
                              updatePropertyField(
                                index,
                                "preferredDate",
                                event.target.value,
                              )
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`handoff-time-${index}`}>
                            Start time
                          </Label>
                          <select
                            id={`handoff-time-${index}`}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={property.startTime || ""}
                            onChange={(event) =>
                              updatePropertyField(
                                index,
                                "startTime",
                                event.target.value,
                              )
                            }
                          >
                            {BUSINESS_DAY_TIME_OPTIONS.map((timeOption) => (
                              <option key={timeOption} value={timeOption}>
                                {timeOption}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-2">
                          <Label htmlFor={`handoff-building-${index}`}>
                            Building
                          </Label>
                          <Input
                            id={`handoff-building-${index}`}
                            value={property.building || ""}
                            onChange={(event) =>
                              updatePropertyField(
                                index,
                                "building",
                                event.target.value,
                              )
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`handoff-community-${index}`}>
                            Community
                          </Label>
                          <Input
                            id={`handoff-community-${index}`}
                            value={property.community || ""}
                            onChange={(event) =>
                              updatePropertyField(
                                index,
                                "community",
                                event.target.value,
                              )
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`handoff-unit-${index}`}>
                            Unit number
                          </Label>
                          <Input
                            id={`handoff-unit-${index}`}
                            value={property.unitNumber || ""}
                            onChange={(event) =>
                              updatePropertyField(
                                index,
                                "unitNumber",
                                event.target.value,
                              )
                            }
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Payment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="handoff-promo">Promo code</Label>
                    <Input
                      id="handoff-promo"
                      value={promotionCode}
                      onChange={(event) =>
                        setPromotionCode(event.target.value.toUpperCase())
                      }
                      placeholder="Optional"
                    />
                    <p className="text-xs text-muted-foreground">
                      Any eligible customer promotions and discounts will be
                      rechecked before payment.
                    </p>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarDays className="h-4 w-4" />
                      Reserved properties: {properties.length}
                    </div>
                    <div className="text-lg font-semibold">
                      {formatMoney(totalAmount)}
                    </div>
                  </div>
                  <Button
                    type="button"
                    disabled={submitting}
                    onClick={startCheckout}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Continuing...
                      </>
                    ) : (
                      "Continue to payment"
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
