import { Op } from "sequelize";
import models from "@/lib/db/models";
import {
  getBookingArrivalWindowFromDetails,
  getBookingBlockedPeriods,
  getBookingLoadBreakdown,
  getDynamicTwilightSlotLabel,
} from "@/lib/helpers/bookingUtils";
import { formatBookingReference } from "@/lib/helpers/invoice-format";
import {
  enumerateDateRange,
  getEffectiveBlockForDate,
  normalizeTimeSlotConfig,
} from "@/lib/services/schedulingAvailability";

const CONFIG_KEY = "timeSlots";
const MAX_QUERY_RANGE_DAYS = 124;

function normalizeDateOnly(value, label) {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    throw new Error(`${label} is required`);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error(`${label} must use YYYY-MM-DD`);
  }

  const [year, month, day] = normalized.split("-").map(Number);
  const resolved = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));

  if (
    resolved.getUTCFullYear() !== year ||
    resolved.getUTCMonth() !== month - 1 ||
    resolved.getUTCDate() !== day
  ) {
    throw new Error(`${label} must be a valid calendar date`);
  }

  return normalized;
}

function buildRangeMetadata(startDate, endDate) {
  const normalizedStartDate = normalizeDateOnly(
    startDate,
    "Calendar range startDate",
  );
  const normalizedEndDate = normalizeDateOnly(
    endDate,
    "Calendar range endDate",
  );

  if (normalizedEndDate < normalizedStartDate) {
    throw new Error(
      "Calendar range endDate must be on or after Calendar range startDate",
    );
  }

  const dayCount = enumerateDateRange(
    normalizedStartDate,
    normalizedEndDate,
  ).length;

  if (dayCount > MAX_QUERY_RANGE_DAYS) {
    throw new Error(
      `Calendar range must be ${MAX_QUERY_RANGE_DAYS} days or fewer`,
    );
  }

  return {
    startDate: normalizedStartDate,
    endDate: normalizedEndDate,
    dayCount,
  };
}

function mapBookingToPeriod(booking) {
  if (booking.slot === 1) return "morning";
  if (booking.slot === 2) return "afternoon";
  if (booking.slot === 3) return "evening";

  const startTime = booking.startTime;
  if (!startTime) return null;

  if (startTime >= "09:00" && startTime < "12:00") return "morning";
  if (startTime >= "13:00" && startTime < "17:00") return "afternoon";
  if (startTime >= "17:00" && startTime <= "20:00") return "evening";
  return null;
}

function getVideographySelections(videographySubService) {
  return String(videographySubService || "")
    .split("|")
    .map((value) => value.trim())
    .filter(Boolean);
}

function isNightServiceBooking(booking) {
  const services = Array.isArray(booking?.shootDetails?.services)
    ? booking.shootDetails.services
    : [];

  if (!services.includes("Videography")) {
    return false;
  }

  const selections = getVideographySelections(
    booking?.shootDetails?.videographySubService,
  );

  return selections.some(
    (selection) =>
      selection.includes("Night Light") ||
      selection.includes("Daylight + Night"),
  );
}

function labelizePeriod(period) {
  if (!period) return "";
  return period.charAt(0).toUpperCase() + period.slice(1);
}

function toPlainRecord(record) {
  if (!record) return null;
  if (typeof record.get === "function") {
    return record.get({ plain: true });
  }
  return record;
}

function buildBookingPropertySnapshot(propertyDetails) {
  const property = propertyDetails || {};
  const type = property.type || property.propertyType || "";
  const size = property.size || property.propertySize || "";
  const community =
    property.community || property.area || property.location || "";

  return {
    type,
    size,
    community,
    label: [type, size].filter(Boolean).join(" - ") || "Property",
  };
}

function buildBookingServiceSnapshot(shootDetails) {
  const services = Array.isArray(shootDetails?.services)
    ? shootDetails.services
    : [];
  const videographySelections = getVideographySelections(
    shootDetails?.videographySubService,
  );
  const label = [
    services.length ? services.join(", ") : "",
    videographySelections.length ? `(${videographySelections.join(", ")})` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    services,
    videographySelections,
    label,
  };
}

function buildBookingCalendarItem(booking) {
  const property = buildBookingPropertySnapshot(booking.propertyDetails);
  const service = buildBookingServiceSnapshot(booking.shootDetails);
  const loadBreakdown = getBookingLoadBreakdown({
    propertyType: property.type,
    propertySize: property.size,
    services: service.services,
    videographySubService: booking?.shootDetails?.videographySubService || "",
  });
  const startPeriod = mapBookingToPeriod(booking);
  const blockedPeriods = getBookingBlockedPeriods({
    startTime: booking.startTime || "",
    slot: booking.slot,
    durationHours: booking.duration || loadBreakdown.slotsRequired || 1,
    isNightService: isNightServiceBooking(booking),
  });
  const resolvedPeriods = blockedPeriods.length > 0 ? blockedPeriods : [];
  const amountSource = booking.transaction?.amount ?? booking.total ?? null;

  return {
    id: Number(booking.id),
    bookingCode: formatBookingReference(booking),
    date: booking.date,
    status: booking.status,
    customer: booking.user
      ? {
          id: Number(booking.user.id),
          fullName: booking.user.fullName || "",
          email: booking.user.email || "",
          phone: booking.user.phone || "",
        }
      : null,
    property,
    service,
    amount: amountSource == null ? null : Number(amountSource),
    paymentStatus: booking.transaction?.status || null,
    slot: {
      startTime: booking.startTime || "",
      durationHours: Number(
        booking.duration || loadBreakdown.slotsRequired || 1,
      ),
      startPeriod,
      blockedPeriods: resolvedPeriods,
      label:
        startPeriod === "evening"
          ? getDynamicTwilightSlotLabel(loadBreakdown.totalLoad)
          : labelizePeriod(startPeriod),
      arrivalWindow: getBookingArrivalWindowFromDetails({
        startTime: booking.startTime || "",
        slot: booking.slot,
        propertyType: property.type,
        propertySize: property.size,
        services: service.services,
        videographySubService:
          booking?.shootDetails?.videographySubService || "",
      }),
    },
  };
}

function buildEventCalendarItem(event) {
  return {
    id: Number(event.id),
    title: event.title,
    description: event.description || "",
    date: event.businessDate,
    status: event.status,
    period: event.period || null,
    startTime: event.startTime || null,
    endTime: event.endTime || null,
    consumesCapacity: Boolean(event.consumesCapacity),
    reservedCapacityUnits: Number(event.reservedCapacityUnits || 0),
    propertySummary: event.propertySummary || null,
    contactSummary: event.contactSummary || null,
    createdByUser: event.createdByUser
      ? {
          id: Number(event.createdByUser.id),
          fullName: event.createdByUser.fullName || "",
          email: event.createdByUser.email || "",
        }
      : null,
    updatedByUser: event.updatedByUser
      ? {
          id: Number(event.updatedByUser.id),
          fullName: event.updatedByUser.fullName || "",
          email: event.updatedByUser.email || "",
        }
      : null,
    cancelledAt: event.cancelledAt || null,
    cancellationReason: event.cancellationReason || null,
  };
}

export async function listAdminSchedulingCalendarRange({
  startDate,
  endDate,
} = {}) {
  const range = buildRangeMetadata(startDate, endDate);

  const [configEntry, bookingRecords, eventRecords] = await Promise.all([
    models.DynamicConfig.findOne({
      where: { key: CONFIG_KEY },
      attributes: ["value"],
    }),
    models.Booking.findAll({
      where: {
        date: {
          [Op.between]: [range.startDate, range.endDate],
        },
        status: {
          [Op.in]: ["DRAFT", "CONFIRMED", "COMPLETED", "CANCELLED"],
        },
      },
      include: [
        {
          model: models.User,
          as: "user",
          attributes: ["id", "fullName", "email", "phone"],
          required: false,
        },
        {
          model: models.Transaction,
          as: "transaction",
          attributes: ["id", "amount", "status", "invoiceNumber"],
          required: false,
        },
      ],
      order: [
        ["date", "ASC"],
        ["startTime", "ASC"],
        ["createdAt", "ASC"],
      ],
    }),
    models.CalendarEvent.findAll({
      where: {
        businessDate: {
          [Op.between]: [range.startDate, range.endDate],
        },
        status: {
          [Op.in]: ["ACTIVE", "CANCELLED"],
        },
      },
      include: [
        {
          model: models.User,
          as: "createdByUser",
          attributes: ["id", "fullName", "email"],
          required: false,
        },
        {
          model: models.User,
          as: "updatedByUser",
          attributes: ["id", "fullName", "email"],
          required: false,
        },
      ],
      order: [
        ["businessDate", "ASC"],
        ["startTime", "ASC"],
        ["createdAt", "ASC"],
      ],
    }),
  ]);

  const config = normalizeTimeSlotConfig(configEntry?.value);
  const bookings = bookingRecords.map((record) =>
    buildBookingCalendarItem(toPlainRecord(record)),
  );
  const events = eventRecords.map((record) =>
    buildEventCalendarItem(toPlainRecord(record)),
  );
  const countsByDate = new Map();

  enumerateDateRange(range.startDate, range.endDate).forEach((date) => {
    countsByDate.set(date, {
      bookings: 0,
      events: 0,
      activeEvents: 0,
      capacityConsumingEvents: 0,
    });
  });

  bookings.forEach((booking) => {
    const counts = countsByDate.get(booking.date);
    if (!counts) return;
    counts.bookings += 1;
  });

  events.forEach((event) => {
    const counts = countsByDate.get(event.date);
    if (!counts) return;
    counts.events += 1;
    if (event.status === "ACTIVE") {
      counts.activeEvents += 1;
    }
    if (event.status === "ACTIVE" && event.consumesCapacity) {
      counts.capacityConsumingEvents += 1;
    }
  });

  const days = enumerateDateRange(range.startDate, range.endDate).map(
    (date) => {
      const block = getEffectiveBlockForDate(date, config);
      const counts = countsByDate.get(date) || {
        bookings: 0,
        events: 0,
        activeEvents: 0,
        capacityConsumingEvents: 0,
      };

      return {
        date,
        dayName: block.dayName,
        isWorkingDay: block.isWorkingDay,
        block: {
          fullDayBlocked: block.fullDayBlocked,
          blockedPeriods: block.blockedPeriods,
          blockDefinitions: block.blockDefinitions,
        },
        counts,
      };
    },
  );

  return {
    range,
    bookings,
    events,
    days,
    summary: {
      totalBookings: bookings.length,
      totalEvents: events.length,
      totalActiveEvents: events.filter((event) => event.status === "ACTIVE")
        .length,
      totalCapacityConsumingEvents: events.filter(
        (event) => event.status === "ACTIVE" && event.consumesCapacity,
      ).length,
      totalFullyBlockedDays: days.filter((day) => day.block.fullDayBlocked)
        .length,
      totalPartiallyBlockedDays: days.filter(
        (day) =>
          !day.block.fullDayBlocked && day.block.blockedPeriods.length > 0,
      ).length,
    },
  };
}
