"use client";

import { RefreshCcw, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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
  AdminTablePanel,
} from "@/components/admin/AdminPrimitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const PERIODS = ["morning", "afternoon", "evening"];

const PROPERTY_WEIGHT_GROUPS = [
  {
    label: "Apartments",
    type: "Apartment",
    sizes: ["Studio", "1 Bed", "2 Bed", "3 Bed", "4 Bed", "5 Bed"],
  },
  {
    label: "Villas / Townhouses",
    type: "Villa/Townhouse",
    sizes: ["2 Bed", "3 Bed", "4 Bed", "5 Bed", "6 Bed", "7 Bed"],
  },
];

const COMMERCIAL_SCALES = ["Basic", "Essential", "Premium", "Executive"];

const SERVICE_WEIGHT_ORDER = [
  "Photo",
  "Short Form Video",
  "Long Form - Daylight",
  "Long Form - Night",
  "Long Form - Day + Night",
  "360 Virtual Tour",
];

const labelizePeriod = (period) =>
  period ? period.charAt(0).toUpperCase() + period.slice(1) : "";

const ADMIN_PRIMARY_BUTTON_CLASS =
  "rounded-full border border-[hsl(var(--admin-highlight)/0.45)] bg-[hsl(var(--admin-highlight)/0.18)] px-5 text-[hsl(var(--admin-foreground))] hover:bg-[hsl(var(--admin-highlight)/0.26)] hover:text-[hsl(var(--admin-foreground))]";
const INPUT_CLASS =
  "admin-input h-9 rounded-lg border-[hsl(var(--admin-border)/0.9)]";
const TABLE_HEAD_CLASS =
  "border-white/8 bg-white/[0.03] text-xs font-medium uppercase tracking-[0.18em] text-[hsl(var(--admin-muted))]";
const TABLE_CELL_CLASS = "border-white/8 text-[hsl(var(--admin-foreground))]";

export default function TimeSlotsManager() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/timeslots", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load time slot config");
      const data = await res.json();
      setConfig(data.config);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load time slot config";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/timeslots", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeSlots: config }),
      });
      if (!res.ok) throw new Error("Failed to save config");
      toast.success("Time slot settings saved");
    } catch (_error) {
      toast.error("Failed to save time slot settings");
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (updater) => {
    setConfig((prev) => (prev ? updater(prev) : prev));
  };

  const updateServiceWeight = (serviceName, patch) => {
    updateConfig((prev) => ({
      ...prev,
      systemSettings: {
        ...prev.systemSettings,
        weightModel: {
          ...(prev.systemSettings?.weightModel || {}),
          serviceWeights: {
            ...(prev.systemSettings?.weightModel?.serviceWeights || {}),
            [serviceName]: {
              ...(prev.systemSettings?.weightModel?.serviceWeights?.[
                serviceName
              ] || {}),
              ...patch,
            },
          },
        },
      },
    }));
  };

  const updatePropertyWeight = (type, size, value) => {
    updateConfig((prev) => ({
      ...prev,
      systemSettings: {
        ...prev.systemSettings,
        weightModel: {
          ...(prev.systemSettings?.weightModel || {}),
          propertyWeights: {
            ...(prev.systemSettings?.weightModel?.propertyWeights || {}),
            [type]: {
              ...(prev.systemSettings?.weightModel?.propertyWeights?.[type] ||
                {}),
              [size]: Number(value) || 0,
            },
          },
        },
      },
    }));
  };

  if (!config) {
    return (
      <AdminPage>
        <AdminPageHeader
          eyebrow="Operations"
          title="Time Slots"
          description="Manage day availability, slot weighting, and booking block rules."
        />
        {loading ? (
          <AdminInlineMessage
            loading
            tone="info"
            title="Loading time slot settings"
            description="Fetching the live scheduling configuration and booked calendar state."
          />
        ) : (
          <div className="space-y-4">
            <AdminInlineMessage
              tone="danger"
              title="Unable to load time slot settings"
              description={
                loadError ||
                "The live scheduling configuration could not be loaded."
              }
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => loadConfig()}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        )}
      </AdminPage>
    );
  }

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Operations"
        title="Time Slots"
        description="Adjust rolling availability, service and property weights, and day-specific blocking without changing the existing scheduling logic."
        actions={
          <Button
            onClick={saveConfig}
            disabled={saving}
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <AdminInlineMessage
            tone="danger"
            title="Calendar data may be stale"
            description={loadError}
            className="flex-1"
          />
          <Button type="button" variant="outline" onClick={() => loadConfig()}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Retry load
          </Button>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <AdminCard>
          <AdminCardHeader>
            <AdminCardTitle>System settings</AdminCardTitle>
            <AdminCardDescription>
              Configure the booking window, day capacity reference, and weekly
              working schedule.
            </AdminCardDescription>
          </AdminCardHeader>
          <AdminCardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="rolling-window-days">
                  Rolling window length
                </Label>
                <Input
                  id="rolling-window-days"
                  type="number"
                  min="1"
                  value={config.systemSettings.rollingWindowDays}
                  onChange={(e) =>
                    updateConfig((prev) => ({
                      ...prev,
                      systemSettings: {
                        ...prev.systemSettings,
                        rollingWindowDays: parseInt(e.target.value, 10) || 1,
                      },
                    }))
                  }
                  className={cn(INPUT_CLASS, "w-full sm:w-40")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="day-slot-capacity">Day slot capacity</Label>
                <Input
                  id="day-slot-capacity"
                  type="number"
                  value={6}
                  readOnly
                  className={cn(INPUT_CLASS, "w-full sm:w-40")}
                />
                <p className="text-xs leading-6 text-[hsl(var(--admin-muted))]">
                  Formula: property weight + service weight sum. Totals at or
                  below capacity consume one slot; higher totals consume two.
                </p>
              </div>
            </div>

            <Separator className="admin-divider" />

            <div className="space-y-3">
              <Label>Working days</Label>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {DAYS_OF_WEEK.map((day) => (
                  <div
                    key={day}
                    className="admin-panel-muted flex items-center justify-between rounded-xl border border-[hsl(var(--admin-border)/0.72)] px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-[hsl(var(--admin-foreground))]">
                        {day}
                      </p>
                      <p className="text-xs text-[hsl(var(--admin-muted))]">
                        {day.slice(0, 3)} operations window
                      </p>
                    </div>
                    <Switch
                      checked={Boolean(
                        config.systemSettings.workingDays?.[day],
                      )}
                      onCheckedChange={(checked) =>
                        updateConfig((prev) => ({
                          ...prev,
                          systemSettings: {
                            ...prev.systemSettings,
                            workingDays: {
                              ...prev.systemSettings.workingDays,
                              [day]: checked,
                            },
                          },
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </AdminCardContent>
        </AdminCard>

        <AdminCard>
          <AdminCardHeader>
            <AdminCardTitle>Block definitions</AdminCardTitle>
            <AdminCardDescription>
              Set the live morning, afternoon, and evening time ranges used by
              the calendar and conflict checks.
            </AdminCardDescription>
          </AdminCardHeader>
          <AdminCardContent className="space-y-4">
            {PERIODS.map((period) => (
              <div
                key={period}
                className="admin-panel-muted rounded-xl border border-[hsl(var(--admin-border)/0.72)] p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[hsl(var(--admin-foreground))]">
                      {labelizePeriod(period)}
                    </p>
                    <p className="text-xs text-[hsl(var(--admin-muted))]">
                      Configured block window for {period} scheduling.
                    </p>
                  </div>
                  <AdminBadge tone="info">{labelizePeriod(period)}</AdminBadge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    aria-label={`${labelizePeriod(period)} start time`}
                    type="time"
                    value={
                      config.systemSettings.blockDefinitions?.[period]
                        ?.startTime || ""
                    }
                    onChange={(e) =>
                      updateConfig((prev) => ({
                        ...prev,
                        systemSettings: {
                          ...prev.systemSettings,
                          blockDefinitions: {
                            ...prev.systemSettings.blockDefinitions,
                            [period]: {
                              ...(prev.systemSettings.blockDefinitions?.[
                                period
                              ] || {}),
                              startTime: e.target.value,
                            },
                          },
                        },
                      }))
                    }
                    className={INPUT_CLASS}
                  />
                  <Input
                    aria-label={`${labelizePeriod(period)} end time`}
                    type="time"
                    value={
                      config.systemSettings.blockDefinitions?.[period]
                        ?.endTime || ""
                    }
                    onChange={(e) =>
                      updateConfig((prev) => ({
                        ...prev,
                        systemSettings: {
                          ...prev.systemSettings,
                          blockDefinitions: {
                            ...prev.systemSettings.blockDefinitions,
                            [period]: {
                              ...(prev.systemSettings.blockDefinitions?.[
                                period
                              ] || {}),
                              endTime: e.target.value,
                            },
                          },
                        },
                      }))
                    }
                    className={INPUT_CLASS}
                  />
                </div>
              </div>
            ))}
          </AdminCardContent>
        </AdminCard>
      </div>

      <AdminCard>
        <AdminCardHeader>
          <AdminCardTitle>Service weights</AdminCardTitle>
          <AdminCardDescription>
            Manage which services contribute to slot load and how much capacity
            each one consumes.
          </AdminCardDescription>
        </AdminCardHeader>
        <AdminCardContent>
          <AdminTablePanel>
            <div className="grid min-w-[640px] grid-cols-[minmax(220px,1fr)_140px_120px]">
              <div className={cn(TABLE_HEAD_CLASS, "px-5 py-3")}>
                Service name
              </div>
              <div className={cn(TABLE_HEAD_CLASS, "px-5 py-3")}>Weight</div>
              <div className={cn(TABLE_HEAD_CLASS, "px-5 py-3")}>Active</div>
              {SERVICE_WEIGHT_ORDER.map((service) => {
                const cfg = config.systemSettings?.weightModel
                  ?.serviceWeights?.[service] || {
                  weight: 0,
                  active: false,
                };
                return (
                  <div key={service} className="contents">
                    <div className={cn(TABLE_CELL_CLASS, "px-5 py-4 text-sm")}>
                      {service}
                    </div>
                    <div className={cn(TABLE_CELL_CLASS, "px-5 py-3")}>
                      <Input
                        aria-label={`${service} weight`}
                        type="number"
                        min="0"
                        step="0.5"
                        value={cfg.weight ?? 0}
                        onChange={(e) =>
                          updateServiceWeight(service, {
                            weight: Number(e.target.value) || 0,
                          })
                        }
                        className={cn(INPUT_CLASS, "h-10")}
                      />
                    </div>
                    <div className={cn(TABLE_CELL_CLASS, "px-5 py-4")}>
                      <Switch
                        checked={Boolean(cfg.active)}
                        onCheckedChange={(checked) =>
                          updateServiceWeight(service, { active: checked })
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </AdminTablePanel>
        </AdminCardContent>
      </AdminCard>

      <AdminCard>
        <AdminCardHeader>
          <AdminCardTitle>Property settings</AdminCardTitle>
          <AdminCardDescription>
            Preserve the current configuration fields while aligning apartments,
            villas, and commercial references to the shared admin system.
          </AdminCardDescription>
        </AdminCardHeader>
        <AdminCardContent className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-2">
            {PROPERTY_WEIGHT_GROUPS.map((group) => (
              <AdminCard key={group.type} tone="muted">
                <AdminCardHeader className="pb-4">
                  <AdminCardTitle className="text-lg">
                    {group.label}
                  </AdminCardTitle>
                  <AdminCardDescription>
                    Property weights for {group.type.toLowerCase()} scheduling.
                  </AdminCardDescription>
                </AdminCardHeader>
                <AdminCardContent>
                  <AdminTablePanel>
                    <div className="grid min-w-[360px] grid-cols-[minmax(180px,1fr)_140px]">
                      <div className={cn(TABLE_HEAD_CLASS, "px-5 py-3")}>
                        Size
                      </div>
                      <div className={cn(TABLE_HEAD_CLASS, "px-5 py-3")}>
                        Weight
                      </div>
                      {group.sizes.map((size) => (
                        <div key={size} className="contents">
                          <div
                            className={cn(
                              TABLE_CELL_CLASS,
                              "px-5 py-4 text-sm",
                            )}
                          >
                            {size}
                          </div>
                          <div className={cn(TABLE_CELL_CLASS, "px-5 py-3")}>
                            <Input
                              aria-label={`${group.label} ${size} weight`}
                              type="number"
                              min="0"
                              step="0.5"
                              value={
                                config.systemSettings?.weightModel
                                  ?.propertyWeights?.[group.type]?.[size] ?? 0
                              }
                              onChange={(e) =>
                                updatePropertyWeight(
                                  group.type,
                                  size,
                                  e.target.value,
                                )
                              }
                              className={cn(INPUT_CLASS, "h-10")}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </AdminTablePanel>
                </AdminCardContent>
              </AdminCard>
            ))}
          </div>

          <AdminCard tone="muted">
            <AdminCardHeader className="pb-4">
              <AdminCardTitle className="text-lg">Commercial</AdminCardTitle>
              <AdminCardDescription>
                Commercial scales continue to act as property-weight references.
              </AdminCardDescription>
            </AdminCardHeader>
            <AdminCardContent>
              <AdminTablePanel>
                <div className="grid min-w-[480px] grid-cols-[minmax(180px,1fr)_140px_120px]">
                  <div className={cn(TABLE_HEAD_CLASS, "px-5 py-3")}>Scale</div>
                  <div className={cn(TABLE_HEAD_CLASS, "px-5 py-3")}>
                    Weight
                  </div>
                  <div className={cn(TABLE_HEAD_CLASS, "px-5 py-3")}>
                    Active
                  </div>
                  {COMMERCIAL_SCALES.map((scale) => {
                    const value =
                      config.systemSettings?.weightModel?.propertyWeights
                        ?.Commercial?.[scale] ?? 0;
                    return (
                      <div key={scale} className="contents">
                        <div
                          className={cn(TABLE_CELL_CLASS, "px-5 py-4 text-sm")}
                        >
                          {scale}
                        </div>
                        <div className={cn(TABLE_CELL_CLASS, "px-5 py-3")}>
                          <Input
                            aria-label={`${scale} commercial weight`}
                            type="number"
                            min="0"
                            step="0.5"
                            value={value}
                            onChange={(e) =>
                              updatePropertyWeight(
                                "Commercial",
                                scale,
                                e.target.value,
                              )
                            }
                            className={cn(INPUT_CLASS, "h-10")}
                          />
                        </div>
                        <div className={cn(TABLE_CELL_CLASS, "px-5 py-4")}>
                          <Switch
                            checked={value > 0}
                            onCheckedChange={(checked) =>
                              !checked &&
                              updatePropertyWeight("Commercial", scale, 0)
                            }
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AdminTablePanel>
            </AdminCardContent>
          </AdminCard>
        </AdminCardContent>
      </AdminCard>
    </AdminPage>
  );
}
