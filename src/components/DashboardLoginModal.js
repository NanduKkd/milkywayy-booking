"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Info } from "lucide-react";
import PhoneNumberInput from "@/components/PhoneInput";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { customerSendOtp, customerVerifyOtp, createCustomer } from "@/lib/actions/auth";
import { newUserSchema, otpSchema, phoneSchema } from "@/lib/schema/auth.schema";

export default function DashboardLoginModal({ isOpen, onClose, onSuccess }) {
  const [activeTab, setActiveTab] = useState("login");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState(null);
  const [showAccountCreated, setShowAccountCreated] = useState(false);

  // Login forms
  const phoneForm = useForm({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: "+971" },
  });

  const otpForm = useForm({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  // Account creation form
  const createAccountForm = useForm({
    resolver: zodResolver(newUserSchema),
    defaultValues: { fullName: "", phone: "+971", email: "" },
  });

  const handleSendOtp = async (data) => {
    setIsLoading(true);
    setError("");

    try {
      const phone = typeof data?.phone === "string" ? data.phone.replace(/\s/g, "") : "";
      if (!phone) {
        throw new Error("Phone number is required");
      }
      const res = await customerSendOtp({
        phone,
      });
      if (!res.success) {
        throw new Error(res.message);
      }
      const result = res.data;
      if (result?.requiresRegistration) {
        createAccountForm.setValue("phone", phone);
        setActiveTab("create");
        setError("No account found for this phone number. Please create an account.");
        return;
      }
      setUserId(result.userId);
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
      const res = await customerVerifyOtp({ userId, otp: data.otp });
      if (!res.success) {
        throw new Error(res.message);
      }

      onSuccess(res.data);
      handleClose();
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
      const phone = typeof data?.phone === "string" ? data.phone.replace(/\s/g, "") : "";
      if (!phone) {
        throw new Error("Phone number is required");
      }
      const res = await createCustomer({
        fullName: data.fullName.trim(),
        phone,
        email: data.email?.trim() || null,
      });
      if (!res.success) {
        throw new Error(res.message);
      }
      const otpRes = await customerSendOtp({ phone });
      if (!otpRes.success) {
        throw new Error(otpRes.message || "Account created, but failed to send OTP");
      }

      const otpData = otpRes.data;
      if (otpData?.requiresRegistration) {
        throw new Error("Account was created, but OTP setup failed. Please try again.");
      }

      setUserId(otpData.userId);
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
    setUserId(null);
    setShowAccountCreated(false);
  };

  const handleClose = () => {
    onClose();
    resetModal();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Welcome to Milkywayy</DialogTitle>
        </DialogHeader>

        {showAccountCreated ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Account Created!</h3>
            <p className="text-muted-foreground mb-4">
              Your account has been created successfully. You can now log in with your phone number.
            </p>
            <div className="text-sm text-muted-foreground">
              Redirecting to login...
            </div>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="create">Create Account</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4 mt-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm leading-relaxed break-words whitespace-pre-wrap">
                  {error}
                </div>
              )}

              {activeTab === "login" && (
                <form onSubmit={phoneForm.handleSubmit(handleSendOtp)} className="space-y-4">
                  <Controller
                    name="phone"
                    control={phoneForm.control}
                    render={({ field }) => (
                      <div className="flex flex-col gap-2">
                        <Label className="flex items-center gap-1.5">
                          WhatsApp Number *
                          <span
                            className="inline-flex text-muted-foreground cursor-help"
                            title="Enter the phone number linked to your WhatsApp. OTP will be sent to your WhatsApp."
                          >
                            <Info size={14} />
                          </span>
                        </Label>
                        <PhoneNumberInput
                          value={field.value}
                          onChange={field.onChange}
                          name={field.name}
                          classNames={{
                            inputWrapper: "flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
                            input: "bg-transparent border-none outline-none w-full h-full placeholder:text-muted-foreground",
                            countryIcon: "mr-2 flex items-center h-full",
                          }}
                        />
                        {phoneForm.formState.errors.phone && (
                          <div className="text-xs text-red-500">
                            {phoneForm.formState.errors.phone.message}
                          </div>
                        )}
                      </div>
                    )}
                  />
                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? "Sending OTP..." : "Send OTP"}
                  </Button>
                </form>
              )}

            </TabsContent>

            <TabsContent value="otp" className="space-y-4 mt-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm leading-relaxed break-words whitespace-pre-wrap">
                  {error}
                </div>
              )}

              {activeTab === "otp" && (
                <form onSubmit={otpForm.handleSubmit(handleVerifyOtp)} className="space-y-4">
                  <div className="flex justify-center">
                    <Controller
                      control={otpForm.control}
                      name="otp"
                      render={({ field }) => (
                        <InputOTP
                          maxLength={6}
                          value={field.value}
                          onChange={field.onChange}
                        >
                          <InputOTPGroup>
                            <InputOTPSlot index={0} char={field.value.substring(0, 1)} />
                            <InputOTPSlot index={1} char={field.value.substring(1, 2)} />
                            <InputOTPSlot index={2} char={field.value.substring(2, 3)} />
                            <InputOTPSlot index={3} char={field.value.substring(3, 4)} />
                            <InputOTPSlot index={4} char={field.value.substring(4, 5)} />
                            <InputOTPSlot index={5} char={field.value.substring(5, 6)} />
                          </InputOTPGroup>
                        </InputOTP>
                      )}
                    />
                  </div>
                  {otpForm.formState.errors.otp && (
                    <div className="text-center text-xs text-red-500">
                      {otpForm.formState.errors.otp.message}
                    </div>
                  )}
                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? "Verifying..." : "Verify OTP"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab("login")}
                    className="w-full"
                  >
                    Back to Login
                  </Button>
                </form>
              )}
            </TabsContent>

            <TabsContent value="create" className="space-y-4 mt-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm leading-relaxed break-words whitespace-pre-wrap">
                  {error}
                </div>
              )}

              <form onSubmit={createAccountForm.handleSubmit(handleCreateAccount)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    {...createAccountForm.register("fullName")}
                    placeholder="Enter your full name"
                    className={createAccountForm.formState.errors.fullName ? "border-red-500" : ""}
                  />
                  {createAccountForm.formState.errors.fullName && (
                    <div className="text-xs text-red-500">
                      {createAccountForm.formState.errors.fullName.message}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-1.5">
                    WhatsApp Number *
                    <span
                      className="inline-flex text-muted-foreground cursor-help"
                      title="Enter the phone number linked to your WhatsApp. OTP will be sent to your WhatsApp."
                    >
                      <Info size={14} />
                    </span>
                  </Label>
                  <Controller
                    name="phone"
                    control={createAccountForm.control}
                    render={({ field }) => (
                      <div>
                        <PhoneNumberInput
                          value={field.value}
                          onChange={field.onChange}
                          name={field.name}
                          classNames={{
                            inputWrapper: "flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
                            input: "bg-transparent border-none outline-none w-full h-full placeholder:text-muted-foreground",
                            countryIcon: "mr-2 flex items-center h-full",
                          }}
                        />
                        {createAccountForm.formState.errors.phone && (
                          <div className="text-xs text-red-500">
                            {createAccountForm.formState.errors.phone.message}
                          </div>
                        )}
                      </div>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email (Optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    {...createAccountForm.register("email")}
                    placeholder="Enter your email address"
                    className={createAccountForm.formState.errors.email ? "border-red-500" : ""}
                  />
                  {createAccountForm.formState.errors.email && (
                    <div className="text-xs text-red-500">
                      {createAccountForm.formState.errors.email.message}
                    </div>
                  )}
                </div>

                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? "Creating Account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

