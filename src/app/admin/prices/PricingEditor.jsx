"use client";

import { useState } from "react";
import { savePricingConfig } from "./actions";
import { SERVICES } from "@/lib/config/pricing";

export default function PricingEditor({ initialConfig }) {
  const [config, setConfig] = useState(initialConfig);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const handlePriceChange = (
    propertyType,
    sizeIndex,
    service,
    field,
    value,
  ) => {
    const newConfig = { ...config };
    const newSizes = [...newConfig[propertyType].sizes];

    // Get current config for this service
    const currentServiceConfig = newSizes[sizeIndex].prices[service];

    // Ensure it's an object
    const newServiceConfig =
      typeof currentServiceConfig === "object"
        ? { ...currentServiceConfig }
        : { price: currentServiceConfig, slots: 1, allowEvening: false };

    // Update field
    if (field === "price" || field === "slots") {
      newServiceConfig[field] = Number(value);
    } else {
      newServiceConfig[field] = value;
    }

    newSizes[sizeIndex] = {
      ...newSizes[sizeIndex],
      prices: {
        ...newSizes[sizeIndex].prices,
        [service]: newServiceConfig,
      },
    };
    newConfig[propertyType] = {
      ...newConfig[propertyType],
      sizes: newSizes,
    };

    setConfig(newConfig);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    const result = await savePricingConfig(config);
    setSaving(false);
    if (result.success) {
      setMessage({ type: "success", text: "Prices saved successfully!" });
      // Clear success message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({
        type: "error",
        text: "Failed to save prices: " + result.message,
      });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Pricing Configuration
        </h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {message && (
        <div
          className={`p-4 mb-6 rounded-lg border ${message.type === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-8">
        {Object.entries(config).map(([type, typeConfig]) => (
          <div
            key={type}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
          >
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">{type}</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-4">
                {typeConfig.sizes.map((size, sizeIndex) => (
                  <div
                    key={sizeIndex}
                    className="flex flex-col lg:flex-row lg:items-center gap-4 p-4 bg-white border border-gray-100 rounded-lg hover:border-gray-300 transition-colors"
                  >
                    <div className="w-48 font-medium text-gray-700 flex-shrink-0">
                      {size.label}
                    </div>
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {Object.values(SERVICES).map((service) => {
                        const serviceConfig = size.prices[service];
                        const price =
                          typeof serviceConfig === "object"
                            ? serviceConfig.price
                            : serviceConfig;
                        const slots =
                          typeof serviceConfig === "object"
                            ? serviceConfig.slots || 1
                            : 1;
                        const allowEvening =
                          typeof serviceConfig === "object"
                            ? serviceConfig.allowEvening || false
                            : false;

                        return (
                          <div
                            key={service}
                            className="flex flex-col p-3 border border-gray-100 rounded-lg bg-gray-50/50"
                          >
                            <label className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">
                              {service}
                            </label>
                            <div className="space-y-2">
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
                                  AED
                                </span>
                                <input
                                  type="number"
                                  value={price}
                                  onChange={(e) =>
                                    handlePriceChange(
                                      type,
                                      sizeIndex,
                                      service,
                                      "price",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full pl-8 pr-2 py-1.5 text-sm bg-white border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                  placeholder="Price"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">
                                    SLOTS
                                  </span>
                                  <input
                                    type="number"
                                    min="1"
                                    value={slots}
                                    onChange={(e) =>
                                      handlePriceChange(
                                        type,
                                        sizeIndex,
                                        service,
                                        "slots",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full pl-10 pr-2 py-1.5 text-sm bg-white border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                  />
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id={`${type}-${sizeIndex}-${service}-evening`}
                                  checked={allowEvening}
                                  onChange={(e) =>
                                    handlePriceChange(
                                      type,
                                      sizeIndex,
                                      service,
                                      "allowEvening",
                                      e.target.checked,
                                    )
                                  }
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                                />
                                <label
                                  htmlFor={`${type}-${sizeIndex}-${service}-evening`}
                                  className="text-xs text-gray-600 select-none cursor-pointer"
                                >
                                  Allow Evening
                                </label>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
