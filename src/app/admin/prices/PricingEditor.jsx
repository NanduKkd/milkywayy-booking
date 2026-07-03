"use client";

import { Save } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AdminBadge,
  AdminCard,
  AdminCardContent,
  AdminCardDescription,
  AdminCardHeader,
  AdminCardTitle,
  AdminInlineMessage,
  AdminPage,
  AdminPageHeader,
} from "@/components/admin/AdminPrimitives";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SERVICES,
  VIDEOGRAPHY_SUB_CATEGORIES,
  VIDEOGRAPHY_SUB_SERVICES,
} from "@/lib/config/pricing";
import { cn } from "@/lib/utils";
import { savePricingConfig } from "./actions";

const ADMIN_PRIMARY_BUTTON_CLASS =
  "rounded-full border border-[hsl(var(--admin-highlight)/0.45)] bg-[hsl(var(--admin-highlight)/0.18)] px-5 text-[hsl(var(--admin-foreground))] hover:bg-[hsl(var(--admin-highlight)/0.26)] hover:text-[hsl(var(--admin-foreground))]";
const INPUT_CLASS =
  "admin-input h-10 rounded-2xl border-[hsl(var(--admin-border)/0.9)]";
const FIELD_PANEL_CLASS =
  "admin-panel-muted rounded-[1.2rem] border border-[hsl(var(--admin-border)/0.72)] p-3";

function collectPricingEntries(config) {
  const entries = [];

  Object.values(config || {}).forEach((typeConfig) => {
    (typeConfig?.sizes || []).forEach((size) => {
      Object.entries(size?.prices || {}).forEach(([service, serviceConfig]) => {
        if (service === SERVICES.VIDEOGRAPHY) {
          const shortFormConfig =
            serviceConfig?.[VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM];
          if (shortFormConfig) {
            entries.push(shortFormConfig);
          }

          const longFormConfig =
            serviceConfig?.[VIDEOGRAPHY_SUB_SERVICES.LONG_FORM];
          if (
            longFormConfig &&
            typeof longFormConfig === "object" &&
            ("price" in longFormConfig || "slots" in longFormConfig)
          ) {
            entries.push(longFormConfig);
          } else {
            Object.values(longFormConfig || {}).forEach((categoryConfig) => {
              entries.push(categoryConfig);
            });
          }

          return;
        }

        if (typeof serviceConfig === "object") {
          entries.push(serviceConfig);
        } else {
          entries.push({ price: serviceConfig });
        }
      });
    });
  });

  return entries;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export default function PricingEditor({ initialConfig, loadError = null }) {
  const [config, setConfig] = useState(initialConfig || {});
  const [saving, setSaving] = useState(false);

  const summary = useMemo(() => {
    const propertyTypes = Object.keys(config || {});
    const sizeTierCount = Object.values(config || {}).reduce(
      (total, typeConfig) => total + (typeConfig?.sizes?.length || 0),
      0,
    );
    const pricingEntries = collectPricingEntries(config);
    const eveningEligibleCount = pricingEntries.filter(
      (entry) => entry?.allowEvening,
    ).length;
    const prices = pricingEntries
      .map((entry) => Number(entry?.price))
      .filter((value) => Number.isFinite(value));

    return {
      eveningEligibleCount,
      propertyTypeCount: propertyTypes.length,
      sizeTierCount,
      startingPrice: prices.length ? Math.min(...prices) : 0,
    };
  }, [config]);

  const handlePriceChange = (
    propertyType,
    sizeIndex,
    service,
    field,
    value,
  ) => {
    const newConfig = { ...config };
    const newSizes = [...newConfig[propertyType].sizes];
    const currentServiceConfig = newSizes[sizeIndex].prices[service];

    const newServiceConfig =
      typeof currentServiceConfig === "object"
        ? { ...currentServiceConfig }
        : { price: currentServiceConfig, slots: 1, allowEvening: false };

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
      const currentShortForm =
        typeof currentVideography[VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM] ===
        "object"
          ? { ...currentVideography[VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM] }
          : { price: 0, slots: 1, allowEvening: false };

      if (field === "price" || field === "slots") {
        currentShortForm[field] = Number(value);
      } else {
        currentShortForm[field] = value;
      }
      currentVideography[VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM] =
        currentShortForm;
    } else if (subService === VIDEOGRAPHY_SUB_SERVICES.LONG_FORM) {
      const currentLongForm =
        typeof currentVideography[VIDEOGRAPHY_SUB_SERVICES.LONG_FORM] ===
        "object"
          ? { ...currentVideography[VIDEOGRAPHY_SUB_SERVICES.LONG_FORM] }
          : {};

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
        const currentCategory =
          typeof currentLongForm[category] === "object"
            ? { ...currentLongForm[category] }
            : { price: 0, slots: 2, allowEvening: true };

        if (field === "price" || field === "slots") {
          currentCategory[field] = Number(value);
        } else {
          currentCategory[field] = value;
        }

        currentLongForm[category] = currentCategory;
        currentVideography[VIDEOGRAPHY_SUB_SERVICES.LONG_FORM] =
          currentLongForm;
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
      toast.success("Pricing configuration saved successfully!");
      return;
    }

    toast.error(`Failed to save pricing configuration: ${result.message}`);
  };

  const hasConfig = Object.keys(config || {}).length > 0;

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Operations"
        title="Pricing"
        description="Update the live pricing matrix for apartments, villas, and commercial packages without changing the existing server-side save flow."
        actions={
          <Button
            onClick={handleSave}
            disabled={saving || !hasConfig}
            className={cn(
              ADMIN_PRIMARY_BUTTON_CLASS,
              "flex items-center gap-2 px-5",
            )}
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        }
      />

      {loadError ? (
        <AdminInlineMessage
          tone="danger"
          title="Unable to load saved pricing"
          description={loadError}
        />
      ) : null}

      {hasConfig ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AdminCard tone="subtle">
              <AdminCardHeader>
                <AdminCardDescription>Property groups</AdminCardDescription>
                <AdminCardTitle className="text-3xl">
                  {summary.propertyTypeCount}
                </AdminCardTitle>
              </AdminCardHeader>
              <AdminCardContent className="pt-0 text-sm text-[hsl(var(--admin-muted))]">
                Apartment, villa, and commercial pricing remain editable here.
              </AdminCardContent>
            </AdminCard>
            <AdminCard tone="subtle">
              <AdminCardHeader>
                <AdminCardDescription>Size tiers</AdminCardDescription>
                <AdminCardTitle className="text-3xl">
                  {summary.sizeTierCount}
                </AdminCardTitle>
              </AdminCardHeader>
              <AdminCardContent className="pt-0 text-sm text-[hsl(var(--admin-muted))]">
                Live package rows currently preserved in the configuration.
              </AdminCardContent>
            </AdminCard>
            <AdminCard tone="subtle">
              <AdminCardHeader>
                <AdminCardDescription>
                  Evening-eligible rules
                </AdminCardDescription>
                <AdminCardTitle className="text-3xl">
                  {summary.eveningEligibleCount}
                </AdminCardTitle>
              </AdminCardHeader>
              <AdminCardContent className="pt-0 text-sm text-[hsl(var(--admin-muted))]">
                Service variants that can still be booked into evening slots.
              </AdminCardContent>
            </AdminCard>
            <AdminCard tone="subtle">
              <AdminCardHeader>
                <AdminCardDescription>
                  Lowest starting rate
                </AdminCardDescription>
                <AdminCardTitle className="text-3xl">
                  {formatCurrency(summary.startingPrice)}
                </AdminCardTitle>
              </AdminCardHeader>
              <AdminCardContent className="pt-0 text-sm text-[hsl(var(--admin-muted))]">
                Minimum package price across the current live configuration.
              </AdminCardContent>
            </AdminCard>
          </div>

          <div className="space-y-6">
            {Object.entries(config).map(([type, typeConfig]) => (
              <AdminCard key={type}>
                <AdminCardHeader className="gap-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <AdminCardTitle>{type}</AdminCardTitle>
                      <AdminCardDescription>
                        Manage preserved pricing, slot counts, and evening rules
                        for every {type.toLowerCase()} size tier.
                      </AdminCardDescription>
                    </div>
                    <AdminBadge tone="info">
                      {typeConfig.sizes.length} size
                      {typeConfig.sizes.length === 1 ? "" : "s"}
                    </AdminBadge>
                  </div>
                </AdminCardHeader>
                <AdminCardContent className="space-y-4">
                  {typeConfig.sizes.map((size, sizeIndex) => (
                    <section
                      key={`${type}-${size.label}`}
                      className="admin-panel-muted rounded-[1.45rem] border border-[hsl(var(--admin-border)/0.76)] p-4"
                    >
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h2 className="text-base font-semibold text-[hsl(var(--admin-foreground))]">
                            {size.label}
                          </h2>
                          <p className="text-sm text-[hsl(var(--admin-muted))]">
                            Existing package settings stay live while you edit
                            prices and slot usage.
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-4">
                        {Object.values(SERVICES).map((service) => {
                          if (service === SERVICES.VIDEOGRAPHY) {
                            const videographyConfig =
                              size.prices[SERVICES.VIDEOGRAPHY] || {};
                            const shortFormConfig = videographyConfig[
                              VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM
                            ] || { price: 0, slots: 1 };
                            const longFormConfig =
                              videographyConfig[
                                VIDEOGRAPHY_SUB_SERVICES.LONG_FORM
                              ] || {};

                            return (
                              <div
                                key={`${type}-${size.label}-${service}`}
                                className="admin-panel rounded-[1.2rem] border border-[hsl(var(--admin-border)/0.72)] p-4"
                              >
                                <div className="mb-4 flex items-center justify-between gap-3">
                                  <Label className="text-sm font-semibold uppercase tracking-[0.18em] text-[hsl(var(--admin-muted))]">
                                    {service}
                                  </Label>
                                  <AdminBadge tone="neutral">
                                    Multi-variant
                                  </AdminBadge>
                                </div>
                                <div className="grid gap-4 lg:grid-cols-2">
                                  <div className={FIELD_PANEL_CLASS}>
                                    <Label className="mb-3 block text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--admin-muted))]">
                                      Short Form
                                    </Label>
                                    <div className="space-y-3">
                                      <Input
                                        aria-label={`${type} ${size.label} Short Form price`}
                                        type="number"
                                        value={shortFormConfig.price || 0}
                                        onChange={(e) =>
                                          handleVideographyPriceChange(
                                            type,
                                            sizeIndex,
                                            VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM,
                                            null,
                                            "price",
                                            e.target.value,
                                          )
                                        }
                                        className={INPUT_CLASS}
                                        placeholder="Price"
                                      />
                                      <Input
                                        aria-label={`${type} ${size.label} Short Form slots`}
                                        type="number"
                                        min="1"
                                        value={shortFormConfig.slots || 1}
                                        onChange={(e) =>
                                          handleVideographyPriceChange(
                                            type,
                                            sizeIndex,
                                            VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM,
                                            null,
                                            "slots",
                                            e.target.value,
                                          )
                                        }
                                        className={INPUT_CLASS}
                                      />
                                    </div>
                                  </div>

                                  {!(
                                    type === "Commercial" &&
                                    size.label === "Basic"
                                  ) ? (
                                    <div className={FIELD_PANEL_CLASS}>
                                      <Label className="mb-3 block text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--admin-muted))]">
                                        Long Form
                                      </Label>
                                      <div className="space-y-3">
                                        {type === "Commercial" ? (
                                          <>
                                            <Input
                                              aria-label={`${type} ${size.label} Long Form price`}
                                              type="number"
                                              value={
                                                typeof longFormConfig ===
                                                "object"
                                                  ? longFormConfig.price || 0
                                                  : longFormConfig || 0
                                              }
                                              onChange={(e) =>
                                                handleVideographyPriceChange(
                                                  type,
                                                  sizeIndex,
                                                  VIDEOGRAPHY_SUB_SERVICES.LONG_FORM,
                                                  null,
                                                  "price",
                                                  e.target.value,
                                                )
                                              }
                                              className={INPUT_CLASS}
                                              placeholder="Price"
                                            />
                                            <Input
                                              aria-label={`${type} ${size.label} Long Form slots`}
                                              type="number"
                                              min="1"
                                              value={
                                                typeof longFormConfig ===
                                                "object"
                                                  ? longFormConfig.slots || 1
                                                  : 1
                                              }
                                              onChange={(e) =>
                                                handleVideographyPriceChange(
                                                  type,
                                                  sizeIndex,
                                                  VIDEOGRAPHY_SUB_SERVICES.LONG_FORM,
                                                  null,
                                                  "slots",
                                                  e.target.value,
                                                )
                                              }
                                              className={INPUT_CLASS}
                                            />
                                          </>
                                        ) : (
                                          Object.entries(
                                            VIDEOGRAPHY_SUB_CATEGORIES.LONG_FORM,
                                          ).map(([key, label]) => {
                                            const categoryConfig =
                                              longFormConfig[label] ||
                                                longFormConfig[key] || {
                                                  price: 0,
                                                  slots: 2,
                                                };

                                            return (
                                              <div
                                                key={key}
                                                className="grid gap-2 sm:grid-cols-[minmax(120px,140px)_1fr_96px]"
                                              >
                                                <span className="self-center text-xs font-medium text-[hsl(var(--admin-muted))]">
                                                  {label}
                                                </span>
                                                <Input
                                                  aria-label={`${type} ${size.label} ${label} price`}
                                                  type="number"
                                                  value={
                                                    categoryConfig.price || 0
                                                  }
                                                  onChange={(e) =>
                                                    handleVideographyPriceChange(
                                                      type,
                                                      sizeIndex,
                                                      VIDEOGRAPHY_SUB_SERVICES.LONG_FORM,
                                                      label,
                                                      "price",
                                                      e.target.value,
                                                    )
                                                  }
                                                  className={INPUT_CLASS}
                                                />
                                                <Input
                                                  aria-label={`${type} ${size.label} ${label} slots`}
                                                  type="number"
                                                  min="1"
                                                  value={
                                                    categoryConfig.slots || 2
                                                  }
                                                  onChange={(e) =>
                                                    handleVideographyPriceChange(
                                                      type,
                                                      sizeIndex,
                                                      VIDEOGRAPHY_SUB_SERVICES.LONG_FORM,
                                                      label,
                                                      "slots",
                                                      e.target.value,
                                                    )
                                                  }
                                                  className={INPUT_CLASS}
                                                />
                                              </div>
                                            );
                                          })
                                        )}
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            );
                          }

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
                              key={`${type}-${size.label}-${service}`}
                              className="grid gap-3 rounded-[1.2rem] border border-[hsl(var(--admin-border)/0.72)] bg-black/10 p-4 lg:grid-cols-[minmax(160px,200px)_minmax(0,1fr)_120px_auto]"
                            >
                              <div className="self-center">
                                <Label className="text-sm font-semibold uppercase tracking-[0.18em] text-[hsl(var(--admin-muted))]">
                                  {service}
                                </Label>
                              </div>
                              <Input
                                aria-label={`${type} ${size.label} ${service} price`}
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
                                className={INPUT_CLASS}
                              />
                              <Input
                                aria-label={`${type} ${size.label} ${service} slots`}
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
                                className={INPUT_CLASS}
                              />
                              <div className="flex items-center gap-2 self-center">
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
                                  className="cursor-pointer text-sm text-[hsl(var(--admin-muted))]"
                                >
                                  Allow Evening
                                </Label>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </AdminCardContent>
              </AdminCard>
            ))}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving}
              className={cn(
                ADMIN_PRIMARY_BUTTON_CLASS,
                "flex items-center gap-2 px-5",
              )}
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </>
      ) : (
        <AdminInlineMessage
          tone="warning"
          title="No pricing configuration found"
          description="Load or seed a pricing configuration before editing package values."
        />
      )}
    </AdminPage>
  );
}
