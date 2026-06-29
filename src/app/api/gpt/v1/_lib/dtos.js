import { Op } from "sequelize";
import { z } from "zod";
import {
  BOOKING_WORKFLOW_STATUS,
  DELIVERY_FILE_STATUS,
  DELIVERY_FILE_TYPE,
} from "@/lib/helpers/bookingWorkflow";
import {
  formatBookingReference,
  formatInvoiceNumber,
} from "@/lib/helpers/invoice-format";

export const GPT_API_DEFAULT_PAGE_SIZE = 20;
export const GPT_API_MAX_PAGE_SIZE = 50;
export const GPT_API_MAX_DATE_RANGE_DAYS = 366;

const BOOKING_CODE_PATTERN = /^MWB-\d{4,}$/u;
const INVOICE_NUMBER_PATTERN = /^(?:MW-\d{4}-\d{4}-\d{3}|INV-\d{6})$/u;
const PHONE_LAST4_PATTERN = /^\d{4}$/u;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const ISO_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

export class GptApiDtoValidationError extends Error {
  constructor(message, { issues = [] } = {}) {
    super(message);
    this.name = "GptApiDtoValidationError";
    this.issues = issues;
  }
}

function buildIssue(path, message, code = "custom") {
  return {
    code,
    message,
    path: Array.isArray(path) ? path : [path],
  };
}

function parseIntegerParam(value, fieldName) {
  if (value === undefined) return undefined;

  const normalized = String(value).trim();
  if (!normalized) {
    throw new GptApiDtoValidationError(`"${fieldName}" must not be empty.`, {
      issues: [buildIssue(fieldName, "Must not be empty.")],
    });
  }

  const parsed = Number(normalized);
  if (!Number.isInteger(parsed)) {
    throw new GptApiDtoValidationError(`"${fieldName}" must be an integer.`, {
      issues: [buildIssue(fieldName, "Must be an integer.")],
    });
  }

  return parsed;
}

function normalizeOptionalString(value) {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim();
  return normalized || undefined;
}

function normalizeDateOnly(value) {
  if (value === undefined) return undefined;

  const normalized = String(value).trim();
  if (!ISO_DATE_PATTERN.test(normalized)) {
    return normalized;
  }

  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return normalized;
  }

  return normalized;
}

function isValidDateOnly(value) {
  if (!ISO_DATE_PATTERN.test(String(value || ""))) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value)
  );
}

function serializeDateTime(value) {
  if (!value) return null;

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function normalizeModelValue(value) {
  return typeof value?.toJSON === "function" ? value.toJSON() : value;
}

function uniqueStrings(values) {
  return [...new Set((Array.isArray(values) ? values : []).map(String))]
    .map((value) => value.trim())
    .filter(Boolean);
}

function normalizeDisplayName(user) {
  return (
    String(
      user?.companyName || user?.fullName || "Milkywayy customer",
    ).trim() || "Milkywayy customer"
  );
}

function normalizePhoneLast4(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length < 4) return null;
  return digits.slice(-4);
}

function normalizePropertySummary(booking) {
  const property = booking?.propertyDetails || {};
  const propertyType =
    normalizeOptionalString(property.propertyType || property.type) || null;
  const propertySize =
    normalizeOptionalString(property.propertySize || property.size) || null;
  const building = normalizeOptionalString(property.building) || null;
  const community = normalizeOptionalString(property.community) || null;
  const unitNumber =
    normalizeOptionalString(
      property.unitNumber || property.unit || property.name,
    ) || null;
  const locationLabel =
    [unitNumber, building, community].filter(Boolean).join(", ") || null;

  return {
    building,
    community,
    locationLabel,
    propertySize,
    propertyType,
    unitNumber,
  };
}

function normalizeBookingServices(booking) {
  return uniqueStrings(booking?.shootDetails?.services).slice(0, 10);
}

function normalizeCursorInput(value) {
  if (value === undefined) return null;

  const normalized = String(value).trim();
  if (!normalized) {
    throw new GptApiDtoValidationError('"cursor" must not be empty.', {
      issues: [buildIssue("cursor", "Must not be empty.")],
    });
  }

  try {
    const rawValue = Buffer.from(normalized, "base64url").toString("utf8");
    return JSON.parse(rawValue);
  } catch {
    throw new GptApiDtoValidationError('"cursor" is invalid.', {
      issues: [buildIssue("cursor", "Must be a valid opaque cursor.")],
    });
  }
}

const isoDateSchema = z
  .string()
  .regex(ISO_DATE_PATTERN, "Must use YYYY-MM-DD.")
  .refine(isValidDateOnly, "Must be a valid calendar date.");

const isoDateTimeSchema = z
  .string()
  .regex(ISO_DATE_TIME_PATTERN, "Must use an ISO 8601 UTC timestamp.");

const pageCursorSchema = z.object({
  id: z.number().int().positive(),
  sortValue: isoDateTimeSchema,
});

const paginationInfoSchema = z.object({
  hasMore: z.boolean(),
  nextCursor: z.string().min(1).nullable(),
});

const bookingCodeSchema = z
  .string()
  .trim()
  .regex(BOOKING_CODE_PATTERN, "Must be a public booking code.");

const invoiceNumberSchema = z
  .string()
  .trim()
  .regex(INVOICE_NUMBER_PATTERN, "Must be a public invoice number.");

const pageSizeSchema = z.number().int().min(1).max(GPT_API_MAX_PAGE_SIZE);

const accountTypeSchema = z.enum(["INDIVIDUAL", "COMPANY"]);
const bookingStatusSchema = z.enum([
  "DRAFT",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
]);
const bookingWorkflowStatusSchema = z.enum(
  Object.values(BOOKING_WORKFLOW_STATUS),
);
const invoiceStatusSchema = z.enum(["pending", "success", "failed"]);
const fileStatusSchema = z.enum([
  DELIVERY_FILE_STATUS.UNDER_REVIEW,
  DELIVERY_FILE_STATUS.ACCEPTED,
]);
const fileTypeSchema = z.enum(Object.values(DELIVERY_FILE_TYPE));

function validateDateRange(
  value,
  ctx,
  { endKey, maxRangeDays = GPT_API_MAX_DATE_RANGE_DAYS, startKey },
) {
  const start = value[startKey];
  const end = value[endKey];
  if (!start || !end) return;

  const startDate = new Date(`${start}T00:00:00.000Z`);
  const endDate = new Date(`${end}T00:00:00.000Z`);

  if (startDate.getTime() > endDate.getTime()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `"${startKey}" must be on or before "${endKey}".`,
      path: [startKey],
    });
    return;
  }

  const daySpan = Math.floor(
    (endDate.getTime() - startDate.getTime()) / 86_400_000,
  );

  if (daySpan > maxRangeDays) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Date range must not exceed ${maxRangeDays} days.`,
      path: [endKey],
    });
  }
}

function buildDateRangeSchema({
  endKey,
  maxRangeDays = GPT_API_MAX_DATE_RANGE_DAYS,
  startKey,
}) {
  return (value, ctx) =>
    validateDateRange(value, ctx, {
      endKey,
      maxRangeDays,
      startKey,
    });
}

const commonListQuerySchema = z.object({
  cursor: pageCursorSchema.nullable(),
  limit: pageSizeSchema.default(GPT_API_DEFAULT_PAGE_SIZE),
});

const bookingsListQuerySchema = commonListQuerySchema
  .extend({
    bookingCode: bookingCodeSchema.optional(),
    scheduledFrom: isoDateSchema.optional(),
    scheduledTo: isoDateSchema.optional(),
    status: bookingStatusSchema.optional(),
    workflowStatus: bookingWorkflowStatusSchema.optional(),
  })
  .strict()
  .superRefine(
    buildDateRangeSchema({
      endKey: "scheduledTo",
      startKey: "scheduledFrom",
    }),
  );

const invoicesListQuerySchema = commonListQuerySchema
  .extend({
    invoiceNumber: invoiceNumberSchema.optional(),
    paidFrom: isoDateSchema.optional(),
    paidTo: isoDateSchema.optional(),
    status: invoiceStatusSchema.optional(),
  })
  .strict()
  .superRefine(
    buildDateRangeSchema({
      endKey: "paidTo",
      startKey: "paidFrom",
    }),
  );

const filesListQuerySchema = commonListQuerySchema
  .extend({
    bookingCode: bookingCodeSchema.optional(),
    fileId: z.number().int().positive().optional(),
    status: fileStatusSchema.optional(),
    type: fileTypeSchema.optional(),
    uploadedFrom: isoDateSchema.optional(),
    uploadedTo: isoDateSchema.optional(),
  })
  .strict()
  .superRefine(
    buildDateRangeSchema({
      endKey: "uploadedTo",
      startKey: "uploadedFrom",
    }),
  );

export const gptConnectedAccountDtoSchema = z.object({
  account: z.object({
    accountType: accountTypeSchema,
    displayName: z.string().trim().min(1).max(120),
    phoneLast4: z
      .string()
      .regex(PHONE_LAST4_PATTERN, "Must contain four digits.")
      .nullable(),
  }),
});

export const gptBookingDtoSchema = z.object({
  bookingCode: bookingCodeSchema,
  createdAt: isoDateTimeSchema,
  currency: z.literal("AED"),
  property: z.object({
    building: z.string().min(1).nullable(),
    community: z.string().min(1).nullable(),
    locationLabel: z.string().min(1).nullable(),
    propertySize: z.string().min(1).nullable(),
    propertyType: z.string().min(1).nullable(),
    unitNumber: z.string().min(1).nullable(),
  }),
  scheduledDate: isoDateSchema.nullable(),
  scheduledStartTime: z.string().trim().min(1).max(32).nullable(),
  services: z.array(z.string().trim().min(1)).max(10),
  status: bookingStatusSchema,
  totalAmount: z.number().finite().nonnegative().nullable(),
  workflowStatus: bookingWorkflowStatusSchema,
});

export const gptBookingListResponseSchema = z.object({
  bookings: z.array(gptBookingDtoSchema),
  pagination: paginationInfoSchema,
});

export const gptInvoiceDtoSchema = z.object({
  amount: z.number().finite().nonnegative(),
  bookingCodes: z.array(bookingCodeSchema).max(20),
  createdAt: isoDateTimeSchema,
  currency: z.literal("AED"),
  invoiceNumber: invoiceNumberSchema,
  paidAt: isoDateTimeSchema.nullable(),
  status: invoiceStatusSchema,
  websiteUrl: z
    .string()
    .regex(
      /^\/dashboard\/invoices\?invoiceNumber=[A-Za-z0-9\-_.~%]+$/u,
      "Must link to the dashboard invoices page.",
    ),
});

export const gptInvoiceListResponseSchema = z.object({
  invoices: z.array(gptInvoiceDtoSchema),
  pagination: paginationInfoSchema,
});

export const gptDeliveryFileDtoSchema = z.object({
  bookingCode: bookingCodeSchema,
  fileId: z.number().int().positive(),
  fileName: z.string().min(1).max(255).nullable(),
  label: z.string().trim().min(1).max(120),
  mimeType: z.string().trim().min(1).max(120).nullable(),
  reviewDeadlineAt: isoDateTimeSchema.nullable(),
  revisionCount: z.number().int().nonnegative(),
  sizeBytes: z.number().int().nonnegative().nullable(),
  status: fileStatusSchema,
  type: fileTypeSchema,
  uploadedAt: isoDateTimeSchema.nullable(),
  websiteUrl: z
    .string()
    .regex(
      /^\/dashboard\/files\?fileId=\d+$/u,
      "Must link to the dashboard files page.",
    ),
});

export const gptDeliveryFileListResponseSchema = z.object({
  files: z.array(gptDeliveryFileDtoSchema),
  pagination: paginationInfoSchema,
});

function readSearchParams(searchParams) {
  const resolvedSearchParams =
    searchParams instanceof URLSearchParams
      ? searchParams
      : searchParams?.searchParams instanceof URLSearchParams
        ? searchParams.searchParams
        : new URLSearchParams(searchParams);

  const normalized = {};
  const duplicates = [];

  for (const key of new Set(resolvedSearchParams.keys())) {
    const values = resolvedSearchParams.getAll(key);
    if (values.length > 1) {
      duplicates.push(key);
      continue;
    }
    normalized[key] = values[0];
  }

  if (duplicates.length > 0) {
    throw new GptApiDtoValidationError(
      `Duplicate query parameters are not allowed: ${duplicates.join(", ")}.`,
      {
        issues: duplicates.map((key) =>
          buildIssue(key, "Duplicate query parameters are not allowed."),
        ),
      },
    );
  }

  return normalized;
}

function parseListQuery(schema, input) {
  const parsed = schema.safeParse(input);
  if (parsed.success) return parsed.data;

  throw new GptApiDtoValidationError("Query parameters are invalid.", {
    issues: parsed.error.issues,
  });
}

function encodeCursor(cursor) {
  return Buffer.from(
    JSON.stringify(pageCursorSchema.parse(cursor)),
    "utf8",
  ).toString("base64url");
}

function validateDto(schema, value) {
  const parsed = schema.safeParse(value);
  if (parsed.success) return parsed.data;

  throw new GptApiDtoValidationError("GPT API DTO validation failed.", {
    issues: parsed.error.issues,
  });
}

export function parseBookingsListQuery(searchParams) {
  const input = readSearchParams(searchParams);

  return parseListQuery(bookingsListQuerySchema, {
    bookingCode: normalizeOptionalString(input.bookingCode),
    cursor: normalizeCursorInput(input.cursor),
    limit: parseIntegerParam(input.limit, "limit") ?? GPT_API_DEFAULT_PAGE_SIZE,
    scheduledFrom: normalizeDateOnly(input.scheduledFrom),
    scheduledTo: normalizeDateOnly(input.scheduledTo),
    status: normalizeOptionalString(input.status),
    workflowStatus: normalizeOptionalString(input.workflowStatus),
  });
}

export function parseInvoicesListQuery(searchParams) {
  const input = readSearchParams(searchParams);

  return parseListQuery(invoicesListQuerySchema, {
    cursor: normalizeCursorInput(input.cursor),
    invoiceNumber: normalizeOptionalString(input.invoiceNumber),
    limit: parseIntegerParam(input.limit, "limit") ?? GPT_API_DEFAULT_PAGE_SIZE,
    paidFrom: normalizeDateOnly(input.paidFrom),
    paidTo: normalizeDateOnly(input.paidTo),
    status: normalizeOptionalString(input.status),
  });
}

export function parseFilesListQuery(searchParams) {
  const input = readSearchParams(searchParams);

  return parseListQuery(filesListQuerySchema, {
    bookingCode: normalizeOptionalString(input.bookingCode),
    cursor: normalizeCursorInput(input.cursor),
    fileId: parseIntegerParam(input.fileId, "fileId"),
    limit: parseIntegerParam(input.limit, "limit") ?? GPT_API_DEFAULT_PAGE_SIZE,
    status: normalizeOptionalString(input.status),
    type: normalizeOptionalString(input.type),
    uploadedFrom: normalizeDateOnly(input.uploadedFrom),
    uploadedTo: normalizeDateOnly(input.uploadedTo),
  });
}

export function buildSequelizeCursorPagination(
  cursor,
  { idField = "id", sortField = "createdAt" } = {},
) {
  if (!cursor) {
    return {
      order: [
        [sortField, "DESC"],
        [idField, "DESC"],
      ],
      where: {},
    };
  }

  const validatedCursor = pageCursorSchema.parse(cursor);

  return {
    order: [
      [sortField, "DESC"],
      [idField, "DESC"],
    ],
    where: {
      [Op.or]: [
        {
          [sortField]: {
            [Op.lt]: validatedCursor.sortValue,
          },
        },
        {
          [sortField]: validatedCursor.sortValue,
          [idField]: {
            [Op.lt]: validatedCursor.id,
          },
        },
      ],
    },
  };
}

export function buildCursorPaginationResult(items, pageSize, getCursorValue) {
  const limitedItems = items.slice(0, pageSize);
  const hasMore = items.length > pageSize;
  const nextCursor =
    hasMore && limitedItems.length > 0
      ? encodeCursor(getCursorValue(limitedItems[limitedItems.length - 1]))
      : null;

  return {
    hasMore,
    items: limitedItems,
    nextCursor,
  };
}

export function serializeConnectedAccountDto(user) {
  const normalizedUser = normalizeModelValue(user) || {};

  return validateDto(gptConnectedAccountDtoSchema, {
    account: {
      accountType: normalizedUser.accountType || "INDIVIDUAL",
      displayName: normalizeDisplayName(normalizedUser),
      phoneLast4: normalizePhoneLast4(normalizedUser.phone),
    },
  });
}

export function serializeBookingDto(booking) {
  const normalizedBooking = normalizeModelValue(booking) || {};

  return validateDto(gptBookingDtoSchema, {
    bookingCode: formatBookingReference(normalizedBooking),
    createdAt: serializeDateTime(normalizedBooking.createdAt),
    currency: "AED",
    property: normalizePropertySummary(normalizedBooking),
    scheduledDate: normalizeOptionalString(normalizedBooking.date) || null,
    scheduledStartTime:
      normalizeOptionalString(normalizedBooking.startTime) || null,
    services: normalizeBookingServices(normalizedBooking),
    status: normalizedBooking.status,
    totalAmount:
      normalizedBooking.total === undefined || normalizedBooking.total === null
        ? null
        : Number(normalizedBooking.total),
    workflowStatus:
      normalizedBooking.workflowStatus || BOOKING_WORKFLOW_STATUS.SHOOT_BOOKED,
  });
}

export function buildBookingsListResponse(bookings, pageSize, getCursorValue) {
  const { hasMore, items, nextCursor } = buildCursorPaginationResult(
    bookings,
    pageSize,
    getCursorValue,
  );

  return validateDto(gptBookingListResponseSchema, {
    bookings: items.map(serializeBookingDto),
    pagination: {
      hasMore,
      nextCursor,
    },
  });
}

export function serializeInvoiceDto(transaction) {
  const normalizedTransaction = normalizeModelValue(transaction) || {};
  const invoiceNumber = formatInvoiceNumber(normalizedTransaction);

  return validateDto(gptInvoiceDtoSchema, {
    amount: Number(normalizedTransaction.amount || 0),
    bookingCodes: uniqueStrings(
      (normalizedTransaction.bookings || []).map((booking) =>
        formatBookingReference(booking),
      ),
    ).slice(0, 20),
    createdAt: serializeDateTime(normalizedTransaction.createdAt),
    currency: "AED",
    invoiceNumber,
    paidAt: serializeDateTime(normalizedTransaction.paidAt),
    status: normalizedTransaction.status,
    websiteUrl: `/dashboard/invoices?invoiceNumber=${encodeURIComponent(invoiceNumber)}`,
  });
}

export function buildInvoicesListResponse(invoices, pageSize, getCursorValue) {
  const { hasMore, items, nextCursor } = buildCursorPaginationResult(
    invoices,
    pageSize,
    getCursorValue,
  );

  return validateDto(gptInvoiceListResponseSchema, {
    invoices: items.map(serializeInvoiceDto),
    pagination: {
      hasMore,
      nextCursor,
    },
  });
}

export function serializeDeliveryFileDto(file) {
  const normalizedFile = normalizeModelValue(file) || {};
  const currentVersion =
    normalizeModelValue(normalizedFile.currentVersion) || {};
  const booking = normalizeModelValue(normalizedFile.booking) || {};

  return validateDto(gptDeliveryFileDtoSchema, {
    bookingCode: formatBookingReference(booking),
    fileId: Number(normalizedFile.id),
    fileName: normalizeOptionalString(currentVersion.originalFilename) || null,
    label: String(normalizedFile.label || "").trim(),
    mimeType: normalizeOptionalString(currentVersion.mimeType) || null,
    reviewDeadlineAt: serializeDateTime(normalizedFile.reviewDeadlineAt),
    revisionCount: Number(normalizedFile.revisionCount || 0),
    sizeBytes:
      currentVersion.sizeBytes === undefined ||
      currentVersion.sizeBytes === null
        ? null
        : Number(currentVersion.sizeBytes),
    status: normalizedFile.status,
    type: normalizedFile.type,
    uploadedAt: serializeDateTime(currentVersion.uploadedAt),
    websiteUrl: `/dashboard/files?fileId=${encodeURIComponent(Number(normalizedFile.id))}`,
  });
}

export function buildDeliveryFilesListResponse(
  files,
  pageSize,
  getCursorValue,
) {
  const { hasMore, items, nextCursor } = buildCursorPaginationResult(
    files,
    pageSize,
    getCursorValue,
  );

  return validateDto(gptDeliveryFileListResponseSchema, {
    files: items.map(serializeDeliveryFileDto),
    pagination: {
      hasMore,
      nextCursor,
    },
  });
}
