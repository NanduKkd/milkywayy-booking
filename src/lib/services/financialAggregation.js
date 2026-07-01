const REPORTING_TIMEZONE = "Asia/Dubai";
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const SERVICE_KEY_UNALLOCATED = "unallocated";
const SERVICE_LABEL_UNALLOCATED = "Unallocated";
const BUSINESS_DAY_MS = 24 * 60 * 60 * 1000;
const MAX_FINANCIAL_RANGE_DAYS = 366;
const DASHBOARD_COMPARISON_MODE = "previous_period";
const MAX_DASHBOARD_RECENT_BOOKINGS = 10;

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

function buildRevenueTrend(transactions, filters) {
  const granularity = resolveTrendGranularity(filters.rangeDayCount);
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
  MAX_FINANCIAL_RANGE_DAYS,
  REPORTING_TIMEZONE,
  SERVICE_KEY_UNALLOCATED,
};
