"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AdminInlineMessage } from "@/components/admin/AdminPrimitives";
import {
  SERVICES,
  VIDEOGRAPHY_SUB_CATEGORIES,
  VIDEOGRAPHY_SUB_SERVICES,
} from "@/lib/config/pricing";
import { cn } from "@/lib/utils";
import { savePricingConfig } from "./actions";

const STANDARD_COLUMNS = [
  {
    key: "photography",
    label: "Photography",
    service: SERVICES.PHOTOGRAPHY,
  },
  {
    key: "short-video",
    label: "Short Video",
    subService: VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM,
  },
];

const LONG_FORM_COLUMNS = Object.entries(
  VIDEOGRAPHY_SUB_CATEGORIES.LONG_FORM,
).map(([key, category]) => ({
  category,
  key: `long-form-${key.toLowerCase()}`,
  label: {
    Daylight: "LF Day",
    "Night Light": "LF Night",
    "Daylight + Night": "LF Day+Night",
  }[category],
  subService: VIDEOGRAPHY_SUB_SERVICES.LONG_FORM,
}));

const TOUR_COLUMN = {
  key: "360-tour",
  label: "360 Tour",
  service: SERVICES.TOUR_360,
};

function getPropertyLabel(propertyType) {
  if (propertyType === "Apartment") return "apartments";
  if (propertyType === "Villa/Townhouse") return "villas";
  return propertyType.toLowerCase();
}

function getPrice(priceConfig) {
  if (priceConfig == null) return null;
  if (typeof priceConfig === "object") return priceConfig.price ?? null;
  return priceConfig;
}

function hasCategorizedLongForm(typeConfig) {
  return (typeConfig?.sizes || []).some((size) => {
    const longForm =
      size?.prices?.[SERVICES.VIDEOGRAPHY]?.[
        VIDEOGRAPHY_SUB_SERVICES.LONG_FORM
      ];

    return (
      longForm &&
      typeof longForm === "object" &&
      !("price" in longForm || "slots" in longForm)
    );
  });
}

function getColumns(typeConfig) {
  const longFormColumns = hasCategorizedLongForm(typeConfig)
    ? LONG_FORM_COLUMNS
    : [
        {
          key: "long-form",
          label: "Long Form",
          subService: VIDEOGRAPHY_SUB_SERVICES.LONG_FORM,
        },
      ];

  return [...STANDARD_COLUMNS, ...longFormColumns, TOUR_COLUMN];
}

function getCellPrice(size, column) {
  if (column.service) {
    return getPrice(size?.prices?.[column.service]);
  }

  const subServiceConfig =
    size?.prices?.[SERVICES.VIDEOGRAPHY]?.[column.subService];

  if (!column.category) return getPrice(subServiceConfig);

  return getPrice(
    subServiceConfig?.[column.category] ??
      subServiceConfig?.[
        Object.entries(VIDEOGRAPHY_SUB_CATEGORIES.LONG_FORM).find(
          ([, category]) => category === column.category,
        )?.[0]
      ],
  );
}

export default function PricingEditor({ initialConfig, loadError = null }) {
  const [config, setConfig] = useState(initialConfig || {});
  const [savedConfig, setSavedConfig] = useState(initialConfig || {});
  const [activeType, setActiveType] = useState(
    () => Object.keys(initialConfig || {})[0] || "",
  );
  const [saving, setSaving] = useState(false);

  const propertyTypes = Object.keys(config || {});
  const selectedType = config[activeType] ? activeType : propertyTypes[0];
  const selectedConfig = config[selectedType];
  const columns = getColumns(selectedConfig);
  const hasConfig = propertyTypes.length > 0;
  const dirtyPropertyTypes = new Set(
    propertyTypes.filter((propertyType) => {
      const typeConfig = config[propertyType];
      const savedTypeConfig = savedConfig[propertyType];
      const typeColumns = getColumns(typeConfig);

      return (typeConfig?.sizes || []).some((size, sizeIndex) =>
        typeColumns.some(
          (column) =>
            getCellPrice(size, column) !==
            getCellPrice(savedTypeConfig?.sizes?.[sizeIndex], column),
        ),
      );
    }),
  );
  const hasUnsavedChanges = dirtyPropertyTypes.size > 0;

  const handlePriceChange = (propertyType, sizeIndex, column, value) => {
    const price = Number(value);

    setConfig((currentConfig) => {
      const currentTypeConfig = currentConfig[propertyType];
      const currentSize = currentTypeConfig.sizes[sizeIndex];
      const prices = { ...currentSize.prices };

      if (column.service) {
        const currentService = prices[column.service];
        prices[column.service] =
          currentService && typeof currentService === "object"
            ? { ...currentService, price }
            : price;
      } else {
        const videography = { ...(prices[SERVICES.VIDEOGRAPHY] || {}) };
        const currentSubService = videography[column.subService];

        if (column.category) {
          const longForm = { ...(currentSubService || {}) };
          const currentCategory = longForm[column.category];
          longForm[column.category] =
            currentCategory && typeof currentCategory === "object"
              ? { ...currentCategory, price }
              : { price };
          videography[column.subService] = longForm;
        } else {
          videography[column.subService] =
            currentSubService && typeof currentSubService === "object"
              ? { ...currentSubService, price }
              : { price };
        }

        prices[SERVICES.VIDEOGRAPHY] = videography;
      }

      const sizes = [...currentTypeConfig.sizes];
      sizes[sizeIndex] = { ...currentSize, prices };

      return {
        ...currentConfig,
        [propertyType]: { ...currentTypeConfig, sizes },
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const result = await savePricingConfig(config);

      if (result.success) {
        setSavedConfig(config);
        toast.success("Pricing configuration saved successfully!");
        return;
      }

      toast.error(`Failed to save pricing configuration: ${result.message}`);
    } catch (error) {
      toast.error(
        `Failed to save pricing configuration: ${error?.message || "Unexpected error"}`,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row">
        <div>
          <p className="mb-0.5 text-[10px] uppercase tracking-widest text-zinc-600">
            Operations
          </p>
          <h1 className="text-xl font-bold text-white">
            Pricing Configuration
          </h1>
          <p className="mt-0.5 text-xs text-zinc-500">
            Manage service pricing by property type and size
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !hasConfig || !hasUnsavedChanges}
          className="rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {loadError ? (
        <AdminInlineMessage
          className="mb-4"
          tone="danger"
          title="Unable to load saved pricing"
          description={loadError}
        />
      ) : null}

      {hasConfig ? (
        <>
          <div
            className="mb-4 flex flex-wrap gap-2"
            aria-label="Property type"
            role="tablist"
          >
            {propertyTypes.map((propertyType) => {
              const active = propertyType === selectedType;
              const isDirty = dirtyPropertyTypes.has(propertyType);

              return (
                <button
                  key={propertyType}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveType(propertyType)}
                  className={cn(
                    "inline-flex items-center rounded-lg px-4 py-1.5 text-xs font-semibold capitalize transition-colors",
                    active
                      ? "bg-white text-black"
                      : "border border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600",
                  )}
                >
                  <span>{getPropertyLabel(propertyType)}</span>
                  {isDirty ? (
                    <>
                      <span
                        aria-hidden="true"
                        className="ml-2 inline-block h-2 w-2 rounded-full bg-amber-400 ring-2 ring-amber-400/20"
                        title="Unsaved edits"
                      />
                      <span className="sr-only">Unsaved edits</span>
                    </>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
            <div className="border-b border-zinc-800 px-5 py-3">
              <p className="text-sm font-semibold capitalize text-white">
                {getPropertyLabel(selectedType)}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                      Size
                    </th>
                    {columns.map((column) => (
                      <th
                        key={column.key}
                        className="whitespace-nowrap px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-zinc-500"
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {(selectedConfig?.sizes || []).map((size, sizeIndex) => (
                    <tr
                      key={`${selectedType}-${size.label}`}
                      className="transition-colors hover:bg-zinc-800/40"
                    >
                      <th
                        scope="row"
                        className="whitespace-nowrap px-4 py-3 text-left text-sm font-bold text-white"
                      >
                        {size.label}
                      </th>
                      {columns.map((column) => {
                        const price = getCellPrice(size, column);
                        const savedPrice = getCellPrice(
                          savedConfig[selectedType]?.sizes?.[sizeIndex],
                          column,
                        );
                        const isDirty = price !== savedPrice;
                        const label = `${selectedType} ${size.label} ${column.label} price`;

                        return (
                          <td key={column.key} className="px-4 py-3">
                            <label
                              className={cn(
                                "flex w-[100px] items-center rounded-lg border px-2.5 py-1.5 text-sm font-semibold text-white transition-colors focus-within:ring-1",
                                isDirty
                                  ? "border-amber-500/70 bg-amber-500/15 ring-amber-400"
                                  : "border-transparent bg-zinc-800 ring-blue-500",
                              )}
                            >
                              <span aria-hidden="true" className="mr-1">
                                AED
                              </span>
                              <input
                                aria-label={label}
                                type="number"
                                min="0"
                                value={price ?? ""}
                                onChange={(event) =>
                                  handlePriceChange(
                                    selectedType,
                                    sizeIndex,
                                    column,
                                    event.target.value,
                                  )
                                }
                                className="min-w-0 flex-1 appearance-none bg-transparent p-0 text-sm font-semibold text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              />
                            </label>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <AdminInlineMessage
          tone="warning"
          title="No pricing configuration found"
          description="Load or seed a pricing configuration before editing package values."
        />
      )}
    </div>
  );
}
