import puppeteer from "puppeteer";
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
const COUNT_METRIC_KEYS = new Set(["cancelledBookings", "completedBookings"]);

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDisplayDate(value) {
  if (!value) {
    return "";
  }

  const [year, month, day] = String(value)
    .split("-")
    .map((part) => Number(part));

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en", {
    currency: "AED",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(Number(value || 0));
}

function formatCount(value) {
  return new Intl.NumberFormat("en").format(Number(value || 0));
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}

function formatMetricLabel(value) {
  return String(value || "")
    .replace(/([a-z0-9])([A-Z])/gu, "$1 $2")
    .replace(/^./u, (letter) => letter.toUpperCase());
}

function formatMetricValue(metricKey, value) {
  return COUNT_METRIC_KEYS.has(metricKey)
    ? formatCount(value)
    : formatCurrency(value);
}

function formatGeneratedAt(value) {
  const instant = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(instant.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dubai",
  }).format(instant);
}

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

function buildPdfKpiCards(report) {
  const metricOrder = [
    "grossPayments",
    "refunds",
    "netRevenue",
    "expenses",
    "netProfit",
    "completedBookings",
    "averageBookingValue",
    "lostValue",
  ];

  return metricOrder
    .filter((metricKey) => report?.kpis?.[metricKey] != null)
    .map((metricKey) => {
      const comparison = report?.comparison?.[metricKey];
      const deltaLabel = comparison
        ? `${comparison.delta >= 0 ? "+" : "-"}${formatMetricValue(metricKey, Math.abs(Number(comparison.delta || 0)))} vs previous period`
        : "No prior period";

      return `
        <article class="kpi-card">
          <div class="kpi-label">${escapeHtml(formatMetricLabel(metricKey))}</div>
          <div class="kpi-value">${escapeHtml(formatMetricValue(metricKey, report.kpis[metricKey]))}</div>
          <div class="kpi-delta">${escapeHtml(deltaLabel)}</div>
        </article>
      `;
    })
    .join("");
}

function buildPdfTrendChart(title, buckets = []) {
  const maxValue = Math.max(
    ...buckets.map((bucket) => Math.abs(Number(bucket?.netRevenue || 0))),
    1,
  );
  const rows = buckets.length
    ? buckets
        .map((bucket) => {
          const value = Number(bucket?.netRevenue || 0);
          const width = Math.max((Math.abs(value) / maxValue) * 100, 4);
          const label =
            bucket.monthLabel || bucket.bucketStartBusinessDate || "Bucket";

          return `
            <div class="chart-row">
              <div class="chart-row-top">
                <span>${escapeHtml(label)}</span>
                <span>${escapeHtml(formatCurrency(value))}</span>
              </div>
              <div class="chart-track">
                <div class="chart-bar ${value >= 0 ? "positive" : "negative"}" style="width:${width}%"></div>
              </div>
            </div>
          `;
        })
        .join("")
    : '<p class="empty-copy">No chart data in this range.</p>';

  return `
    <section class="panel">
      <h2>${escapeHtml(title)}</h2>
      <div class="chart-list">${rows}</div>
    </section>
  `;
}

function buildPdfSimpleTable(headers, rows) {
  if (!rows.length) {
    return '<p class="empty-copy">No rows in this range.</p>';
  }

  return `
    <table>
      <thead>
        <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) =>
              `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

export function buildFinancialReportPdfHtml(report) {
  const filters = report?.filters || {};
  const comparisonPeriod = report?.comparisonPeriod || {};
  const rangeEndInclusive = filters.rangeEndBusinessDateExclusive
    ? addDays(filters.rangeEndBusinessDateExclusive, -1)
    : "";

  const bookingStatusTable = buildPdfSimpleTable(
    ["Booking status", "Count"],
    (report?.bookingStatus?.buckets || []).map((bucket) => [
      bucket.label || bucket.key || "Unknown",
      formatCount(bucket.count),
    ]),
  );
  const serviceRevenueTable = buildPdfSimpleTable(
    ["Service", "Revenue"],
    (report?.revenueByService || []).map((service) => [
      service.label || service.key || "Unknown",
      formatCurrency(service.amount),
    ]),
  );
  const monthlyComparisonTable = buildPdfSimpleTable(
    [
      "Month",
      "Gross payments",
      "Refunds",
      "Net revenue",
      "Expenses",
      "Net profit",
      "Completed bookings",
      "Cancelled bookings",
      "Lost value",
      "Average booking value",
    ],
    (report?.monthlyComparison || []).map((month) => [
      month.monthLabel || month.monthStartBusinessDate || "Month",
      formatCurrency(month.grossPayments),
      formatCurrency(month.refunds),
      formatCurrency(month.netRevenue),
      formatCurrency(month.expenses),
      formatCurrency(month.netProfit),
      formatCount(month.completedBookings),
      formatCount(month.cancelledBookings),
      formatCurrency(month.lostValue),
      formatCurrency(month.averageBookingValue),
    ]),
  );
  const profitAndLossTable = buildPdfSimpleTable(
    ["Metric", "Value"],
    [
      ["Net revenue", formatCurrency(report?.profitAndLoss?.netRevenue)],
      ["Expenses", formatCurrency(report?.profitAndLoss?.expenses)],
      ["Net profit", formatCurrency(report?.profitAndLoss?.netProfit)],
      ["Margin", formatPercent(report?.profitAndLoss?.margin)],
    ],
  );

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Milkywayy financial report</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f4efe6;
        --panel: #fffdf8;
        --ink: #14213d;
        --muted: #5a6478;
        --line: #d7cfbf;
        --accent: #0f766e;
        --accent-soft: #d8f3ef;
        --danger: #b45309;
      }

      * {
        box-sizing: border-box;
      }

      body {
        background: linear-gradient(180deg, #f7f3ec 0%, #efe7d8 100%);
        color: var(--ink);
        font-family: "Helvetica Neue", Arial, sans-serif;
        margin: 0;
        padding: 28px;
      }

      .page {
        background: var(--panel);
        border: 1px solid rgba(20, 33, 61, 0.08);
        border-radius: 24px;
        padding: 28px;
      }

      .hero {
        align-items: flex-start;
        display: flex;
        gap: 24px;
        justify-content: space-between;
        margin-bottom: 28px;
      }

      .eyebrow {
        color: var(--accent);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.18em;
        margin: 0 0 8px;
        text-transform: uppercase;
      }

      h1 {
        font-size: 30px;
        line-height: 1.1;
        margin: 0;
      }

      .hero-copy p,
      .meta-card p,
      .empty-copy {
        color: var(--muted);
        font-size: 13px;
        line-height: 1.5;
        margin: 8px 0 0;
      }

      .meta-card {
        background: #f9f4ea;
        border: 1px solid var(--line);
        border-radius: 18px;
        min-width: 250px;
        padding: 18px;
      }

      .meta-card h2 {
        font-size: 16px;
        margin: 0 0 12px;
      }

      .meta-grid {
        display: grid;
        gap: 10px 18px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .meta-item-label {
        color: var(--muted);
        display: block;
        font-size: 11px;
        margin-bottom: 2px;
        text-transform: uppercase;
      }

      .meta-item-value {
        font-size: 13px;
        font-weight: 600;
      }

      .kpi-grid {
        display: grid;
        gap: 14px;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        margin-bottom: 24px;
      }

      .kpi-card,
      .panel {
        background: #fff;
        border: 1px solid rgba(20, 33, 61, 0.08);
        border-radius: 18px;
        break-inside: avoid;
        padding: 16px;
      }

      .kpi-label {
        color: var(--muted);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .kpi-value {
        font-size: 22px;
        font-weight: 700;
        margin-top: 10px;
      }

      .kpi-delta {
        color: var(--muted);
        font-size: 12px;
        margin-top: 8px;
      }

      .panel-grid {
        display: grid;
        gap: 16px;
        grid-template-columns: 1fr 1fr;
        margin-bottom: 16px;
      }

      .stack {
        display: grid;
        gap: 16px;
      }

      h2 {
        font-size: 16px;
        margin: 0 0 12px;
      }

      .chart-list {
        display: grid;
        gap: 10px;
      }

      .chart-row-top {
        color: var(--muted);
        display: flex;
        font-size: 12px;
        justify-content: space-between;
        margin-bottom: 4px;
      }

      .chart-track {
        background: #eef1f5;
        border-radius: 999px;
        height: 10px;
        overflow: hidden;
      }

      .chart-bar {
        border-radius: 999px;
        height: 10px;
      }

      .chart-bar.positive {
        background: linear-gradient(90deg, #0f766e 0%, #34d399 100%);
      }

      .chart-bar.negative {
        background: linear-gradient(90deg, #b45309 0%, #f59e0b 100%);
      }

      table {
        border-collapse: collapse;
        width: 100%;
      }

      th,
      td {
        border-bottom: 1px solid #ece6da;
        font-size: 12px;
        padding: 10px 8px;
        text-align: left;
        vertical-align: top;
      }

      th {
        color: var(--muted);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      tr:last-child td {
        border-bottom: none;
      }

      .footer-note {
        color: var(--muted);
        font-size: 11px;
        margin-top: 18px;
      }
    </style>
  </head>
  <body>
    <div class="page">
      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow">Milkywayy finance</p>
          <h1>Financial report export</h1>
          <p>
            Server-generated PDF using the same validated report dataset as the
            on-screen analytics view.
          </p>
        </div>

        <aside class="meta-card">
          <h2>Report filters</h2>
          <div class="meta-grid">
            <div>
              <span class="meta-item-label">Generated at</span>
              <span class="meta-item-value">${escapeHtml(formatGeneratedAt(new Date()))}</span>
            </div>
            <div>
              <span class="meta-item-label">Timezone</span>
              <span class="meta-item-value">${escapeHtml(filters.timezone || "Asia/Dubai")}</span>
            </div>
            <div>
              <span class="meta-item-label">Range start</span>
              <span class="meta-item-value">${escapeHtml(formatDisplayDate(filters.rangeStartBusinessDate))}</span>
            </div>
            <div>
              <span class="meta-item-label">Range end</span>
              <span class="meta-item-value">${escapeHtml(formatDisplayDate(rangeEndInclusive))}</span>
            </div>
            <div>
              <span class="meta-item-label">Group by</span>
              <span class="meta-item-value">${escapeHtml(filters.groupBy || "week")}</span>
            </div>
            <div>
              <span class="meta-item-label">Comparison</span>
              <span class="meta-item-value">${escapeHtml(report?.comparisonMode || "previous_period")}</span>
            </div>
            <div>
              <span class="meta-item-label">Comparison start</span>
              <span class="meta-item-value">${escapeHtml(formatDisplayDate(comparisonPeriod.rangeStartBusinessDate))}</span>
            </div>
            <div>
              <span class="meta-item-label">Comparison end</span>
              <span class="meta-item-value">${escapeHtml(formatDisplayDate(comparisonPeriod.rangeEndBusinessDateExclusive ? addDays(comparisonPeriod.rangeEndBusinessDateExclusive, -1) : ""))}</span>
            </div>
          </div>
        </aside>
      </section>

      <section class="kpi-grid">
        ${buildPdfKpiCards(report)}
      </section>

      <section class="panel-grid">
        ${buildPdfTrendChart("Weekly net revenue", report?.weeklyTrend?.buckets)}
        ${buildPdfTrendChart("Six-month net revenue", report?.sixMonthTrend?.buckets)}
      </section>

      <section class="stack">
        <section class="panel">
          <h2>Profit and loss</h2>
          ${profitAndLossTable}
        </section>
        <section class="panel">
          <h2>Booking status</h2>
          ${bookingStatusTable}
        </section>
        <section class="panel">
          <h2>Revenue by service</h2>
          ${serviceRevenueTable}
        </section>
        <section class="panel">
          <h2>Monthly comparison</h2>
          ${monthlyComparisonTable}
        </section>
      </section>

      <p class="footer-note">
        This export reconciles to the live Financial Reports screen for the same
        normalized filter set.
      </p>
    </div>
  </body>
</html>`;
}

export async function buildFinancialReportPdf(report) {
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    headless: "new",
  });

  try {
    const page = await browser.newPage();

    await page.setContent(buildFinancialReportPdfHtml(report), {
      waitUntil: "networkidle0",
    });

    if (typeof page.emulateMediaType === "function") {
      await page.emulateMediaType("screen");
    }

    return await page.pdf({
      displayHeaderFooter: false,
      format: "A4",
      margin: {
        bottom: "16mm",
        left: "12mm",
        right: "12mm",
        top: "12mm",
      },
      printBackground: true,
    });
  } finally {
    await browser.close();
  }
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

export function buildFinancialReportPdfFilename(report) {
  return buildFinancialReportFilename(report, "pdf");
}
