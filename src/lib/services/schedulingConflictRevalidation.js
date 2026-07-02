import { Op } from "sequelize";
import { sequelize } from "@/lib/db/db";
import Booking from "@/lib/db/models/booking";
import CalendarEvent from "@/lib/db/models/calendarevent";
import DynamicConfig from "@/lib/db/models/dynamicconfig";
import Transaction from "@/lib/db/models/transaction";
import {
  getBookingBlockedPeriods,
  getBookingLoadBreakdown,
} from "@/lib/helpers/bookingUtils";
import {
  expandPeriodsToSlotTimes,
  expandTimeRangeToSlotTimes,
  getEffectiveBlockForDate,
  normalizeBlockTimeRange,
  normalizeTimeSlotConfig,
  PERIODS,
} from "@/lib/services/schedulingAvailability";

const CONFIG_KEY = "timeSlots";
const SCHEDULING_LOCK_NAMESPACE = 24071;
const ACTIVE_EVENT_STATUS = "ACTIVE";

export class SchedulingConflictError extends Error {
  constructor(
    message,
    { reasonCode = "schedule_conflict", status = 409, conflicts = [] } = {},
  ) {
    super(message);
    this.name = "SchedulingConflictError";
    this.reasonCode = reasonCode;
    this.status = status;
    this.conflicts = conflicts;
  }
}

function normalizeDateOnly(value, label) {
  const normalized = String(value ?? "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error(`${label} must use YYYY-MM-DD`);
  }

  return normalized;
}

function getBookingStartTime(booking) {
  if (
    typeof booking?.startTime === "string" &&
    booking.startTime.includes(":")
  ) {
    return booking.startTime;
  }

  if (booking?.slot === 1) return "09:00";
  if (booking?.slot === 2) return "13:00";
  if (booking?.slot === 3) return "17:00";
  return "";
}

function isNightServiceBooking(booking) {
  const services = Array.isArray(booking?.shootDetails?.services)
    ? booking.shootDetails.services
    : [];

  if (!services.includes("Videography")) {
    return false;
  }

  const subSelection = String(
    booking?.shootDetails?.videographySubService || "",
  );
  return (
    subSelection.includes("Night Light") ||
    subSelection.includes("Daylight + Night")
  );
}

function isBookingBlocking(booking) {
  if (booking?.cancelledAt) return false;

  if (booking?.status === "CONFIRMED") return true;
  if (booking?.status === "COMPLETED") return true;

  if (booking?.status === "DRAFT") {
    if (booking?.transaction) {
      return ["pending", "success"].includes(booking.transaction.status);
    }

    if (!booking?.createdAt) {
      return true;
    }

    const ageMinutes =
      (Date.now() - new Date(booking.createdAt).getTime()) / 60000;
    return ageMinutes < 15;
  }

  return false;
}

function getBookingPeriods(booking) {
  const propertyType =
    booking?.propertyDetails?.type ||
    booking?.propertyDetails?.propertyType ||
    "";
  const propertySize =
    booking?.propertyDetails?.size ||
    booking?.propertyDetails?.propertySize ||
    "";
  const services = Array.isArray(booking?.shootDetails?.services)
    ? booking.shootDetails.services
    : [];
  const videographySubService =
    booking?.shootDetails?.videographySubService || "";
  const loadBreakdown = getBookingLoadBreakdown({
    propertyType,
    propertySize,
    services,
    videographySubService,
  });

  return getBookingBlockedPeriods({
    startTime: getBookingStartTime(booking),
    slot: booking?.slot,
    durationHours: booking?.duration || loadBreakdown.slotsRequired || 1,
    isNightService: isNightServiceBooking(booking),
  });
}

function getEventPeriods(event) {
  if (event?.period && PERIODS.includes(event.period)) {
    return [event.period];
  }

  if (!event?.startTime) {
    return [];
  }

  if (event.startTime < "12:00") return ["morning"];
  if (event.startTime < "17:00") return ["afternoon"];
  return ["evening"];
}

function slotTimesOverlap(left, right) {
  const leftSlots = new Set(left || []);
  return (right || []).some((slot) => leftSlots.has(slot));
}

function getBookingBlockedSlots(booking) {
  return expandPeriodsToSlotTimes(getBookingPeriods(booking));
}

function getEventBlockedSlots(event) {
  if (event?.startTime && event?.endTime) {
    return expandTimeRangeToSlotTimes({
      startTime: event.startTime,
      endTime: event.endTime,
    });
  }

  return expandPeriodsToSlotTimes(getEventPeriods(event));
}

function buildBookingConflictRecord(booking) {
  return {
    kind: "booking",
    id: Number(booking.id),
    bookingCode: booking.bookingCode || null,
    date: booking.date,
    status: booking.status,
    startTime: getBookingStartTime(booking) || null,
    periods: getBookingPeriods(booking),
  };
}

function buildEventConflictRecord(event) {
  return {
    kind: "calendar_event",
    id: Number(event.id),
    title: event.title,
    date: event.businessDate,
    status: event.status,
    consumesCapacity: Boolean(event.consumesCapacity),
    periods: getEventPeriods(event),
  };
}

function buildConflictMessage(
  date,
  bookings,
  events,
  { blockedPeriods = null, blockedTimeRanges = null } = {},
) {
  const parts = [];
  if (blockedPeriods?.length) {
    parts.push(
      `blocked periods (${blockedPeriods
        .map((period) => period.charAt(0).toUpperCase() + period.slice(1))
        .join(", ")})`,
    );
  }
  if (blockedTimeRanges?.length) {
    parts.push(
      `blocked times (${blockedTimeRanges
        .map((timeRange) => `${timeRange.startTime}-${timeRange.endTime}`)
        .join(", ")})`,
    );
  }
  if (bookings.length) {
    parts.push(
      `${bookings.length} existing booking${bookings.length === 1 ? "" : "s"}`,
    );
  }
  if (events.length) {
    parts.push(
      `${events.length} existing calendar event${events.length === 1 ? "" : "s"}`,
    );
  }

  return `Scheduling conflict on ${date}: ${parts.join(", ")}. Refresh and try another time or review the affected records.`;
}

async function lockSchedulingDate(transaction, date) {
  const normalizedDate = normalizeDateOnly(date, "Scheduling lock date");
  const resourceKey = Number(normalizedDate.replaceAll("-", ""));

  await sequelize.query(
    "SELECT pg_advisory_xact_lock(:namespace, :resourceKey)",
    {
      replacements: {
        namespace: SCHEDULING_LOCK_NAMESPACE,
        resourceKey,
      },
      transaction,
    },
  );
}

async function loadSchedulingConfig(transaction) {
  const query = {
    where: { key: CONFIG_KEY },
    attributes: ["value"],
  };

  if (transaction) {
    query.transaction = transaction;
    query.lock = transaction.LOCK.UPDATE;
  }

  const entry = await DynamicConfig.findOne(query);
  return normalizeTimeSlotConfig(entry?.value);
}

async function loadBookingsForDates(dates, transaction) {
  if (dates.length === 0) return [];

  const query = {
    where: {
      date: {
        [Op.in]: dates,
      },
    },
    include: [{ model: Transaction, as: "transaction", required: false }],
  };

  if (transaction) {
    query.transaction = transaction;
    query.lock = transaction.LOCK.UPDATE;
  }

  return Booking.findAll(query);
}

async function loadEventsForDates(dates, transaction) {
  if (dates.length === 0) return [];

  const query = {
    where: {
      businessDate: {
        [Op.in]: dates,
      },
      status: ACTIVE_EVENT_STATUS,
    },
  };

  if (transaction) {
    query.transaction = transaction;
    query.lock = transaction.LOCK.UPDATE;
  }

  return CalendarEvent.findAll(query);
}

function normalizeRequest(request) {
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    throw new Error("Scheduling revalidation request must be an object");
  }

  const type = String(request.type || "").trim();
  const date = normalizeDateOnly(request.date, "Scheduling request date");

  if (type === "booking") {
    const periods = getBookingBlockedPeriods({
      startTime: request.startTime || "",
      slot: request.slot,
      durationHours: request.durationHours || 1,
      isNightService: Boolean(request.isNightService),
    });

    if (periods.length === 0) {
      throw new Error(
        `Scheduling request for ${date} must include a valid booking slot`,
      );
    }

    return {
      type,
      date,
      periods,
      blockedSlots: expandPeriodsToSlotTimes(periods),
    };
  }

  if (type === "event") {
    const periods = getEventPeriods(request);
    if (periods.length === 0) {
      throw new Error(
        `Scheduling request for ${date} must include a valid event period`,
      );
    }

    return {
      type,
      date,
      periods,
      blockedSlots: getEventBlockedSlots(request),
      consumesCapacity: Boolean(request.consumesCapacity),
    };
  }

  if (type === "block") {
    const periods =
      request.fullDayBlocked === true
        ? [...PERIODS]
        : PERIODS.filter((period) =>
            Array.isArray(request.blockedPeriods)
              ? request.blockedPeriods.includes(period)
              : false,
          );

    const timeBlocks = (
      Array.isArray(request.timeBlocks) ? request.timeBlocks : []
    )
      .map((timeRange) => normalizeBlockTimeRange(timeRange))
      .filter(Boolean);
    const blockedSlots = new Set(expandPeriodsToSlotTimes(periods));
    timeBlocks.forEach((timeRange) => {
      expandTimeRangeToSlotTimes(timeRange).forEach((slot) => {
        blockedSlots.add(slot);
      });
    });

    if (blockedSlots.size === 0) {
      throw new Error(
        `Scheduling block request for ${date} must include blocked periods or time ranges`,
      );
    }

    return {
      type,
      date,
      periods,
      timeBlocks,
      blockedSlots: [...blockedSlots],
      allowOverride: Boolean(request.allowOverride),
    };
  }

  throw new Error(`Unsupported scheduling revalidation request type: ${type}`);
}

function getConflictingBookings(bookings, request, excludeBookingIds) {
  return bookings.filter((booking) => {
    if (excludeBookingIds.has(Number(booking.id))) {
      return false;
    }

    if (!isBookingBlocking(booking)) {
      return false;
    }

    if (booking.date !== request.date) {
      return false;
    }

    return slotTimesOverlap(
      getBookingBlockedSlots(booking),
      request.blockedSlots,
    );
  });
}

function getConflictingEvents(
  events,
  request,
  excludeEventIds,
  { includeNonCapacityEvents = false } = {},
) {
  return events.filter((event) => {
    if (excludeEventIds.has(Number(event.id))) {
      return false;
    }

    if (
      event.businessDate !== request.date ||
      event.status !== ACTIVE_EVENT_STATUS
    ) {
      return false;
    }

    if (!includeNonCapacityEvents && !event.consumesCapacity) {
      return false;
    }

    return slotTimesOverlap(getEventBlockedSlots(event), request.blockedSlots);
  });
}

function assertRequestConflicts({
  timeSlotConfig,
  bookings,
  events,
  request,
  excludeBookingIds,
  excludeEventIds,
}) {
  const block = getEffectiveBlockForDate(request.date, timeSlotConfig);
  const blockedPeriods = block.blockedPeriods.filter((period) =>
    request.periods.includes(period),
  );
  const blockedTimeRanges = block.blockedTimeRanges.filter((timeRange) =>
    slotTimesOverlap(
      expandTimeRangeToSlotTimes(timeRange),
      request.blockedSlots,
    ),
  );
  const blockedSlots = new Set(expandPeriodsToSlotTimes(blockedPeriods));
  blockedTimeRanges.forEach((timeRange) => {
    expandTimeRangeToSlotTimes(timeRange).forEach((slot) => {
      blockedSlots.add(slot);
    });
  });

  if (
    request.type === "booking" ||
    (request.type === "event" && request.consumesCapacity)
  ) {
    if (blockedSlots.size > 0) {
      throw new SchedulingConflictError(
        buildConflictMessage(request.date, [], [], {
          blockedPeriods,
          blockedTimeRanges,
        }),
        {
          reasonCode: "schedule_conflict_blocked_period",
          conflicts: [
            {
              type: request.type,
              date: request.date,
              blockedPeriods,
              blockedTimeRanges,
            },
          ],
        },
      );
    }

    const conflictingBookings = getConflictingBookings(
      bookings,
      request,
      excludeBookingIds,
    );
    const conflictingEvents = getConflictingEvents(
      events,
      request,
      excludeEventIds,
    );

    if (conflictingBookings.length > 0 || conflictingEvents.length > 0) {
      throw new SchedulingConflictError(
        buildConflictMessage(
          request.date,
          conflictingBookings,
          conflictingEvents,
        ),
        {
          reasonCode: "schedule_conflict_existing_entries",
          conflicts: [
            {
              type: request.type,
              date: request.date,
              periods: request.periods,
              bookings: conflictingBookings.map(buildBookingConflictRecord),
              events: conflictingEvents.map(buildEventConflictRecord),
            },
          ],
        },
      );
    }

    return;
  }

  if (request.type === "event") {
    if (blockedSlots.size > 0) {
      throw new SchedulingConflictError(
        buildConflictMessage(request.date, [], [], {
          blockedPeriods,
          blockedTimeRanges,
        }),
        {
          reasonCode: "schedule_conflict_blocked_period",
          conflicts: [
            {
              type: request.type,
              date: request.date,
              blockedPeriods,
              blockedTimeRanges,
            },
          ],
        },
      );
    }

    return;
  }

  if (request.type === "block") {
    const conflictingBookings = getConflictingBookings(
      bookings,
      request,
      excludeBookingIds,
    );
    const conflictingEvents = getConflictingEvents(
      events,
      request,
      excludeEventIds,
      { includeNonCapacityEvents: true },
    );

    if (conflictingBookings.length > 0) {
      throw new SchedulingConflictError(
        buildConflictMessage(
          request.date,
          conflictingBookings,
          conflictingEvents,
        ),
        {
          reasonCode: "schedule_conflict_existing_bookings",
          conflicts: [
            {
              type: request.type,
              date: request.date,
              blockedPeriods: request.periods,
              blockedTimeRanges: request.timeBlocks,
              bookings: conflictingBookings.map(buildBookingConflictRecord),
              events: conflictingEvents.map(buildEventConflictRecord),
            },
          ],
        },
      );
    }

    if (!request.allowOverride && conflictingEvents.length > 0) {
      throw new SchedulingConflictError(
        buildConflictMessage(request.date, [], conflictingEvents),
        {
          reasonCode: "schedule_conflict_existing_records",
          conflicts: [
            {
              type: request.type,
              date: request.date,
              blockedPeriods: request.periods,
              blockedTimeRanges: request.timeBlocks,
              bookings: [],
              events: conflictingEvents.map(buildEventConflictRecord),
            },
          ],
        },
      );
    }
  }
}

export async function loadSchedulingConflictContext({
  dates = [],
  transaction = null,
} = {}) {
  const normalizedDates = [
    ...new Set(
      dates
        .filter(Boolean)
        .map((date) => normalizeDateOnly(date, "Scheduling date")),
    ),
  ].sort();

  if (transaction) {
    for (const date of normalizedDates) {
      await lockSchedulingDate(transaction, date);
    }
  }

  const [timeSlotConfig, bookings, events] = await Promise.all([
    loadSchedulingConfig(transaction),
    loadBookingsForDates(normalizedDates, transaction),
    loadEventsForDates(normalizedDates, transaction),
  ]);

  return {
    dates: normalizedDates,
    timeSlotConfig,
    bookings,
    events,
  };
}

export function assertSchedulingRequestsAvailable({
  context,
  requests = [],
  excludeBookingIds = [],
  excludeEventIds = [],
} = {}) {
  if (!context || typeof context !== "object") {
    throw new Error("Scheduling conflict context is required");
  }

  const normalizedRequests = requests.map(normalizeRequest);
  const excludedBookings = new Set(
    excludeBookingIds.map((value) => Number(value)).filter(Number.isFinite),
  );
  const excludedEvents = new Set(
    excludeEventIds.map((value) => Number(value)).filter(Number.isFinite),
  );

  normalizedRequests.forEach((request) => {
    assertRequestConflicts({
      timeSlotConfig: context.timeSlotConfig,
      bookings: context.bookings || [],
      events: context.events || [],
      request,
      excludeBookingIds: excludedBookings,
      excludeEventIds: excludedEvents,
    });
  });

  return normalizedRequests;
}

export async function revalidateSchedulingRequests({
  dates = [],
  transaction = null,
  requests = [],
  excludeBookingIds = [],
  excludeEventIds = [],
} = {}) {
  const context = await loadSchedulingConflictContext({ dates, transaction });
  const normalizedRequests = assertSchedulingRequestsAvailable({
    context,
    requests,
    excludeBookingIds,
    excludeEventIds,
  });

  return {
    context,
    requests: normalizedRequests,
  };
}
