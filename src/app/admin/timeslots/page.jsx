"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Save,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

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

export default function TimeSlotsManager() {
  const [config, setConfig] = useState(null);
  const [bookedMap, setBookedMap] = useState({});
  const [bookedDetailsMap, setBookedDetailsMap] = useState({});
  const [loading, setLoading] = useState(true);
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

  const loadConfig = async ({ preserveLayout = false } = {}) => {
    if (preserveLayout) {
      setCalendarRefreshing(true);
    } else {
      setLoading(true);
    }
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
      toast.error("Failed to load time slot config");
    } finally {
      if (preserveLayout) {
        setCalendarRefreshing(false);
      } else {
        setLoading(false);
      }
      hasLoadedOnceRef.current = true;
    }
  };

  useEffect(() => {
    loadConfig({ preserveLayout: hasLoadedOnceRef.current });
  }, [currentMonth]);

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
    } catch (error) {
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

  const blockFullDay = () => {
    updateSelectedDay((existing) => ({ ...existing, fullDayBlocked: true }));
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
  const selectedDateBookingDetails = selectedDateKey
    ? bookedDetailsMap?.[selectedDateKey] || {}
    : {};

  if (loading || !config) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-sm text-muted-foreground">
          Loading timeslot settings...
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Calendar & Time Slot Rules</h1>
          <p className="text-muted-foreground">
            Manage daily availability, block definitions, and
            service/property-specific slot rules.
          </p>
        </div>
        <Button
          onClick={saveConfig}
          disabled={saving}
          className="flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>System Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Rolling Window Length (days)</Label>
              <Input
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
                className="w-32"
              />
            </div>

            <div className="space-y-2">
              <Label>Day Slot Capacity (Fixed)</Label>
              <Input type="number" value={6} readOnly className="w-32" />
              <p className="text-xs text-muted-foreground">
                Formula: totalWeight = propertyWeight + serviceWeightSum, then
                totalWeight {"<="} slotCapacity ? 1 : 2
              </p>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Working Days</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {DAYS_OF_WEEK.map((day) => (
                  <div
                    key={day}
                    className="flex items-center justify-between border rounded-md px-3 py-2"
                  >
                    <span className="text-sm">{day.slice(0, 3)}</span>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Block Definitions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {PERIODS.map((period) => (
              <div key={period} className="space-y-2 border rounded-md p-3">
                <Label className="font-medium">{labelizePeriod(period)}</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Input
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
                  />
                  <Input
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
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Services</CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure service types and their weight values.
          </p>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-hidden">
            <div className="grid grid-cols-[1fr_120px_80px] gap-2 px-4 py-3 text-xs text-muted-foreground border-b">
              <span>Service Name</span>
              <span>Weight</span>
              <span>Active</span>
            </div>
            {SERVICE_WEIGHT_ORDER.map((service) => {
              const cfg = config.systemSettings?.weightModel?.serviceWeights?.[
                service
              ] || {
                weight: 0,
                active: false,
              };
              return (
                <div
                  key={service}
                  className="grid grid-cols-[1fr_120px_80px] gap-2 px-4 py-3 border-b last:border-b-0 items-center"
                >
                  <span className="text-sm">{service}</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    value={cfg.weight ?? 0}
                    onChange={(e) =>
                      updateServiceWeight(service, {
                        weight: Number(e.target.value) || 0,
                      })
                    }
                    className="h-8"
                  />
                  <div className="flex justify-start">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Property Settings</CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure property sizes and commercial scales with weight values.
            Property Weight + Service Weight Sum = Total Load.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {PROPERTY_WEIGHT_GROUPS.map((group) => (
              <Card key={group.type}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{group.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-md overflow-hidden">
                    <div className="grid grid-cols-[1fr_120px] gap-2 px-4 py-3 text-xs text-muted-foreground border-b">
                      <span>Size</span>
                      <span>Weight</span>
                    </div>
                    {group.sizes.map((size) => (
                      <div
                        key={size}
                        className="grid grid-cols-[1fr_120px] gap-2 px-4 py-3 border-b last:border-b-0 items-center"
                      >
                        <span className="text-sm">{size}</span>
                        <Input
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
                          className="h-8"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Commercial</CardTitle>
              <p className="text-xs text-muted-foreground">
                Commercial scales are used as property weight references.
              </p>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-hidden">
                <div className="grid grid-cols-[1fr_120px_80px] gap-2 px-4 py-3 text-xs text-muted-foreground border-b">
                  <span>Scale</span>
                  <span>Weight</span>
                  <span>Active</span>
                </div>
                {COMMERCIAL_SCALES.map((scale) => {
                  const value =
                    config.systemSettings?.weightModel?.propertyWeights
                      ?.Commercial?.[scale] ?? 0;
                  return (
                    <div
                      key={scale}
                      className="grid grid-cols-[1fr_120px_80px] gap-2 px-4 py-3 border-b last:border-b-0 items-center"
                    >
                      <span className="text-sm">{scale}</span>
                      <Input
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
                        className="h-8"
                      />
                      <div className="flex justify-start">
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
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5" />
                Calendar
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Click a day to block full day or block specific periods.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setCurrentMonth(
                    (prev) =>
                      new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
                  )
                }
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="min-w-[160px] text-center font-medium">
                {monthLabel}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setCurrentMonth(
                    (prev) =>
                      new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
                  )
                }
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
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
          {calendarRefreshing && (
            <p className="text-xs text-muted-foreground pt-1">
              Refreshing calendar...
            </p>
          )}
          <div className="flex flex-wrap gap-3 pt-2">
            <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
              Available
            </Badge>
            <Badge className="bg-red-500/20 text-red-500 border-red-500/30">
              Booked
            </Badge>
            <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30">
              Blocked
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 border rounded-md overflow-hidden">
            {DAY_HEADERS.map((header) => (
              <div
                key={header}
                className="p-3 text-center border-b bg-muted/30 text-sm font-medium"
              >
                {header}
              </div>
            ))}
            {calendarDays.map((day, idx) => {
              const key = toDateKey(day);
              const isInCurrentMonth =
                day.getMonth() === currentMonth.getMonth();
              const periodStates = PERIODS.map((period) =>
                getPeriodState(day, key, period),
              );
              const selected = selectedDateKey === key;

              return (
                <button
                  key={`${key}_${idx}`}
                  type="button"
                  onClick={() => openDayDialog(day)}
                  className={`min-h-[110px] p-2 border-t border-l text-left transition-colors ${isInCurrentMonth ? "hover:bg-muted/20" : "bg-muted/20 text-muted-foreground"} ${selected ? "ring-2 ring-primary" : ""}`}
                >
                  <div className="text-sm font-medium mb-2">
                    {day.getDate()}
                  </div>
                  <div className="space-y-1">
                    {periodStates.map((state, i) => (
                      <div
                        key={`${key}_${PERIODS[i]}`}
                        className={`h-2 rounded ${state === "available" ? "bg-green-500" : state === "booked" ? "bg-red-500" : "bg-zinc-400"}`}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDayDialogOpen} onOpenChange={setIsDayDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {selectedDateObj
                ? selectedDateObj.toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "Day Details"}
            </DialogTitle>
          </DialogHeader>

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

              return (
                <div
                  key={period}
                  className="border rounded-md p-3 flex items-center justify-between gap-3"
                >
                  <div className="flex-1">
                    <p className="font-medium">{labelizePeriod(period)}</p>
                    <p className="text-sm text-muted-foreground">
                      {blockDef.startTime || "--:--"} -{" "}
                      {blockDef.endTime || "--:--"}
                    </p>
                    {state === "booked" && periodBookingDetails.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {periodBookingDetails.map((detail, idx) => (
                          <div
                            key={`${period}_${detail.bookingCode}_${idx}`}
                            className="rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
                          >
                            <p>Booking: {detail.bookingCode}</p>
                            <p>Property: {detail.propertyLabel}</p>
                            {detail.serviceLabel && (
                              <p>Services: {detail.serviceLabel}</p>
                            )}
                            <p>Arrival: {detail.arrival}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      className={
                        state === "available"
                          ? "bg-green-500/20 text-green-500 border-green-500/30"
                          : state === "booked"
                            ? "bg-red-500/20 text-red-500 border-red-500/30"
                            : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
                      }
                    >
                      {state === "available"
                        ? "Available"
                        : state === "booked"
                          ? "Booked"
                          : "Blocked"}
                    </Badge>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => toggleBlockForPeriod(period)}
                    >
                      {selectedOverride?.blocks?.[period] === "blocked"
                        ? "Unblock"
                        : "Block"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={blockFullDay}>
              <Clock3 className="w-4 h-4 mr-2" />
              Block Full Day
            </Button>
            <Button variant="outline" onClick={unblockDay}>
              Unblock Day
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
