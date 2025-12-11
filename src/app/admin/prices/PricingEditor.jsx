"use client";

import { useState } from "react";
import { savePricingConfig } from "./actions";
import { SERVICES } from "@/lib/config/pricing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function PricingEditor({ initialConfig }) {
  const [config, setConfig] = useState(initialConfig);
  const [saving, setSaving] = useState(false);

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
    const result = await savePricingConfig(config);
    setSaving(false);
    if (result.success) {
      toast.success("Prices saved successfully!");
    } else {
      toast.error("Failed to save prices: " + result.message);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Pricing Configuration
        </h1>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="space-y-8">
        {Object.entries(config).map(([type, typeConfig]) => (
          <Card key={type} className="overflow-hidden">
            <CardHeader className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <CardTitle className="text-xl font-semibold text-gray-800">{type}</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
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
                            <Label className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">
                              {service}
                            </Label>
                            <div className="space-y-2">
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
                                  AED
                                </span>
                                <Input
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
                                  className="pl-8 pr-2 h-8 text-sm bg-white"
                                  placeholder="Price"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">
                                    SLOTS
                                  </span>
                                  <Input
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
                                    className="pl-10 pr-2 h-8 text-sm bg-white"
                                  />
                                </div>
                              </div>
                              <div className="flex items-center gap-2 pt-1">
                                <Checkbox
                                  id={`${type}-${sizeIndex}-${service}-evening`}
                                  checked={allowEvening}
                                  onCheckedChange={(checked) =>
                                    handlePriceChange(
                                      type,
                                      sizeIndex,
                                      service,
                                      "allowEvening",
                                      checked,
                                    )
                                  }
                                />
                                <Label
                                  htmlFor={`${type}-${sizeIndex}-${service}-evening`}
                                  className="text-xs text-gray-600 cursor-pointer"
                                >
                                  Allow Evening
                                </Label>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
