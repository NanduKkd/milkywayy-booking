"use client";

import {
  Ban,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  MapPinned,
  Pencil,
  Plus,
  RefreshCcw,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AdminBadge,
  AdminCard,
  AdminCardContent,
  AdminCardHeader,
  AdminCardTitle,
  AdminEmptyState,
  AdminFilterChip,
  AdminFilterRow,
  AdminInlineMessage,
  AdminPage,
  AdminPageHeader,
  AdminTablePanel,
} from "@/components/admin/AdminPrimitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  PRICING_CONFIG,
  PROPERTY_TYPE_ORDER,
  SERVICE_ORDER,
  VIDEOGRAPHY_SUB_CATEGORIES,
  VIDEOGRAPHY_SUB_SERVICES,
} from "@/lib/config/pricing";
import { cn } from "@/lib/utils";

const DUBAI_TIMEZONE = "Asia/Dubai";
const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const PERIOD_ORDER = ["morning", "afternoon", "evening"];
const UPCOMING_FILTERS = [
  { value: "all", label: "All" },
  { value: "bookings", label: "Bookings" },
  { value: "events", label: "Events" },
];
const PREPARATION_START_TIME_OPTIONS = [
  { value: "09:00", label: "Morning · 09:00" },
  { value: "13:00", label: "Afternoon · 13:00" },
  { value: "17:00", label: "Evening · 17:00" },
];
const EVENT_TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hours = String(Math.floor(index / 2)).padStart(2, "0");
  const minutes = index % 2 === 0 ? "00" : "30";

  return `${hours}:${minutes}`;
});
const VIDEOGRAPHY_PREPARATION_OPTIONS = [
  VIDEOGRAPHY_SUB_SERVICES.SHORT_FORM,
  `${VIDEOGRAPHY_SUB_SERVICES.LONG_FORM}.${VIDEOGRAPHY_SUB_CATEGORIES.LONG_FORM.DAYLIGHT}`,
  `${VIDEOGRAPHY_SUB_SERVICES.LONG_FORM}.${VIDEOGRAPHY_SUB_CATEGORIES.LONG_FORM.NIGHT_LIGHT}`,
  `${VIDEOGRAPHY_SUB_SERVICES.LONG_FORM}.${VIDEOGRAPHY_SUB_CATEGORIES.LONG_FORM.DAYLIGHT_NIGHT}`,
];
const BOOKING_PROPERTY_TYPES = PROPERTY_TYPE_ORDER.filter(
  (propertyType) => PRICING_CONFIG[propertyType],
);
const BOOKING_SERVICE_OPTIONS = SERVICE_ORDER.filter(Boolean);
const ADMIN_OUTLINE_BUTTON_CLASS =
  "border-[hsl(var(--admin-border)/0.88)] bg-transparent text-[hsl(var(--admin-foreground))] hover:bg-white/[0.05] hover:text-[hsl(var(--admin-foreground))]";
const CALENDAR_PANEL_CLASS = "admin-panel rounded-xl";
const CALENDAR_SUBPANEL_CLASS =
  "admin-panel-subtle rounded-xl border border-[hsl(var(--admin-border)/0.76)] p-4";

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

function buildDayAriaLabel(day, counts, _eventsForDay) {
  const parts = [formatDateLabel(day.date)];
  const blockedTimeRanges = Array.isArray(day.block?.blockedTimeRanges)
    ? day.block.blockedTimeRanges
    : [];

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
  if (blockedTimeRanges.length > 0) {
    parts.push("legacy exact block active");
  }
  if (counts.bookings > 0) {
    parts.push(`${counts.bookings} booking${counts.bookings === 1 ? "" : "s"}`);
  }
  if (counts.activeEvents > 0) {
    parts.push(
      `${counts.activeEvents} active event${counts.activeEvents === 1 ? "" : "s"}`,
    );
  }
  return parts.join(". ");
}

function buildSelectedDaySummary(day) {
  if (!day) return [];

  const badges = [];
  const blockedTimeRanges = Array.isArray(day.block?.blockedTimeRanges)
    ? day.block.blockedTimeRanges
    : [];

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
  }

  if (blockedTimeRanges.length > 0) {
    badges.push({
      label: "Legacy exact block active",
      variant: "outline",
    });
  }

  if (
    !day.block.fullDayBlocked &&
    day.block.blockedPeriods.length === 0 &&
    blockedTimeRanges.length === 0
  ) {
    badges.push({ label: "No active blocks", variant: "outline" });
  }

  return badges;
}

function getCalendarMarkerClass(item) {
  const status = String(item?.status || "").toUpperCase();

  if (status.includes("CANCEL")) return "bg-red-500";
  if (status.includes("COMPLETE") || status.includes("DELIVER")) {
    return "bg-emerald-500";
  }
  if (
    status.includes("DRAFT") ||
    status.includes("PENDING") ||
    status.includes("PAYMENT")
  ) {
    return "bg-amber-500";
  }
  return item?.kind === "event" ? "bg-violet-500" : "bg-blue-500";
}

function getBookingOccupiedPeriods(booking) {
  const blockedPeriods = booking?.slot?.blockedPeriods;

  if (Array.isArray(blockedPeriods) && blockedPeriods.length > 0) {
    return blockedPeriods;
  }

  return booking?.slot?.startPeriod ? [booking.slot.startPeriod] : [];
}

function getCalendarSlotTrack({ bookings, day, events, period }) {
  if (
    day?.block?.fullDayBlocked ||
    day?.block?.blockedPeriods?.includes(period)
  ) {
    return {
      className: "bg-orange-500",
      kind: "block",
      status: "blocked",
    };
  }

  const booking = bookings.find(
    (item) =>
      String(item?.status || "").toUpperCase() !== "CANCELLED" &&
      getBookingOccupiedPeriods(item).includes(period),
  );

  if (booking) {
    return {
      className: getCalendarMarkerClass({ ...booking, kind: "booking" }),
      kind: "booking",
      status: booking.status || "booked",
    };
  }

  const event = events.find(
    (item) =>
      item?.status !== "CANCELLED" &&
      (item?.isAllDay || item?.period === period),
  );

  if (event) {
    return {
      className: getCalendarMarkerClass({ ...event, kind: "event" }),
      kind: "event",
      status: event.status || "active",
    };
  }

  return null;
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

  if (entry.event.isAllDay) {
    return "00:00";
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

  if (entry.event.isAllDay) {
    return "All day";
  }

  const periodLabel = entry.event.period
    ? labelizePeriod(entry.event.period)
    : "";
  const parts = [];

  if (periodLabel) {
    parts.push(periodLabel);
  }

  if (entry.event.startTime) {
    parts.push(entry.event.startTime);
  }

  if (entry.event.endTime) {
    parts.push(`to ${entry.event.endTime}`);
  }

  return parts.join(" • ").replace(" • to ", " to ");
}

function isPastDateKey(dateKey, todayDateKey) {
  return Boolean(dateKey && todayDateKey && dateKey < todayDateKey);
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
  reasonCode: "",
};
const EMPTY_EVENT_DIALOG_STATE = {
  open: false,
  mode: "create",
  eventId: null,
};
const EMPTY_PREPARATION_CUSTOMER = {
  accountType: "INDIVIDUAL",
  fullName: "",
  companyName: "",
  phone: "+971",
  billingAddress: "",
  email: "",
  trn: "",
};
const EMPTY_PREPARATION_PREVIEW = null;
const EMPTY_HANDOFF_LINK_STATE = {
  transactionId: null,
  url: "",
  expiresAt: "",
  whatsAppSent: false,
};

function createPreparedPropertyLocalId() {
  return (
    globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)
  );
}

function buildEventFormState(dateKey, event = null) {
  return {
    title: event?.title || "",
    description: event?.description || "",
    date: event?.date || dateKey || "",
    allDay: Boolean(event?.isAllDay),
    startTime: event?.startTime || "",
    endTime: event?.endTime || "",
    propertyLabel: event?.propertySummary?.label || "",
    contactLabel: event?.contactSummary?.label || "",
  };
}

function createEmptyPreparedProperty(dateKey = "") {
  return {
    localId: createPreparedPropertyLocalId(),
    propertyType: "",
    propertySize: "",
    services: [],
    videographySubService: "",
    preferredDate: dateKey || "",
    startTime: "09:00",
    building: "",
    community: "",
    unitNumber: "",
  };
}

function getPreparedPropertySizeOptions(propertyType) {
  return PRICING_CONFIG[propertyType]?.sizes?.map((size) => size.label) || [];
}

function formatVideographyPreparationLabel(value) {
  return String(value || "").replace(".", " - ");
}

function formatPreparationCustomerLabel(customer) {
  if (!customer) return "No customer selected";
  return (
    customer.displayName ||
    customer.companyName ||
    customer.fullName ||
    customer.email ||
    customer.phone ||
    "Unnamed customer"
  );
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
  const [loadError, setLoadError] = useState(null);
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
  const [bookingPreparationOpen, setBookingPreparationOpen] = useState(false);
  const [bookingPreparationMode, setBookingPreparationMode] =
    useState("existing");
  const [bookingPreparationCustomer, setBookingPreparationCustomer] = useState(
    EMPTY_PREPARATION_CUSTOMER,
  );
  const [bookingPreparationProperties, setBookingPreparationProperties] =
    useState(() => [createEmptyPreparedProperty(todayDateKey)]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [customerSearchResults, setCustomerSearchResults] = useState([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [selectedExistingCustomer, setSelectedExistingCustomer] =
    useState(null);
  const [bookingPreparationPreview, setBookingPreparationPreview] = useState(
    EMPTY_PREPARATION_PREVIEW,
  );
  const [bookingHandoffSaving, setBookingHandoffSaving] = useState(false);
  const [bookingHandoffSending, setBookingHandoffSending] = useState(false);
  const [bookingHandoffState, setBookingHandoffState] = useState(
    EMPTY_HANDOFF_LINK_STATE,
  );
  const hasLoadedOnceRef = useRef(false);
  const loadTrigger = `${monthKey}:${reloadVersion}`;

  useEffect(() => {
    if (!bookingPreparationOpen) {
      return;
    }

    setBookingPreparationProperties((current) =>
      current.map((property, index) =>
        index === 0 && !property.preferredDate
          ? { ...property, preferredDate: selectedDateKey || todayDateKey }
          : property,
      ),
    );
  }, [bookingPreparationOpen, selectedDateKey, todayDateKey]);

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
      setLoadError(null);

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
        setLoadError(null);
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
          setLoadError(error.message || "Failed to load scheduling calendar");
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
  const selectedBlockedTimeRanges = selectedDay?.block?.blockedTimeRanges || [];
  const conflictRequiresBookingResolution =
    conflictState.reasonCode === "schedule_conflict_existing_bookings";
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
  const calendarStatusTone = loadError
    ? "danger"
    : loading
      ? "info"
      : refreshing
        ? "warning"
        : "neutral";
  const calendarStatusLabel = loadError
    ? "Sync failed"
    : loading
      ? "Loading live range"
      : refreshing
        ? "Refreshing"
        : `${days.length} visible days`;

  const handleRefreshCalendar = () => {
    setReloadVersion((current) => current + 1);
  };

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
        reasonCode: String(payload?.reasonCode || ""),
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
    setEventForm((current) => {
      const nextForm = {
        ...current,
        [field]: value,
      };

      if (field === "allDay" && value) {
        nextForm.startTime = "";
        nextForm.endTime = "";
      }

      return nextForm;
    });
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
        allDay: eventForm.allDay,
        startTime: eventForm.allDay ? null : eventForm.startTime || null,
        endTime: eventForm.allDay ? null : eventForm.endTime || null,
        propertySummary: eventForm.propertyLabel.trim()
          ? { label: eventForm.propertyLabel.trim() }
          : null,
        contactSummary: eventForm.contactLabel.trim()
          ? { label: eventForm.contactLabel.trim() }
          : null,
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

  const resetBookingPreparationDialog = () => {
    setBookingPreparationOpen(false);
    setBookingPreparationMode("existing");
    setBookingPreparationCustomer(EMPTY_PREPARATION_CUSTOMER);
    setBookingPreparationProperties([
      createEmptyPreparedProperty(selectedDateKey || todayDateKey),
    ]);
    setCustomerSearchQuery("");
    setCustomerSearchResults([]);
    setSelectedExistingCustomer(null);
    setBookingPreparationPreview(EMPTY_PREPARATION_PREVIEW);
    setBookingHandoffState(EMPTY_HANDOFF_LINK_STATE);
  };

  const openBookingPreparationDialog = () => {
    setBookingPreparationOpen(true);
    setBookingPreparationMode("existing");
    setBookingPreparationCustomer(EMPTY_PREPARATION_CUSTOMER);
    setBookingPreparationProperties([
      createEmptyPreparedProperty(selectedDateKey || todayDateKey),
    ]);
    setCustomerSearchQuery("");
    setCustomerSearchResults([]);
    setSelectedExistingCustomer(null);
    setBookingPreparationPreview(EMPTY_PREPARATION_PREVIEW);
    setBookingHandoffState(EMPTY_HANDOFF_LINK_STATE);
  };

  const updateBookingPreparationCustomer = (field, value) => {
    setBookingPreparationCustomer((current) => ({
      ...current,
      [field]: value,
    }));
    setBookingPreparationPreview(EMPTY_PREPARATION_PREVIEW);
    setBookingHandoffState(EMPTY_HANDOFF_LINK_STATE);
  };

  const updatePreparedProperty = (index, field, value) => {
    setBookingPreparationProperties((current) =>
      current.map((property, propertyIndex) => {
        if (propertyIndex !== index) {
          return property;
        }

        const nextProperty = {
          ...property,
          [field]: value,
        };

        if (field === "propertyType") {
          nextProperty.propertySize = "";
          nextProperty.services = [];
          nextProperty.videographySubService = "";
        }

        if (field === "services" && !value.includes("Videography")) {
          nextProperty.videographySubService = "";
        }

        return nextProperty;
      }),
    );
    setBookingPreparationPreview(EMPTY_PREPARATION_PREVIEW);
    setBookingHandoffState(EMPTY_HANDOFF_LINK_STATE);
  };

  const togglePreparedPropertyService = (index, service) => {
    const property = bookingPreparationProperties[index];
    const currentServices = Array.isArray(property?.services)
      ? property.services
      : [];
    const nextServices = currentServices.includes(service)
      ? currentServices.filter((currentService) => currentService !== service)
      : [...currentServices, service];

    updatePreparedProperty(index, "services", nextServices);
  };

  const addPreparedProperty = () => {
    setBookingPreparationProperties((current) => [
      ...current,
      createEmptyPreparedProperty(selectedDateKey || todayDateKey),
    ]);
    setBookingPreparationPreview(EMPTY_PREPARATION_PREVIEW);
    setBookingHandoffState(EMPTY_HANDOFF_LINK_STATE);
  };

  const removePreparedProperty = (index) => {
    setBookingPreparationProperties((current) => {
      if (current.length === 1) {
        return current;
      }

      return current.filter((_, propertyIndex) => propertyIndex !== index);
    });
    setBookingPreparationPreview(EMPTY_PREPARATION_PREVIEW);
    setBookingHandoffState(EMPTY_HANDOFF_LINK_STATE);
  };

  const searchExistingCustomers = async () => {
    if (customerSearchQuery.trim().length < 2) {
      toast.error("Enter at least two characters to search customers");
      return;
    }

    setCustomerSearchLoading(true);

    try {
      const response = await fetch(
        `/api/admin/scheduling-calendar/customers?query=${encodeURIComponent(customerSearchQuery.trim())}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        },
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to search customers");
      }

      setCustomerSearchResults(
        Array.isArray(payload?.customers) ? payload.customers : [],
      );
    } catch (error) {
      toast.error(error.message || "Failed to search customers");
    } finally {
      setCustomerSearchLoading(false);
    }
  };

  const createBookingHandoff = async (submitEvent) => {
    submitEvent?.preventDefault?.();
    setBookingHandoffSaving(true);

    try {
      const requestPayload =
        bookingPreparationMode === "existing"
          ? {
              customerMode: "existing",
              customerId: selectedExistingCustomer?.id,
              properties: bookingPreparationProperties,
            }
          : {
              customerMode: "new",
              customer: bookingPreparationCustomer,
              properties: bookingPreparationProperties,
            };
      const response = await fetch(
        "/api/admin/scheduling-calendar/booking-handoffs",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: requestPayload,
            transactionId: bookingHandoffState.transactionId || null,
            sendWhatsApp: false,
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to create booking handoff");
      }

      setBookingPreparationPreview({
        customer: payload.customer,
        properties: payload.propertyPreviews || payload.properties || [],
        totalAmount: payload.totalAmount,
      });
      setBookingHandoffState({
        transactionId: payload.transactionId || null,
        url: payload.url || "",
        expiresAt: payload.expiresAt || "",
        whatsAppSent: false,
      });
      const actionLabel = bookingHandoffState.transactionId
        ? "Booking handoff regenerated"
        : "Booking handoff created";

      toast.success(actionLabel);
    } catch (error) {
      toast.error(error.message || "Failed to create booking handoff");
    } finally {
      setBookingHandoffSaving(false);
    }
  };

  const sendBookingHandoffWhatsApp = async () => {
    if (
      !bookingHandoffState.transactionId ||
      bookingHandoffState.whatsAppSent
    ) {
      return;
    }

    setBookingHandoffSending(true);
    try {
      const response = await fetch(
        "/api/admin/scheduling-calendar/booking-handoffs",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "send_whatsapp",
            transactionId: bookingHandoffState.transactionId,
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.notification?.sent) {
        throw new Error(
          payload?.notification?.error ||
            payload?.error ||
            "Failed to send customer link via WhatsApp",
        );
      }

      setBookingHandoffState((current) => ({
        ...current,
        whatsAppSent: true,
      }));
      toast.success("Customer link sent via WhatsApp");
    } catch (error) {
      toast.error(error.message || "Failed to send customer link via WhatsApp");
    } finally {
      setBookingHandoffSending(false);
    }
  };

  const copyBookingHandoffLink = async () => {
    if (!bookingHandoffState.url) {
      toast.error("No booking handoff link available yet");
      return;
    }

    try {
      await navigator.clipboard.writeText(bookingHandoffState.url);
      toast.success("Booking handoff link copied");
    } catch {
      toast.error("Failed to copy booking handoff link");
    }
  };

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Scheduling"
        title="Scheduling Calendar"
        actions={
          <div className="flex items-center gap-2">
            <AdminBadge tone={calendarStatusTone}>
              {calendarStatusLabel}
            </AdminBadge>
            <Button
              type="button"
              variant="outline"
              onClick={handleRefreshCalendar}
              disabled={loading || refreshing}
              className={ADMIN_OUTLINE_BUTTON_CLASS}
            >
              <RefreshCcw
                className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")}
              />
              Refresh
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">
        <AdminCard className={CALENDAR_PANEL_CLASS}>
          <AdminCardHeader className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <AdminCardTitle className="text-base">
                  {monthLabel}
                </AdminCardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className={ADMIN_OUTLINE_BUTTON_CLASS}
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
                  className={ADMIN_OUTLINE_BUTTON_CLASS}
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
                  className={ADMIN_OUTLINE_BUTTON_CLASS}
                  aria-label="Next month"
                  onClick={() =>
                    setMonthKey((current) => shiftMonthKey(current, 1))
                  }
                >
                  <ChevronRight />
                </Button>
              </div>
            </div>

            <fieldset className="flex flex-wrap gap-4">
              <legend className="sr-only">Calendar legend</legend>
              {[
                ["Booked", "bg-blue-500"],
                ["Completed", "bg-emerald-500"],
                ["Awaiting", "bg-amber-500"],
                ["Event", "bg-violet-500"],
                ["Blocked", "bg-orange-500"],
              ].map(([label, color]) => (
                <span
                  key={label}
                  className="flex items-center gap-1.5 text-[10px] text-zinc-500"
                >
                  <span className={cn("h-2 w-2 rounded-full", color)} />
                  {label}
                </span>
              ))}
            </fieldset>
          </AdminCardHeader>

          <AdminCardContent className="space-y-3">
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-zinc-600">
              {DAY_HEADERS.map((label) => (
                <div key={label}>{label}</div>
              ))}
            </div>

            {loadError ? (
              <AdminInlineMessage
                tone="danger"
                title="Calendar could not be loaded"
                description={loadError}
              />
            ) : loading ? (
              <AdminInlineMessage
                loading
                title="Loading scheduling calendar"
                description="Fetching the current month range, bookings, events, and Time Slots blocks."
              />
            ) : days.length === 0 ? (
              <AdminEmptyState
                title="No calendar days are available"
                description="Refresh the current month range or load a different month to continue reviewing the schedule."
              />
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((date) => {
                  const dateKey = toDateKey(date);
                  const day = dayMap.get(dateKey);
                  const counts = day?.counts || {
                    bookings: 0,
                    events: 0,
                    activeEvents: 0,
                  };
                  const eventsForDay = eventsByDate.get(dateKey) || [];
                  const bookingsForDay = bookingsByDate.get(dateKey) || [];
                  const slotTracks = PERIOD_ORDER.map((period) => ({
                    period,
                    marker: getCalendarSlotTrack({
                      bookings: bookingsForDay,
                      day,
                      events: eventsForDay,
                      period,
                    }),
                  }));
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
                        "relative h-[68px] rounded-lg border p-1.5 text-left transition-colors sm:h-[76px]",
                        isCurrentMonth
                          ? "border-zinc-800 bg-zinc-950/50 hover:border-zinc-700 hover:bg-zinc-800/50"
                          : "border-zinc-900 bg-zinc-950/20 text-zinc-700 opacity-50",
                        isSelected &&
                          "border-zinc-600 bg-zinc-800 ring-1 ring-zinc-600",
                        isToday && "ring-1 ring-emerald-500",
                        day?.block?.fullDayBlocked &&
                          "border-red-800 bg-red-950/80",
                        hasPartialBlock && "border-amber-800 bg-amber-950/20",
                      )}
                      onClick={() => setSelectedDateKey(dateKey)}
                    >
                      <div
                        className={cn(
                          "mx-auto flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold",
                          isToday
                            ? "bg-emerald-500 text-white"
                            : isSelected
                              ? "text-white"
                              : "text-zinc-400",
                        )}
                      >
                        {date.getUTCDate()}
                      </div>
                      <div
                        className="mt-1.5 space-y-1 px-0.5"
                        aria-hidden="true"
                      >
                        {slotTracks.map(({ marker, period }) => (
                          <span
                            key={period}
                            data-calendar-marker={marker?.kind}
                            data-calendar-slot-track={period}
                            data-calendar-status={marker?.status}
                            className={cn(
                              "block h-1 rounded-full bg-transparent",
                              marker?.className,
                            )}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </AdminCardContent>
        </AdminCard>

        <div className="contents">
          <AdminCard className={CALENDAR_PANEL_CLASS}>
            <AdminCardHeader className="space-y-2">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <AdminCardTitle className="text-sm">
                    {selectedDateKey
                      ? formatDateLabel(selectedDateKey)
                      : "Select a date"}
                  </AdminCardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className={ADMIN_OUTLINE_BUTTON_CLASS}
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
                    className={ADMIN_OUTLINE_BUTTON_CLASS}
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
                    className={ADMIN_OUTLINE_BUTTON_CLASS}
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
            </AdminCardHeader>

            <AdminCardContent className="flex flex-col gap-4">
              <div className={cn(CALENDAR_SUBPANEL_CLASS, "order-3")}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Block status
                    </p>
                    <p className="mt-1 text-sm">
                      {selectedDay?.block?.fullDayBlocked
                        ? "Full day blocked"
                        : [
                            formatBlockedPeriods(
                              selectedDay?.block?.blockedPeriods || [],
                            ),
                            selectedDay?.block?.blockedTimeRanges?.length > 0
                              ? "Legacy exact block active"
                              : "",
                          ]
                            .filter(
                              (value) =>
                                value && value !== "No blocked periods",
                            )
                            .join(" • ") || "No active blocks"}
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

              <div className={cn(CALENDAR_SUBPANEL_CLASS, "order-4")}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold">Slot blocking</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={
                        blockSaving ||
                        (!selectedDay?.block?.fullDayBlocked &&
                          selectedBlockedPeriods.length === 0 &&
                          selectedBlockedTimeRanges.length === 0)
                      }
                      onClick={() =>
                        handleBlockMutation("clear day blocks", (existing) => ({
                          ...existing,
                          fullDayBlocked: false,
                          blocks: {},
                          timeBlocks: [],
                        }))
                      }
                    >
                      Clear blocks
                    </Button>
                  </div>
                </div>

                <div className="mt-3 divide-y divide-white/8 border-y border-white/8">
                  {PERIOD_ORDER.map((period) => {
                    const isBlocked = selectedBlockedPeriods.includes(period);
                    const definition = selectedBlockDefinitions?.[period] || {};

                    return (
                      <div
                        key={period}
                        data-slot-block-row={period}
                        className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 py-2 sm:grid-cols-[minmax(7rem,1fr)_minmax(7rem,1fr)_auto_auto] sm:gap-3"
                      >
                        <div className="min-w-0">
                          <p className="font-medium">
                            {labelizePeriod(period)}
                          </p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground sm:hidden">
                            {definition.startTime || "--:--"} -{" "}
                            {definition.endTime || "--:--"}
                          </p>
                        </div>
                        <p className="hidden text-xs text-muted-foreground sm:block">
                          {definition.startTime || "--:--"} -{" "}
                          {definition.endTime || "--:--"}
                        </p>
                        <Badge
                          variant={isBlocked ? "destructive" : "outline"}
                          className="shrink-0 whitespace-nowrap rounded-full"
                        >
                          {isBlocked ? "Blocked" : "Open"}
                        </Badge>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          aria-label={
                            isBlocked
                              ? `Open ${labelizePeriod(period)}`
                              : `Block ${labelizePeriod(period)}`
                          }
                          className="h-8 min-w-16"
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
                          {isBlocked ? "Open" : "Block"}
                        </Button>
                      </div>
                    );
                  })}
                </div>

                {selectedDay?.block?.fullDayBlocked ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    A legacy full-day block is active. Clear it before editing
                    individual slots.
                  </p>
                ) : null}
              </div>

              <div className="order-1 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold">Bookings</h2>
                    <Badge variant="secondary" className="rounded-full">
                      {selectedBookings.length}
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={openBookingPreparationDialog}
                  >
                    Prepare booking
                  </Button>
                </div>
                {selectedBookings.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-white/10 px-4 py-6 text-sm text-muted-foreground">
                    No bookings scheduled for this date.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="rounded-lg border border-white/10 bg-background/40 p-4"
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

              <div className="order-2 space-y-3">
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
                    disabled={
                      !selectedDateKey ||
                      isPastDateKey(selectedDateKey, todayDateKey)
                    }
                    onClick={openCreateEventDialog}
                  >
                    Create event
                  </Button>
                </div>
                {selectedEvents.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-white/10 px-4 py-6 text-sm text-muted-foreground">
                    No calendar-only events scheduled for this date.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedEvents.map((event) => (
                      <div
                        key={event.id}
                        className="rounded-lg border border-white/10 bg-background/40 p-4"
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
                                isPastDateKey(event.date, todayDateKey) ||
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
                                  isPastDateKey(event.date, todayDateKey) ||
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
                                  isPastDateKey(event.date, todayDateKey) ||
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
                            <Badge variant="outline">
                              {event.isAllDay ? "All day" : "Informational"}
                            </Badge>
                            {isPastDateKey(event.date, todayDateKey) ? (
                              <Badge variant="outline">
                                Read-only past event
                              </Badge>
                            ) : null}
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
                              {event.isAllDay
                                ? "All day"
                                : event.period
                                  ? labelizePeriod(event.period)
                                  : "Timed"}
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
                              Event cancelled
                            </p>
                            <p className="mt-1 text-muted-foreground">
                              {event.cancellationReason ||
                                "This informational event is cancelled."}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </AdminCardContent>
          </AdminCard>

          <AdminTablePanel
            title="Upcoming schedule"
            description={`Entries from ${formatDateLabel(selectedDateKey, {
              month: "short",
              day: "numeric",
            })} through ${formatDateLabel(calendarData?.range?.endDate, {
              month: "short",
              day: "numeric",
            })}.`}
            className="rounded-xl xl:col-span-2"
            actions={
              <AdminFilterRow>
                {UPCOMING_FILTERS.map((filter) => {
                  const filterCount = upcomingCounts[filter.value] || 0;

                  return (
                    <AdminFilterChip
                      key={filter.value}
                      active={upcomingFilter === filter.value}
                      onClick={() => setUpcomingFilter(filter.value)}
                      aria-label={`${filter.label} (${filterCount})`}
                      aria-pressed={upcomingFilter === filter.value}
                    >
                      <span>{filter.label}</span>
                      <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[0.72rem] text-[hsl(var(--admin-foreground))]">
                        {filterCount}
                      </span>
                    </AdminFilterChip>
                  );
                })}
              </AdminFilterRow>
            }
          >
            <Table aria-label="Upcoming schedule" className="min-w-[760px]">
              <TableHeader className="bg-white/[0.03] [&_tr]:border-white/8">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[0.72rem] uppercase tracking-[0.18em] text-[hsl(var(--admin-muted))]">
                    Date
                  </TableHead>
                  <TableHead className="text-[0.72rem] uppercase tracking-[0.18em] text-[hsl(var(--admin-muted))]">
                    Entry
                  </TableHead>
                  <TableHead className="text-[0.72rem] uppercase tracking-[0.18em] text-[hsl(var(--admin-muted))]">
                    Schedule
                  </TableHead>
                  <TableHead className="text-[0.72rem] uppercase tracking-[0.18em] text-[hsl(var(--admin-muted))]">
                    Status
                  </TableHead>
                  <TableHead className="text-right text-[0.72rem] uppercase tracking-[0.18em] text-[hsl(var(--admin-muted))]">
                    View
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="[&_tr:last-child]:border-white/8">
                {loadError ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6">
                      <AdminInlineMessage
                        tone="danger"
                        title="Upcoming schedule is unavailable"
                        description={loadError}
                      />
                    </TableCell>
                  </TableRow>
                ) : loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6">
                      <AdminInlineMessage
                        loading
                        title="Loading upcoming entries"
                        description="Preparing the bounded bookings and events list for the selected calendar range."
                      />
                    </TableCell>
                  </TableRow>
                ) : filteredUpcomingEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6">
                      <AdminEmptyState
                        title="No upcoming entries in this range"
                        description="Change the row filter or select a different date to inspect another part of the loaded calendar."
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUpcomingEntries.map((entry) => {
                    const isSelected = entry.date === selectedDateKey;

                    return (
                      <TableRow
                        key={entry.id}
                        className={cn(
                          "cursor-pointer border-white/8 text-[hsl(var(--admin-foreground))] hover:bg-white/[0.03]",
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
                              <p className="font-medium">{entry.event.title}</p>
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
                                {entry.event.isAllDay
                                  ? "All day"
                                  : "Informational"}
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
          </AdminTablePanel>
        </div>
      </div>

      <Dialog
        open={bookingPreparationOpen}
        onOpenChange={(open) => {
          if (!open && !bookingHandoffSaving && !bookingHandoffSending) {
            resetBookingPreparationDialog();
          }
        }}
      >
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b border-white/10 px-6 py-5">
            <DialogTitle>Prepare admin booking</DialogTitle>
            <DialogDescription className="sr-only">
              Collect the customer and property details, then validate pricing
              and availability, then create a secure payment handoff link.
            </DialogDescription>
          </DialogHeader>

          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={createBookingHandoff}
          >
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
              <div
                className={cn(
                  "rounded-lg border border-white/10 p-4",
                  bookingHandoffState.url && "hidden",
                )}
              >
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={
                      bookingPreparationMode === "existing"
                        ? "secondary"
                        : "outline"
                    }
                    onClick={() => {
                      setBookingPreparationMode("existing");
                      setBookingPreparationPreview(EMPTY_PREPARATION_PREVIEW);
                      setBookingHandoffState(EMPTY_HANDOFF_LINK_STATE);
                    }}
                  >
                    Existing customer
                  </Button>
                  <Button
                    type="button"
                    variant={
                      bookingPreparationMode === "new" ? "secondary" : "outline"
                    }
                    onClick={() => {
                      setBookingPreparationMode("new");
                      setBookingPreparationPreview(EMPTY_PREPARATION_PREVIEW);
                      setBookingHandoffState(EMPTY_HANDOFF_LINK_STATE);
                    }}
                  >
                    New customer
                  </Button>
                </div>

                {bookingPreparationMode === "existing" ? (
                  <div className="mt-4 space-y-4">
                    {!selectedExistingCustomer ? (
                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                        <div className="space-y-2">
                          <Label htmlFor="booking-preparation-search">
                            Search customer
                          </Label>
                          <Input
                            id="booking-preparation-search"
                            value={customerSearchQuery}
                            placeholder="Name, company, email, phone, or customer ID"
                            onChange={(event) =>
                              setCustomerSearchQuery(event.target.value)
                            }
                          />
                        </div>
                        <Button
                          type="button"
                          className="self-end"
                          disabled={customerSearchLoading}
                          onClick={searchExistingCustomers}
                        >
                          {customerSearchLoading ? "Searching..." : "Search"}
                        </Button>
                      </div>
                    ) : null}

                    {!selectedExistingCustomer &&
                    customerSearchResults.length > 0 ? (
                      <div className="space-y-2">
                        {customerSearchResults.map((customer) => {
                          const isSelected =
                            selectedExistingCustomer?.id === customer.id;

                          return (
                            <button
                              key={customer.id}
                              type="button"
                              className={cn(
                                "w-full rounded-lg border p-3 text-left transition-colors",
                                isSelected
                                  ? "border-white/30 bg-background/70"
                                  : "border-white/10 bg-background/40 hover:bg-background/60",
                              )}
                              onClick={() => {
                                setSelectedExistingCustomer(customer);
                                setBookingPreparationPreview(
                                  EMPTY_PREPARATION_PREVIEW,
                                );
                                setBookingHandoffState(
                                  EMPTY_HANDOFF_LINK_STATE,
                                );
                              }}
                            >
                              <p className="font-medium">
                                {formatPreparationCustomerLabel(customer)}
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {[customer.email, customer.phone]
                                  .filter(Boolean)
                                  .join(" • ") || "No contact details"}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}

                    {selectedExistingCustomer ? (
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/15 bg-background/60 px-4 py-3">
                        <div>
                          <p className="font-medium">
                            {formatPreparationCustomerLabel(
                              selectedExistingCustomer,
                            )}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {[
                              selectedExistingCustomer.email,
                              selectedExistingCustomer.phone,
                            ]
                              .filter(Boolean)
                              .join(" • ")}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setSelectedExistingCustomer(null);
                            setCustomerSearchResults([]);
                          }}
                        >
                          Change customer
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="booking-preparation-account-type">
                        Account type
                      </Label>
                      <select
                        id="booking-preparation-account-type"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={bookingPreparationCustomer.accountType}
                        onChange={(event) =>
                          updateBookingPreparationCustomer(
                            "accountType",
                            event.target.value,
                          )
                        }
                      >
                        <option value="INDIVIDUAL">Individual</option>
                        <option value="COMPANY">Company</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="booking-preparation-phone">Phone</Label>
                      <Input
                        id="booking-preparation-phone"
                        value={bookingPreparationCustomer.phone}
                        onChange={(event) =>
                          updateBookingPreparationCustomer(
                            "phone",
                            event.target.value,
                          )
                        }
                      />
                    </div>
                    {bookingPreparationCustomer.accountType === "COMPANY" ? (
                      <div className="space-y-2">
                        <Label htmlFor="booking-preparation-company">
                          Company name
                        </Label>
                        <Input
                          id="booking-preparation-company"
                          value={bookingPreparationCustomer.companyName}
                          onChange={(event) =>
                            updateBookingPreparationCustomer(
                              "companyName",
                              event.target.value,
                            )
                          }
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="booking-preparation-full-name">
                          Full name
                        </Label>
                        <Input
                          id="booking-preparation-full-name"
                          value={bookingPreparationCustomer.fullName}
                          onChange={(event) =>
                            updateBookingPreparationCustomer(
                              "fullName",
                              event.target.value,
                            )
                          }
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="booking-preparation-email">Email</Label>
                      <Input
                        id="booking-preparation-email"
                        type="email"
                        value={bookingPreparationCustomer.email}
                        onChange={(event) =>
                          updateBookingPreparationCustomer(
                            "email",
                            event.target.value,
                          )
                        }
                      />
                    </div>
                    {bookingPreparationCustomer.accountType === "COMPANY" ? (
                      <>
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="booking-preparation-billing-address">
                            Billing address
                          </Label>
                          <Input
                            id="booking-preparation-billing-address"
                            value={bookingPreparationCustomer.billingAddress}
                            onChange={(event) =>
                              updateBookingPreparationCustomer(
                                "billingAddress",
                                event.target.value,
                              )
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="booking-preparation-trn">TRN</Label>
                          <Input
                            id="booking-preparation-trn"
                            value={bookingPreparationCustomer.trn}
                            onChange={(event) =>
                              updateBookingPreparationCustomer(
                                "trn",
                                event.target.value,
                              )
                            }
                          />
                        </div>
                      </>
                    ) : null}
                  </div>
                )}
              </div>

              <div
                className={cn("space-y-4", bookingHandoffState.url && "hidden")}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">
                      Prepared properties
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Use the same pricing and availability rules as the
                      customer checkout flow.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addPreparedProperty}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add property
                  </Button>
                </div>

                <div className="space-y-4">
                  {bookingPreparationProperties.map((property, index) => (
                    <div
                      key={property.localId}
                      className="rounded-lg border border-white/10 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">Property {index + 1}</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={bookingPreparationProperties.length === 1}
                          onClick={() => removePreparedProperty(index)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove
                        </Button>
                      </div>

                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`prepared-property-type-${index}`}>
                            Property type
                          </Label>
                          <select
                            id={`prepared-property-type-${index}`}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={property.propertyType}
                            onChange={(event) =>
                              updatePreparedProperty(
                                index,
                                "propertyType",
                                event.target.value,
                              )
                            }
                          >
                            <option value="">Select property type</option>
                            {BOOKING_PROPERTY_TYPES.map((propertyType) => (
                              <option key={propertyType} value={propertyType}>
                                {propertyType}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`prepared-property-size-${index}`}>
                            Property size
                          </Label>
                          <select
                            id={`prepared-property-size-${index}`}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={property.propertySize}
                            onChange={(event) =>
                              updatePreparedProperty(
                                index,
                                "propertySize",
                                event.target.value,
                              )
                            }
                          >
                            <option value="">Select property size</option>
                            {getPreparedPropertySizeOptions(
                              property.propertyType,
                            ).map((propertySize) => (
                              <option key={propertySize} value={propertySize}>
                                {propertySize}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        <Label>Services</Label>
                        <div className="grid gap-2 sm:grid-cols-3">
                          {BOOKING_SERVICE_OPTIONS.map((service) => (
                            <label
                              key={service}
                              className="flex items-center gap-2 rounded-xl border border-white/10 bg-background/40 px-3 py-2 text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={property.services.includes(service)}
                                onChange={() =>
                                  togglePreparedPropertyService(index, service)
                                }
                              />
                              <span>{service}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {property.services.includes("Videography") ? (
                        <div className="mt-4 space-y-2">
                          <Label htmlFor={`prepared-property-video-${index}`}>
                            Videography option
                          </Label>
                          <select
                            id={`prepared-property-video-${index}`}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={property.videographySubService}
                            onChange={(event) =>
                              updatePreparedProperty(
                                index,
                                "videographySubService",
                                event.target.value,
                              )
                            }
                          >
                            <option value="">Select videography option</option>
                            {VIDEOGRAPHY_PREPARATION_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {formatVideographyPreparationLabel(option)}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}

                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`prepared-property-date-${index}`}>
                            Preferred date
                          </Label>
                          <Input
                            id={`prepared-property-date-${index}`}
                            type="date"
                            value={property.preferredDate}
                            onChange={(event) =>
                              updatePreparedProperty(
                                index,
                                "preferredDate",
                                event.target.value,
                              )
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`prepared-property-time-${index}`}>
                            Start time
                          </Label>
                          <select
                            id={`prepared-property-time-${index}`}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={property.startTime}
                            onChange={(event) =>
                              updatePreparedProperty(
                                index,
                                "startTime",
                                event.target.value,
                              )
                            }
                          >
                            {PREPARATION_START_TIME_OPTIONS.map(
                              (timeOption) => (
                                <option
                                  key={timeOption.value}
                                  value={timeOption.value}
                                >
                                  {timeOption.label}
                                </option>
                              ),
                            )}
                          </select>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4 sm:grid-cols-3">
                        <div className="space-y-2">
                          <Label
                            htmlFor={`prepared-property-building-${index}`}
                          >
                            Building
                          </Label>
                          <Input
                            id={`prepared-property-building-${index}`}
                            value={property.building}
                            onChange={(event) =>
                              updatePreparedProperty(
                                index,
                                "building",
                                event.target.value,
                              )
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor={`prepared-property-community-${index}`}
                          >
                            Community
                          </Label>
                          <Input
                            id={`prepared-property-community-${index}`}
                            value={property.community}
                            onChange={(event) =>
                              updatePreparedProperty(
                                index,
                                "community",
                                event.target.value,
                              )
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`prepared-property-unit-${index}`}>
                            Unit number
                          </Label>
                          <Input
                            id={`prepared-property-unit-${index}`}
                            value={property.unitNumber}
                            onChange={(event) =>
                              updatePreparedProperty(
                                index,
                                "unitNumber",
                                event.target.value,
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {bookingPreparationPreview ? (
                <div className="rounded-lg border border-white/10 bg-background/40 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">
                        Prepared handoff summary
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatPreparationCustomerLabel(
                          bookingPreparationPreview.customer,
                        )}
                        {bookingPreparationPreview.customer?.phone
                          ? ` • ${bookingPreparationPreview.customer.phone}`
                          : ""}
                      </p>
                    </div>
                    <Badge variant="secondary" className="rounded-full">
                      AED {Number(bookingPreparationPreview.totalAmount || 0)}
                    </Badge>
                  </div>

                  <div className="mt-4 space-y-3">
                    {bookingPreparationPreview.properties.map(
                      (property, index) => (
                        <div
                          key={`${property.preferredDate}-${property.startTime}-${property.label}-${property.locationLabel || index}`}
                          className="rounded-xl border border-white/10 bg-background/60 p-3"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-medium">
                                {property.label || `Property ${index + 1}`}
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {property.locationLabel || "Location pending"}
                              </p>
                            </div>
                            <Badge variant="outline">
                              AED {Number(property.total || 0)}
                            </Badge>
                          </div>
                          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                            <p className="text-muted-foreground">
                              {property.serviceLabel}
                            </p>
                            <p className="text-muted-foreground">
                              {property.preferredDate} • {property.startTime}
                              {property.arrivalWindow
                                ? ` • Arrival ${property.arrivalWindow}`
                                : ""}
                            </p>
                          </div>
                        </div>
                      ),
                    )}
                  </div>

                  {bookingHandoffState.url ? (
                    <div className="mt-4 rounded-lg border border-white/10 bg-background/60 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">Secure handoff link</p>
                          <p className="mt-1 break-all text-sm text-muted-foreground">
                            {bookingHandoffState.url}
                          </p>
                          {bookingHandoffState.expiresAt ? (
                            <p className="mt-2 text-xs text-muted-foreground">
                              Expires{" "}
                              {new Date(
                                bookingHandoffState.expiresAt,
                              ).toLocaleString("en-GB")}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={copyBookingHandoffLink}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Copy link
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={bookingHandoffSaving}
                            onClick={createBookingHandoff}
                          >
                            {bookingHandoffSaving
                              ? "Regenerating..."
                              : "Regenerate link"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {bookingHandoffState.url ? (
                    <Button
                      className="mt-4 w-full"
                      type="button"
                      disabled={
                        bookingHandoffSending ||
                        bookingHandoffState.whatsAppSent
                      }
                      onClick={sendBookingHandoffWhatsApp}
                    >
                      {bookingHandoffState.whatsAppSent
                        ? "Link sent to customer via WhatsApp"
                        : bookingHandoffSending
                          ? "Sending via WhatsApp..."
                          : "Send customer link via WhatsApp"}
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>

            <DialogFooter className="shrink-0 border-t border-white/10 px-6 py-4">
              <Button
                type="button"
                variant="outline"
                disabled={bookingHandoffSaving || bookingHandoffSending}
                onClick={resetBookingPreparationDialog}
              >
                Close
              </Button>
              {!bookingHandoffState.url ? (
                <Button type="submit" disabled={bookingHandoffSaving}>
                  {bookingHandoffSaving ? "Creating..." : "Create secure link"}
                </Button>
              ) : null}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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

              <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-background/40 p-4 sm:col-span-2">
                <input
                  id="calendar-event-all-day"
                  type="checkbox"
                  checked={eventForm.allDay}
                  onChange={(event) =>
                    handleEventFormChange("allDay", event.target.checked)
                  }
                />
                <div className="space-y-1">
                  <Label htmlFor="calendar-event-all-day">All day</Label>
                  <p className="text-sm text-muted-foreground">
                    Use this for informational events that span the whole Dubai
                    business day.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="calendar-event-start-time">Start time</Label>
                <select
                  id="calendar-event-start-time"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={eventForm.allDay}
                  value={eventForm.startTime}
                  onChange={(event) =>
                    handleEventFormChange("startTime", event.target.value)
                  }
                >
                  <option value="">Select start time</option>
                  {EVENT_TIME_OPTIONS.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="calendar-event-end-time">End time</Label>
                <select
                  id="calendar-event-end-time"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={eventForm.allDay}
                  value={eventForm.endTime}
                  onChange={(event) =>
                    handleEventFormChange("endTime", event.target.value)
                  }
                >
                  <option value="">Select end time</option>
                  {EVENT_TIME_OPTIONS.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
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
              {conflictRequiresBookingResolution
                ? "This block overlaps an active booking. Resolve the booking in Bookings before retrying the block."
                : "Existing events will remain, but availability for the selected periods will be blocked if you continue."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {conflictRequiresBookingResolution
                ? "Active bookings cannot be cancelled, moved, or overridden from Calendar blocking. Use the Bookings section to resolve the overlap, then retry."
                : "This block overlaps existing calendar entries. The entries will remain, but future availability for the affected periods will be blocked if you continue."}
            </p>

            {conflictState.conflicts.map((conflict) => (
              <div
                key={`${conflict.date}-${conflict.blockedPeriods?.join("-") || "all"}-${
                  conflict.blockedTimeRanges
                    ?.map(
                      (timeRange) =>
                        `${timeRange.startTime}-${timeRange.endTime}`,
                    )
                    .join("-") || "none"
                }`}
                className="rounded-lg border border-white/10 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {formatDateLabel(conflict.date)}
                    </p>
                    {Array.isArray(conflict.blockedPeriods) &&
                    conflict.blockedPeriods.length > 0 ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Periods:{" "}
                        {formatConflictPeriods(conflict.blockedPeriods)}
                      </p>
                    ) : null}
                    {Array.isArray(conflict.blockedTimeRanges) &&
                    conflict.blockedTimeRanges.length > 0 ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Legacy exact block overlap
                      </p>
                    ) : null}
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
                {conflictRequiresBookingResolution ? "Close" : "Cancel"}
              </Button>
              {conflictRequiresBookingResolution ? (
                <Button asChild type="button">
                  <a href="/admin/bookings">Open Bookings</a>
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={blockSaving}
                  onClick={handleConflictOverrideSave}
                >
                  Save block anyway
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
