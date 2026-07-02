"use client";

import {
  Ban,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPinned,
  Pencil,
  RefreshCcw,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const DUBAI_TIMEZONE = "Asia/Dubai";
const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const PERIOD_ORDER = ["morning", "afternoon", "evening"];
const UPCOMING_FILTERS = [
  { value: "all", label: "All" },
  { value: "bookings", label: "Bookings" },
  { value: "events", label: "Events" },
];

function getDatePartsInTimeZone(date, timeZone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(date)
    .reduce((accumulator, part) => {
      if (part.type !== "literal") {
        accumulator[part.type] = part.value;
      }
      return accumulator;
    }, {});
}

function getTodayDateKeyInDubai() {
  const parts = getDatePartsInTimeZone(new Date(), DUBAI_TIMEZONE);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function parseMonthKey(monthKey) {
  const [year, month] = String(monthKey).split("-").map(Number);
  return { year, month };
}

function buildUtcDate(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
}

function toDateKey(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthKeyFromDateKey(dateKey) {
  return String(dateKey).slice(0, 7);
}

function shiftMonthKey(monthKey, offset) {
  const { year, month } = parseMonthKey(monthKey);
  const shifted = buildUtcDate(year, month, 1);
  shifted.setUTCMonth(shifted.getUTCMonth() + offset);

  return `${shifted.getUTCFullYear()}-${String(
    shifted.getUTCMonth() + 1,
  ).padStart(2, "0")}`;
}

function getMonthRange(monthKey) {
  const { year, month } = parseMonthKey(monthKey);
  const start = buildUtcDate(year, month, 1);
  const end = buildUtcDate(year, month + 1, 0);

  return {
    start: toDateKey(start),
    end: toDateKey(end),
  };
}

function buildCalendarDays(monthKey) {
  const { year, month } = parseMonthKey(monthKey);
  const firstOfMonth = buildUtcDate(year, month, 1);
  const mondayIndex = (firstOfMonth.getUTCDay() + 6) % 7;
  const start = buildUtcDate(year, month, 1 - mondayIndex);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return date;
  });
}

function formatMonthLabel(monthKey) {
  const { year, month } = parseMonthKey(monthKey);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(buildUtcDate(year, month, 1));
}

function formatDateLabel(dateKey, options = {}) {
  if (!dateKey) return "";
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
    ...options,
  }).format(buildUtcDate(year, month, day));
}

function labelizePeriod(period) {
  if (!period) return "";
  return period.charAt(0).toUpperCase() + period.slice(1);
}

function formatBlockedPeriods(blockedPeriods) {
  if (!Array.isArray(blockedPeriods) || blockedPeriods.length === 0) {
    return "No blocked periods";
  }

  return [...blockedPeriods]
    .sort(
      (left, right) => PERIOD_ORDER.indexOf(left) - PERIOD_ORDER.indexOf(right),
    )
    .map(labelizePeriod)
    .join(", ");
}

function formatConflictPeriods(periods) {
  if (!Array.isArray(periods) || periods.length === 0) {
    return "All periods";
  }

  return periods.map(labelizePeriod).join(", ");
}

function formatMoney(amount) {
  if (amount == null || Number.isNaN(Number(amount))) {
    return "Amount pending";
  }

  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

function buildDayAriaLabel(day, counts, eventsForDay) {
  const parts = [formatDateLabel(day.date)];

  if (!day.isWorkingDay) {
    parts.push("non-working day");
  }
  if (day.block.fullDayBlocked) {
    parts.push("fully blocked");
  } else if (day.block.blockedPeriods.length > 0) {
    parts.push(
      `blocked periods: ${day.block.blockedPeriods.map(labelizePeriod).join(", ")}`,
    );
  }
  if (counts.bookings > 0) {
    parts.push(`${counts.bookings} booking${counts.bookings === 1 ? "" : "s"}`);
  }
  if (counts.activeEvents > 0) {
    parts.push(
      `${counts.activeEvents} active event${counts.activeEvents === 1 ? "" : "s"}`,
    );
  }
  if (
    eventsForDay.some(
      (event) => event.status === "ACTIVE" && event.consumesCapacity,
    )
  ) {
    parts.push("has capacity reservation");
  }

  return parts.join(". ");
}

function buildSelectedDaySummary(day) {
  if (!day) return [];

  const badges = [];

  badges.push({
    label: day.isWorkingDay ? "Working day" : "Non-working day",
    variant: day.isWorkingDay ? "secondary" : "destructive",
  });

  if (day.block.fullDayBlocked) {
    badges.push({ label: "Full-day block", variant: "destructive" });
  } else if (day.block.blockedPeriods.length > 0) {
    badges.push({
      label: `Blocked: ${formatBlockedPeriods(day.block.blockedPeriods)}`,
      variant: "outline",
    });
  } else {
    badges.push({ label: "No active blocks", variant: "outline" });
  }

  return badges;
}

function getBookingStatusVariant(status) {
  if (status === "CONFIRMED" || status === "COMPLETED") {
    return "secondary";
  }
  if (status === "CANCELLED") {
    return "destructive";
  }
  return "outline";
}

function getEventStatusVariant(status) {
  return status === "ACTIVE" ? "secondary" : "destructive";
}

function formatWeekdayLabel(dateKey) {
  if (!dateKey) return "";
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: "UTC",
  }).format(buildUtcDate(year, month, day));
}

function getEntrySortTime(entry) {
  if (entry.kind === "booking") {
    return entry.booking.slot?.startTime || "99:99";
  }

  if (entry.event.startTime) {
    return entry.event.startTime;
  }

  if (entry.event.period) {
    const periodIndex = PERIOD_ORDER.indexOf(entry.event.period);
    return `${String(periodIndex === -1 ? 9 : periodIndex).padStart(2, "0")}:00`;
  }

  return "99:99";
}

function formatUpcomingEntrySchedule(entry) {
  if (entry.kind === "booking") {
    const label = entry.booking.slot?.label || "Unscheduled";
    const startTime = entry.booking.slot?.startTime;

    return startTime ? `${label} • ${startTime}` : label;
  }

  const periodLabel = entry.event.period
    ? labelizePeriod(entry.event.period)
    : "Custom";
  const parts = [periodLabel];

  if (entry.event.startTime) {
    parts.push(entry.event.startTime);
  }

  if (entry.event.endTime) {
    parts.push(`to ${entry.event.endTime}`);
  }

  return parts.join(" • ").replace(" • to ", " to ");
}

function buildUpcomingScheduleEntries({
  bookings,
  events,
  startDate,
  endDate,
}) {
  if (!startDate || !endDate) {
    return [];
  }

  const entries = [];

  bookings.forEach((booking) => {
    if (booking.date < startDate || booking.date > endDate) {
      return;
    }

    entries.push({
      id: `booking-${booking.id}`,
      kind: "booking",
      date: booking.date,
      booking,
    });
  });

  events.forEach((event) => {
    if (event.date < startDate || event.date > endDate) {
      return;
    }

    entries.push({
      id: `event-${event.id}`,
      kind: "event",
      date: event.date,
      event,
    });
  });

  return entries.sort((left, right) => {
    if (left.date !== right.date) {
      return left.date.localeCompare(right.date);
    }

    const timeComparison = getEntrySortTime(left).localeCompare(
      getEntrySortTime(right),
    );
    if (timeComparison !== 0) {
      return timeComparison;
    }

    if (left.kind !== right.kind) {
      return left.kind.localeCompare(right.kind);
    }

    return left.id.localeCompare(right.id);
  });
}

function updateDateOverride(timeSlotsConfig, dateKey, updater) {
  const currentOverride = timeSlotsConfig?.dateOverrides?.[dateKey] || {};
  const nextOverride = updater(currentOverride);

  return {
    ...timeSlotsConfig,
    dateOverrides: {
      ...(timeSlotsConfig?.dateOverrides || {}),
      [dateKey]: nextOverride,
    },
  };
}

const EMPTY_CONFLICT_STATE = {
  actionLabel: "",
  conflicts: [],
  pendingTimeSlots: null,
};
const EMPTY_EVENT_DIALOG_STATE = {
  open: false,
  mode: "create",
  eventId: null,
};

function buildEventFormState(dateKey, event = null) {
  return {
    title: event?.title || "",
    description: event?.description || "",
    date: event?.date || dateKey || "",
    period: event?.period || "",
    startTime: event?.startTime || "",
    endTime: event?.endTime || "",
    propertyLabel: event?.propertySummary?.label || "",
    contactLabel: event?.contactSummary?.label || "",
    consumesCapacity: Boolean(event?.consumesCapacity),
    reservedCapacityUnits: event?.consumesCapacity
      ? String(event?.reservedCapacityUnits || 1)
      : "0",
  };
}

export default function SchedulingCalendarPage() {
  const todayDateKey = useMemo(() => getTodayDateKeyInDubai(), []);
  const [monthKey, setMonthKey] = useState(
    getMonthKeyFromDateKey(todayDateKey),
  );
  const [selectedDateKey, setSelectedDateKey] = useState(todayDateKey);
  const [upcomingFilter, setUpcomingFilter] = useState("all");
  const [calendarData, setCalendarData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [blockSaving, setBlockSaving] = useState(false);
  const [eventSaving, setEventSaving] = useState(false);
  const [eventActionState, setEventActionState] = useState({
    id: null,
    action: "",
  });
  const [reloadVersion, setReloadVersion] = useState(0);
  const [conflictState, setConflictState] = useState(EMPTY_CONFLICT_STATE);
  const [eventDialogState, setEventDialogState] = useState(
    EMPTY_EVENT_DIALOG_STATE,
  );
  const [eventForm, setEventForm] = useState(() =>
    buildEventFormState(todayDateKey),
  );
  const hasLoadedOnceRef = useRef(false);
  const loadTrigger = `${monthKey}:${reloadVersion}`;

  useEffect(() => {
    let ignore = false;
    const [activeMonthKey] = loadTrigger.split(":");

    const loadCalendar = async () => {
      const isRefresh = hasLoadedOnceRef.current;
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const { start, end } = getMonthRange(activeMonthKey);
        const response = await fetch(
          `/api/admin/scheduling-calendar?start=${start}&end=${end}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
          },
        );

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(
            payload?.error || "Failed to load scheduling calendar",
          );
        }

        const payload = await response.json();

        if (ignore) {
          return;
        }

        setCalendarData(payload);
        hasLoadedOnceRef.current = true;

        setSelectedDateKey((current) => {
          if (current && payload.days.some((day) => day.date === current)) {
            return current;
          }

          if (getMonthKeyFromDateKey(todayDateKey) === activeMonthKey) {
            return todayDateKey;
          }

          return payload.days[0]?.date || current;
        });
      } catch (error) {
        if (!ignore) {
          toast.error(error.message || "Failed to load scheduling calendar");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    loadCalendar();

    return () => {
      ignore = true;
    };
  }, [loadTrigger, todayDateKey]);

  const days = calendarData?.days || [];
  const bookings = calendarData?.bookings || [];
  const events = calendarData?.events || [];
  const monthLabel = useMemo(() => formatMonthLabel(monthKey), [monthKey]);
  const calendarDays = useMemo(() => buildCalendarDays(monthKey), [monthKey]);

  const dayMap = useMemo(
    () => new Map(days.map((day) => [day.date, day])),
    [days],
  );
  const bookingsByDate = useMemo(() => {
    const grouped = new Map();

    bookings.forEach((booking) => {
      const bucket = grouped.get(booking.date) || [];
      bucket.push(booking);
      grouped.set(booking.date, bucket);
    });

    return grouped;
  }, [bookings]);
  const eventsByDate = useMemo(() => {
    const grouped = new Map();

    events.forEach((event) => {
      const bucket = grouped.get(event.date) || [];
      bucket.push(event);
      grouped.set(event.date, bucket);
    });

    return grouped;
  }, [events]);

  const selectedDay = dayMap.get(selectedDateKey) || null;
  const selectedBookings = bookingsByDate.get(selectedDateKey) || [];
  const selectedEvents = eventsByDate.get(selectedDateKey) || [];
  const selectedBadges = buildSelectedDaySummary(selectedDay);
  const selectedBlockDefinitions = selectedDay?.block?.blockDefinitions || {};
  const selectedBlockedPeriods = selectedDay?.block?.blockedPeriods || [];
  const selectedDateIndex = days.findIndex(
    (day) => day.date === selectedDateKey,
  );
  const previousDateKey =
    selectedDateIndex > 0 ? days[selectedDateIndex - 1]?.date || null : null;
  const nextDateKey =
    selectedDateIndex >= 0 && selectedDateIndex < days.length - 1
      ? days[selectedDateIndex + 1]?.date || null
      : null;
  const upcomingEntries = useMemo(
    () =>
      buildUpcomingScheduleEntries({
        bookings,
        events,
        startDate: selectedDateKey,
        endDate: calendarData?.range?.endDate || selectedDateKey,
      }),
    [bookings, calendarData?.range?.endDate, events, selectedDateKey],
  );
  const filteredUpcomingEntries = useMemo(() => {
    if (upcomingFilter === "bookings") {
      return upcomingEntries.filter((entry) => entry.kind === "booking");
    }

    if (upcomingFilter === "events") {
      return upcomingEntries.filter((entry) => entry.kind === "event");
    }

    return upcomingEntries;
  }, [upcomingEntries, upcomingFilter]);
  const upcomingCounts = useMemo(
    () => ({
      all: upcomingEntries.length,
      bookings: upcomingEntries.filter((entry) => entry.kind === "booking")
        .length,
      events: upcomingEntries.filter((entry) => entry.kind === "event").length,
    }),
    [upcomingEntries],
  );

  const persistBlockConfig = async (
    nextTimeSlots,
    { actionLabel, allowConflictOverride = false },
  ) => {
    const response = await fetch("/api/admin/timeslots", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timeSlots: nextTimeSlots,
        allowConflictOverride,
      }),
    });

    if (response.status === 409) {
      const payload = await response.json().catch(() => ({}));
      setConflictState({
        actionLabel,
        conflicts: Array.isArray(payload?.conflicts) ? payload.conflicts : [],
        pendingTimeSlots: nextTimeSlots,
      });
      return false;
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload?.error || `Failed to ${actionLabel}`);
    }

    setConflictState(EMPTY_CONFLICT_STATE);
    setReloadVersion((current) => current + 1);
    toast.success(actionLabel.charAt(0).toUpperCase() + actionLabel.slice(1));
    return true;
  };

  const handleBlockMutation = async (actionLabel, overrideUpdater) => {
    if (!selectedDateKey || !calendarData?.range) {
      return;
    }

    setBlockSaving(true);

    try {
      const configResponse = await fetch(
        `/api/admin/timeslots?start=${calendarData.range.startDate}&end=${calendarData.range.endDate}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        },
      );

      if (!configResponse.ok) {
        const payload = await configResponse.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to load time slot config");
      }

      const payload = await configResponse.json();
      const nextTimeSlots = updateDateOverride(
        payload?.config || {},
        selectedDateKey,
        overrideUpdater,
      );

      await persistBlockConfig(nextTimeSlots, { actionLabel });
    } catch (error) {
      toast.error(error.message || `Failed to ${actionLabel}`);
    } finally {
      setBlockSaving(false);
    }
  };

  const handleConflictOverrideSave = async () => {
    if (!conflictState.pendingTimeSlots) {
      return;
    }

    setBlockSaving(true);

    try {
      const saved = await persistBlockConfig(conflictState.pendingTimeSlots, {
        actionLabel: conflictState.actionLabel || "save block override",
        allowConflictOverride: true,
      });

      if (saved) {
        setConflictState(EMPTY_CONFLICT_STATE);
      }
    } catch (error) {
      toast.error(error.message || "Failed to save block override");
    } finally {
      setBlockSaving(false);
    }
  };

  const resetEventDialog = () => {
    setEventDialogState(EMPTY_EVENT_DIALOG_STATE);
    setEventForm(buildEventFormState(selectedDateKey || todayDateKey));
  };

  const openCreateEventDialog = () => {
    setEventForm(buildEventFormState(selectedDateKey || todayDateKey));
    setEventDialogState({
      open: true,
      mode: "create",
      eventId: null,
    });
  };

  const openEditEventDialog = (event) => {
    setEventForm(buildEventFormState(selectedDateKey || todayDateKey, event));
    setEventDialogState({
      open: true,
      mode: "edit",
      eventId: event.id,
    });
  };

  const handleEventFormChange = (field, value) => {
    setEventForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const refreshCalendarForDate = (dateKey) => {
    if (!dateKey) {
      setReloadVersion((current) => current + 1);
      return;
    }

    setSelectedDateKey(dateKey);
    setMonthKey(getMonthKeyFromDateKey(dateKey));
    setReloadVersion((current) => current + 1);
  };

  const submitEventForm = async (submitEvent) => {
    submitEvent.preventDefault();
    setEventSaving(true);

    try {
      const requestPayload = {
        title: eventForm.title,
        description: eventForm.description,
        date: eventForm.date,
        period: eventForm.period || null,
        startTime: eventForm.startTime || null,
        endTime: eventForm.endTime || null,
        propertySummary: eventForm.propertyLabel.trim()
          ? { label: eventForm.propertyLabel.trim() }
          : null,
        contactSummary: eventForm.contactLabel.trim()
          ? { label: eventForm.contactLabel.trim() }
          : null,
        consumesCapacity: eventForm.consumesCapacity,
        reservedCapacityUnits: eventForm.consumesCapacity
          ? eventForm.reservedCapacityUnits || "1"
          : "0",
      };
      const endpoint =
        eventDialogState.mode === "create"
          ? "/api/admin/scheduling-calendar/events"
          : `/api/admin/scheduling-calendar/events/${eventDialogState.eventId}`;
      const method = eventDialogState.mode === "create" ? "POST" : "PUT";
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            `Failed to ${eventDialogState.mode === "create" ? "create" : "update"} event`,
        );
      }

      toast.success(
        eventDialogState.mode === "create"
          ? "Calendar event created"
          : "Calendar event updated",
      );
      resetEventDialog();
      refreshCalendarForDate(payload?.date || requestPayload.date);
    } catch (error) {
      toast.error(error.message || "Failed to save calendar event");
    } finally {
      setEventSaving(false);
    }
  };

  const handleEventStatusAction = async (event, action) => {
    setEventActionState({
      id: event.id,
      action,
    });

    try {
      const response = await fetch(
        `/api/admin/scheduling-calendar/events/${event.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            `Failed to ${action === "cancel" ? "cancel" : "restore"} event`,
        );
      }

      toast.success(
        action === "cancel"
          ? "Calendar event cancelled"
          : "Calendar event restored",
      );
      refreshCalendarForDate(payload?.date || event.date);
    } catch (error) {
      toast.error(error.message || "Failed to update event status");
    } finally {
      setEventActionState({
        id: null,
        action: "",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Scheduling
          </p>
          <div className="flex items-center gap-3">
            <CalendarDays className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                Scheduling Calendar
              </h1>
              <p className="text-sm text-muted-foreground md:text-base">
                Review bookings, calendar events, and availability blocks in one
                Dubai-time calendar view.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline" className="rounded-full px-3 py-1">
            Timezone: Dubai business day
          </Badge>
          {refreshing ? (
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              <RefreshCcw className="mr-1 h-3.5 w-3.5 animate-spin" />
              Refreshing
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl border-white/10 bg-card/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bookings in view
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {calendarData?.summary?.totalBookings ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-white/10 bg-card/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {calendarData?.summary?.totalActiveEvents ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-white/10 bg-card/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fully blocked days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {calendarData?.summary?.totalFullyBlockedDays ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-white/10 bg-card/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Partial blocks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {calendarData?.summary?.totalPartiallyBlockedDays ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(360px,1fr)]">
        <Card className="rounded-3xl border-white/10 bg-card/80">
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-2xl">{monthLabel}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Live status for bookings, events, and Time Slots blocks.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Previous month"
                  onClick={() =>
                    setMonthKey((current) => shiftMonthKey(current, -1))
                  }
                >
                  <ChevronLeft />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setMonthKey(getMonthKeyFromDateKey(todayDateKey));
                    setSelectedDateKey(todayDateKey);
                  }}
                >
                  Today
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Next month"
                  onClick={() =>
                    setMonthKey((current) => shiftMonthKey(current, 1))
                  }
                >
                  <ChevronRight />
                </Button>
              </div>
            </div>

            <fieldset className="flex flex-wrap gap-2">
              <legend className="sr-only">Calendar legend</legend>
              <Badge variant="secondary" className="rounded-full">
                Booking
              </Badge>
              <Badge variant="outline" className="rounded-full">
                Calendar event
              </Badge>
              <Badge
                variant="outline"
                className="rounded-full border-amber-400/40 text-amber-200"
              >
                Period block
              </Badge>
              <Badge variant="destructive" className="rounded-full">
                Full-day block
              </Badge>
              <Badge
                variant="outline"
                className="rounded-full border-slate-400/40 text-slate-300"
              >
                Non-working day
              </Badge>
            </fieldset>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              {DAY_HEADERS.map((label) => (
                <div key={label}>{label}</div>
              ))}
            </div>

            {loading ? (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-12 text-center text-sm text-muted-foreground">
                Loading scheduling calendar...
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((date) => {
                  const dateKey = toDateKey(date);
                  const day = dayMap.get(dateKey);
                  const counts = day?.counts || {
                    bookings: 0,
                    events: 0,
                    activeEvents: 0,
                  };
                  const eventsForDay = eventsByDate.get(dateKey) || [];
                  const isCurrentMonth =
                    getMonthKeyFromDateKey(dateKey) === monthKey;
                  const isSelected = selectedDateKey === dateKey;
                  const isToday = dateKey === todayDateKey;
                  const hasPartialBlock =
                    !day?.block?.fullDayBlocked &&
                    (day?.block?.blockedPeriods?.length || 0) > 0;

                  return (
                    <button
                      key={dateKey}
                      type="button"
                      aria-label={buildDayAriaLabel(
                        day || {
                          date: dateKey,
                          isWorkingDay: true,
                          block: {
                            fullDayBlocked: false,
                            blockedPeriods: [],
                          },
                        },
                        counts,
                        eventsForDay,
                      )}
                      className={cn(
                        "min-h-[132px] rounded-2xl border p-3 text-left transition-colors",
                        isCurrentMonth
                          ? "border-white/10 bg-background/50 hover:border-white/20 hover:bg-background/70"
                          : "border-white/5 bg-background/20 text-muted-foreground opacity-60",
                        isSelected &&
                          "border-primary bg-primary/10 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]",
                        isToday && "ring-1 ring-primary/40",
                        day?.block?.fullDayBlocked &&
                          "border-rose-400/30 bg-rose-500/10",
                        hasPartialBlock &&
                          "border-amber-400/30 bg-amber-500/10",
                      )}
                      onClick={() => setSelectedDateKey(dateKey)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            {formatWeekdayLabel(dateKey)}
                          </p>
                          <p className="text-2xl font-semibold">
                            {date.getUTCDate()}
                          </p>
                        </div>
                        {isToday ? (
                          <Badge
                            variant="secondary"
                            className="rounded-full px-2"
                          >
                            Today
                          </Badge>
                        ) : null}
                      </div>

                      <div className="mt-3 space-y-1.5 text-xs">
                        {counts.bookings > 0 ? (
                          <p className="text-sky-200">
                            {counts.bookings} booking
                            {counts.bookings === 1 ? "" : "s"}
                          </p>
                        ) : null}
                        {counts.activeEvents > 0 ? (
                          <p className="text-emerald-200">
                            {counts.activeEvents} active event
                            {counts.activeEvents === 1 ? "" : "s"}
                          </p>
                        ) : null}
                        {day?.block?.fullDayBlocked ? (
                          <p className="text-rose-200">Full-day block</p>
                        ) : null}
                        {!day?.block?.fullDayBlocked &&
                        day?.block?.blockedPeriods?.length > 0 ? (
                          <p className="text-amber-100">
                            {formatBlockedPeriods(day.block.blockedPeriods)}
                          </p>
                        ) : null}
                        {day && !day.isWorkingDay ? (
                          <p className="text-slate-300">Non-working day</p>
                        ) : null}
                        {!day && isCurrentMonth ? (
                          <p className="text-muted-foreground">
                            No calendar data
                          </p>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-3xl border-white/10 bg-card/80">
            <CardHeader className="space-y-3">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-2xl">
                    {selectedDateKey
                      ? formatDateLabel(selectedDateKey)
                      : "Select a date"}
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Selected-day schedule, block state, and live entries.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Previous date"
                    disabled={!previousDateKey}
                    onClick={() =>
                      previousDateKey && setSelectedDateKey(previousDateKey)
                    }
                  >
                    <ChevronLeft />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (dayMap.has(todayDateKey)) {
                        setSelectedDateKey(todayDateKey);
                      }
                    }}
                    disabled={
                      !dayMap.has(todayDateKey) ||
                      selectedDateKey === todayDateKey
                    }
                  >
                    Today
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Next date"
                    disabled={!nextDateKey}
                    onClick={() =>
                      nextDateKey && setSelectedDateKey(nextDateKey)
                    }
                  >
                    <ChevronRight />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedBadges.map((badge) => (
                  <Badge
                    key={badge.label}
                    variant={badge.variant}
                    className="rounded-full"
                  >
                    {badge.label}
                  </Badge>
                ))}
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="rounded-2xl border border-white/10 bg-background/40 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ShieldAlert className="h-4 w-4 text-amber-300" />
                  Availability summary
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Block status
                    </p>
                    <p className="mt-1 text-sm">
                      {selectedDay?.block?.fullDayBlocked
                        ? "Full day blocked"
                        : formatBlockedPeriods(
                            selectedDay?.block?.blockedPeriods || [],
                          )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Entries
                    </p>
                    <p className="mt-1 text-sm">
                      {selectedBookings.length} booking
                      {selectedBookings.length === 1 ? "" : "s"},{" "}
                      {selectedEvents.length} event
                      {selectedEvents.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-background/40 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">
                      Availability blocks
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Reuse Time Slots overrides for this date. Blocking warns
                      before affecting existing bookings or events.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={
                        blockSaving || selectedDay?.block?.fullDayBlocked
                      }
                      onClick={() =>
                        handleBlockMutation("block full day", (existing) => ({
                          ...existing,
                          fullDayBlocked: true,
                        }))
                      }
                    >
                      Block full day
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={
                        blockSaving ||
                        (!selectedDay?.block?.fullDayBlocked &&
                          selectedBlockedPeriods.length === 0)
                      }
                      onClick={() =>
                        handleBlockMutation("clear day blocks", (existing) => ({
                          ...existing,
                          fullDayBlocked: false,
                          blocks: {},
                        }))
                      }
                    >
                      Clear blocks
                    </Button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {PERIOD_ORDER.map((period) => {
                    const isBlocked = selectedBlockedPeriods.includes(period);
                    const definition = selectedBlockDefinitions?.[period] || {};

                    return (
                      <div
                        key={period}
                        className="rounded-2xl border border-white/10 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">
                              {labelizePeriod(period)}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {definition.startTime || "--:--"} -{" "}
                              {definition.endTime || "--:--"}
                            </p>
                          </div>
                          <Badge
                            variant={isBlocked ? "destructive" : "outline"}
                            className="rounded-full"
                          >
                            {isBlocked ? "Blocked" : "Open"}
                          </Badge>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-4 w-full"
                          disabled={
                            blockSaving || selectedDay?.block?.fullDayBlocked
                          }
                          onClick={() =>
                            handleBlockMutation(
                              isBlocked
                                ? `unblock ${labelizePeriod(period).toLowerCase()}`
                                : `block ${labelizePeriod(period).toLowerCase()}`,
                              (existing) => {
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
                              },
                            )
                          }
                        >
                          {isBlocked ? "Unblock period" : "Block period"}
                        </Button>
                      </div>
                    );
                  })}
                </div>

                {selectedDay?.block?.fullDayBlocked ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Full-day block is active. Clear the day block before editing
                    individual periods.
                  </p>
                ) : null}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">Bookings</h2>
                  <Badge variant="secondary" className="rounded-full">
                    {selectedBookings.length}
                  </Badge>
                </div>
                {selectedBookings.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-muted-foreground">
                    No bookings scheduled for this date.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="rounded-2xl border border-white/10 bg-background/40 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-base font-semibold">
                              {booking.bookingCode}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {booking.customer?.fullName || "Unnamed customer"}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge
                              variant={getBookingStatusVariant(booking.status)}
                            >
                              {booking.status}
                            </Badge>
                            {booking.paymentStatus ? (
                              <Badge variant="outline">
                                {booking.paymentStatus}
                              </Badge>
                            ) : null}
                          </div>
                        </div>

                        <Separator className="my-4 bg-white/10" />

                        <div className="grid gap-3 text-sm sm:grid-cols-2">
                          <div className="space-y-1">
                            <p className="font-medium">Schedule</p>
                            <p className="text-muted-foreground">
                              {booking.slot?.label || "Unscheduled"}
                              {booking.slot?.startTime
                                ? ` • ${booking.slot.startTime}`
                                : ""}
                            </p>
                            {booking.slot?.arrivalWindow ? (
                              <p className="text-muted-foreground">
                                Arrival: {booking.slot.arrivalWindow}
                              </p>
                            ) : null}
                          </div>
                          <div className="space-y-1">
                            <p className="font-medium">Commercials</p>
                            <p className="text-muted-foreground">
                              {formatMoney(booking.amount)}
                            </p>
                            <p className="text-muted-foreground">
                              {booking.service?.label ||
                                "Service details pending"}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="font-medium">Property</p>
                            <p className="text-muted-foreground">
                              {booking.property?.label || "Property"}
                            </p>
                            {booking.property?.community ? (
                              <p className="text-muted-foreground">
                                {booking.property.community}
                              </p>
                            ) : null}
                          </div>
                          <div className="space-y-1">
                            <p className="font-medium">Blocked periods</p>
                            <p className="text-muted-foreground">
                              {formatBlockedPeriods(
                                booking.slot?.blockedPeriods || [],
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold">Calendar events</h2>
                    <Badge variant="outline" className="rounded-full">
                      {selectedEvents.length}
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!selectedDateKey}
                    onClick={openCreateEventDialog}
                  >
                    Create event
                  </Button>
                </div>
                {selectedEvents.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-muted-foreground">
                    No calendar-only events scheduled for this date.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedEvents.map((event) => (
                      <div
                        key={event.id}
                        className="rounded-2xl border border-white/10 bg-background/40 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-base font-semibold">
                              {event.title}
                            </p>
                            {event.description ? (
                              <p className="mt-1 text-sm text-muted-foreground">
                                {event.description}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={
                                eventSaving ||
                                (eventActionState.id === event.id &&
                                  eventActionState.action.length > 0)
                              }
                              onClick={() => openEditEventDialog(event)}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit event
                            </Button>
                            {event.status === "ACTIVE" ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={
                                  eventSaving ||
                                  eventActionState.id === event.id
                                }
                                onClick={() =>
                                  handleEventStatusAction(event, "cancel")
                                }
                              >
                                <Ban className="mr-2 h-4 w-4" />
                                Cancel event
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={
                                  eventSaving ||
                                  eventActionState.id === event.id
                                }
                                onClick={() =>
                                  handleEventStatusAction(event, "restore")
                                }
                              >
                                <RotateCcw className="mr-2 h-4 w-4" />
                                Restore event
                              </Button>
                            )}
                            <Badge
                              variant={getEventStatusVariant(event.status)}
                            >
                              {event.status}
                            </Badge>
                            {event.consumesCapacity ? (
                              <Badge variant="outline">
                                Reserves {event.reservedCapacityUnits} capacity
                              </Badge>
                            ) : (
                              <Badge variant="outline">No capacity hold</Badge>
                            )}
                          </div>
                        </div>

                        <Separator className="my-4 bg-white/10" />

                        <div className="grid gap-3 text-sm sm:grid-cols-2">
                          <div className="space-y-1">
                            <p className="flex items-center gap-2 font-medium">
                              <Clock3 className="h-4 w-4 text-muted-foreground" />
                              Schedule
                            </p>
                            <p className="text-muted-foreground">
                              {event.period
                                ? labelizePeriod(event.period)
                                : "Custom"}
                              {event.startTime ? ` • ${event.startTime}` : ""}
                              {event.endTime ? ` to ${event.endTime}` : ""}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="flex items-center gap-2 font-medium">
                              <MapPinned className="h-4 w-4 text-muted-foreground" />
                              Property
                            </p>
                            <p className="text-muted-foreground">
                              {event.propertySummary?.label || "Not specified"}
                            </p>
                          </div>
                        </div>

                        {event.status === "CANCELLED" ? (
                          <div className="mt-3 rounded-xl border border-rose-400/20 bg-rose-500/5 p-3 text-sm">
                            <p className="font-medium text-rose-100">
                              Capacity released
                            </p>
                            <p className="mt-1 text-muted-foreground">
                              {event.cancellationReason ||
                                "This event is cancelled and does not reserve capacity."}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-white/10 bg-card/80">
            <CardHeader className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-2xl">Upcoming schedule</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Entries from{" "}
                    {formatDateLabel(selectedDateKey, {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    through{" "}
                    {formatDateLabel(calendarData?.range?.endDate, {
                      month: "short",
                      day: "numeric",
                    })}
                    .
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {UPCOMING_FILTERS.map((filter) => (
                    <Button
                      key={filter.value}
                      type="button"
                      variant={
                        upcomingFilter === filter.value
                          ? "secondary"
                          : "outline"
                      }
                      className="rounded-full"
                      onClick={() => setUpcomingFilter(filter.value)}
                    >
                      {filter.label} ({upcomingCounts[filter.value] || 0})
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-2xl border border-white/10">
                <Table aria-label="Upcoming schedule">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Entry</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">View</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUpcomingEntries.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="py-8 text-center text-muted-foreground"
                        >
                          No upcoming entries in the current calendar range.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUpcomingEntries.map((entry) => {
                        const isSelected = entry.date === selectedDateKey;

                        return (
                          <TableRow
                            key={entry.id}
                            className={cn(
                              "cursor-pointer",
                              isSelected && "bg-primary/5",
                            )}
                            onClick={() => setSelectedDateKey(entry.date)}
                          >
                            <TableCell className="font-medium">
                              <div>
                                {formatDateLabel(entry.date, {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatWeekdayLabel(entry.date)}
                              </div>
                            </TableCell>
                            <TableCell>
                              {entry.kind === "booking" ? (
                                <div className="space-y-1">
                                  <p className="font-medium">
                                    {entry.booking.bookingCode}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {entry.booking.customer?.fullName ||
                                      "Unnamed customer"}
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <p className="font-medium">
                                    {entry.event.title}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {entry.event.propertySummary?.label ||
                                      entry.event.description ||
                                      "Calendar event"}
                                  </p>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatUpcomingEntrySchedule(entry)}
                            </TableCell>
                            <TableCell>
                              {entry.kind === "booking" ? (
                                <div className="flex flex-wrap gap-2">
                                  <Badge
                                    variant={getBookingStatusVariant(
                                      entry.booking.status,
                                    )}
                                  >
                                    {entry.booking.status}
                                  </Badge>
                                  {entry.booking.paymentStatus ? (
                                    <Badge variant="outline">
                                      {entry.booking.paymentStatus}
                                    </Badge>
                                  ) : null}
                                </div>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  <Badge
                                    variant={getEventStatusVariant(
                                      entry.event.status,
                                    )}
                                  >
                                    {entry.event.status}
                                  </Badge>
                                  <Badge variant="outline">
                                    {entry.event.consumesCapacity
                                      ? `Reserves ${entry.event.reservedCapacityUnits}`
                                      : "No capacity hold"}
                                  </Badge>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSelectedDateKey(entry.date);
                                }}
                              >
                                View day
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog
        open={eventDialogState.open}
        onOpenChange={(open) => {
          if (!open && !eventSaving) {
            resetEventDialog();
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {eventDialogState.mode === "create"
                ? "Create calendar event"
                : "Edit calendar event"}
            </DialogTitle>
            <DialogDescription>
              Add a calendar-only event without creating invoices, payments, or
              customer workflow records.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-5" onSubmit={submitEventForm}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="calendar-event-title">Title</Label>
                <Input
                  id="calendar-event-title"
                  value={eventForm.title}
                  maxLength={160}
                  onChange={(event) =>
                    handleEventFormChange("title", event.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="calendar-event-date">Date</Label>
                <Input
                  id="calendar-event-date"
                  type="date"
                  value={eventForm.date}
                  onChange={(event) =>
                    handleEventFormChange("date", event.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="calendar-event-period">Period</Label>
                <select
                  id="calendar-event-period"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  value={eventForm.period}
                  onChange={(event) =>
                    handleEventFormChange("period", event.target.value)
                  }
                >
                  <option value="">Infer from time</option>
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="evening">Evening</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="calendar-event-start-time">Start time</Label>
                <Input
                  id="calendar-event-start-time"
                  type="time"
                  value={eventForm.startTime}
                  onChange={(event) =>
                    handleEventFormChange("startTime", event.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="calendar-event-end-time">End time</Label>
                <Input
                  id="calendar-event-end-time"
                  type="time"
                  value={eventForm.endTime}
                  onChange={(event) =>
                    handleEventFormChange("endTime", event.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="calendar-event-property">
                  Property summary
                </Label>
                <Input
                  id="calendar-event-property"
                  value={eventForm.propertyLabel}
                  maxLength={200}
                  onChange={(event) =>
                    handleEventFormChange("propertyLabel", event.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="calendar-event-contact">Contact summary</Label>
                <Input
                  id="calendar-event-contact"
                  value={eventForm.contactLabel}
                  maxLength={200}
                  onChange={(event) =>
                    handleEventFormChange("contactLabel", event.target.value)
                  }
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="calendar-event-description">Description</Label>
                <Textarea
                  id="calendar-event-description"
                  value={eventForm.description}
                  maxLength={2000}
                  onChange={(event) =>
                    handleEventFormChange("description", event.target.value)
                  }
                />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-background/40 p-4">
              <div className="flex items-start gap-3">
                <input
                  id="calendar-event-consumes-capacity"
                  type="checkbox"
                  checked={eventForm.consumesCapacity}
                  onChange={(event) =>
                    setEventForm((current) => ({
                      ...current,
                      consumesCapacity: event.target.checked,
                      reservedCapacityUnits: event.target.checked
                        ? current.reservedCapacityUnits === "0"
                          ? "1"
                          : current.reservedCapacityUnits
                        : "0",
                    }))
                  }
                />
                <div className="space-y-1">
                  <Label htmlFor="calendar-event-consumes-capacity">
                    Reserve scheduling capacity
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Leave this off for informational notes that should not
                    affect customer availability.
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <Label htmlFor="calendar-event-capacity-units">
                  Reserved capacity units
                </Label>
                <Input
                  id="calendar-event-capacity-units"
                  type="number"
                  min="0"
                  step="0.25"
                  disabled={!eventForm.consumesCapacity}
                  value={
                    eventForm.consumesCapacity
                      ? eventForm.reservedCapacityUnits
                      : "0"
                  }
                  onChange={(event) =>
                    handleEventFormChange(
                      "reservedCapacityUnits",
                      event.target.value,
                    )
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={eventSaving}
                onClick={resetEventDialog}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={eventSaving}>
                {eventSaving
                  ? "Saving..."
                  : eventDialogState.mode === "create"
                    ? "Create event"
                    : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(conflictState.pendingTimeSlots)}
        onOpenChange={(open) => {
          if (!open && !blockSaving) {
            setConflictState(EMPTY_CONFLICT_STATE);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review block conflict</DialogTitle>
            <DialogDescription>
              Existing bookings and events will remain, but availability for the
              selected periods will be blocked if you continue.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This block overlaps scheduled records. Existing bookings and
              events will remain, but future availability for the affected
              periods will be blocked if you continue.
            </p>

            {conflictState.conflicts.map((conflict) => (
              <div
                key={`${conflict.date}-${conflict.blockedPeriods?.join("-") || "all"}`}
                className="rounded-2xl border border-white/10 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {formatDateLabel(conflict.date)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Periods: {formatConflictPeriods(conflict.blockedPeriods)}
                    </p>
                  </div>
                  <Badge variant="outline" className="rounded-full">
                    {(conflict.bookings?.length || 0) +
                      (conflict.events?.length || 0)}{" "}
                    affected
                  </Badge>
                </div>

                {Array.isArray(conflict.bookings) &&
                conflict.bookings.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium">Bookings</p>
                    {conflict.bookings.map((booking) => (
                      <div
                        key={`booking-${booking.id}`}
                        className="rounded-xl bg-background/60 px-3 py-2 text-sm"
                      >
                        <p className="font-medium">
                          {booking.bookingCode || `Booking #${booking.id}`}
                        </p>
                        <p className="text-muted-foreground">
                          {formatConflictPeriods(booking.periods)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {Array.isArray(conflict.events) &&
                conflict.events.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium">Events</p>
                    {conflict.events.map((event) => (
                      <div
                        key={`event-${event.id}`}
                        className="rounded-xl bg-background/60 px-3 py-2 text-sm"
                      >
                        <p className="font-medium">
                          {event.title || `Event #${event.id}`}
                        </p>
                        <p className="text-muted-foreground">
                          {formatConflictPeriods(event.periods)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={blockSaving}
                onClick={() => setConflictState(EMPTY_CONFLICT_STATE)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={blockSaving}
                onClick={handleConflictOverrideSave}
              >
                Save block anyway
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
