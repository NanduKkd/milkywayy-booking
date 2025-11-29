"use client";

import React from "react";
import { Controller } from "react-hook-form";
import { Button } from "@heroui/react";

export default function FileUpload({
  name,
  control,
  label,
  accept = "image/*",
  buttonText = "Choose Image",
  changeButtonText = "Change",
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange, value }, fieldState }) => {
        const fileInputRef = React.useRef(null);

        const handleFileChange = (e) => {
          const file = e.target.files[0];
          if (file) {
            onChange(file);
          }
        };

        const handleButtonClick = () => {
          fileInputRef.current?.click();
        };

        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {label}
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              onChange={handleFileChange}
              className="hidden"
            />
            {!value || !(value instanceof File || typeof value === "string")
              ? <Button
                  color="primary"
                  variant="light"
                  onPress={handleButtonClick}
                  className="w-full justify-start"
                >
                  {buttonText}
                </Button>
              : <div className="flex items-center space-x-3">
                  {accept.includes("image") && (
                    <img
                      src={
                        value instanceof File
                          ? URL.createObjectURL(value)
                          : process.env.NEXT_PUBLIC_FILE_URL + value
                      }
                      alt="Preview"
                      className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                    />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {value instanceof File ? value.name : value}
                    </p>
                    {value instanceof File && (
                      <p className="text-xs text-gray-500">
                        {(value.size / 1024).toFixed(1)} KB
                      </p>
                    )}
                  </div>
                  <Button
                    color="primary"
                    variant="light"
                    size="sm"
                    onPress={handleButtonClick}
                  >
                    {changeButtonText}
                  </Button>
                </div>}
            {fieldState.error && (
              <p className="mt-1 text-sm text-red-600">
                {fieldState.error.message}
              </p>
            )}
          </div>
        );
      }}
    />
  );
}
