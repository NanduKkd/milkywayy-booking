"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
  Save,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AdminBadge,
  AdminCard,
  AdminCardContent,
  AdminCardDescription,
  AdminCardHeader,
  AdminCardTitle,
  AdminDialogContent,
  AdminInlineMessage,
  AdminPage,
  AdminPageHeader,
  AdminTablePanel,
} from "@/components/admin/AdminPrimitives";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
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

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
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

const toDateKey = (dateObj) => {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const toDayName = (dateObj) => {
  const day = dateObj.getDay();
  const sundayFirst = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return sundayFirst[day];
};

const buildCalendarDays = (currentMonth) => {
  const first = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1,
  );
  const mondayIndex = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - mondayIndex);

  const days = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
};

const getMonthRange = (currentMonth) => {
  const start = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1,
  );
  const end = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0,
  );
  return { start: toDateKey(start), end: toDateKey(end) };
};

const labelizePeriod = (period) => {
  if (!period) return "";
  return period.charAt(0).toUpperCase() + period.slice(1);
};

const ADMIN_PRIMARY_BUTTON_CLASS =
  "rounded-full border border-[hsl(var(--admin-highlight)/0.45)] bg-[hsl(var(--admin-highlight)/0.18)] px-5 text-[hsl(var(--admin-foreground))] hover:bg-[hsl(var(--admin-highlight)/0.26)] hover:text-[hsl(var(--admin-foreground))]";
const ADMIN_OUTLINE_BUTTON_CLASS =
  "rounded-full border-[hsl(var(--admin-border)/0.88)] bg-transparent text-[hsl(var(--admin-foreground))] hover:bg-white/[0.05] hover:text-[hsl(var(--admin-foreground))]";
const INPUT_CLASS =
  "admin-input h-9 rounded-lg border-[hsl(var(--admin-border)/0.9)]";
const TABLE_HEAD_CLASS =
  "border-white/8 bg-white/[0.03] text-xs font-medium uppercase tracking-[0.18em] text-[hsl(var(--admin-muted))]";
const TABLE_CELL_CLASS = "border-white/8 text-[hsl(var(--admin-foreground))]";

function getStateTone(state) {
  if (state === "available") return "success";
  if (state === "booked") return "danger";
  return "neutral";
}

export default function TimeSlotsManager() {
  const [config, setConfig] = useState(null);
  const [bookedMap, setBookedMap] = useState({});
  const [bookedDetailsMap, setBookedDetailsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [calendarRefreshing, setCalendarRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [selectedDateKey, setSelectedDateKey] = useState("");
  const [isDayDialogOpen, setIsDayDialogOpen] = useState(false);
  const hasLoadedOnceRef = useRef(false);

  const monthLabel = useMemo(() => {
    return currentMonth.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }, [currentMonth]);

  const calendarDays = useMemo(
    () => buildCalendarDays(currentMonth),
    [currentMonth],
  );

  const loadConfig = useCallback(
    async ({ preserveLayout = false } = {}) => {
      if (preserveLayout) {
        setCalendarRefreshing(true);
      } else {
        setLoading(true);
      }
      setLoadError(null);
      try {
        const { start, end } = getMonthRange(currentMonth);
        const res = await fetch(
          `/api/admin/timeslots?start=${start}&end=${end}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
          },
        );
        if (!res.ok) throw new Error("Failed to load time slot config");
        const data = await res.json();
        setConfig(data.config);
        setBookedMap(data.bookedMap || {});
        setBookedDetailsMap(data.bookedDetailsMap || {});
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load time slot config";
        setLoadError(message);
        toast.error(message);
      } finally {
        if (preserveLayout) {
          setCalendarRefreshing(false);
        } else {
          setLoading(false);
        }
        hasLoadedOnceRef.current = true;
      }
    },
    [currentMonth],
  );

  useEffect(() => {
    loadConfig({ preserveLayout: hasLoadedOnceRef.current });
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

  const getDateOverride = (dateKey) => config?.dateOverrides?.[dateKey] || {};

  const getPeriodState = (dateObj, dateKey, period) => {
    if (!config) return "blocked";
    const dayName = toDayName(dateObj);
    const isWorkingDay = Boolean(config.systemSettings?.workingDays?.[dayName]);
    const override = getDateOverride(dateKey);

    if (!isWorkingDay) return "blocked";
    if (override.fullDayBlocked) return "blocked";

    const blockOverride = override.blocks?.[period];
    if (blockOverride === "blocked") return "blocked";
    if (bookedMap?.[dateKey]?.includes(period)) return "booked";
    return "available";
  };

  const openDayDialog = (dateObj) => {
    const key = toDateKey(dateObj);
    setSelectedDateKey(key);
    setIsDayDialogOpen(true);
  };

  const updateSelectedDay = (updater) => {
    if (!selectedDateKey) return;
    updateConfig((prev) => {
      const existing = prev.dateOverrides?.[selectedDateKey] || {};
      const next = updater(existing);
      return {
        ...prev,
        dateOverrides: {
          ...prev.dateOverrides,
          [selectedDateKey]: next,
        },
      };
    });
  };

  const toggleBlockForPeriod = (period) => {
    updateSelectedDay((existing) => {
      const blocks = { ...(existing.blocks || {}) };
      if (blocks[period] === "blocked") {
        delete blocks[period];
      } else {
        blocks[period] = "blocked";
      }
      return {
        ...existing,
        blocks,
      };
    });
  };

  const unblockDay = () => {
    updateSelectedDay(() => ({ fullDayBlocked: false, blocks: {} }));
  };

  const selectedDateObj = selectedDateKey
    ? new Date(`${selectedDateKey}T00:00:00`)
    : null;
  const selectedOverride = selectedDateKey
    ? getDateOverride(selectedDateKey)
    : {};
  const selectedDayHasManualBlocks =
    Boolean(selectedOverride?.fullDayBlocked) ||
    Object.values(selectedOverride?.blocks || {}).some(
      (value) => value === "blocked",
    );
  const selectedDateBookingDetails = selectedDateKey
    ? bookedDetailsMap?.[selectedDateKey] || {}
    : {};

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

      <AdminCard>
        <AdminCardHeader className="gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <AdminCardTitle className="flex items-center gap-2 text-2xl">
                <CalendarDays className="h-5 w-5" />
                Calendar
              </AdminCardTitle>
              <AdminCardDescription>
                Review bookings and manage named slot blocks.
              </AdminCardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className={ADMIN_OUTLINE_BUTTON_CLASS}
                onClick={() =>
                  setCurrentMonth(
                    (prev) =>
                      new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
                  )
                }
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-[160px] text-center text-sm font-semibold text-[hsl(var(--admin-foreground))]">
                {monthLabel}
              </div>
              <Button
                variant="outline"
                size="icon"
                className={ADMIN_OUTLINE_BUTTON_CLASS}
                onClick={() =>
                  setCurrentMonth(
                    (prev) =>
                      new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
                  )
                }
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className={ADMIN_OUTLINE_BUTTON_CLASS}
                onClick={() =>
                  setCurrentMonth(
                    new Date(
                      new Date().getFullYear(),
                      new Date().getMonth(),
                      1,
                    ),
                  )
                }
              >
                Today
              </Button>
            </div>
          </div>
          {calendarRefreshing ? (
            <AdminInlineMessage
              loading
              tone="info"
              title="Refreshing calendar"
              description="Updating booked periods and block state for the selected month."
            />
          ) : null}
        </AdminCardHeader>
        <AdminCardContent>
          <div className="admin-panel-muted overflow-hidden rounded-xl border border-[hsl(var(--admin-border)/0.72)]">
            <div className="grid grid-cols-7">
              {DAY_HEADERS.map((header) => (
                <div
                  key={header}
                  className="border-b border-white/8 bg-white/[0.04] px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--admin-muted))]"
                >
                  {header}
                </div>
              ))}
              {calendarDays.map((day) => {
                const key = toDateKey(day);
                const isInCurrentMonth =
                  day.getMonth() === currentMonth.getMonth();
                const periodStates = PERIODS.map((period) =>
                  getPeriodState(day, key, period),
                );
                const selected = selectedDateKey === key;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => openDayDialog(day)}
                    className={cn(
                      "min-h-[120px] border-l border-t border-white/8 px-3 py-3 text-left transition hover:bg-white/[0.04]",
                      !isInCurrentMonth &&
                        "bg-white/[0.03] text-[hsl(var(--admin-muted))]",
                      selected &&
                        "ring-1 ring-inset ring-[hsl(var(--admin-highlight)/0.75)]",
                    )}
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">
                        {day.getDate()}
                      </span>
                      {bookedMap?.[key]?.length ? (
                        <AdminBadge
                          tone="danger"
                          className="px-2 py-0.5 text-[0.62rem]"
                        >
                          {bookedMap[key].length} booked
                        </AdminBadge>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      {periodStates.map((state, index) => (
                        <div
                          key={`${key}_${PERIODS[index]}`}
                          className={cn(
                            "rounded-full px-2 py-1 text-[0.68rem] font-medium",
                            state === "available" &&
                              "bg-[hsl(var(--admin-success)/0.18)] text-[hsl(var(--admin-success))]",
                            state === "booked" &&
                              "bg-[hsl(var(--admin-danger)/0.18)] text-[hsl(var(--admin-danger))]",
                            state === "blocked" &&
                              "bg-white/[0.06] text-[hsl(var(--admin-muted))]",
                          )}
                        >
                          {labelizePeriod(PERIODS[index])}
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </AdminCardContent>
      </AdminCard>

      <Dialog open={isDayDialogOpen} onOpenChange={setIsDayDialogOpen}>
        <AdminDialogContent
          className="max-w-2xl"
          title={
            selectedDateObj
              ? selectedDateObj.toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : "Day details"
          }
          description="Review period availability, existing bookings, and block overrides for the selected day."
        >
          <div className="space-y-3">
            {PERIODS.map((period) => {
              const state =
                selectedDateObj && selectedDateKey
                  ? getPeriodState(selectedDateObj, selectedDateKey, period)
                  : "blocked";
              const blockDef =
                config.systemSettings.blockDefinitions?.[period] || {};
              const periodBookingDetails =
                selectedDateBookingDetails?.[period] || [];
              const displayPeriodLabel =
                period === "evening" &&
                periodBookingDetails.length > 0 &&
                periodBookingDetails.every(
                  (detail) =>
                    detail.slotLabel === periodBookingDetails[0]?.slotLabel,
                )
                  ? periodBookingDetails[0]?.slotLabel || labelizePeriod(period)
                  : labelizePeriod(period);

              return (
                <div
                  key={period}
                  className="admin-panel-muted rounded-xl border border-[hsl(var(--admin-border)/0.72)] p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-[hsl(var(--admin-foreground))]">
                          {displayPeriodLabel}
                        </p>
                        <AdminBadge tone={getStateTone(state)}>
                          {state === "available"
                            ? "Available"
                            : state === "booked"
                              ? "Booked"
                              : "Blocked"}
                        </AdminBadge>
                      </div>
                      <p className="text-sm text-[hsl(var(--admin-muted))]">
                        {blockDef.startTime || "--:--"} -{" "}
                        {blockDef.endTime || "--:--"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className={ADMIN_OUTLINE_BUTTON_CLASS}
                      onClick={() => toggleBlockForPeriod(period)}
                    >
                      {selectedOverride?.blocks?.[period] === "blocked"
                        ? "Unblock"
                        : "Block"}
                    </Button>
                  </div>
                  {state === "booked" && periodBookingDetails.length > 0 ? (
                    <div className="mt-4 space-y-2">
                      {periodBookingDetails.map((detail, index) => (
                        <div
                          key={`${period}_${detail.bookingCode}_${index}`}
                          className="rounded-xl border border-white/8 bg-black/10 px-3 py-3 text-sm text-[hsl(var(--admin-muted))]"
                        >
                          <p>Booking: {detail.bookingCode}</p>
                          <p>Property: {detail.propertyLabel}</p>
                          {detail.serviceLabel ? (
                            <p>Services: {detail.serviceLabel}</p>
                          ) : null}
                          {detail.slotLabel &&
                          detail.slotLabel !== displayPeriodLabel ? (
                            <p>Slot: {detail.slotLabel}</p>
                          ) : null}
                          <p>Arrival: {detail.arrival}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <Separator className="admin-divider" />

          {selectedDayHasManualBlocks ? (
            <Button
              variant="outline"
              className={ADMIN_OUTLINE_BUTTON_CLASS}
              onClick={unblockDay}
            >
              Clear blocks
            </Button>
          ) : null}
        </AdminDialogContent>
      </Dialog>
    </AdminPage>
  );
}
