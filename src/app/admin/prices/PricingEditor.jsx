"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SERVICES, VIDEOGRAPHY_SUB_SERVICES, VIDEOGRAPHY_SUB_CATEGORIES } from "@/lib/config/pricing";
import { savePricingConfig } from "./actions";

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

  const handleVideographyPriceChange = (
    propertyType,
    sizeIndex,
    subService,
    category,
    field,
    value,
  ) => {
    const newConfig = { ...config };
    const newSizes = [...newConfig[propertyType].sizes];
    const currentPrices = { ...newSizes[sizeIndex].prices };
    const currentVideography = { ...currentPrices[SERVICES.VIDEOGRAPHY] };

    if (subService === VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM) {
      const currentShortForm = typeof currentVideography[VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM] === "object"
        ? { ...currentVideography[VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM] }
        : { price: 0, slots: 1, allowEvening: false };
      
      if (field === "price" || field === "slots") {
        currentShortForm[field] = Number(value);
      } else {
        currentShortForm[field] = value;
      }
      currentVideography[VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM] = currentShortForm;
    } else if (subService === VIDEOGRAPHY_SUB_SERVICES.LONG_FORM) {
      const currentLongForm = typeof currentVideography[VIDEOGRAPHY_SUB_SERVICES.LONG_FORM] === "object"
        ? { ...currentVideography[VIDEOGRAPHY_SUB_SERVICES.LONG_FORM] }
        : {};

      // Commercial stores Long Form as a direct object (no categories).
      if (!category) {
        const directLongForm =
          "price" in currentLongForm || "slots" in currentLongForm
            ? { ...currentLongForm }
            : { price: 0, slots: 1, allowEvening: true };

        if (field === "price" || field === "slots") {
          directLongForm[field] = Number(value);
        } else {
          directLongForm[field] = value;
        }

        currentVideography[VIDEOGRAPHY_SUB_SERVICES.LONG_FORM] = directLongForm;
      } else {
        const currentCategory = typeof currentLongForm[category] === "object"
          ? { ...currentLongForm[category] }
          : { price: 0, slots: 2, allowEvening: true };

        if (field === "price" || field === "slots") {
          currentCategory[field] = Number(value);
        } else {
          currentCategory[field] = value;
        }

        currentLongForm[category] = currentCategory;
        currentVideography[VIDEOGRAPHY_SUB_SERVICES.LONG_FORM] = currentLongForm;
      }
    }

    currentPrices[SERVICES.VIDEOGRAPHY] = currentVideography;
    newSizes[sizeIndex] = {
      ...newSizes[sizeIndex],
      prices: currentPrices,
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
              <CardTitle className="text-xl font-semibold text-gray-800">
                {type}
              </CardTitle>
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
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.values(SERVICES).map((service) => {
                        // Special handling for Videography
                        if (service === SERVICES.VIDEOGRAPHY) {
                          const videographyConfig = size.prices[SERVICES.VIDEOGRAPHY] || {};
                          const shortFormConfig = videographyConfig[VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM] || { price: 0, slots: 1 };
                          const longFormConfig = videographyConfig[VIDEOGRAPHY_SUB_SERVICES.LONG_FORM] || {};
                          
                          return (
                            <div key={service} className="col-span-full">
                              <div className="p-3 border border-gray-200 rounded-lg bg-gray-50/50">
                                <Label className="text-xs font-medium text-gray-700 mb-3 uppercase tracking-wider block">
                                  {service}
                                </Label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {/* Short Form */}
                                  <div className="p-3 border border-gray-100 rounded-lg bg-white">
                                    <Label className="text-xs font-medium text-gray-500 mb-2 block">
                                      Short Form
                                    </Label>
                                    <div className="space-y-2">
                                      <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">AED</span>
                                        <Input
                                          type="number"
                                          value={shortFormConfig.price || 0}
                                          onChange={(e) => handleVideographyPriceChange(type, sizeIndex, VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM, null, "price", e.target.value)}
                                          className="pl-8 pr-2 h-8 text-sm"
                                          placeholder="Price"
                                        />
                                      </div>
                                      <div className="relative">
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">Slots</span>
                                        <Input
                                          type="number"
                                          min="1"
                                          value={shortFormConfig.slots || 1}
                                          onChange={(e) => handleVideographyPriceChange(type, sizeIndex, VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM, null, "slots", e.target.value)}
                                          className="pl-10 pr-2 h-8 text-sm"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Long Form */}
                                  {!(type === "Commercial" && size.label === "Basic") && (
                                    <div className="p-3 border border-gray-100 rounded-lg bg-white">
                                      <Label className="text-xs font-medium text-gray-500 mb-2 block">
                                        Long Form
                                      </Label>
                                      <div className="space-y-2">
                                        {type === "Commercial" ? (
                                          // For commercial properties, simplified pricing without subcategories
                                          <>
                                            <div className="relative">
                                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">AED</span>
                                              <Input
                                                type="number"
                                                value={typeof longFormConfig === "object" ? longFormConfig.price || 0 : longFormConfig || 0}
                                                onChange={(e) => handleVideographyPriceChange(type, sizeIndex, VIDEOGRAPHY_SUB_SERVICES.LONG_FORM, null, "price", e.target.value)}
                                                className="pl-8 pr-2 h-8 text-sm"
                                                placeholder="Price"
                                              />
                                            </div>
                                            <div className="relative">
                                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">Slots</span>
                                              <Input
                                                type="number"
                                                min="1"
                                                value={typeof longFormConfig === "object" ? longFormConfig.slots || 1 : 1}
                                                onChange={(e) => handleVideographyPriceChange(type, sizeIndex, VIDEOGRAPHY_SUB_SERVICES.LONG_FORM, null, "slots", e.target.value)}
                                                className="pl-10 pr-2 h-8 text-sm"
                                              />
                                            </div>
                                          </>
                                        ) : (
                                          // For non-commercial properties, show subcategories
                                          Object.entries(VIDEOGRAPHY_SUB_CATEGORIES.LONG_FORM).map(([key, label]) => {
                                            const categoryConfig =
                                              longFormConfig[label] ||
                                              longFormConfig[key] || { price: 0, slots: 2 };
                                            return (
                                              <div key={key} className="flex items-center gap-2">
                                                <span className="text-xs text-gray-600 w-20">{label}</span>
                                                <div className="relative flex-1">
                                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-[10px]">AED</span>
                                                  <Input
                                                    type="number"
                                                    value={categoryConfig.price || 0}
                                                    onChange={(e) => handleVideographyPriceChange(type, sizeIndex, VIDEOGRAPHY_SUB_SERVICES.LONG_FORM, label, "price", e.target.value)}
                                                    className="pl-7 pr-1 h-7 text-xs"
                                                  />
                                                </div>
                                                <div className="relative w-16">
                                                  <Input
                                                    type="number"
                                                    min="1"
                                                    value={categoryConfig.slots || 2}
                                                    onChange={(e) => handleVideographyPriceChange(type, sizeIndex, VIDEOGRAPHY_SUB_SERVICES.LONG_FORM, label, "slots", e.target.value)}
                                                    className="pl-1 pr-1 h-7 text-xs text-center"
                                                  />
                                                </div>
                                              </div>
                                            );
                                          })
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        }
                        
                        // Regular services (Photography, 360 Tour)
                        const serviceConfig = size.prices[service];
                        const price = typeof serviceConfig === "object" ? serviceConfig.price : serviceConfig;
                        const slots = typeof serviceConfig === "object" ? serviceConfig.slots || 1 : 1;
                        const allowEvening = typeof serviceConfig === "object" ? serviceConfig.allowEvening || false : false;

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
      
      {/* Save Button */}
      <div className="flex justify-end mt-8">
        <Button
          onClick={async () => {
            setSaving(true);
            try {
              await savePricingConfig(config);
              toast.success("Pricing configuration saved successfully!");
            } catch (error) {
              toast.error("Failed to save pricing configuration");
              console.error(error);
            } finally {
              setSaving(false);
            }
          }}
          disabled={saving}
          className="px-6 py-2"
        >
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
