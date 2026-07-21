"use client";

import { CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { SharedBookingForm } from "@/app/booking/BookNew";
import { mapHandoffToBookingProperties } from "@/app/booking/bookingFormAdapters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";

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

export default function BookingHandoffPageClient({
  token,
  pricingConfig,
  discounts = [],
}) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [handoff, setHandoff] = useState(null);
  const [customer, setCustomer] = useState(EMPTY_CUSTOMER);
  const [verificationId, setVerificationId] = useState("");
  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

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

  const handoffProperties = useMemo(
    () =>
      mapHandoffToBookingProperties(
        handoff?.properties,
        customer,
        `handoff-${handoff?.transactionId || "pending"}`,
      ),
    [customer, handoff?.properties, handoff?.transactionId],
  );

  const startCheckout = useCallback(
    async ({ properties, promotionCode }) => {
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
    },
    [token],
  );

  const previewPricing = useCallback(
    async (eligibleSubtotal, promotionCode) => {
      try {
        const response = await fetch(
          `/api/booking-handoffs/${token}/promotion-preview`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              eligibleSubtotal,
              promotionCode,
            }),
          },
        );
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          return {
            success: false,
            message: payload?.error || "Unable to load promotion pricing",
          };
        }

        return {
          success: true,
          data: payload,
        };
      } catch (requestError) {
        return {
          success: false,
          message: requestError?.message || "Unable to load promotion pricing",
        };
      }
    },
    [token],
  );

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
            <div className="-mx-4 -mb-6">
              <SharedBookingForm
                pricingConfig={pricingConfig}
                discounts={discounts}
                initialProperties={handoffProperties}
                submitBooking={startCheckout}
                previewPricing={previewPricing}
                mode="handoff"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
