"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from "@heroui/react";
import { HeroTelInput } from "@hyperse/hero-tel-input";
import { InputOtp } from "@heroui/input-otp";
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
      phone: "",
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

    // For now, we'll use a hardcoded userId since OTP sending is not enabled
    // In production, you would need to find user by phone number
    // For demo purposes, let's assume userId is 1
    const tempUserId = 1;

    try {
      // Call customerSendOtp action
      await customerSendOtp({ userId: tempUserId });
      setUserId(tempUserId);
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
      const result = await customerVerifyOtp({ userId, otp: data.otp });
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
      await customerSendOtp({ userId });
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
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <ModalContent>
        <ModalHeader>
          {step === 1 ? "Enter Phone Number" : "Enter OTP"}
        </ModalHeader>
        <ModalBody>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={phoneForm.handleSubmit(handleSendOtp)} className="space-y-4">
              <HeroTelInput
                {...phoneForm.register("phone")}
                label="Phone Number"
                placeholder="Enter your phone number"
                defaultCountry="AE" // UAE as default
                variant="bordered"
                isInvalid={!!phoneForm.formState.errors.phone}
                errorMessage={phoneForm.formState.errors.phone?.message}
              />
              <p className="text-sm text-gray-600">
                We will send an OTP to verify your phone number.
              </p>
              <Button
                type="submit"
                color="primary"
                isLoading={isLoading}
                className="w-full"
              >
                Send OTP
              </Button>
            </form>
          ) : (
            <form onSubmit={otpForm.handleSubmit(handleVerifyOtp)} className="space-y-4">
              <div className="flex justify-center">
                <InputOtp
                  {...otpForm.register("otp")}
                  length={6}
                  variant="bordered"
                  size="lg"
                  isInvalid={!!otpForm.formState.errors.otp}
                  errorMessage={otpForm.formState.errors.otp?.message}
                />
              </div>
              <div className="flex gap-2 justify-center">
                <Button
                  color="primary"
                  variant="light"
                  onPress={handleChangePhone}
                  size="sm"
                >
                  Change Phone Number
                </Button>
                <Button
                  color="primary"
                  variant="light"
                  onPress={handleResendOtp}
                  size="sm"
                  isLoading={isLoading}
                >
                  Resend OTP
                </Button>
              </div>
              <Button
                type="submit"
                color="primary"
                isLoading={isLoading}
                className="w-full"
              >
                Verify OTP
              </Button>
            </form>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            color="danger"
            variant="light"
            onPress={handleClose}
            isDisabled={isLoading}
          >
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}