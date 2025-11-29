"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@heroui/react";
import PhoneNumberInput from "@/components/PhoneInput";
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
      const result = await customerSendOtp({
        phone: data.phone.replace(/\s/g, ""),
      });
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
      const phone = phoneForm.getValues("phone").replace(/\s/g, "");
      const result = await customerSendOtp({ phone });
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

          {step === 1
            ? <form
              onSubmit={phoneForm.handleSubmit(handleSendOtp)}
              className="space-y-4"
            >
              <Controller
                name="phone"
                control={phoneForm.control}
                render={({ field }) => (
                  <div className="flex flex-col gap-1">
                    <label className="text-small font-medium text-foreground-600">
                      Phone Number
                    </label>
                    <PhoneNumberInput
                      value={field.value}
                      onChange={field.onChange}
                      name={field.name}
                      classNames={{
                        inputWrapper:
                          "flex items-center w-full px-3 py-2 rounded-medium border-2 border-default-200 hover:border-default-400 focus-within:!border-primary transition-colors h-12",
                        input:
                          "bg-transparent border-none outline-none text-small w-full h-full",
                        countryIcon: "mr-2 flex items-center h-full",
                      }}
                    />
                    {phoneForm.formState.errors.phone && (
                      <div className="text-tiny text-danger">
                        {phoneForm.formState.errors.phone.message}
                      </div>
                    )}
                  </div>
                )}
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
            : <form
              onSubmit={otpForm.handleSubmit(handleVerifyOtp)}
              className="space-y-4"
            >
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
            </form>}
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
