"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPinned,
  RefreshCcw,
  ShieldAlert,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const DUBAI_TIMEZONE = "Asia/Dubai";
const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const PERIOD_ORDER = ["morning", "afternoon", "evening"];

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

export default function SchedulingCalendarPage() {
  const todayDateKey = useMemo(() => getTodayDateKeyInDubai(), []);
  const [monthKey, setMonthKey] = useState(
    getMonthKeyFromDateKey(todayDateKey),
  );
  const [selectedDateKey, setSelectedDateKey] = useState(todayDateKey);
  const [calendarData, setCalendarData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedOnceRef = useRef(false);

  useEffect(() => {
    let ignore = false;

    const loadCalendar = async () => {
      const isRefresh = hasLoadedOnceRef.current;
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const { start, end } = getMonthRange(monthKey);
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

          if (getMonthKeyFromDateKey(todayDateKey) === monthKey) {
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
  }, [monthKey, todayDateKey]);

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

        <Card className="rounded-3xl border-white/10 bg-card/80">
          <CardHeader className="space-y-3">
            <div className="flex items-start justify-between gap-3">
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
                <h2 className="text-lg font-semibold">Calendar events</h2>
                <Badge variant="outline" className="rounded-full">
                  {selectedEvents.length}
                </Badge>
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
                          <Badge variant={getEventStatusVariant(event.status)}>
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
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
