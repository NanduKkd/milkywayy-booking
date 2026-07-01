const CSV_ROW_COLUMNS = [
  "section",
  "rowKey",
  "label",
  "valueType",
  "numericValue",
  "textValue",
  "bucketStartBusinessDate",
  "bucketEndBusinessDateExclusive",
  "rangeStartBusinessDate",
  "rangeEndBusinessDateExclusive",
  "timezone",
  "groupBy",
  "comparisonMode",
];

function addDays(dateString, days) {
  const [year, month, day] = String(dateString)
    .split("-")
    .map((value) => Number(value));
  const instant = new Date(Date.UTC(year, month - 1, day + days));

  return instant.toISOString().slice(0, 10);
}

function formatTimestamp(value) {
  const instant = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(instant.getTime())) {
    return "";
  }

  return instant.toISOString();
}

function sanitizeSpreadsheetText(value) {
  if (!value) {
    return "";
  }

  return /^[=+\-@]/u.test(value) ? `'${value}` : value;
}

function serializeCsvValue(value) {
  if (value == null) {
    return "";
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  const sanitized = sanitizeSpreadsheetText(String(value));

  if (!/[",\n\r]/u.test(sanitized)) {
    return sanitized;
  }

  return `"${sanitized.replace(/"/gu, '""')}"`;
}

function buildCsvRow(baseRow, values = {}) {
  const row = { ...baseRow, ...values };

  return CSV_ROW_COLUMNS.map((column) => serializeCsvValue(row[column])).join(
    ",",
  );
}

function createBaseRow(report) {
  return {
    bucketEndBusinessDateExclusive: "",
    bucketStartBusinessDate: "",
    comparisonMode: report?.comparisonMode || "",
    groupBy: report?.filters?.groupBy || "",
    label: "",
    numericValue: "",
    rangeEndBusinessDateExclusive:
      report?.filters?.rangeEndBusinessDateExclusive || "",
    rangeStartBusinessDate: report?.filters?.rangeStartBusinessDate || "",
    rowKey: "",
    section: "",
    textValue: "",
    timezone: report?.filters?.timezone || "",
    valueType: "",
  };
}

function buildMetadataRows(report, baseRow) {
  const comparisonPeriod = report?.comparisonPeriod || {};
  const filters = report?.filters || {};
  const generatedAt = formatTimestamp(new Date());

  return [
    buildCsvRow(baseRow, {
      label: "Generated at",
      rowKey: "generatedAt",
      section: "metadata",
      textValue: generatedAt,
      valueType: "text",
    }),
    buildCsvRow(baseRow, {
      label: "Report range start",
      rowKey: "rangeStartBusinessDate",
      section: "metadata",
      textValue: filters.rangeStartBusinessDate || "",
      valueType: "text",
    }),
    buildCsvRow(baseRow, {
      label: "Report range end (inclusive)",
      rowKey: "rangeEndBusinessDateInclusive",
      section: "metadata",
      textValue: filters.rangeEndBusinessDateExclusive
        ? addDays(filters.rangeEndBusinessDateExclusive, -1)
        : "",
      valueType: "text",
    }),
    buildCsvRow(baseRow, {
      label: "Report range end (exclusive)",
      rowKey: "rangeEndBusinessDateExclusive",
      section: "metadata",
      textValue: filters.rangeEndBusinessDateExclusive || "",
      valueType: "text",
    }),
    buildCsvRow(baseRow, {
      label: "Comparison period start",
      rowKey: "comparisonRangeStartBusinessDate",
      section: "metadata",
      textValue: comparisonPeriod.rangeStartBusinessDate || "",
      valueType: "text",
    }),
    buildCsvRow(baseRow, {
      label: "Comparison period end (exclusive)",
      rowKey: "comparisonRangeEndBusinessDateExclusive",
      section: "metadata",
      textValue: comparisonPeriod.rangeEndBusinessDateExclusive || "",
      valueType: "text",
    }),
  ];
}

function getMetricValueType(rowKey) {
  return rowKey === "completedBookings" ? "count" : "amount";
}

function buildMetricRows(section, metrics, baseRow, valueType) {
  return Object.entries(metrics || {}).map(([rowKey, numericValue]) =>
    buildCsvRow(baseRow, {
      label: rowKey,
      numericValue,
      rowKey,
      section,
      valueType: valueType || getMetricValueType(rowKey),
    }),
  );
}

function buildComparisonRows(report, baseRow) {
  return Object.entries(report?.comparison || {}).map(([rowKey, value]) =>
    buildCsvRow(baseRow, {
      label: `${rowKey} delta`,
      numericValue: value?.delta ?? "",
      rowKey,
      section: "comparison",
      valueType: rowKey === "completedBookings" ? "count" : "amount",
    }),
  );
}

function buildTrendRows(section, buckets, baseRow) {
  return (buckets || []).map((bucket) =>
    buildCsvRow(baseRow, {
      bucketEndBusinessDateExclusive:
        bucket.bucketEndBusinessDateExclusive || "",
      bucketStartBusinessDate: bucket.bucketStartBusinessDate || "",
      label: bucket.monthLabel || bucket.bucketStartBusinessDate || section,
      numericValue: bucket.netRevenue ?? "",
      rowKey: "netRevenue",
      section,
      valueType: "amount",
    }),
  );
}

function buildMonthlyComparisonRows(report, baseRow) {
  return (report?.monthlyComparison || []).flatMap((month) => [
    buildCsvRow(baseRow, {
      bucketEndBusinessDateExclusive: month.monthEndBusinessDateExclusive || "",
      bucketStartBusinessDate: month.monthStartBusinessDate || "",
      label: `${month.monthLabel} gross payments`,
      numericValue: month.grossPayments ?? "",
      rowKey: "grossPayments",
      section: "monthlyComparison",
      valueType: "amount",
    }),
    buildCsvRow(baseRow, {
      bucketEndBusinessDateExclusive: month.monthEndBusinessDateExclusive || "",
      bucketStartBusinessDate: month.monthStartBusinessDate || "",
      label: `${month.monthLabel} refunds`,
      numericValue: month.refunds ?? "",
      rowKey: "refunds",
      section: "monthlyComparison",
      valueType: "amount",
    }),
    buildCsvRow(baseRow, {
      bucketEndBusinessDateExclusive: month.monthEndBusinessDateExclusive || "",
      bucketStartBusinessDate: month.monthStartBusinessDate || "",
      label: `${month.monthLabel} net revenue`,
      numericValue: month.netRevenue ?? "",
      rowKey: "netRevenue",
      section: "monthlyComparison",
      valueType: "amount",
    }),
    buildCsvRow(baseRow, {
      bucketEndBusinessDateExclusive: month.monthEndBusinessDateExclusive || "",
      bucketStartBusinessDate: month.monthStartBusinessDate || "",
      label: `${month.monthLabel} expenses`,
      numericValue: month.expenses ?? "",
      rowKey: "expenses",
      section: "monthlyComparison",
      valueType: "amount",
    }),
    buildCsvRow(baseRow, {
      bucketEndBusinessDateExclusive: month.monthEndBusinessDateExclusive || "",
      bucketStartBusinessDate: month.monthStartBusinessDate || "",
      label: `${month.monthLabel} net profit`,
      numericValue: month.netProfit ?? "",
      rowKey: "netProfit",
      section: "monthlyComparison",
      valueType: "amount",
    }),
    buildCsvRow(baseRow, {
      bucketEndBusinessDateExclusive: month.monthEndBusinessDateExclusive || "",
      bucketStartBusinessDate: month.monthStartBusinessDate || "",
      label: `${month.monthLabel} completed bookings`,
      numericValue: month.completedBookings ?? "",
      rowKey: "completedBookings",
      section: "monthlyComparison",
      valueType: "count",
    }),
    buildCsvRow(baseRow, {
      bucketEndBusinessDateExclusive: month.monthEndBusinessDateExclusive || "",
      bucketStartBusinessDate: month.monthStartBusinessDate || "",
      label: `${month.monthLabel} cancelled bookings`,
      numericValue: month.cancelledBookings ?? "",
      rowKey: "cancelledBookings",
      section: "monthlyComparison",
      valueType: "count",
    }),
    buildCsvRow(baseRow, {
      bucketEndBusinessDateExclusive: month.monthEndBusinessDateExclusive || "",
      bucketStartBusinessDate: month.monthStartBusinessDate || "",
      label: `${month.monthLabel} lost value`,
      numericValue: month.lostValue ?? "",
      rowKey: "lostValue",
      section: "monthlyComparison",
      valueType: "amount",
    }),
    buildCsvRow(baseRow, {
      bucketEndBusinessDateExclusive: month.monthEndBusinessDateExclusive || "",
      bucketStartBusinessDate: month.monthStartBusinessDate || "",
      label: `${month.monthLabel} average booking value`,
      numericValue: month.averageBookingValue ?? "",
      rowKey: "averageBookingValue",
      section: "monthlyComparison",
      valueType: "amount",
    }),
  ]);
}

function buildBookingStatusRows(report, baseRow) {
  return (report?.bookingStatus?.buckets || []).map((bucket) =>
    buildCsvRow(baseRow, {
      label: bucket.label || bucket.key,
      numericValue: bucket.count ?? "",
      rowKey: bucket.key || "",
      section: "bookingStatus",
      valueType: "count",
    }),
  );
}

function buildServiceRevenueRows(report, baseRow) {
  return (report?.revenueByService || []).map((service) =>
    buildCsvRow(baseRow, {
      label: service.label || service.key,
      numericValue: service.amount ?? "",
      rowKey: service.key || "",
      section: "revenueByService",
      valueType: "amount",
    }),
  );
}

function buildProfitAndLossRows(report, baseRow) {
  return [
    buildCsvRow(baseRow, {
      label: "Net revenue",
      numericValue: report?.profitAndLoss?.netRevenue ?? "",
      rowKey: "netRevenue",
      section: "profitAndLoss",
      valueType: "amount",
    }),
    buildCsvRow(baseRow, {
      label: "Expenses",
      numericValue: report?.profitAndLoss?.expenses ?? "",
      rowKey: "expenses",
      section: "profitAndLoss",
      valueType: "amount",
    }),
    buildCsvRow(baseRow, {
      label: "Net profit",
      numericValue: report?.profitAndLoss?.netProfit ?? "",
      rowKey: "netProfit",
      section: "profitAndLoss",
      valueType: "amount",
    }),
    buildCsvRow(baseRow, {
      label: "Margin",
      numericValue: report?.profitAndLoss?.margin ?? "",
      rowKey: "margin",
      section: "profitAndLoss",
      valueType: "percent",
    }),
  ];
}

export function buildFinancialReportCsv(report) {
  const baseRow = createBaseRow(report);
  const rows = [
    CSV_ROW_COLUMNS.join(","),
    ...buildMetadataRows(report, baseRow),
    ...buildMetricRows("kpis", report?.kpis, baseRow),
    ...buildComparisonRows(report, baseRow),
    ...buildTrendRows("weeklyTrend", report?.weeklyTrend?.buckets, baseRow),
    ...buildTrendRows("sixMonthTrend", report?.sixMonthTrend?.buckets, baseRow),
    ...buildMonthlyComparisonRows(report, baseRow),
    ...buildBookingStatusRows(report, baseRow),
    ...buildServiceRevenueRows(report, baseRow),
    ...buildProfitAndLossRows(report, baseRow),
  ];

  return `\uFEFF${rows.join("\n")}\n`;
}

export function buildFinancialReportCsvFilename(report) {
  const rangeStart = report?.filters?.rangeStartBusinessDate || "unknown-start";
  const rangeEnd =
    report?.filters?.rangeEndBusinessDateExclusive || "unknown-end";

  return `financial-report-${rangeStart}-to-${rangeEnd}.csv`;
}
