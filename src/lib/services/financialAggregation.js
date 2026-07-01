import {
  EXPENSE_CATEGORY_KEYS,
  getExpenseCategoryLabel,
} from "@/lib/config/expenseCategories";

const REPORTING_TIMEZONE = "Asia/Dubai";
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const SERVICE_KEY_UNALLOCATED = "unallocated";
const SERVICE_LABEL_UNALLOCATED = "Unallocated";
const BUSINESS_DAY_MS = 24 * 60 * 60 * 1000;
const MAX_FINANCIAL_RANGE_DAYS = 366;
const DASHBOARD_COMPARISON_MODE = "previous_period";
const MAX_DASHBOARD_RECENT_BOOKINGS = 10;
const DEFAULT_DRILLDOWN_PAGE = 1;
const DEFAULT_DRILLDOWN_PAGE_SIZE = 25;
const MAX_DRILLDOWN_PAGE_SIZE = 100;
const FINANCIAL_REPORT_GROUP_BY_WEEK = "week";
const FINANCIAL_REPORT_GROUP_BY_MONTH = "month";
const FINANCIAL_REPORT_GROUP_BY_VALUES = new Set([
  FINANCIAL_REPORT_GROUP_BY_WEEK,
  FINANCIAL_REPORT_GROUP_BY_MONTH,
]);
const BOOKING_STATUS_BUCKET_ALL = "all";
const BOOKING_STATUS_BUCKET_PENDING = "pending";
const BOOKING_STATUS_BUCKET_COMPLETED = "completed";
const BOOKING_STATUS_BUCKET_CANCELLED = "cancelled";
const BOOKING_STATUS_BUCKETS = new Set([
  BOOKING_STATUS_BUCKET_ALL,
  BOOKING_STATUS_BUCKET_PENDING,
  BOOKING_STATUS_BUCKET_COMPLETED,
  BOOKING_STATUS_BUCKET_CANCELLED,
]);
const SORT_DIRECTION_ASC = "asc";
const SORT_DIRECTION_DESC = "desc";
const DRILLDOWN_SERVICE_KEYS = new Set([
  "photography",
  SERVICE_KEY_UNALLOCATED,
  "tour-360",
  "videography",
]);
const DRILLDOWN_METRIC_CONFIG = {
  cancelledBookings: {
    allowedBookingStatusBuckets: new Set([
      BOOKING_STATUS_BUCKET_ALL,
      BOOKING_STATUS_BUCKET_CANCELLED,
    ]),
    allowedFilterKeys: new Set(["bookingStatusBucket"]),
    allowedSortKeys: ["cancelledAt", "date", "id", "total"],
    defaultSortDirection: SORT_DIRECTION_DESC,
    defaultSortKey: "cancelledAt",
    totalKind: "count",
  },
  completedBookings: {
    allowedBookingStatusBuckets: new Set([
      BOOKING_STATUS_BUCKET_ALL,
      BOOKING_STATUS_BUCKET_COMPLETED,
    ]),
    allowedFilterKeys: new Set(["bookingStatusBucket"]),
    allowedSortKeys: ["completedAt", "date", "id", "total"],
    defaultSortDirection: SORT_DIRECTION_DESC,
    defaultSortKey: "completedAt",
    totalKind: "count",
  },
  expenses: {
    allowedFilterKeys: new Set(["expenseCategory"]),
    allowedSortKeys: ["amount", "createdAt", "expenseDate", "id"],
    defaultSortDirection: SORT_DIRECTION_DESC,
    defaultSortKey: "expenseDate",
    totalKind: "amount",
  },
  grossPayments: {
    allowedFilterKeys: new Set(),
    allowedSortKeys: ["amount", "id", "paidAt"],
    defaultSortDirection: SORT_DIRECTION_DESC,
    defaultSortKey: "paidAt",
    totalKind: "amount",
  },
  lostValue: {
    allowedBookingStatusBuckets: new Set([
      BOOKING_STATUS_BUCKET_ALL,
      BOOKING_STATUS_BUCKET_CANCELLED,
    ]),
    allowedFilterKeys: new Set(["bookingStatusBucket"]),
    allowedSortKeys: ["cancelledAt", "date", "id", "lostValue"],
    defaultSortDirection: SORT_DIRECTION_DESC,
    defaultSortKey: "cancelledAt",
    totalKind: "amount",
  },
  netProfit: {
    allowedFilterKeys: new Set(["expenseCategory"]),
    allowedSortKeys: ["eventAt", "id", "netAmount"],
    defaultSortDirection: SORT_DIRECTION_DESC,
    defaultSortKey: "eventAt",
    totalKind: "amount",
  },
  netRevenue: {
    allowedFilterKeys: new Set(),
    allowedSortKeys: ["eventAt", "id", "netAmount"],
    defaultSortDirection: SORT_DIRECTION_DESC,
    defaultSortKey: "eventAt",
    totalKind: "amount",
  },
  outstandingBalance: {
    allowedBookingStatusBuckets: new Set([
      BOOKING_STATUS_BUCKET_ALL,
      BOOKING_STATUS_BUCKET_COMPLETED,
      BOOKING_STATUS_BUCKET_PENDING,
    ]),
    allowedFilterKeys: new Set(["bookingStatusBucket"]),
    allowedSortKeys: ["date", "id", "outstandingBalance", "total"],
    defaultSortDirection: SORT_DIRECTION_DESC,
    defaultSortKey: "date",
    totalKind: "amount",
  },
  pendingBookings: {
    allowedBookingStatusBuckets: new Set([
      BOOKING_STATUS_BUCKET_ALL,
      BOOKING_STATUS_BUCKET_PENDING,
    ]),
    allowedFilterKeys: new Set(["bookingStatusBucket"]),
    allowedSortKeys: ["date", "id", "total"],
    defaultSortDirection: SORT_DIRECTION_DESC,
    defaultSortKey: "date",
    totalKind: "count",
  },
  recentBookings: {
    allowedBookingStatusBuckets: BOOKING_STATUS_BUCKETS,
    allowedFilterKeys: new Set(["bookingStatusBucket"]),
    allowedSortKeys: ["createdAt", "date", "id", "total"],
    defaultSortDirection: SORT_DIRECTION_DESC,
    defaultSortKey: "createdAt",
    totalKind: "count",
  },
  refunds: {
    allowedFilterKeys: new Set(),
    allowedSortKeys: ["amount", "id", "refundedAt"],
    defaultSortDirection: SORT_DIRECTION_DESC,
    defaultSortKey: "refundedAt",
    totalKind: "amount",
  },
  revenueByService: {
    allowedFilterKeys: new Set(["serviceKey"]),
    allowedSortKeys: ["amount", "bookingId", "paidAt", "serviceLabel"],
    defaultSortDirection: SORT_DIRECTION_DESC,
    defaultSortKey: "paidAt",
    totalKind: "amount",
  },
  scheduleSummary: {
    allowedBookingStatusBuckets: BOOKING_STATUS_BUCKETS,
    allowedFilterKeys: new Set(["bookingStatusBucket"]),
    allowedSortKeys: ["date", "id", "statusBucket", "total"],
    defaultSortDirection: SORT_DIRECTION_DESC,
    defaultSortKey: "date",
    totalKind: "count",
  },
};

function toCents(value) {
  const normalized = Number(value || 0);

  if (!Number.isFinite(normalized)) {
    return 0;
  }

  return Math.round(normalized * 100);
}

function fromCents(value) {
  return Math.round(Number(value || 0)) / 100;
}

function addDays(dateString, days) {
  const [year, month, day] = String(dateString)
    .split("-")
    .map((value) => Number(value));
  const instant = new Date(Date.UTC(year, month - 1, day + days));

  return instant.toISOString().slice(0, 10);
}

function addMonths(dateString, months) {
  const [year, month] = String(dateString)
    .split("-")
    .map((value) => Number(value));
  const instant = new Date(Date.UTC(year, month - 1 + months, 1));

  return instant.toISOString().slice(0, 10);
}

function formatDubaiDate(value) {
  const instant = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(instant.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORTING_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

function dateOnlyToUtcDate(dateString) {
  const [year, month, day] = String(dateString)
    .split("-")
    .map((value) => Number(value));

  return new Date(Date.UTC(year, month - 1, day));
}

function businessDateSpanDays(startDate, endDateExclusive) {
  return Math.round(
    (dateOnlyToUtcDate(endDateExclusive) - dateOnlyToUtcDate(startDate)) /
      BUSINESS_DAY_MS,
  );
}

function normalizeRangeBoundary(value, { endExclusive = false } = {}) {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    throw new Error(
      `Financial aggregation ${endExclusive ? "rangeEnd" : "rangeStart"} is required`,
    );
  }

  if (DATE_ONLY_PATTERN.test(normalized)) {
    const businessDate = endExclusive ? addDays(normalized, 1) : normalized;

    return {
      businessDate,
      instant: new Date(`${businessDate}T00:00:00+04:00`),
    };
  }

  const instant = new Date(normalized);

  if (Number.isNaN(instant.getTime())) {
    throw new Error(
      `Financial aggregation ${endExclusive ? "rangeEnd" : "rangeStart"} must be a valid ISO timestamp or YYYY-MM-DD date`,
    );
  }

  return {
    businessDate: formatDubaiDate(instant),
    instant,
  };
}

export function normalizeFinancialAggregationFilters(input = {}) {
  const timezone = input.timezone ?? REPORTING_TIMEZONE;

  if (timezone !== REPORTING_TIMEZONE) {
    throw new Error(
      `Financial aggregation timezone must be ${REPORTING_TIMEZONE}`,
    );
  }

  const normalizedStart = normalizeRangeBoundary(input.rangeStart);
  const normalizedEnd = normalizeRangeBoundary(input.rangeEnd, {
    endExclusive: true,
  });

  if (normalizedEnd.instant <= normalizedStart.instant) {
    throw new Error("Financial aggregation rangeEnd must be after rangeStart");
  }

  const rangeDayCount = businessDateSpanDays(
    normalizedStart.businessDate,
    normalizedEnd.businessDate,
  );

  if (rangeDayCount > MAX_FINANCIAL_RANGE_DAYS) {
    throw new Error(
      `Financial aggregation range cannot exceed ${MAX_FINANCIAL_RANGE_DAYS} days`,
    );
  }

  return {
    timezone,
    rangeStart: normalizedStart.instant.toISOString(),
    rangeEnd: normalizedEnd.instant.toISOString(),
    rangeStartBusinessDate: normalizedStart.businessDate,
    rangeEndBusinessDateExclusive: normalizedEnd.businessDate,
    rangeStartInstant: normalizedStart.instant,
    rangeEndInstant: normalizedEnd.instant,
    rangeDayCount,
  };
}

function serializeNormalizedFilters(filters) {
  return {
    rangeEnd: filters.rangeEnd,
    rangeEndBusinessDateExclusive: filters.rangeEndBusinessDateExclusive,
    rangeStart: filters.rangeStart,
    rangeStartBusinessDate: filters.rangeStartBusinessDate,
    timezone: filters.timezone,
  };
}

function serializeFinancialReportFilters(filters) {
  return {
    ...serializeNormalizedFilters(filters),
    comparisonMode: filters.comparisonMode,
    groupBy: filters.groupBy,
  };
}

function serializeDrilldownFilters(filters) {
  return {
    ...serializeNormalizedFilters(filters),
    bookingStatusBucket: filters.bookingStatusBucket,
    expenseCategory: filters.expenseCategory,
    metricKey: filters.metricKey,
    page: filters.page,
    pageSize: filters.pageSize,
    serviceKey: filters.serviceKey,
    sortDirection: filters.sortDirection,
    sortKey: filters.sortKey,
  };
}

function toPlainRecord(record) {
  return typeof record?.get === "function"
    ? record.get({ plain: true })
    : record;
}

function normalizeOptionalSlug(value) {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim().toLowerCase();

  return normalized || null;
}

function normalizeMetricKey(value) {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();

  return normalized || null;
}

function normalizeOptionalInteger(value, { defaultValue, label, min, max }) {
  if (value == null || String(value).trim() === "") {
    return defaultValue;
  }

  const normalized = Number(value);

  if (!Number.isInteger(normalized)) {
    throw new Error(`${label} must be an integer`);
  }

  if (normalized < min || normalized > max) {
    throw new Error(`${label} must be between ${min} and ${max}`);
  }

  return normalized;
}

function normalizeSortDirection(value, defaultValue) {
  if (value == null || String(value).trim() === "") {
    return defaultValue;
  }

  const normalized = String(value).trim().toLowerCase();

  if (normalized !== SORT_DIRECTION_ASC && normalized !== SORT_DIRECTION_DESC) {
    throw new Error(
      `Financial drill-down sortDirection must be ${SORT_DIRECTION_ASC} or ${SORT_DIRECTION_DESC}`,
    );
  }

  return normalized;
}

function normalizeBookingStatusBucket(value) {
  const normalized = normalizeOptionalSlug(value);

  if (!normalized) {
    return null;
  }

  if (!BOOKING_STATUS_BUCKETS.has(normalized)) {
    throw new Error("Financial drill-down bookingStatusBucket is unsupported");
  }

  return normalized;
}

function normalizeExpenseCategory(value) {
  const normalized = normalizeOptionalSlug(value);

  if (!normalized) {
    return null;
  }

  if (!EXPENSE_CATEGORY_KEYS.has(normalized)) {
    throw new Error("Financial drill-down expenseCategory is unsupported");
  }

  return normalized;
}

function normalizeServiceKey(value) {
  const normalized = normalizeOptionalSlug(value);

  if (!normalized) {
    return null;
  }

  if (!DRILLDOWN_SERVICE_KEYS.has(normalized)) {
    throw new Error("Financial drill-down serviceKey is unsupported");
  }

  return normalized;
}

function validateDrilldownMetricFilters(filters, metricConfig) {
  const providedFilterKeys = [];

  if (filters.bookingStatusBucket) {
    providedFilterKeys.push("bookingStatusBucket");
  }

  if (filters.expenseCategory) {
    providedFilterKeys.push("expenseCategory");
  }

  if (filters.serviceKey) {
    providedFilterKeys.push("serviceKey");
  }

  providedFilterKeys.forEach((key) => {
    if (!metricConfig.allowedFilterKeys.has(key)) {
      throw new Error(
        `Financial drill-down metric ${filters.metricKey} does not support ${key}`,
      );
    }
  });

  if (
    filters.bookingStatusBucket &&
    metricConfig.allowedBookingStatusBuckets &&
    !metricConfig.allowedBookingStatusBuckets.has(filters.bookingStatusBucket)
  ) {
    throw new Error(
      `Financial drill-down metric ${filters.metricKey} does not support bookingStatusBucket=${filters.bookingStatusBucket}`,
    );
  }
}

function isInstantInRange(value, filters) {
  if (!value) {
    return false;
  }

  const instant = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(instant.getTime())) {
    return false;
  }

  return (
    instant >= filters.rangeStartInstant && instant < filters.rangeEndInstant
  );
}

function normalizeBusinessDate(value) {
  if (!value) {
    return null;
  }

  const normalized = String(value).trim();

  if (DATE_ONLY_PATTERN.test(normalized)) {
    return normalized;
  }

  return formatDubaiDate(normalized);
}

function isBusinessDateInRange(value, filters) {
  const normalized = normalizeBusinessDate(value);

  if (!normalized) {
    return false;
  }

  return (
    normalized >= filters.rangeStartBusinessDate &&
    normalized < filters.rangeEndBusinessDateExclusive
  );
}

function roundMetricValue(value, digits = 2) {
  const multiplier = 10 ** digits;

  return Math.round(Number(value || 0) * multiplier) / multiplier;
}

function getServiceAmount(priceConfig) {
  const amount =
    typeof priceConfig === "object"
      ? Number(priceConfig?.price || 0)
      : Number(priceConfig || 0);

  return Number.isFinite(amount) ? amount : 0;
}

function parseVideographySelections(value) {
  return String(value || "")
    .split("|")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function resolveVideographyPriceConfig(servicePriceConfig, subService) {
  if (
    !subService ||
    !servicePriceConfig ||
    typeof servicePriceConfig !== "object"
  ) {
    return servicePriceConfig;
  }

  if (subService.includes(".")) {
    const [mainService, category] = subService.split(".");
    const nested = servicePriceConfig?.[mainService]?.[category];

    if (nested !== undefined) {
      return nested;
    }

    const mainConfig = servicePriceConfig?.[mainService];

    if (
      mainConfig &&
      typeof mainConfig === "object" &&
      !Array.isArray(mainConfig) &&
      "price" in mainConfig
    ) {
      return mainConfig;
    }
  }

  const direct = servicePriceConfig?.[subService];

  if (direct !== undefined) {
    return direct;
  }

  return servicePriceConfig;
}

function getServiceKey(service) {
  const normalized = String(service || "")
    .trim()
    .toLowerCase();

  if (normalized.startsWith("photography")) {
    return "photography";
  }

  if (normalized.startsWith("videography")) {
    return "videography";
  }

  if (normalized.startsWith("360")) {
    return "tour-360";
  }

  return normalized.replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
}

function buildAttributedServiceAmounts(booking, pricingConfig) {
  const bookingTotalCents = toCents(booking?.total);
  const property = booking?.propertyDetails || {};
  const shoot = booking?.shootDetails || {};
  const services = Array.isArray(shoot.services) ? shoot.services : [];
  const propertyType =
    property.type || property.propertyType || booking?.propertyType;
  const propertySize =
    property.size || property.propertySize || booking?.propertySize;
  const sizeConfig = pricingConfig?.[propertyType]?.sizes?.find(
    (size) => size.label === propertySize,
  );
  const prices = sizeConfig?.prices || {};
  const items = [];

  services.forEach((service) => {
    if (service === "Videography") {
      const videographySelections = parseVideographySelections(
        shoot.videographySubService,
      );
      const videographyConfig = prices[service];

      if (videographySelections.length > 0) {
        videographySelections.forEach((selection) => {
          items.push({
            amountCents: toCents(
              getServiceAmount(
                resolveVideographyPriceConfig(videographyConfig, selection),
              ),
            ),
            key: "videography",
            label: "Videography",
          });
        });
        return;
      }

      items.push({
        amountCents: toCents(getServiceAmount(videographyConfig)),
        key: "videography",
        label: "Videography",
      });
      return;
    }

    items.push({
      amountCents: toCents(getServiceAmount(prices[service])),
      key: getServiceKey(service),
      label: String(service || "Service").replace(/_/gu, " "),
    });
  });

  const validItems = items.filter((item) => item.amountCents > 0);

  if (validItems.length === 0) {
    return [
      {
        amountCents: bookingTotalCents,
        key: SERVICE_KEY_UNALLOCATED,
        label: SERVICE_LABEL_UNALLOCATED,
      },
    ];
  }

  const attributedTotalCents = validItems.reduce(
    (sum, item) => sum + item.amountCents,
    0,
  );
  const deltaCents = bookingTotalCents - attributedTotalCents;

  if (deltaCents !== 0) {
    validItems[validItems.length - 1] = {
      ...validItems[validItems.length - 1],
      amountCents: validItems[validItems.length - 1].amountCents + deltaCents,
    };
  }

  return validItems;
}

function addGroupedAmount(store, key, label, amountCents) {
  if (!amountCents) {
    return;
  }

  const current = store.get(key);

  store.set(key, {
    amountCents: (current?.amountCents || 0) + amountCents,
    key,
    label,
  });
}

function buildDashboardComparisonEntry(currentValue, previousValue) {
  const current = Number(currentValue || 0);
  const previous = Number(previousValue || 0);
  const delta = roundMetricValue(current - previous);
  const deltaPercentage =
    previous === 0
      ? current === 0
        ? 0
        : null
      : roundMetricValue(((current - previous) / previous) * 100);

  return {
    current,
    previous,
    delta,
    deltaPercentage,
    direction: delta === 0 ? "flat" : delta > 0 ? "up" : "down",
  };
}

function isCompletedBooking(booking) {
  return (
    booking?.status === "COMPLETED" ||
    booking?.workflowStatus === "PROJECT_COMPLETED" ||
    Boolean(booking?.completedAt)
  );
}

function isCancelledBooking(booking) {
  return booking?.status === "CANCELLED" || Boolean(booking?.cancelledAt);
}

function getRefundEventAmountCents(transaction) {
  const lastRefundAmount = Number(transaction?.metadata?.lastRefund?.amount);

  if (Number.isFinite(lastRefundAmount) && lastRefundAmount > 0) {
    return toCents(lastRefundAmount);
  }

  return toCents(transaction?.refundedAmount);
}

export function aggregateFinancialOverview({
  bookings = [],
  transactions = [],
  expenses = [],
  pricingConfig = {},
  filters: rawFilters,
} = {}) {
  const filters = normalizeFinancialAggregationFilters(rawFilters);
  const serviceRevenue = new Map();
  const paidBookingIds = new Set();
  const bookingsByTransactionId = new Map();

  bookings.forEach((booking) => {
    if (booking?.transactionId == null) {
      return;
    }

    const transactionId = Number(booking.transactionId);

    if (!bookingsByTransactionId.has(transactionId)) {
      bookingsByTransactionId.set(transactionId, []);
    }

    bookingsByTransactionId.get(transactionId).push(booking);
  });

  let grossPaymentsCents = 0;
  let refundsCents = 0;

  transactions.forEach((transaction) => {
    if (transaction?.status !== "success") {
      return;
    }

    if (isInstantInRange(transaction.paidAt, filters)) {
      grossPaymentsCents += toCents(transaction.amount);

      const linkedBookings = bookingsByTransactionId.get(
        Number(transaction.id),
      );

      if (Array.isArray(linkedBookings)) {
        linkedBookings.forEach((booking) => {
          paidBookingIds.add(Number(booking.id));

          buildAttributedServiceAmounts(booking, pricingConfig).forEach(
            (item) => {
              addGroupedAmount(
                serviceRevenue,
                item.key,
                item.label,
                item.amountCents,
              );
            },
          );
        });
      }
    }

    const refundOccurredAt =
      transaction?.metadata?.lastRefund?.refundedAt || transaction?.paidAt;
    const refundAmountCents = getRefundEventAmountCents(transaction);

    if (
      refundAmountCents > 0 &&
      refundOccurredAt &&
      isInstantInRange(refundOccurredAt, filters)
    ) {
      refundsCents += refundAmountCents;
    }
  });

  let expensesCents = 0;
  let completedBookings = 0;
  let pendingBookings = 0;
  let cancelledBookings = 0;
  let lostValueCents = 0;
  let outstandingBalanceCents = 0;

  expenses.forEach((expense) => {
    if (expense?.deletedAt) {
      return;
    }

    if (isBusinessDateInRange(expense.expenseDate, filters)) {
      expensesCents += toCents(expense.amount);
    }
  });

  bookings.forEach((booking) => {
    if (
      isCompletedBooking(booking) &&
      isInstantInRange(booking.completedAt, filters)
    ) {
      completedBookings += 1;
    }

    if (
      isCancelledBooking(booking) &&
      isInstantInRange(booking.cancelledAt, filters)
    ) {
      cancelledBookings += 1;
      lostValueCents += toCents(booking.total);
    }

    if (
      !isCancelledBooking(booking) &&
      booking?.status !== "DRAFT" &&
      isBusinessDateInRange(booking.date, filters)
    ) {
      const outstandingBalanceCentsForBooking = Math.max(
        toCents(booking?.total) - toCents(booking?.paidAmount),
        0,
      );

      outstandingBalanceCents += outstandingBalanceCentsForBooking;

      if (!isCompletedBooking(booking)) {
        pendingBookings += 1;
      }
    }
  });

  const netRevenueCents = grossPaymentsCents - refundsCents;
  const netProfitCents = netRevenueCents - expensesCents;
  const paidBookingsCount = paidBookingIds.size;

  return {
    filters: {
      rangeEnd: filters.rangeEnd,
      rangeEndBusinessDateExclusive: filters.rangeEndBusinessDateExclusive,
      rangeStart: filters.rangeStart,
      rangeStartBusinessDate: filters.rangeStartBusinessDate,
      timezone: filters.timezone,
    },
    totals: {
      expenses: fromCents(expensesCents),
      grossPayments: fromCents(grossPaymentsCents),
      lostValue: fromCents(lostValueCents),
      netProfit: fromCents(netProfitCents),
      netRevenue: fromCents(netRevenueCents),
      outstandingBalance: fromCents(outstandingBalanceCents),
      refunds: fromCents(refundsCents),
    },
    counts: {
      cancelledBookings,
      completedBookings,
      paidBookings: paidBookingsCount,
      pendingBookings,
    },
    averages: {
      averageBookingValue:
        paidBookingsCount > 0
          ? fromCents(Math.round(netRevenueCents / paidBookingsCount))
          : 0,
    },
    breakdowns: {
      serviceRevenue: Array.from(serviceRevenue.values())
        .sort((left, right) => left.label.localeCompare(right.label))
        .map((entry) => ({
          amount: fromCents(entry.amountCents),
          key: entry.key,
          label: entry.label,
        })),
    },
  };
}

function buildPreviousPeriodFilters(filters) {
  const rangeDurationMs =
    filters.rangeEndInstant.getTime() - filters.rangeStartInstant.getTime();

  return normalizeFinancialAggregationFilters({
    rangeStart: new Date(
      filters.rangeStartInstant.getTime() - rangeDurationMs,
    ).toISOString(),
    rangeEnd: filters.rangeStartInstant.toISOString(),
    timezone: filters.timezone,
  });
}

function resolveTrendGranularity(rangeDayCount) {
  if (rangeDayCount <= 31) {
    return "day";
  }

  if (rangeDayCount <= 120) {
    return "week";
  }

  return "month";
}

function getBucketStartBusinessDate(businessDate, granularity) {
  if (granularity === "day") {
    return businessDate;
  }

  if (granularity === "month") {
    return `${businessDate.slice(0, 7)}-01`;
  }

  const instant = dateOnlyToUtcDate(businessDate);
  const isoWeekday = (instant.getUTCDay() + 6) % 7;

  return addDays(businessDate, -isoWeekday);
}

function getBucketEndBusinessDateExclusive(
  bucketStartBusinessDate,
  granularity,
) {
  if (granularity === "day") {
    return addDays(bucketStartBusinessDate, 1);
  }

  if (granularity === "week") {
    return addDays(bucketStartBusinessDate, 7);
  }

  const [year, month] = bucketStartBusinessDate
    .split("-")
    .map((value) => Number(value));

  return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
}

function buildRevenueTrendForGranularity(transactions, filters, granularity) {
  const bucketMap = new Map();

  for (
    let businessDate = filters.rangeStartBusinessDate;
    businessDate < filters.rangeEndBusinessDateExclusive;
    businessDate = addDays(businessDate, 1)
  ) {
    const bucketStartBusinessDate = getBucketStartBusinessDate(
      businessDate,
      granularity,
    );

    if (bucketMap.has(bucketStartBusinessDate)) {
      continue;
    }

    bucketMap.set(bucketStartBusinessDate, {
      bucketStartBusinessDate,
      bucketEndBusinessDateExclusive: getBucketEndBusinessDateExclusive(
        bucketStartBusinessDate,
        granularity,
      ),
      grossPaymentsCents: 0,
      refundsCents: 0,
    });
  }

  transactions.forEach((transaction) => {
    if (transaction?.status !== "success") {
      return;
    }

    if (isInstantInRange(transaction.paidAt, filters)) {
      const businessDate = formatDubaiDate(transaction.paidAt);
      const bucketStartBusinessDate = getBucketStartBusinessDate(
        businessDate,
        granularity,
      );

      if (bucketMap.has(bucketStartBusinessDate)) {
        bucketMap.get(bucketStartBusinessDate).grossPaymentsCents += toCents(
          transaction.amount,
        );
      }
    }

    const refundOccurredAt =
      transaction?.metadata?.lastRefund?.refundedAt || transaction?.paidAt;
    const refundAmountCents = getRefundEventAmountCents(transaction);

    if (
      refundAmountCents > 0 &&
      refundOccurredAt &&
      isInstantInRange(refundOccurredAt, filters)
    ) {
      const businessDate = formatDubaiDate(refundOccurredAt);
      const bucketStartBusinessDate = getBucketStartBusinessDate(
        businessDate,
        granularity,
      );

      if (bucketMap.has(bucketStartBusinessDate)) {
        bucketMap.get(bucketStartBusinessDate).refundsCents +=
          refundAmountCents;
      }
    }
  });

  return {
    granularity,
    buckets: Array.from(bucketMap.values()).map((bucket) => ({
      bucketStartBusinessDate: bucket.bucketStartBusinessDate,
      bucketEndBusinessDateExclusive: bucket.bucketEndBusinessDateExclusive,
      grossPayments: fromCents(bucket.grossPaymentsCents),
      refunds: fromCents(bucket.refundsCents),
      netRevenue: fromCents(bucket.grossPaymentsCents - bucket.refundsCents),
    })),
  };
}

function buildRevenueTrend(transactions, filters) {
  return buildRevenueTrendForGranularity(
    transactions,
    filters,
    resolveTrendGranularity(filters.rangeDayCount),
  );
}

function buildScheduleSummary(bookings, filters) {
  const dayMap = new Map();

  for (
    let businessDate = filters.rangeStartBusinessDate;
    businessDate < filters.rangeEndBusinessDateExclusive;
    businessDate = addDays(businessDate, 1)
  ) {
    dayMap.set(businessDate, {
      bucketStartBusinessDate: businessDate,
      cancelled: 0,
      completed: 0,
      pending: 0,
      total: 0,
    });
  }

  bookings.forEach((booking) => {
    if (
      booking?.status === "DRAFT" ||
      !isBusinessDateInRange(booking?.date, filters)
    ) {
      return;
    }

    const day = dayMap.get(normalizeBusinessDate(booking.date));

    if (!day) {
      return;
    }

    const statusBucket = isCancelledBooking(booking)
      ? "cancelled"
      : isCompletedBooking(booking)
        ? "completed"
        : "pending";

    day[statusBucket] += 1;
    day.total += 1;
  });

  const days = Array.from(dayMap.values());

  return {
    totals: days.reduce(
      (summary, day) => ({
        cancelled: summary.cancelled + day.cancelled,
        completed: summary.completed + day.completed,
        pending: summary.pending + day.pending,
        total: summary.total + day.total,
      }),
      { cancelled: 0, completed: 0, pending: 0, total: 0 },
    ),
    days,
    recentDayDetails: days
      .filter((day) => day.total > 0)
      .slice(-7)
      .reverse(),
  };
}

function doesBookingIntersectDashboardRange(booking, filters) {
  if (!booking || booking.status === "DRAFT") {
    return false;
  }

  return (
    isBusinessDateInRange(booking.date, filters) ||
    isInstantInRange(booking.completedAt, filters) ||
    isInstantInRange(booking.cancelledAt, filters)
  );
}

function serializeRecentBooking(booking) {
  const plain =
    typeof booking?.get === "function" ? booking.get({ plain: true }) : booking;
  const user = plain?.user || null;

  return {
    id: Number(plain?.id),
    bookingCode: plain?.bookingCode || null,
    createdAt: plain?.createdAt
      ? new Date(plain.createdAt).toISOString()
      : null,
    date: plain?.date || null,
    status: plain?.status || null,
    total: roundMetricValue(plain?.total),
    workflowStatus: plain?.workflowStatus || null,
    customer: user
      ? {
          id: Number(user.id),
          email: user.email || null,
          fullName: user.fullName || null,
          phone: user.phone || null,
        }
      : null,
  };
}

function getDrilldownMetricConfig(metricKey) {
  const config = DRILLDOWN_METRIC_CONFIG[metricKey];

  if (!config) {
    throw new Error("Financial drill-down metricKey is unsupported");
  }

  return config;
}

export function normalizeFinancialDrilldownFilters(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Financial drill-down filters must be an object");
  }

  const allowedKeys = new Set([
    "bookingStatusBucket",
    "expenseCategory",
    "metricKey",
    "page",
    "pageSize",
    "rangeEnd",
    "rangeStart",
    "serviceKey",
    "sortDirection",
    "sortKey",
    "timezone",
  ]);

  Object.keys(input).forEach((key) => {
    if (!allowedKeys.has(key)) {
      throw new Error(`Financial drill-down filter ${key} is unsupported`);
    }
  });

  const metricKey = normalizeMetricKey(input.metricKey);

  if (!metricKey) {
    throw new Error("Financial drill-down metricKey is required");
  }

  const metricConfig = getDrilldownMetricConfig(metricKey);
  const sortKey =
    input.sortKey == null || String(input.sortKey).trim() === ""
      ? metricConfig.defaultSortKey
      : String(input.sortKey).trim();

  if (!metricConfig.allowedSortKeys.includes(sortKey)) {
    throw new Error(
      `Financial drill-down metric ${metricKey} does not support sortKey=${sortKey}`,
    );
  }

  const filters = {
    ...normalizeFinancialAggregationFilters(input),
    bookingStatusBucket: normalizeBookingStatusBucket(
      input.bookingStatusBucket,
    ),
    expenseCategory: normalizeExpenseCategory(input.expenseCategory),
    metricKey,
    page: normalizeOptionalInteger(input.page, {
      defaultValue: DEFAULT_DRILLDOWN_PAGE,
      label: "Financial drill-down page",
      max: Number.MAX_SAFE_INTEGER,
      min: 1,
    }),
    pageSize: normalizeOptionalInteger(input.pageSize, {
      defaultValue: DEFAULT_DRILLDOWN_PAGE_SIZE,
      label: "Financial drill-down pageSize",
      max: MAX_DRILLDOWN_PAGE_SIZE,
      min: 1,
    }),
    serviceKey: normalizeServiceKey(input.serviceKey),
    sortDirection: normalizeSortDirection(
      input.sortDirection,
      metricConfig.defaultSortDirection,
    ),
    sortKey,
  };

  validateDrilldownMetricFilters(filters, metricConfig);

  return filters;
}

function toIsoStringOrNull(value) {
  if (!value) {
    return null;
  }

  const instant = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(instant.getTime())) {
    return null;
  }

  return instant.toISOString();
}

function buildCustomerSummary(user) {
  const plain = toPlainRecord(user);

  if (!plain) {
    return null;
  }

  return {
    email: plain.email || null,
    fullName: plain.fullName || null,
    id: Number(plain.id),
    phone: plain.phone || null,
  };
}

function serializeBookingBase(booking) {
  const plain = toPlainRecord(booking);

  return {
    bookingCode: plain?.bookingCode || null,
    cancelledAt: toIsoStringOrNull(plain?.cancelledAt),
    completedAt: toIsoStringOrNull(plain?.completedAt),
    createdAt: toIsoStringOrNull(plain?.createdAt),
    customer: buildCustomerSummary(plain?.user),
    date: plain?.date || null,
    id: Number(plain?.id),
    paidAmount: roundMetricValue(plain?.paidAmount),
    status: plain?.status || null,
    total: roundMetricValue(plain?.total),
    transactionId:
      plain?.transactionId == null ? null : Number(plain.transactionId),
    workflowStatus: plain?.workflowStatus || null,
  };
}

function serializeLinkedBookings(bookings) {
  return bookings.map((booking) => {
    const serialized = serializeBookingBase(booking);

    return {
      bookingCode: serialized.bookingCode,
      customer: serialized.customer,
      date: serialized.date,
      id: serialized.id,
      status: serialized.status,
      total: serialized.total,
      workflowStatus: serialized.workflowStatus,
    };
  });
}

function buildBookingsByTransactionId(bookings) {
  return bookings.reduce((map, booking) => {
    const plain = toPlainRecord(booking);

    if (plain?.transactionId == null) {
      return map;
    }

    const transactionId = Number(plain.transactionId);

    if (!map.has(transactionId)) {
      map.set(transactionId, []);
    }

    map.get(transactionId).push(plain);

    return map;
  }, new Map());
}

function compareSortValues(left, right) {
  if (left == null && right == null) {
    return 0;
  }

  if (left == null) {
    return 1;
  }

  if (right == null) {
    return -1;
  }

  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  return String(left).localeCompare(String(right), "en", {
    numeric: true,
    sensitivity: "base",
  });
}

function sortDrilldownRows(rows, filters) {
  return rows
    .map((row, index) => ({ index, row }))
    .sort((left, right) => {
      const directionMultiplier =
        filters.sortDirection === SORT_DIRECTION_ASC ? 1 : -1;
      const primaryComparison =
        compareSortValues(
          left.row?.[filters.sortKey],
          right.row?.[filters.sortKey],
        ) * directionMultiplier;

      if (primaryComparison !== 0) {
        return primaryComparison;
      }

      const idComparison = compareSortValues(left.row?.id, right.row?.id);

      if (idComparison !== 0) {
        return idComparison;
      }

      return left.index - right.index;
    })
    .map((entry) => entry.row);
}

function paginateRows(rows, filters) {
  const offset = (filters.page - 1) * filters.pageSize;

  return rows.slice(offset, offset + filters.pageSize);
}

function getBookingStatusBucket(booking) {
  if (isCancelledBooking(booking)) {
    return BOOKING_STATUS_BUCKET_CANCELLED;
  }

  if (isCompletedBooking(booking)) {
    return BOOKING_STATUS_BUCKET_COMPLETED;
  }

  return BOOKING_STATUS_BUCKET_PENDING;
}

function matchesBookingStatusBucket(booking, filters) {
  if (
    !filters.bookingStatusBucket ||
    filters.bookingStatusBucket === BOOKING_STATUS_BUCKET_ALL
  ) {
    return true;
  }

  return getBookingStatusBucket(booking) === filters.bookingStatusBucket;
}

function buildPaymentRows(transactions, bookingsByTransactionId, filters) {
  return transactions
    .map((transaction) => toPlainRecord(transaction))
    .filter(
      (transaction) =>
        transaction?.status === "success" &&
        isInstantInRange(transaction.paidAt, filters),
    )
    .map((transaction) => ({
      amount: roundMetricValue(transaction.amount),
      id: Number(transaction.id),
      linkedBookings: serializeLinkedBookings(
        bookingsByTransactionId.get(Number(transaction.id)) || [],
      ),
      paidAt: toIsoStringOrNull(transaction.paidAt),
      transactionId: Number(transaction.id),
      type: "payment",
    }));
}

function buildRefundRows(transactions, bookingsByTransactionId, filters) {
  return transactions
    .map((transaction) => toPlainRecord(transaction))
    .map((transaction) => {
      const refundedAt =
        transaction?.metadata?.lastRefund?.refundedAt || transaction?.paidAt;
      const amount = fromCents(getRefundEventAmountCents(transaction));

      return {
        amount,
        id: Number(transaction.id),
        linkedBookings: serializeLinkedBookings(
          bookingsByTransactionId.get(Number(transaction.id)) || [],
        ),
        originalPaidAt: toIsoStringOrNull(transaction?.paidAt),
        refundedAt: toIsoStringOrNull(refundedAt),
        transactionId: Number(transaction.id),
        type: "refund",
      };
    })
    .filter(
      (row) =>
        row.amount > 0 &&
        row.refundedAt &&
        isInstantInRange(row.refundedAt, filters),
    );
}

function buildExpenseRows(expenses, filters) {
  return expenses
    .map((expense) => toPlainRecord(expense))
    .filter(
      (expense) =>
        !expense?.deletedAt &&
        isBusinessDateInRange(expense.expenseDate, filters) &&
        (!filters.expenseCategory ||
          expense.category === filters.expenseCategory),
    )
    .map((expense) => ({
      amount: roundMetricValue(expense.amount),
      category: expense.category || null,
      categoryLabel: getExpenseCategoryLabel(expense.category) || null,
      createdAt: toIsoStringOrNull(expense.createdAt),
      description: expense.description || null,
      expenseDate: expense.expenseDate || null,
      id: Number(expense.id),
      updatedAt: toIsoStringOrNull(expense.updatedAt),
    }));
}

function buildCompletedBookingRows(bookings, filters) {
  return bookings
    .map((booking) => toPlainRecord(booking))
    .filter(
      (booking) =>
        isCompletedBooking(booking) &&
        isInstantInRange(booking.completedAt, filters) &&
        matchesBookingStatusBucket(booking, filters),
    )
    .map((booking) => serializeBookingBase(booking));
}

function buildPendingBookingRows(bookings, filters) {
  return bookings
    .map((booking) => toPlainRecord(booking))
    .filter(
      (booking) =>
        booking?.status !== "DRAFT" &&
        !isCancelledBooking(booking) &&
        !isCompletedBooking(booking) &&
        isBusinessDateInRange(booking.date, filters) &&
        matchesBookingStatusBucket(booking, filters),
    )
    .map((booking) => serializeBookingBase(booking));
}

function buildCancelledBookingRows(bookings, filters) {
  return bookings
    .map((booking) => toPlainRecord(booking))
    .filter(
      (booking) =>
        isCancelledBooking(booking) &&
        isInstantInRange(booking.cancelledAt, filters) &&
        matchesBookingStatusBucket(booking, filters),
    )
    .map((booking) => serializeBookingBase(booking));
}

function buildLostValueRows(bookings, filters) {
  return buildCancelledBookingRows(bookings, filters).map((booking) => ({
    ...booking,
    lostValue: booking.total,
  }));
}

function buildOutstandingBalanceRows(bookings, filters) {
  return bookings
    .map((booking) => toPlainRecord(booking))
    .filter(
      (booking) =>
        booking?.status !== "DRAFT" &&
        !isCancelledBooking(booking) &&
        isBusinessDateInRange(booking.date, filters) &&
        matchesBookingStatusBucket(booking, filters),
    )
    .map((booking) => ({
      ...serializeBookingBase(booking),
      outstandingBalance: roundMetricValue(
        Math.max(toCents(booking.total) - toCents(booking.paidAmount), 0) / 100,
      ),
    }))
    .filter((booking) => booking.outstandingBalance > 0);
}

function buildRecentBookingRows(bookings, filters) {
  return bookings
    .map((booking) => toPlainRecord(booking))
    .filter(
      (booking) =>
        doesBookingIntersectDashboardRange(booking, filters) &&
        matchesBookingStatusBucket(booking, filters),
    )
    .map((booking) => serializeRecentBooking(booking));
}

function buildScheduleSummaryRows(bookings, filters) {
  return bookings
    .map((booking) => toPlainRecord(booking))
    .filter(
      (booking) =>
        booking?.status !== "DRAFT" &&
        isBusinessDateInRange(booking.date, filters) &&
        matchesBookingStatusBucket(booking, filters),
    )
    .map((booking) => ({
      ...serializeBookingBase(booking),
      statusBucket: getBookingStatusBucket(booking),
    }));
}

function buildRevenueByServiceRows(
  bookings,
  transactions,
  pricingConfig,
  filters,
) {
  const bookingsByTransactionId = buildBookingsByTransactionId(bookings);

  return transactions
    .map((transaction) => toPlainRecord(transaction))
    .filter(
      (transaction) =>
        transaction?.status === "success" &&
        isInstantInRange(transaction.paidAt, filters),
    )
    .flatMap((transaction) =>
      (bookingsByTransactionId.get(Number(transaction.id)) || []).flatMap(
        (booking) =>
          buildAttributedServiceAmounts(booking, pricingConfig)
            .filter(
              (item) => !filters.serviceKey || item.key === filters.serviceKey,
            )
            .map((item, index) => ({
              amount: fromCents(item.amountCents),
              bookingCode: booking.bookingCode || null,
              bookingId: Number(booking.id),
              customer: buildCustomerSummary(booking.user),
              date: booking.date || null,
              id: `${booking.id}-${item.key}-${index}`,
              paidAt: toIsoStringOrNull(transaction.paidAt),
              serviceKey: item.key,
              serviceLabel: item.label,
              total: roundMetricValue(booking.total),
              transactionId: Number(transaction.id),
            })),
      ),
    );
}

function buildNetRevenueRows(transactions, bookingsByTransactionId, filters) {
  const paymentRows = buildPaymentRows(
    transactions,
    bookingsByTransactionId,
    filters,
  ).map((row) => ({
    ...row,
    eventAt: row.paidAt,
    netAmount: row.amount,
  }));
  const refundRows = buildRefundRows(
    transactions,
    bookingsByTransactionId,
    filters,
  ).map((row) => ({
    ...row,
    eventAt: row.refundedAt,
    netAmount: roundMetricValue(-row.amount),
  }));

  return [...paymentRows, ...refundRows];
}

function buildNetProfitRows(
  transactions,
  expenses,
  bookingsByTransactionId,
  filters,
) {
  const revenueRows = buildNetRevenueRows(
    transactions,
    bookingsByTransactionId,
    filters,
  ).map((row) => ({
    ...row,
    entryType: "revenue",
  }));
  const expenseRows = buildExpenseRows(expenses, filters).map((row) => ({
    ...row,
    entryType: "expense",
    eventAt: row.expenseDate,
    netAmount: roundMetricValue(-row.amount),
  }));

  return [...revenueRows, ...expenseRows];
}

function sumAmountRows(rows, key = "amount") {
  return roundMetricValue(
    rows.reduce((sum, row) => sum + Number(row?.[key] || 0), 0),
  );
}

function buildDrilldownResponse({ filters, rows, totalValue }) {
  const metricConfig = getDrilldownMetricConfig(filters.metricKey);
  const sortedRows = sortDrilldownRows(rows, filters);
  const paginatedRows = paginateRows(sortedRows, filters);
  const totalRows = sortedRows.length;

  return {
    filters: serializeDrilldownFilters(filters),
    metricKey: filters.metricKey,
    pagination: {
      hasNextPage: filters.page * filters.pageSize < totalRows,
      hasPreviousPage: filters.page > 1 && totalRows > 0,
      page: filters.page,
      pageSize: filters.pageSize,
      totalPages: totalRows === 0 ? 0 : Math.ceil(totalRows / filters.pageSize),
      totalRows,
    },
    rows: paginatedRows,
    sort: {
      allowedKeys: metricConfig.allowedSortKeys,
      direction: filters.sortDirection,
      key: filters.sortKey,
    },
    total: {
      currency: metricConfig.totalKind === "amount" ? "AED" : null,
      kind: metricConfig.totalKind,
      value:
        metricConfig.totalKind === "count"
          ? Number(totalValue || 0)
          : roundMetricValue(totalValue),
    },
  };
}

export function buildFinancialDrilldown({
  bookings = [],
  transactions = [],
  expenses = [],
  pricingConfig = {},
  filters: rawFilters,
} = {}) {
  const filters = normalizeFinancialDrilldownFilters(rawFilters);
  const bookingsByTransactionId = buildBookingsByTransactionId(bookings);

  switch (filters.metricKey) {
    case "grossPayments": {
      const rows = buildPaymentRows(
        transactions,
        bookingsByTransactionId,
        filters,
      );

      return buildDrilldownResponse({
        filters,
        rows,
        totalValue: sumAmountRows(rows),
      });
    }
    case "refunds": {
      const rows = buildRefundRows(
        transactions,
        bookingsByTransactionId,
        filters,
      );

      return buildDrilldownResponse({
        filters,
        rows,
        totalValue: sumAmountRows(rows),
      });
    }
    case "netRevenue": {
      const rows = buildNetRevenueRows(
        transactions,
        bookingsByTransactionId,
        filters,
      );

      return buildDrilldownResponse({
        filters,
        rows,
        totalValue: sumAmountRows(rows, "netAmount"),
      });
    }
    case "expenses": {
      const rows = buildExpenseRows(expenses, filters);

      return buildDrilldownResponse({
        filters,
        rows,
        totalValue: sumAmountRows(rows),
      });
    }
    case "netProfit": {
      const rows = buildNetProfitRows(
        transactions,
        expenses,
        bookingsByTransactionId,
        filters,
      );

      return buildDrilldownResponse({
        filters,
        rows,
        totalValue: sumAmountRows(rows, "netAmount"),
      });
    }
    case "completedBookings": {
      const rows = buildCompletedBookingRows(bookings, filters);

      return buildDrilldownResponse({
        filters,
        rows,
        totalValue: rows.length,
      });
    }
    case "pendingBookings": {
      const rows = buildPendingBookingRows(bookings, filters);

      return buildDrilldownResponse({
        filters,
        rows,
        totalValue: rows.length,
      });
    }
    case "cancelledBookings": {
      const rows = buildCancelledBookingRows(bookings, filters);

      return buildDrilldownResponse({
        filters,
        rows,
        totalValue: rows.length,
      });
    }
    case "lostValue": {
      const rows = buildLostValueRows(bookings, filters);

      return buildDrilldownResponse({
        filters,
        rows,
        totalValue: sumAmountRows(rows, "lostValue"),
      });
    }
    case "outstandingBalance": {
      const rows = buildOutstandingBalanceRows(bookings, filters);

      return buildDrilldownResponse({
        filters,
        rows,
        totalValue: sumAmountRows(rows, "outstandingBalance"),
      });
    }
    case "revenueByService": {
      const rows = buildRevenueByServiceRows(
        bookings,
        transactions,
        pricingConfig,
        filters,
      );

      return buildDrilldownResponse({
        filters,
        rows,
        totalValue: sumAmountRows(rows),
      });
    }
    case "scheduleSummary": {
      const rows = buildScheduleSummaryRows(bookings, filters);

      return buildDrilldownResponse({
        filters,
        rows,
        totalValue: rows.length,
      });
    }
    case "recentBookings": {
      const rows = buildRecentBookingRows(bookings, filters);

      return buildDrilldownResponse({
        filters,
        rows,
        totalValue: rows.length,
      });
    }
    default:
      throw new Error("Financial drill-down metricKey is unsupported");
  }
}

export function normalizeDashboardAnalyticsFilters(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Dashboard analytics filters must be an object");
  }

  const allowedKeys = new Set([
    "comparisonMode",
    "rangeEnd",
    "rangeStart",
    "timezone",
  ]);

  Object.keys(input).forEach((key) => {
    if (!allowedKeys.has(key)) {
      throw new Error(`Dashboard analytics filter ${key} is unsupported`);
    }
  });

  const comparisonMode =
    input.comparisonMode == null
      ? DASHBOARD_COMPARISON_MODE
      : String(input.comparisonMode).trim();

  if (comparisonMode !== DASHBOARD_COMPARISON_MODE) {
    throw new Error(
      `Dashboard analytics comparisonMode must be ${DASHBOARD_COMPARISON_MODE}`,
    );
  }

  return {
    ...normalizeFinancialAggregationFilters(input),
    comparisonMode,
  };
}

export function normalizeFinancialReportFilters(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Financial report filters must be an object");
  }

  const allowedKeys = new Set([
    "comparisonMode",
    "groupBy",
    "rangeEnd",
    "rangeStart",
    "timezone",
  ]);

  Object.keys(input).forEach((key) => {
    if (!allowedKeys.has(key)) {
      throw new Error(`Financial report filter ${key} is unsupported`);
    }
  });

  const comparisonMode =
    input.comparisonMode == null
      ? DASHBOARD_COMPARISON_MODE
      : String(input.comparisonMode).trim();

  if (comparisonMode !== DASHBOARD_COMPARISON_MODE) {
    throw new Error(
      `Financial report comparisonMode must be ${DASHBOARD_COMPARISON_MODE}`,
    );
  }

  const groupBy =
    input.groupBy == null ? FINANCIAL_REPORT_GROUP_BY_WEEK : input.groupBy;
  const normalizedGroupBy = String(groupBy).trim().toLowerCase();

  if (!FINANCIAL_REPORT_GROUP_BY_VALUES.has(normalizedGroupBy)) {
    throw new Error("Financial report groupBy must be week or month");
  }

  return {
    ...normalizeFinancialAggregationFilters(input),
    comparisonMode,
    groupBy: normalizedGroupBy,
  };
}

function formatMonthLabel(monthStartBusinessDate) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(dateOnlyToUtcDate(monthStartBusinessDate));
}

function buildMonthlyRangeFilters(monthStartBusinessDate, timezone) {
  return normalizeFinancialAggregationFilters({
    rangeEnd: addDays(addMonths(monthStartBusinessDate, 1), -1),
    rangeStart: monthStartBusinessDate,
    timezone,
  });
}

function buildMonthlyComparisonRows({
  bookings,
  transactions,
  expenses,
  pricingConfig,
  filters,
  monthCount = 6,
}) {
  const activeMonthStart = getBucketStartBusinessDate(
    addDays(filters.rangeEndBusinessDateExclusive, -1),
    "month",
  );
  const monthStarts = [];

  for (let index = monthCount - 1; index >= 0; index -= 1) {
    monthStarts.push(addMonths(activeMonthStart, -index));
  }

  return monthStarts.map((monthStartBusinessDate) => {
    const monthFilters = buildMonthlyRangeFilters(
      monthStartBusinessDate,
      filters.timezone,
    );
    const overview = aggregateFinancialOverview({
      bookings,
      transactions,
      expenses,
      pricingConfig,
      filters: monthFilters,
    });

    return {
      averageBookingValue: overview.averages.averageBookingValue,
      cancelledBookings: overview.counts.cancelledBookings,
      completedBookings: overview.counts.completedBookings,
      expenses: overview.totals.expenses,
      grossPayments: overview.totals.grossPayments,
      lostValue: overview.totals.lostValue,
      monthEndBusinessDateExclusive: monthFilters.rangeEndBusinessDateExclusive,
      monthLabel: formatMonthLabel(monthStartBusinessDate),
      monthStartBusinessDate,
      netProfit: overview.totals.netProfit,
      netRevenue: overview.totals.netRevenue,
      refunds: overview.totals.refunds,
    };
  });
}

function buildBookingStatusBreakdown(overview) {
  const buckets = [
    {
      count: overview.counts.pendingBookings,
      key: BOOKING_STATUS_BUCKET_PENDING,
      label: "Pending",
    },
    {
      count: overview.counts.completedBookings,
      key: BOOKING_STATUS_BUCKET_COMPLETED,
      label: "Completed",
    },
    {
      count: overview.counts.cancelledBookings,
      key: BOOKING_STATUS_BUCKET_CANCELLED,
      label: "Cancelled",
    },
  ];

  return {
    buckets,
    total: buckets.reduce((sum, bucket) => sum + bucket.count, 0),
  };
}

export function buildFinancialReports({
  bookings = [],
  transactions = [],
  expenses = [],
  pricingConfig = {},
  filters: rawFilters,
} = {}) {
  const filters = normalizeFinancialReportFilters(rawFilters);
  const previousPeriodFilters = buildPreviousPeriodFilters(filters);
  const currentOverview = aggregateFinancialOverview({
    bookings,
    transactions,
    expenses,
    pricingConfig,
    filters,
  });
  const previousOverview = aggregateFinancialOverview({
    bookings,
    transactions,
    expenses,
    pricingConfig,
    filters: previousPeriodFilters,
  });
  const monthlyComparison = buildMonthlyComparisonRows({
    bookings,
    transactions,
    expenses,
    pricingConfig,
    filters,
  });

  const kpis = {
    averageBookingValue: currentOverview.averages.averageBookingValue,
    completedBookings: currentOverview.counts.completedBookings,
    expenses: currentOverview.totals.expenses,
    grossPayments: currentOverview.totals.grossPayments,
    lostValue: currentOverview.totals.lostValue,
    netProfit: currentOverview.totals.netProfit,
    netRevenue: currentOverview.totals.netRevenue,
    refunds: currentOverview.totals.refunds,
  };
  const previousKpis = {
    averageBookingValue: previousOverview.averages.averageBookingValue,
    completedBookings: previousOverview.counts.completedBookings,
    expenses: previousOverview.totals.expenses,
    grossPayments: previousOverview.totals.grossPayments,
    lostValue: previousOverview.totals.lostValue,
    netProfit: previousOverview.totals.netProfit,
    netRevenue: previousOverview.totals.netRevenue,
    refunds: previousOverview.totals.refunds,
  };

  return {
    bookingStatus: buildBookingStatusBreakdown(currentOverview),
    comparison: Object.fromEntries(
      Object.entries(kpis).map(([key, currentValue]) => [
        key,
        buildDashboardComparisonEntry(currentValue, previousKpis[key]),
      ]),
    ),
    comparisonMode: filters.comparisonMode,
    comparisonPeriod: serializeNormalizedFilters(previousPeriodFilters),
    filters: serializeFinancialReportFilters(filters),
    kpis,
    monthlyComparison,
    profitAndLoss: {
      expenses: currentOverview.totals.expenses,
      margin:
        currentOverview.totals.netRevenue > 0
          ? roundMetricValue(
              (currentOverview.totals.netProfit /
                currentOverview.totals.netRevenue) *
                100,
            )
          : 0,
      netProfit: currentOverview.totals.netProfit,
      netRevenue: currentOverview.totals.netRevenue,
    },
    revenueByService: currentOverview.breakdowns.serviceRevenue,
    sixMonthTrend: {
      buckets: monthlyComparison.map((month) => ({
        bucketEndBusinessDateExclusive: month.monthEndBusinessDateExclusive,
        bucketStartBusinessDate: month.monthStartBusinessDate,
        grossPayments: month.grossPayments,
        netRevenue: month.netRevenue,
        refunds: month.refunds,
      })),
      granularity: "month",
    },
    weeklyTrend: buildRevenueTrendForGranularity(transactions, filters, "week"),
  };
}

export function buildDashboardAnalytics({
  bookings = [],
  transactions = [],
  expenses = [],
  pricingConfig = {},
  filters: rawFilters,
} = {}) {
  const filters = normalizeDashboardAnalyticsFilters(rawFilters);
  const previousPeriodFilters = buildPreviousPeriodFilters(filters);
  const currentOverview = aggregateFinancialOverview({
    bookings,
    transactions,
    expenses,
    pricingConfig,
    filters,
  });
  const previousOverview = aggregateFinancialOverview({
    bookings,
    transactions,
    expenses,
    pricingConfig,
    filters: previousPeriodFilters,
  });
  const revenueTrend = buildRevenueTrend(transactions, filters);
  const scheduleSummary = buildScheduleSummary(bookings, filters);
  const recentBookings = bookings
    .filter((booking) => doesBookingIntersectDashboardRange(booking, filters))
    .sort((left, right) => {
      const leftTime = new Date(left?.createdAt || 0).getTime();
      const rightTime = new Date(right?.createdAt || 0).getTime();

      return rightTime - leftTime;
    })
    .slice(0, MAX_DASHBOARD_RECENT_BOOKINGS)
    .map((booking) => serializeRecentBooking(booking));

  const kpis = {
    averageBookingValue: currentOverview.averages.averageBookingValue,
    cancelledBookings: currentOverview.counts.cancelledBookings,
    completedBookings: currentOverview.counts.completedBookings,
    expenses: currentOverview.totals.expenses,
    grossPayments: currentOverview.totals.grossPayments,
    lostValue: currentOverview.totals.lostValue,
    netProfit: currentOverview.totals.netProfit,
    netRevenue: currentOverview.totals.netRevenue,
    outstandingBalance: currentOverview.totals.outstandingBalance,
    paidBookings: currentOverview.counts.paidBookings,
    pendingBookings: currentOverview.counts.pendingBookings,
    refunds: currentOverview.totals.refunds,
  };

  const previousKpis = {
    averageBookingValue: previousOverview.averages.averageBookingValue,
    cancelledBookings: previousOverview.counts.cancelledBookings,
    completedBookings: previousOverview.counts.completedBookings,
    expenses: previousOverview.totals.expenses,
    grossPayments: previousOverview.totals.grossPayments,
    lostValue: previousOverview.totals.lostValue,
    netProfit: previousOverview.totals.netProfit,
    netRevenue: previousOverview.totals.netRevenue,
    outstandingBalance: previousOverview.totals.outstandingBalance,
    paidBookings: previousOverview.counts.paidBookings,
    pendingBookings: previousOverview.counts.pendingBookings,
    refunds: previousOverview.totals.refunds,
  };

  return {
    comparison: Object.fromEntries(
      Object.entries(kpis).map(([key, currentValue]) => [
        key,
        buildDashboardComparisonEntry(currentValue, previousKpis[key]),
      ]),
    ),
    comparisonMode: filters.comparisonMode,
    comparisonPeriod: serializeNormalizedFilters(previousPeriodFilters),
    filters: serializeNormalizedFilters(filters),
    kpis,
    recentBookings,
    revenueByService: currentOverview.breakdowns.serviceRevenue,
    revenueTrend,
    scheduleSummary,
  };
}

export {
  DASHBOARD_COMPARISON_MODE,
  FINANCIAL_REPORT_GROUP_BY_MONTH,
  FINANCIAL_REPORT_GROUP_BY_WEEK,
  MAX_FINANCIAL_RANGE_DAYS,
  REPORTING_TIMEZONE,
  SERVICE_KEY_UNALLOCATED,
};
