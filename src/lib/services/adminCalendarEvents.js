import { USER_ROLES } from "@/lib/config/app.config";
import { sequelize } from "@/lib/db/db";
import models from "@/lib/db/models";
import { PERIODS } from "@/lib/services/schedulingAvailability";
import {
  revalidateSchedulingRequests,
  SchedulingConflictError,
} from "@/lib/services/schedulingConflictRevalidation";

const ACTIVE_STATUS = "ACTIVE";
const CANCELLED_STATUS = "CANCELLED";
const MAX_TITLE_LENGTH = 160;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_SUMMARY_LABEL_LENGTH = 200;
const MAX_CANCELLATION_REASON_LENGTH = 500;
const MAX_RESERVED_CAPACITY_UNITS = 999.99;
const CALENDAR_EVENT_MUTATION_INCLUDE = [
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
  {
    model: models.User,
    as: "cancelledByUser",
    attributes: ["id", "fullName", "email"],
    required: false,
  },
];

function runInTransaction(transaction, callback) {
  if (transaction) {
    return callback(transaction);
  }

  return sequelize.transaction(callback);
}

function normalizeRequiredId(value, label) {
  const normalized = Number(value);

  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new Error(`${label} is required`);
  }

  return normalized;
}

function normalizeDateOnly(value, label) {
  const normalized = String(value ?? "").trim();

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

function normalizeOptionalText(value, { label, maxLength }) {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();

  if (!normalized) {
    return null;
  }

  if (normalized.length > maxLength) {
    throw new Error(`${label} must be ${maxLength} characters or fewer`);
  }

  return normalized;
}

function normalizeRequiredText(value, { label, maxLength }) {
  const normalized = normalizeOptionalText(value, { label, maxLength });

  if (!normalized) {
    throw new Error(`${label} is required`);
  }

  return normalized;
}

function normalizeOptionalTime(value, label) {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();

  if (!normalized) {
    return null;
  }

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(normalized)) {
    throw new Error(`${label} must use HH:MM`);
  }

  return normalized;
}

function normalizeOptionalPeriod(value) {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (!PERIODS.includes(normalized)) {
    throw new Error("Calendar event period is unsupported");
  }

  return normalized;
}

function inferPeriodFromStartTime(startTime) {
  if (!startTime) {
    return null;
  }

  if (startTime < "12:00") return "morning";
  if (startTime < "17:00") return "afternoon";
  return "evening";
}

function normalizeSummary(value, label) {
  if (value == null) {
    return null;
  }

  if (typeof value === "string") {
    const normalizedLabel = normalizeOptionalText(value, {
      label,
      maxLength: MAX_SUMMARY_LABEL_LENGTH,
    });

    return normalizedLabel ? { label: normalizedLabel } : null;
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a string or object`);
  }

  const normalizedLabel = normalizeOptionalText(value.label, {
    label: `${label} label`,
    maxLength: MAX_SUMMARY_LABEL_LENGTH,
  });

  return normalizedLabel ? { label: normalizedLabel } : null;
}

function normalizeConsumesCapacity(value, fallbackValue) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (value === "true") return true;
    if (value === "false") return false;
  }

  if (typeof fallbackValue === "boolean") {
    return fallbackValue;
  }

  return false;
}

function normalizeReservedCapacityUnits(value, { consumesCapacity }) {
  if (!consumesCapacity) {
    return "0.00";
  }

  const normalized = String(value ?? "").trim();

  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    throw new Error(
      "Reserved capacity units must be a positive number with up to 2 decimals",
    );
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("Reserved capacity units must be greater than 0");
  }

  if (parsed > MAX_RESERVED_CAPACITY_UNITS) {
    throw new Error(
      `Reserved capacity units must be ${MAX_RESERVED_CAPACITY_UNITS.toFixed(2)} or less`,
    );
  }

  return parsed.toFixed(2);
}

function buildCalendarEventSnapshot(event) {
  const plain =
    typeof event?.get === "function" ? event.get({ plain: true }) : event;

  if (!plain) {
    return null;
  }

  return {
    id: Number(plain.id),
    title: plain.title,
    description: plain.description || "",
    date: plain.businessDate,
    status: plain.status,
    period: plain.period || null,
    startTime: plain.startTime || null,
    endTime: plain.endTime || null,
    consumesCapacity: Boolean(plain.consumesCapacity),
    reservedCapacityUnits: Number(plain.reservedCapacityUnits || 0),
    propertySummary: plain.propertySummary || null,
    contactSummary: plain.contactSummary || null,
    createdByUser: plain.createdByUser
      ? {
          id: Number(plain.createdByUser.id),
          fullName: plain.createdByUser.fullName || "",
          email: plain.createdByUser.email || "",
        }
      : null,
    updatedByUser: plain.updatedByUser
      ? {
          id: Number(plain.updatedByUser.id),
          fullName: plain.updatedByUser.fullName || "",
          email: plain.updatedByUser.email || "",
        }
      : null,
    cancelledByUser: plain.cancelledByUser
      ? {
          id: Number(plain.cancelledByUser.id),
          fullName: plain.cancelledByUser.fullName || "",
          email: plain.cancelledByUser.email || "",
        }
      : null,
    cancelledAt: plain.cancelledAt
      ? new Date(plain.cancelledAt).toISOString()
      : null,
    cancellationReason: plain.cancellationReason || null,
  };
}

function assertAuthorizedCalendarActor(actorUser) {
  if (!actorUser?.id) {
    throw new Error("Unauthorized");
  }

  if (actorUser.role !== USER_ROLES.SUPERADMIN) {
    throw new Error("Unauthorized: Scheduling calendar admin access required");
  }

  return {
    id: normalizeRequiredId(actorUser.id, "Actor user ID"),
    role: actorUser.role,
  };
}

function normalizeCalendarEventInput(input, { existingEvent = null } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Calendar event input must be an object");
  }

  const current = existingEvent
    ? {
        title: existingEvent.title,
        description: existingEvent.description,
        businessDate: existingEvent.businessDate,
        period: existingEvent.period,
        startTime: existingEvent.startTime,
        endTime: existingEvent.endTime,
        propertySummary: existingEvent.propertySummary,
        contactSummary: existingEvent.contactSummary,
        consumesCapacity: Boolean(existingEvent.consumesCapacity),
        reservedCapacityUnits: existingEvent.reservedCapacityUnits,
      }
    : null;

  const merged = {
    title: Object.hasOwn(input, "title") ? input.title : current?.title,
    description: Object.hasOwn(input, "description")
      ? input.description
      : current?.description,
    businessDate: Object.hasOwn(input, "date")
      ? input.date
      : Object.hasOwn(input, "businessDate")
        ? input.businessDate
        : current?.businessDate,
    period: Object.hasOwn(input, "period") ? input.period : current?.period,
    startTime: Object.hasOwn(input, "startTime")
      ? input.startTime
      : current?.startTime,
    endTime: Object.hasOwn(input, "endTime") ? input.endTime : current?.endTime,
    propertySummary: Object.hasOwn(input, "propertySummary")
      ? input.propertySummary
      : current?.propertySummary,
    contactSummary: Object.hasOwn(input, "contactSummary")
      ? input.contactSummary
      : current?.contactSummary,
    consumesCapacity: Object.hasOwn(input, "consumesCapacity")
      ? input.consumesCapacity
      : current?.consumesCapacity,
    reservedCapacityUnits: Object.hasOwn(input, "reservedCapacityUnits")
      ? input.reservedCapacityUnits
      : current?.reservedCapacityUnits,
  };

  const period = normalizeOptionalPeriod(merged.period);
  const startTime = normalizeOptionalTime(
    merged.startTime,
    "Calendar event start time",
  );
  const endTime = normalizeOptionalTime(
    merged.endTime,
    "Calendar event end time",
  );
  const resolvedPeriod = period || inferPeriodFromStartTime(startTime);

  if (!resolvedPeriod) {
    throw new Error(
      "Calendar event period or start time is required to place the event",
    );
  }

  if (endTime && !startTime) {
    throw new Error(
      "Calendar event start time is required when an end time is provided",
    );
  }

  if (startTime && endTime && endTime <= startTime) {
    throw new Error("Calendar event end time must be after start time");
  }

  const consumesCapacity = normalizeConsumesCapacity(
    merged.consumesCapacity,
    current?.consumesCapacity,
  );

  return {
    title: normalizeRequiredText(merged.title, {
      label: "Calendar event title",
      maxLength: MAX_TITLE_LENGTH,
    }),
    description: normalizeOptionalText(merged.description, {
      label: "Calendar event description",
      maxLength: MAX_DESCRIPTION_LENGTH,
    }),
    businessDate: normalizeDateOnly(merged.businessDate, "Calendar event date"),
    period: resolvedPeriod,
    startTime,
    endTime,
    propertySummary: normalizeSummary(
      merged.propertySummary,
      "Calendar event property summary",
    ),
    contactSummary: normalizeSummary(
      merged.contactSummary,
      "Calendar event contact summary",
    ),
    consumesCapacity,
    reservedCapacityUnits: normalizeReservedCapacityUnits(
      merged.reservedCapacityUnits,
      {
        consumesCapacity,
      },
    ),
  };
}

function buildRevalidationRequest(input) {
  return {
    type: "event",
    date: input.businessDate,
    period: input.period,
    startTime: input.startTime,
    endTime: input.endTime,
    consumesCapacity: input.consumesCapacity,
  };
}

async function loadCalendarEvent(eventId, { transaction } = {}) {
  return models.CalendarEvent.findByPk(eventId, {
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
    include: CALENDAR_EVENT_MUTATION_INCLUDE,
  });
}

async function loadCalendarEventOrThrow(eventId, options = {}) {
  const normalizedEventId = normalizeRequiredId(eventId, "Calendar event ID");
  const event = await loadCalendarEvent(normalizedEventId, options);

  if (!event) {
    throw new Error("Calendar event not found");
  }

  return event;
}

export function isCalendarEventValidationError(error) {
  const message = String(error?.message || "");

  return (
    message === "Calendar event input must be an object" ||
    message === "Calendar event not found" ||
    message.includes("Calendar event ") ||
    message.includes("Reserved capacity units")
  );
}

export async function createCalendarEvent({
  actorUser,
  input,
  transaction = null,
} = {}) {
  const actor = assertAuthorizedCalendarActor(actorUser);
  const normalizedInput = normalizeCalendarEventInput(input);

  return runInTransaction(transaction, async (activeTransaction) => {
    await revalidateSchedulingRequests({
      dates: [normalizedInput.businessDate],
      transaction: activeTransaction,
      requests: [buildRevalidationRequest(normalizedInput)],
    });

    const createdEvent = await models.CalendarEvent.create(
      {
        title: normalizedInput.title,
        description: normalizedInput.description,
        businessDate: normalizedInput.businessDate,
        period: normalizedInput.period,
        startTime: normalizedInput.startTime,
        endTime: normalizedInput.endTime,
        propertySummary: normalizedInput.propertySummary,
        contactSummary: normalizedInput.contactSummary,
        consumesCapacity: normalizedInput.consumesCapacity,
        reservedCapacityUnits: normalizedInput.reservedCapacityUnits,
        status: ACTIVE_STATUS,
        createdByUserId: actor.id,
        updatedByUserId: actor.id,
        cancelledByUserId: null,
        cancelledAt: null,
        cancellationReason: null,
      },
      { transaction: activeTransaction },
    );

    const hydratedEvent = await loadCalendarEventOrThrow(createdEvent.id, {
      transaction: activeTransaction,
    });

    return buildCalendarEventSnapshot(hydratedEvent);
  });
}

export async function updateCalendarEvent({
  actorUser,
  eventId,
  input,
  transaction = null,
} = {}) {
  const actor = assertAuthorizedCalendarActor(actorUser);

  return runInTransaction(transaction, async (activeTransaction) => {
    const existingEvent = await loadCalendarEventOrThrow(eventId, {
      transaction: activeTransaction,
    });
    const normalizedInput = normalizeCalendarEventInput(input, {
      existingEvent,
    });

    if (existingEvent.status === ACTIVE_STATUS) {
      await revalidateSchedulingRequests({
        dates: [normalizedInput.businessDate],
        transaction: activeTransaction,
        requests: [buildRevalidationRequest(normalizedInput)],
        excludeEventIds: [existingEvent.id],
      });
    }

    existingEvent.title = normalizedInput.title;
    existingEvent.description = normalizedInput.description;
    existingEvent.businessDate = normalizedInput.businessDate;
    existingEvent.period = normalizedInput.period;
    existingEvent.startTime = normalizedInput.startTime;
    existingEvent.endTime = normalizedInput.endTime;
    existingEvent.propertySummary = normalizedInput.propertySummary;
    existingEvent.contactSummary = normalizedInput.contactSummary;
    existingEvent.consumesCapacity = normalizedInput.consumesCapacity;
    existingEvent.reservedCapacityUnits = normalizedInput.reservedCapacityUnits;
    existingEvent.updatedByUserId = actor.id;

    await existingEvent.save({ transaction: activeTransaction });

    const hydratedEvent = await loadCalendarEventOrThrow(existingEvent.id, {
      transaction: activeTransaction,
    });

    return buildCalendarEventSnapshot(hydratedEvent);
  });
}

export async function cancelCalendarEvent({
  actorUser,
  eventId,
  cancellationReason = null,
  transaction = null,
} = {}) {
  const actor = assertAuthorizedCalendarActor(actorUser);
  const normalizedReason = normalizeOptionalText(cancellationReason, {
    label: "Calendar event cancellation reason",
    maxLength: MAX_CANCELLATION_REASON_LENGTH,
  });

  return runInTransaction(transaction, async (activeTransaction) => {
    const event = await loadCalendarEventOrThrow(eventId, {
      transaction: activeTransaction,
    });

    if (event.status !== CANCELLED_STATUS) {
      event.status = CANCELLED_STATUS;
      event.cancelledByUserId = actor.id;
      event.cancelledAt = new Date();
      event.cancellationReason = normalizedReason;
      event.updatedByUserId = actor.id;
      await event.save({ transaction: activeTransaction });
    }

    const hydratedEvent = await loadCalendarEventOrThrow(event.id, {
      transaction: activeTransaction,
    });

    return buildCalendarEventSnapshot(hydratedEvent);
  });
}

export async function restoreCalendarEvent({
  actorUser,
  eventId,
  transaction = null,
} = {}) {
  const actor = assertAuthorizedCalendarActor(actorUser);

  return runInTransaction(transaction, async (activeTransaction) => {
    const event = await loadCalendarEventOrThrow(eventId, {
      transaction: activeTransaction,
    });

    if (event.status !== ACTIVE_STATUS) {
      const normalizedInput = normalizeCalendarEventInput(
        {},
        {
          existingEvent: event,
        },
      );

      await revalidateSchedulingRequests({
        dates: [normalizedInput.businessDate],
        transaction: activeTransaction,
        requests: [buildRevalidationRequest(normalizedInput)],
        excludeEventIds: [event.id],
      });

      event.status = ACTIVE_STATUS;
      event.cancelledByUserId = null;
      event.cancelledAt = null;
      event.cancellationReason = null;
      event.updatedByUserId = actor.id;
      await event.save({ transaction: activeTransaction });
    }

    const hydratedEvent = await loadCalendarEventOrThrow(event.id, {
      transaction: activeTransaction,
    });

    return buildCalendarEventSnapshot(hydratedEvent);
  });
}

export { SchedulingConflictError };
