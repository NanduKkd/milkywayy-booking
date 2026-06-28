"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Info, UserRound } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import PhoneNumberInput from "@/components/PhoneInput";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createCustomer,
  customerSendOtp,
  customerVerifyOtp,
} from "@/lib/actions/auth";
import {
  newUserSchema,
  otpSchema,
  phoneSchema,
} from "@/lib/schema/auth.schema";
import { cn } from "@/lib/utils";

const phoneFieldClassNames = {
  inputWrapper:
    "flex h-9 w-full items-center rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm ring-offset-background transition-colors focus-within:border-white/20 focus-within:ring-0",
  input:
    "h-full w-full border-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground",
  countryIcon: "mr-2 flex h-full items-center",
};

const accountTypeOptions = [
  {
    value: "INDIVIDUAL",
    label: "Individual",
    icon: UserRound,
  },
  {
    value: "COMPANY",
    label: "Company",
    icon: Building2,
  },
];

function FieldError({ message }) {
  if (!message) return null;
  return <div className="text-xs text-red-500">{message}</div>;
}

export default function DashboardLoginModal({ isOpen, onClose, onSuccess }) {
  const [activeTab, setActiveTab] = useState("login");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [verificationId, setVerificationId] = useState(null);

  const phoneForm = useForm({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: "+971" },
  });

  const otpForm = useForm({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  const createAccountForm = useForm({
    resolver: zodResolver(newUserSchema),
    defaultValues: {
      accountType: "INDIVIDUAL",
      fullName: "",
      companyName: "",
      phone: "+971",
      billingAddress: "",
      email: "",
      trn: "",
    },
  });

  const accountType = createAccountForm.watch("accountType");

  const createTitle = "Create an account to access the dashboard";

  const handleSendOtp = async (data) => {
    setIsLoading(true);
    setError("");

    try {
      const phone =
        typeof data?.phone === "string" ? data.phone.replace(/\s/g, "") : "";
      if (!phone) {
        throw new Error("Phone number is required");
      }

      const res = await customerSendOtp({ phone });
      if (!res.success) {
        throw new Error(res.message);
      }

      const result = res.data;
      setVerificationId(result.verificationId);
      setActiveTab("otp");
    } catch (err) {
      setError(err.message || "Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (data) => {
    setIsLoading(true);
    setError("");

    try {
      if (!verificationId) {
        throw new Error("Please request a new OTP.");
      }

      const res = await customerVerifyOtp({
        verificationId,
        otp: data.otp,
      });
      if (!res.success) {
        throw new Error(res.message);
      }

      onSuccess(res.data);
      handleClose("success");
    } catch (err) {
      setError(err.message || "Invalid OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccount = async (data) => {
    setIsLoading(true);
    setError("");

    try {
      const phone =
        typeof data?.phone === "string" ? data.phone.replace(/\s/g, "") : "";
      if (!phone) {
        throw new Error("Phone number is required");
      }

      const res = await createCustomer({
        accountType: data.accountType,
        fullName: data.fullName?.trim() || "",
        companyName: data.companyName?.trim() || "",
        phone,
        billingAddress: data.billingAddress?.trim() || "",
        email: data.email?.trim() || "",
        trn: data.trn?.trim() || "",
      });
      if (!res.success) {
        throw new Error(res.message);
      }

      const otpRes = await customerSendOtp({ phone });
      if (!otpRes.success) {
        throw new Error(
          otpRes.message || "Account created, but failed to send OTP",
        );
      }

      const otpData = otpRes.data;
      setVerificationId(otpData.verificationId);
      setActiveTab("otp");
      setError("");
    } catch (err) {
      setError(err.message || "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  };

  const resetModal = () => {
    setActiveTab("login");
    phoneForm.reset();
    otpForm.reset();
    createAccountForm.reset();
    setError("");
    setVerificationId(null);
  };

  const handleClose = (reason = "cancel") => {
    onClose(reason);
    resetModal();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose("cancel");
      }}
    >
      <DialogContent className="flex gap-0 max-h-[82vh] overflow-hidden border-white/10 bg-[#171717] p-0 text-foreground shadow-2xl sm:max-w-[430px]">
        <DialogHeader className="border-b border-white/10 px-0 py-0">
          <DialogTitle className="sr-only">
            Dashboard Authentication
          </DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex w-full min-h-0 flex-col"
        >
          <TabsList className="grid h-[44px] w-full shrink-0 grid-cols-2 rounded-none border-b border-white/10 bg-transparent p-0">
            <TabsTrigger
              value="login"
              className="h-full rounded-none border-b-2 border-transparent bg-transparent text-sm font-semibold text-muted-foreground shadow-none data-[state=active]:border-white data-[state=active]:bg-transparent data-[state=active]:text-foreground"
            >
              Login
            </TabsTrigger>
            <TabsTrigger
              value="create"
              className="h-full rounded-none border-b-2 border-transparent bg-transparent text-sm font-semibold text-muted-foreground shadow-none data-[state=active]:border-white data-[state=active]:bg-transparent data-[state=active]:text-foreground"
            >
              Create Account
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="login"
            className="mt-0 min-h-0 flex-1 overflow-y-auto px-4 py-5"
          >
            <div className="space-y-2">
              <h2 className="max-w-md text-lg font-semibold tracking-tight">
                Login to access your dashboard
              </h2>
              <p className="text-sm text-muted-foreground">
                Enter your WhatsApp number to request a verification code. If
                you do not have an account yet, use the create-account tab.
              </p>
            </div>

            {error && activeTab === "login" && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm leading-relaxed text-red-300">
                {error}
              </div>
            )}

            <form
              onSubmit={phoneForm.handleSubmit(handleSendOtp)}
              className="space-y-4"
            >
              <Controller
                name="phone"
                control={phoneForm.control}
                render={({ field }) => (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 text-sm font-semibold">
                      WhatsApp Number *
                      <span
                        className="inline-flex cursor-help text-muted-foreground"
                        title="For booking confirmations & arrival updates."
                      >
                        <Info size={15} />
                      </span>
                    </Label>
                    <PhoneNumberInput
                      id="dashboard-login-phone"
                      value={field.value}
                      onChange={field.onChange}
                      name={field.name}
                      classNames={phoneFieldClassNames}
                    />
                    <FieldError
                      message={phoneForm.formState.errors.phone?.message}
                    />
                  </div>
                )}
              />

              <Button
                type="submit"
                disabled={isLoading}
                className="h-9 w-full rounded-lg text-sm"
              >
                {isLoading ? "Sending OTP..." : "Send OTP"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent
            value="otp"
            className="mt-0 min-h-0 flex-1 overflow-y-auto px-4 py-5"
          >
            <div className="space-y-2">
              <h2 className="text-lg font-semibold tracking-tight">
                Verify your WhatsApp code
              </h2>
              <p className="text-sm text-muted-foreground">
                Enter the code sent to your WhatsApp number.
              </p>
            </div>

            {error && activeTab === "otp" && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm leading-relaxed text-red-300">
                {error}
              </div>
            )}

            <form
              onSubmit={otpForm.handleSubmit(handleVerifyOtp)}
              className="space-y-4"
            >
              <div className="flex justify-center">
                <Controller
                  control={otpForm.control}
                  name="otp"
                  render={({ field }) => (
                    <InputOTP
                      maxLength={6}
                      value={field.value}
                      onChange={field.onChange}
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
                  )}
                />
              </div>

              <FieldError message={otpForm.formState.errors.otp?.message} />

              <Button
                type="submit"
                disabled={isLoading}
                className="h-9 w-full rounded-lg text-sm"
              >
                {isLoading ? "Verifying..." : "Verify OTP"}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setError("");
                  setActiveTab("login");
                }}
                className="h-9 w-full rounded-lg border-white/10 bg-transparent text-sm"
              >
                Back to Login
              </Button>
            </form>
          </TabsContent>

          <TabsContent
            value="create"
            className="mt-0 min-h-0 flex-1 overflow-y-auto px-4 py-5"
          >
            <div className="space-y-2">
              <h2 className="max-w-md text-lg font-semibold tracking-tight">
                {createTitle}
              </h2>
              <p className="text-sm text-muted-foreground">
                Fill in your details to create an account.
              </p>
            </div>

            {error && activeTab === "create" && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm leading-relaxed text-red-300">
                {error}
              </div>
            )}

            <form
              onSubmit={createAccountForm.handleSubmit(handleCreateAccount)}
              className="space-y-4"
            >
              <div className="space-y-2.5">
                <Label className="text-sm font-semibold">Account Type</Label>
                <div className="grid grid-cols-2 gap-2.5">
                  {accountTypeOptions.map((option) => {
                    const Icon = option.icon;
                    const isSelected = accountType === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          createAccountForm.setValue(
                            "accountType",
                            option.value,
                            {
                              shouldValidate: true,
                            },
                          );
                          createAccountForm.clearErrors([
                            "fullName",
                            "companyName",
                            "billingAddress",
                            "email",
                          ]);
                        }}
                        className={cn(
                          "flex h-10 items-center justify-center gap-2 rounded-lg border text-sm font-semibold transition-colors",
                          isSelected
                            ? "border-white/30 bg-white/[0.08] text-foreground"
                            : "border-white/10 bg-transparent text-muted-foreground hover:border-white/20 hover:text-foreground",
                        )}
                      >
                        <Icon className="h-4 w-4" strokeWidth={1.8} />
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {accountType === "INDIVIDUAL"
                ? <div className="space-y-1.5">
                    <Label htmlFor="fullName" className="text-sm font-semibold">
                      Full Name *
                    </Label>
                    <Input
                      id="fullName"
                      {...createAccountForm.register("fullName")}
                      placeholder="Your full name"
                      className="h-9 rounded-lg border-white/10 bg-white/[0.04] text-sm"
                    />
                    <FieldError
                      message={
                        createAccountForm.formState.errors.fullName?.message
                      }
                    />
                  </div>
                : <div className="space-y-1.5">
                    <Label
                      htmlFor="companyName"
                      className="text-sm font-semibold"
                    >
                      Company Name *
                    </Label>
                    <Input
                      id="companyName"
                      {...createAccountForm.register("companyName")}
                      placeholder="Your company name"
                      className="h-9 rounded-lg border-white/10 bg-white/[0.04] text-sm"
                    />
                    <FieldError
                      message={
                        createAccountForm.formState.errors.companyName?.message
                      }
                    />
                  </div>}

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-sm font-semibold">
                  WhatsApp Number *
                  <span
                    className="inline-flex cursor-help text-muted-foreground"
                    title="We’ll use this to send booking confirmations, shoot updates, and arrival reminders."
                  >
                    <Info size={15} />
                  </span>
                </Label>
                <Controller
                  name="phone"
                  control={createAccountForm.control}
                  render={({ field }) => (
                    <PhoneNumberInput
                      value={field.value}
                      onChange={field.onChange}
                      name={field.name}
                      classNames={phoneFieldClassNames}
                    />
                  )}
                />
                <FieldError
                  message={createAccountForm.formState.errors.phone?.message}
                />
              </div>

              {accountType === "COMPANY" && (
                <div className="space-y-1.5">
                  <Label
                    htmlFor="billingAddress"
                    className="text-sm font-semibold"
                  >
                    Billing Address *
                  </Label>
                  <Input
                    id="billingAddress"
                    {...createAccountForm.register("billingAddress")}
                    placeholder="Full billing address"
                    className="h-9 rounded-lg border-white/10 bg-white/[0.04] text-sm"
                  />
                  <FieldError
                    message={
                      createAccountForm.formState.errors.billingAddress?.message
                    }
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-semibold">
                  {accountType === "COMPANY" ? "Email *" : "Email (optional)"}
                </Label>
                <Input
                  id="email"
                  type="email"
                  {...createAccountForm.register("email")}
                  placeholder={
                    accountType === "COMPANY"
                      ? "billing@company.com"
                      : "email@example.com"
                  }
                  className="h-9 rounded-lg border-white/10 bg-white/[0.04] text-sm"
                />
                <FieldError
                  message={createAccountForm.formState.errors.email?.message}
                />
              </div>

              {accountType === "COMPANY" && (
                <div className="space-y-1.5">
                  <Label htmlFor="trn" className="text-sm font-semibold">
                    TRN (optional)
                  </Label>
                  <Input
                    id="trn"
                    {...createAccountForm.register("trn")}
                    placeholder="Tax Registration Number"
                    className="h-9 rounded-lg border-white/10 bg-white/[0.04] text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    These details will be used for invoices and billing.
                  </p>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="h-9 w-full rounded-lg text-sm"
              >
                {isLoading ? "Creating Account..." : "Create Account"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
