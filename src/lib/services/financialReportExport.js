import * as XLSX from "xlsx";

const REPORT_DATA_COLUMNS = [
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

const REPORT_DATA_DATE_COLUMNS = new Set([
  "bucketEndBusinessDateExclusive",
  "bucketStartBusinessDate",
  "rangeEndBusinessDateExclusive",
  "rangeStartBusinessDate",
]);

const OVERVIEW_COLUMNS = ["section", "label", "value", "valueType"];

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

function parseDateCellValue(value) {
  if (!value) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/u.test(String(value))) {
    const [year, month, day] = String(value)
      .split("-")
      .map((part) => Number(part));

    return new Date(Date.UTC(year, month - 1, day));
  }

  const instant = new Date(value);

  if (Number.isNaN(instant.getTime())) {
    return "";
  }

  return instant;
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

function buildExportRow(baseRow, values = {}) {
  return { ...baseRow, ...values };
}

function buildMetadataRows(report, baseRow) {
  const comparisonPeriod = report?.comparisonPeriod || {};
  const filters = report?.filters || {};
  const generatedAt = formatTimestamp(new Date());

  return [
    buildExportRow(baseRow, {
      label: "Generated at",
      rowKey: "generatedAt",
      section: "metadata",
      textValue: generatedAt,
      valueType: "text",
    }),
    buildExportRow(baseRow, {
      label: "Report range start",
      rowKey: "rangeStartBusinessDate",
      section: "metadata",
      textValue: filters.rangeStartBusinessDate || "",
      valueType: "text",
    }),
    buildExportRow(baseRow, {
      label: "Report range end (inclusive)",
      rowKey: "rangeEndBusinessDateInclusive",
      section: "metadata",
      textValue: filters.rangeEndBusinessDateExclusive
        ? addDays(filters.rangeEndBusinessDateExclusive, -1)
        : "",
      valueType: "text",
    }),
    buildExportRow(baseRow, {
      label: "Report range end (exclusive)",
      rowKey: "rangeEndBusinessDateExclusive",
      section: "metadata",
      textValue: filters.rangeEndBusinessDateExclusive || "",
      valueType: "text",
    }),
    buildExportRow(baseRow, {
      label: "Comparison period start",
      rowKey: "comparisonRangeStartBusinessDate",
      section: "metadata",
      textValue: comparisonPeriod.rangeStartBusinessDate || "",
      valueType: "text",
    }),
    buildExportRow(baseRow, {
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
    buildExportRow(baseRow, {
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
    buildExportRow(baseRow, {
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
    buildExportRow(baseRow, {
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
    buildExportRow(baseRow, {
      bucketEndBusinessDateExclusive: month.monthEndBusinessDateExclusive || "",
      bucketStartBusinessDate: month.monthStartBusinessDate || "",
      label: `${month.monthLabel} gross payments`,
      numericValue: month.grossPayments ?? "",
      rowKey: "grossPayments",
      section: "monthlyComparison",
      valueType: "amount",
    }),
    buildExportRow(baseRow, {
      bucketEndBusinessDateExclusive: month.monthEndBusinessDateExclusive || "",
      bucketStartBusinessDate: month.monthStartBusinessDate || "",
      label: `${month.monthLabel} refunds`,
      numericValue: month.refunds ?? "",
      rowKey: "refunds",
      section: "monthlyComparison",
      valueType: "amount",
    }),
    buildExportRow(baseRow, {
      bucketEndBusinessDateExclusive: month.monthEndBusinessDateExclusive || "",
      bucketStartBusinessDate: month.monthStartBusinessDate || "",
      label: `${month.monthLabel} net revenue`,
      numericValue: month.netRevenue ?? "",
      rowKey: "netRevenue",
      section: "monthlyComparison",
      valueType: "amount",
    }),
    buildExportRow(baseRow, {
      bucketEndBusinessDateExclusive: month.monthEndBusinessDateExclusive || "",
      bucketStartBusinessDate: month.monthStartBusinessDate || "",
      label: `${month.monthLabel} expenses`,
      numericValue: month.expenses ?? "",
      rowKey: "expenses",
      section: "monthlyComparison",
      valueType: "amount",
    }),
    buildExportRow(baseRow, {
      bucketEndBusinessDateExclusive: month.monthEndBusinessDateExclusive || "",
      bucketStartBusinessDate: month.monthStartBusinessDate || "",
      label: `${month.monthLabel} net profit`,
      numericValue: month.netProfit ?? "",
      rowKey: "netProfit",
      section: "monthlyComparison",
      valueType: "amount",
    }),
    buildExportRow(baseRow, {
      bucketEndBusinessDateExclusive: month.monthEndBusinessDateExclusive || "",
      bucketStartBusinessDate: month.monthStartBusinessDate || "",
      label: `${month.monthLabel} completed bookings`,
      numericValue: month.completedBookings ?? "",
      rowKey: "completedBookings",
      section: "monthlyComparison",
      valueType: "count",
    }),
    buildExportRow(baseRow, {
      bucketEndBusinessDateExclusive: month.monthEndBusinessDateExclusive || "",
      bucketStartBusinessDate: month.monthStartBusinessDate || "",
      label: `${month.monthLabel} cancelled bookings`,
      numericValue: month.cancelledBookings ?? "",
      rowKey: "cancelledBookings",
      section: "monthlyComparison",
      valueType: "count",
    }),
    buildExportRow(baseRow, {
      bucketEndBusinessDateExclusive: month.monthEndBusinessDateExclusive || "",
      bucketStartBusinessDate: month.monthStartBusinessDate || "",
      label: `${month.monthLabel} lost value`,
      numericValue: month.lostValue ?? "",
      rowKey: "lostValue",
      section: "monthlyComparison",
      valueType: "amount",
    }),
    buildExportRow(baseRow, {
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
    buildExportRow(baseRow, {
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
    buildExportRow(baseRow, {
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
    buildExportRow(baseRow, {
      label: "Net revenue",
      numericValue: report?.profitAndLoss?.netRevenue ?? "",
      rowKey: "netRevenue",
      section: "profitAndLoss",
      valueType: "amount",
    }),
    buildExportRow(baseRow, {
      label: "Expenses",
      numericValue: report?.profitAndLoss?.expenses ?? "",
      rowKey: "expenses",
      section: "profitAndLoss",
      valueType: "amount",
    }),
    buildExportRow(baseRow, {
      label: "Net profit",
      numericValue: report?.profitAndLoss?.netProfit ?? "",
      rowKey: "netProfit",
      section: "profitAndLoss",
      valueType: "amount",
    }),
    buildExportRow(baseRow, {
      label: "Margin",
      numericValue: report?.profitAndLoss?.margin ?? "",
      rowKey: "margin",
      section: "profitAndLoss",
      valueType: "percent",
    }),
  ];
}

export function buildFinancialReportRows(report) {
  const baseRow = createBaseRow(report);

  return [
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
}

function serializeReportDataRow(row) {
  return REPORT_DATA_COLUMNS.map((column) =>
    serializeCsvValue(row[column]),
  ).join(",");
}

function createSheetFromObjects(columns, rows, dateColumns = new Set()) {
  const data = [
    columns,
    ...rows.map((row) =>
      columns.map((column) => {
        const value = row[column];

        if (value == null || value === "") {
          return "";
        }

        if (dateColumns.has(column)) {
          return parseDateCellValue(value);
        }

        return typeof value === "string"
          ? sanitizeSpreadsheetText(value)
          : value;
      }),
    ),
  ];

  const sheet = XLSX.utils.aoa_to_sheet(data);

  if (sheet["!ref"]) {
    sheet["!autofilter"] = { ref: sheet["!ref"] };
  }

  sheet["!freeze"] = { xSplit: 0, ySplit: 1 };

  return sheet;
}

function buildOverviewRows(report) {
  const filters = report?.filters || {};
  const comparisonPeriod = report?.comparisonPeriod || {};

  return [
    {
      label: "Generated at",
      section: "metadata",
      value: new Date(),
      valueType: "datetime",
    },
    {
      label: "Report range start",
      section: "metadata",
      value: parseDateCellValue(filters.rangeStartBusinessDate),
      valueType: "date",
    },
    {
      label: "Report range end (inclusive)",
      section: "metadata",
      value: parseDateCellValue(
        filters.rangeEndBusinessDateExclusive
          ? addDays(filters.rangeEndBusinessDateExclusive, -1)
          : "",
      ),
      valueType: "date",
    },
    {
      label: "Report range end (exclusive)",
      section: "metadata",
      value: parseDateCellValue(filters.rangeEndBusinessDateExclusive),
      valueType: "date",
    },
    {
      label: "Comparison period start",
      section: "metadata",
      value: parseDateCellValue(comparisonPeriod.rangeStartBusinessDate),
      valueType: "date",
    },
    {
      label: "Comparison period end (exclusive)",
      section: "metadata",
      value: parseDateCellValue(comparisonPeriod.rangeEndBusinessDateExclusive),
      valueType: "date",
    },
    {
      label: "Timezone",
      section: "filters",
      value: filters.timezone || "",
      valueType: "text",
    },
    {
      label: "Group by",
      section: "filters",
      value: filters.groupBy || "",
      valueType: "text",
    },
    {
      label: "Comparison mode",
      section: "filters",
      value: report?.comparisonMode || "",
      valueType: "text",
    },
    {
      label: "Net revenue",
      section: "kpis",
      value: report?.kpis?.netRevenue ?? "",
      valueType: "amount",
    },
    {
      label: "Expenses",
      section: "kpis",
      value: report?.kpis?.expenses ?? "",
      valueType: "amount",
    },
    {
      label: "Net profit",
      section: "kpis",
      value: report?.kpis?.netProfit ?? "",
      valueType: "amount",
    },
    {
      label: "Completed bookings",
      section: "kpis",
      value: report?.kpis?.completedBookings ?? "",
      valueType: "count",
    },
    {
      label: "P&L margin",
      section: "profitAndLoss",
      value: report?.profitAndLoss?.margin ?? "",
      valueType: "percent",
    },
  ];
}

export function buildFinancialReportCsv(report) {
  const rows = buildFinancialReportRows(report);

  return `\uFEFF${[REPORT_DATA_COLUMNS.join(","), ...rows.map(serializeReportDataRow)].join("\n")}\n`;
}

export function buildFinancialReportWorkbook(report) {
  const workbook = XLSX.utils.book_new();
  const overviewSheet = createSheetFromObjects(
    OVERVIEW_COLUMNS,
    buildOverviewRows(report),
  );
  const reportDataSheet = createSheetFromObjects(
    REPORT_DATA_COLUMNS,
    buildFinancialReportRows(report),
    REPORT_DATA_DATE_COLUMNS,
  );

  XLSX.utils.book_append_sheet(workbook, overviewSheet, "Overview");
  XLSX.utils.book_append_sheet(workbook, reportDataSheet, "Report Data");

  return XLSX.write(workbook, {
    bookType: "xlsx",
    compression: true,
    type: "buffer",
  });
}

function buildFinancialReportFilename(report, extension) {
  const rangeStart = report?.filters?.rangeStartBusinessDate || "unknown-start";
  const rangeEnd =
    report?.filters?.rangeEndBusinessDateExclusive || "unknown-end";

  return `financial-report-${rangeStart}-to-${rangeEnd}.${extension}`;
}

export function buildFinancialReportCsvFilename(report) {
  return buildFinancialReportFilename(report, "csv");
}

export function buildFinancialReportWorkbookFilename(report) {
  return buildFinancialReportFilename(report, "xlsx");
}
