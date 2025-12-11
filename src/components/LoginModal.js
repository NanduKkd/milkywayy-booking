"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import PhoneNumberInput from "@/components/PhoneInput";
import { customerSendOtp, customerVerifyOtp } from "@/lib/actions/auth";
import { phoneSchema, otpSchema } from "@/lib/schema/auth.schema";

export default function LoginModal({ isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState(1); // 1: phone input, 2: OTP input
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState(null); // Store userId after OTP generation

  const phoneForm = useForm({
    resolver: zodResolver(phoneSchema),
    defaultValues: {
      phone: "+971",
    },
  });

  const otpForm = useForm({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: "",
    },
  });

  const handleSendOtp = async (data) => {
    setIsLoading(true);
    setError("");

    try {
      // Call customerSendOtp action
      const res = await customerSendOtp({
        phone: data.phone.replace(/\s/g, ""),
      });
      if (!res.success) {
        throw new Error(res.message);
      }
      const result = res.data;
      setUserId(result.userId);
      alert(`OTP: ${result.otp}`); // For development purposes
      setStep(2);
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
      const result = res.data;
      onSuccess(result);
      onClose();
      resetModal();
    } catch (err) {
      setError(err.message || "Invalid OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    setError("");

    try {
      const phone = phoneForm.getValues("phone").replace(/\s/g, "");
      const res = await customerSendOtp({ phone });
      if (!res.success) {
        throw new Error(res.message);
      }
      const result = res.data;
      alert(`OTP: ${result.otp}`); // For development purposes
    } catch (err) {
      setError(err.message || "Failed to resend OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePhone = () => {
    setStep(1);
    otpForm.reset();
    setError("");
  };

  const resetModal = () => {
    setStep(1);
    phoneForm.reset();
    otpForm.reset();
    setError("");
    setUserId(null);
  };

  const handleClose = () => {
    onClose();
    resetModal();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{step === 1 ? "Enter Phone Number" : "Enter OTP"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {step === 1 ? (
            <form
              onSubmit={phoneForm.handleSubmit(handleSendOtp)}
              className="space-y-4"
            >
              <Controller
                name="phone"
                control={phoneForm.control}
                render={({ field }) => (
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Phone Number
                    </label>
                    <PhoneNumberInput
                      value={field.value}
                      onChange={field.onChange}
                      name={field.name}
                      classNames={{
                        inputWrapper:
                          "flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
                        input:
                          "bg-transparent border-none outline-none w-full h-full placeholder:text-muted-foreground",
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
              <p className="text-sm text-muted-foreground">
                We will send an OTP to verify your phone number.
              </p>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? "Sending..." : "Send OTP"}
              </Button>
            </form>
          ) : (
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
                      className="text-white"
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
              <div className="flex gap-2 justify-center">
                <Button
                  variant="ghost"
                  onClick={handleChangePhone}
                  size="sm"
                  type="button"
                >
                  Change Phone Number
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleResendOtp}
                  size="sm"
                  disabled={isLoading}
                  type="button"
                >
                  Resend OTP
                </Button>
              </div>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? "Verifying..." : "Verify OTP"}
              </Button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
