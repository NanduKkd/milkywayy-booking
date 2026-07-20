"use client";

import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  CalendarDays,
  Download,
  RefreshCcw,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  AdminCard,
  AdminCardContent,
  AdminCardDescription,
  AdminCardHeader,
  AdminCardTitle,
  AdminDialogContent,
  AdminEmptyState,
  AdminInlineMessage,
  AdminPage,
  AdminPageHeader,
  AdminTablePanel,
} from "@/components/admin/AdminPrimitives";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ExpenseTrackerSection from "./ExpenseTrackerSection";

const REPORT_TIMEZONE = "Asia/Dubai";
const DASHBOARD_DRILLDOWN_PAGE_SIZE = 10;
const DASHBOARD_KPI_CARDS = [
  { key: "netRevenue", label: "Total Revenue", tone: "emerald" },
  {
    isCount: true,
    key: "completedBookings",
    label: "Completed Bookings",
    tone: "blue",
  },
  {
    isCount: true,
    invertTrend: true,
    key: "pendingBookings",
    label: "Pending Shoots",
    tone: "amber",
  },
  {
    drilldownKey: "netRevenue",
    key: "averageBookingValue",
    label: "Avg Booking Value",
    tone: "violet",
  },
  {
    invertTrend: true,
    key: "expenses",
    label: "Expenses",
    tone: "rose",
  },
  { key: "netProfit", label: "Net Profit", tone: "cyan" },
];
const CHART_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899"];
const KPI_TONE_CLASSES = {
  amber: "text-amber-400",
  blue: "text-blue-400",
  cyan: "text-cyan-400",
  emerald: "text-emerald-400",
  rose: "text-rose-400",
  violet: "text-violet-400",
};
const DRILLDOWN_LABELS = {
  cancelledBookings: "Cancelled Bookings",
  completedBookings: "Completed Bookings",
  expenses: "Expenses",
  grossPayments: "Gross Payments",
  lostValue: "Lost Value",
  netProfit: "Net Profit",
  netRevenue: "Net Revenue",
  outstandingBalance: "Outstanding Balance",
  paidBookings: "Paid Bookings",
  pendingBookings: "Pending Bookings",
  recentBookings: "Recent Bookings",
  refunds: "Refunds",
  revenueByService: "Revenue by Service",
  scheduleSummary: "Schedule Summary",
};

function getDefaultMonthValue() {
  const today = new Date();
  const year = today.getUTCFullYear();
  const month = String(today.getUTCMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function getMonthRange(monthValue) {
  const [year, month] = String(monthValue)
    .split("-")
    .map((value) => Number(value));
  const rangeStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);

  return { rangeEnd: lastDay, rangeStart };
}

function formatMonthLabel(monthValue) {
  const [year, month] = String(monthValue)
    .split("-")
    .map((value) => Number(value));

  return new Intl.DateTimeFormat("en", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
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

function getComparisonPercentage(comparison) {
  if (!comparison) {
    return 0;
  }

  if (comparison.deltaPercentage != null) {
    return Math.abs(Number(comparison.deltaPercentage || 0));
  }

  const current = Number(comparison.current || 0);
  const previous = Number(comparison.previous || 0);

  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }

  return Math.abs(((current - previous) / previous) * 100);
}

function formatCompactPercent(value) {
  const rounded = Math.round(Number(value || 0) * 10) / 10;
  return `${rounded.toLocaleString("en", { maximumFractionDigits: 1 })}%`;
}

function ComparisonBadge({ comparison, invertTrend = false }) {
  const direction =
    comparison?.direction ||
    (Number(comparison?.delta || 0) > 0
      ? "up"
      : Number(comparison?.delta || 0) < 0
        ? "down"
        : "flat");

  if (direction === "flat") {
    return (
      <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-bold text-zinc-500">
        0%
      </span>
    );
  }

  const isUp = direction === "up";
  const isPositive = invertTrend ? !isUp : isUp;
  const Icon = isUp ? ArrowUp : ArrowDown;

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] font-bold ${
        isPositive
          ? "border-emerald-900 bg-emerald-950 text-emerald-400"
          : "border-rose-900 bg-rose-950 text-rose-400"
      }`}
    >
      <Icon className="h-3 w-3" />
      {formatCompactPercent(getComparisonPercentage(comparison))}
    </span>
  );
}

function ComparisonFooter({ comparison, formatter }) {
  return (
    <p className="border-t border-zinc-800 pt-3 text-xs text-[hsl(var(--admin-muted))]">
      vs {formatter(comparison?.previous || 0)} last month
    </p>
  );
}

function formatBusinessDate(value) {
  if (!value) {
    return "Unknown date";
  }

  const [year, month, day] = String(value).split("-").map(Number);

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatDateTime(value) {
  if (!value) {
    return "Unknown time";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: REPORT_TIMEZONE,
  }).format(new Date(value));
}

function formatDateRange(rangeStart, rangeEnd) {
  return `${formatBusinessDate(rangeStart)} to ${formatBusinessDate(rangeEnd)}`;
}

function formatStatusLabel(value) {
  return String(value || "Unknown")
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function BookingStatusBadge({ booking }) {
  const status = booking.workflowStatus || booking.status || "UNKNOWN";
  const tone = status.includes("CANCEL")
    ? "border-rose-800 bg-rose-950 text-rose-300"
    : status.includes("COMPLET") || status.includes("DELIVER")
      ? "border-emerald-800 bg-emerald-950 text-emerald-300"
      : "border-amber-800 bg-amber-950 text-amber-300";

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${tone}`}
    >
      {formatStatusLabel(status)}
    </span>
  );
}

function ServiceBadges({ services = [] }) {
  if (!services.length) {
    return <span className="text-xs text-zinc-600">No services</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {services.map((service, index) => (
        <span
          className="rounded-full border px-2 py-0.5 text-[10px] font-bold"
          key={service}
          style={{
            backgroundColor: `${CHART_COLORS[index % CHART_COLORS.length]}18`,
            borderColor: `${CHART_COLORS[index % CHART_COLORS.length]}55`,
            color: CHART_COLORS[index % CHART_COLORS.length],
          }}
        >
          {service}
        </span>
      ))}
    </div>
  );
}

function formatScheduleTime(value) {
  if (!value) {
    return "Time TBD";
  }

  const [hours, minutes] = String(value).split(":").map(Number);
  if (!Number.isFinite(hours)) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2026, 0, 1, hours, minutes || 0)));
}

function hasReportActivity(report) {
  if (!report) {
    return false;
  }

  return (
    Object.values(report.kpis || {}).some((value) => Number(value || 0) > 0) ||
    (report.bookingStatus?.total || 0) > 0 ||
    (report.revenueByService?.length || 0) > 0
  );
}

function hasDashboardActivity(dashboard) {
  if (!dashboard) {
    return false;
  }

  return (
    Object.values(dashboard.kpis || {}).some(
      (value) => Number(value || 0) > 0,
    ) ||
    (dashboard.recentBookings?.length || 0) > 0 ||
    (dashboard.revenueByService?.length || 0) > 0 ||
    (dashboard.scheduleSummary?.totals?.total || 0) > 0
  );
}

function buildDashboardParams({ rangeEnd, rangeStart }) {
  return new URLSearchParams({
    rangeEnd,
    rangeStart,
    timezone: REPORT_TIMEZONE,
  });
}

function buildDashboardQuery({ rangeEnd, rangeStart }) {
  return `/api/admin/analytics/dashboard?${buildDashboardParams({
    rangeEnd,
    rangeStart,
  }).toString()}`;
}

function buildReportParams({ rangeEnd, rangeStart }) {
  return new URLSearchParams({
    groupBy: "week",
    rangeEnd,
    rangeStart,
    timezone: REPORT_TIMEZONE,
  });
}

function buildReportQuery({ rangeEnd, rangeStart }) {
  return `/api/admin/analytics/reports?${buildReportParams({
    rangeEnd,
    rangeStart,
  }).toString()}`;
}

function getRangeDayCount(rangeStart, rangeEnd) {
  const start = new Date(`${rangeStart}T00:00:00.000Z`);
  const end = new Date(`${rangeEnd}T00:00:00.000Z`);

  return Math.max(
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
    1,
  );
}

function buildExportHref({ rangeEnd, rangeStart, format }) {
  const params = buildReportParams({ rangeEnd, rangeStart });

  params.set("format", format);
  params.set(
    "groupBy",
    getRangeDayCount(rangeStart, rangeEnd) > 93 ? "month" : "week",
  );

  return `/api/admin/analytics/reports/export?${params.toString()}`;
}

function buildDrilldownQuery({ metricKey, page, rangeEnd, rangeStart }) {
  const params = buildDashboardParams({ rangeEnd, rangeStart });

  params.set("metricKey", metricKey);
  params.set("page", String(page));
  params.set("pageSize", String(DASHBOARD_DRILLDOWN_PAGE_SIZE));

  return `/api/admin/analytics/drill-down?${params.toString()}`;
}

function getDrilldownLabel(metricKey) {
  return DRILLDOWN_LABELS[metricKey] || "Details";
}

function TrendChart({ buckets = [], title, valueKey = "netRevenue" }) {
  const width = 720;
  const height = 240;
  const padding = { bottom: 38, left: 72, right: 18, top: 16 };
  const values = buckets.map((bucket) => Number(bucket?.[valueKey] || 0));
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);
  const valueSpan = Math.max(maxValue - minValue, 1);
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const points = values.map((value, index) => {
    const x =
      padding.left + (index / Math.max(values.length - 1, 1)) * plotWidth;
    const y =
      padding.top + plotHeight - ((value - minValue) / valueSpan) * plotHeight;
    return `${x},${y}`;
  });
  const tickIndexes = Array.from(
    new Set([0, Math.floor((buckets.length - 1) / 2), buckets.length - 1]),
  ).filter((index) => index >= 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-emerald-300" />
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
      </div>

      <svg
        aria-label="Revenue by date"
        className="h-auto w-full overflow-visible"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        {[0, 0.5, 1].map((ratio) => {
          const y = padding.top + plotHeight - ratio * plotHeight;
          return (
            <g key={ratio}>
              <line
                stroke="currentColor"
                className="text-white/10"
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
              />
              <text
                className="fill-muted-foreground text-[11px]"
                textAnchor="end"
                x={padding.left - 10}
                y={y + 4}
              >
                {formatCurrency(minValue + valueSpan * ratio)}
              </text>
            </g>
          );
        })}
        <polyline
          fill="none"
          points={points.join(" ")}
          stroke="rgb(52 211 153)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        />
        {tickIndexes.map((index) => {
          const x =
            padding.left +
            (index / Math.max(buckets.length - 1, 1)) * plotWidth;
          const label =
            buckets[index]?.monthLabel ||
            buckets[index]?.bucketStartBusinessDate ||
            "";
          return (
            <text
              className="fill-muted-foreground text-[11px]"
              key={`${label}-${index}`}
              textAnchor={
                index === 0
                  ? "start"
                  : index === buckets.length - 1
                    ? "end"
                    : "middle"
              }
              x={x}
              y={height - 10}
            >
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function DonutChart({
  centerLabel,
  centerValue,
  data = [],
  formatValue = formatCount,
  title,
}) {
  const normalized = data
    .map((item, index) => ({
      ...item,
      color: item.color || CHART_COLORS[index % CHART_COLORS.length],
      value: Math.max(Number(item.value || 0), 0),
    }))
    .filter((item) => item.value > 0);
  const total = normalized.reduce((sum, item) => sum + item.value, 0);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  if (total === 0) {
    return (
      <div className="flex h-52 items-center justify-center rounded-xl border border-dashed border-zinc-800 text-sm text-muted-foreground">
        No data for this month
      </div>
    );
  }

  return (
    <div className="grid items-center gap-5 sm:grid-cols-[180px_1fr]">
      <div className="relative mx-auto h-[170px] w-[170px]">
        <svg
          aria-label={title}
          className="h-full w-full -rotate-90"
          role="img"
          viewBox="0 0 140 140"
        >
          <circle
            cx="70"
            cy="70"
            fill="none"
            r={radius}
            stroke="#27272a"
            strokeWidth="18"
          />
          {normalized.map((item) => {
            const length = (item.value / total) * circumference;
            const segment = (
              <circle
                cx="70"
                cy="70"
                fill="none"
                key={item.key || item.label}
                r={radius}
                stroke={item.color}
                strokeDasharray={`${Math.max(length - 3, 0)} ${circumference}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
                strokeWidth="18"
              />
            );
            offset += length;
            return segment;
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-base font-bold text-white">
            {centerValue || formatValue(total)}
          </span>
          <span className="mt-0.5 text-[10px] text-zinc-500">
            {centerLabel}
          </span>
        </div>
      </div>
      <div className="space-y-2.5">
        {normalized.map((item) => (
          <div
            className="flex items-center justify-between gap-4"
            key={item.key || item.label}
          >
            <span className="flex min-w-0 items-center gap-2 text-xs text-zinc-400">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate">{item.label}</span>
            </span>
            <span className="whitespace-nowrap text-xs font-bold text-white">
              {formatValue(item.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportKpiCard({
  comparison,
  invertTrend = false,
  isCount = false,
  label,
  tone = "emerald",
  value,
}) {
  const formatter = isCount ? formatCount : formatCurrency;

  return (
    <AdminCard className="rounded-xl border-zinc-800 bg-zinc-900">
      <AdminCardHeader className="p-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <AdminCardDescription className="text-[10px] font-semibold uppercase tracking-widest">
            {label}
          </AdminCardDescription>
          <ComparisonBadge comparison={comparison} invertTrend={invertTrend} />
        </div>
        <AdminCardTitle
          className={`text-2xl ${KPI_TONE_CLASSES[tone] || "text-white"}`}
        >
          {formatter(value)}
        </AdminCardTitle>
      </AdminCardHeader>
      <AdminCardContent className="px-5 pb-5">
        <ComparisonFooter comparison={comparison} formatter={formatter} />
      </AdminCardContent>
    </AdminCard>
  );
}

function DashboardKpiCard({
  comparison,
  invertTrend = false,
  isCount = false,
  label,
  onViewDetails,
  tone = "emerald",
  value,
}) {
  const formatter = isCount ? formatCount : formatCurrency;

  return (
    <AdminCard className="overflow-hidden rounded-xl border-zinc-800 bg-zinc-900 transition-colors hover:border-zinc-600">
      <button
        aria-label={`View ${label.toLowerCase()} details`}
        className="w-full text-left outline-none transition-colors hover:bg-zinc-800/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500"
        onClick={onViewDetails}
        type="button"
      >
        <AdminCardHeader className="p-5 pb-3">
          <div className="flex items-start justify-between gap-3">
            <AdminCardDescription className="text-[10px] font-semibold uppercase tracking-widest">
              {label}
            </AdminCardDescription>
            <ComparisonBadge
              comparison={comparison}
              invertTrend={invertTrend}
            />
          </div>
          <AdminCardTitle
            className={`text-2xl ${KPI_TONE_CLASSES[tone] || "text-white"}`}
          >
            {formatter(value)}
          </AdminCardTitle>
        </AdminCardHeader>
        <AdminCardContent className="px-5 pb-5">
          <ComparisonFooter comparison={comparison} formatter={formatter} />
        </AdminCardContent>
      </button>
    </AdminCard>
  );
}

function LoadingState({ label }) {
  return (
    <section aria-label={label} className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {["kpi-1", "kpi-2", "kpi-3", "kpi-4"].map((key) => (
          <div
            key={key}
            className="h-32 rounded-lg border border-white/10 bg-white/[0.04]"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="h-80 rounded-lg border border-white/10 bg-white/[0.04]" />
        <div className="h-80 rounded-lg border border-white/10 bg-white/[0.04]" />
      </div>
    </section>
  );
}

function EmptyTableRow({ colSpan, message }) {
  return (
    <TableRow>
      <TableCell
        className="text-center text-muted-foreground"
        colSpan={colSpan}
      >
        {message}
      </TableCell>
    </TableRow>
  );
}

function BookingCell({ bookingCode, id }) {
  return (
    <div>
      <p className="font-medium text-foreground">
        {bookingCode || `Booking #${id}`}
      </p>
      <p className="text-xs text-muted-foreground">ID {id}</p>
    </div>
  );
}

function CustomerCell({ customer }) {
  if (!customer) {
    return <span className="text-muted-foreground">No customer</span>;
  }

  return (
    <div>
      <p className="font-medium text-foreground">
        {customer.fullName || "Unnamed customer"}
      </p>
      <p className="text-xs text-muted-foreground">
        {customer.email || customer.phone || "No contact details"}
      </p>
    </div>
  );
}

function LinkedBookingsCell({ bookings = [] }) {
  if (bookings.length === 0) {
    return <span className="text-muted-foreground">No linked bookings</span>;
  }

  return (
    <div className="space-y-2">
      {bookings.map((booking) => (
        <div key={`${booking.id}-${booking.bookingCode || "booking"}`}>
          <p className="font-medium text-foreground">
            {booking.bookingCode || `Booking #${booking.id}`}
          </p>
          <p className="text-xs text-muted-foreground">
            {booking.customer?.fullName ||
              booking.customer?.email ||
              booking.date}
          </p>
        </div>
      ))}
    </div>
  );
}

function DrilldownTable({ metricKey, rows }) {
  if (metricKey === "grossPayments") {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Paid at</TableHead>
            <TableHead>Transaction</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Linked bookings</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length > 0 ? (
            rows.map((row) => (
              <TableRow key={`${row.id}-${row.paidAt}`}>
                <TableCell>{formatDateTime(row.paidAt)}</TableCell>
                <TableCell>#{row.transactionId}</TableCell>
                <TableCell>{formatCurrency(row.amount)}</TableCell>
                <TableCell>
                  <LinkedBookingsCell bookings={row.linkedBookings} />
                </TableCell>
              </TableRow>
            ))
          ) : (
            <EmptyTableRow
              colSpan={4}
              message="No payments matched this range."
            />
          )}
        </TableBody>
      </Table>
    );
  }

  if (metricKey === "refunds") {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Refunded at</TableHead>
            <TableHead>Transaction</TableHead>
            <TableHead>Refund amount</TableHead>
            <TableHead>Linked bookings</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length > 0 ? (
            rows.map((row) => (
              <TableRow key={`${row.id}-${row.refundedAt}`}>
                <TableCell>{formatDateTime(row.refundedAt)}</TableCell>
                <TableCell>#{row.transactionId}</TableCell>
                <TableCell>{formatCurrency(row.amount)}</TableCell>
                <TableCell>
                  <LinkedBookingsCell bookings={row.linkedBookings} />
                </TableCell>
              </TableRow>
            ))
          ) : (
            <EmptyTableRow
              colSpan={4}
              message="No refunds matched this range."
            />
          )}
        </TableBody>
      </Table>
    );
  }

  if (metricKey === "netRevenue" || metricKey === "netProfit") {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Event at</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Net impact</TableHead>
            <TableHead>Linked bookings</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length > 0 ? (
            rows.map((row) => (
              <TableRow
                key={`${row.id}-${row.eventAt}-${row.type || row.entryType}`}
              >
                <TableCell>{formatDateTime(row.eventAt)}</TableCell>
                <TableCell className="capitalize">
                  {row.entryType || row.type || "entry"}
                </TableCell>
                <TableCell>{formatCurrency(row.netAmount)}</TableCell>
                <TableCell>
                  {"linkedBookings" in row ? (
                    <LinkedBookingsCell bookings={row.linkedBookings} />
                  ) : (
                    <span className="text-muted-foreground">Expense entry</span>
                  )}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <EmptyTableRow colSpan={4} message="No rows matched this range." />
          )}
        </TableBody>
      </Table>
    );
  }

  if (metricKey === "expenses") {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Expense date</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length > 0 ? (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{formatBusinessDate(row.expenseDate)}</TableCell>
                <TableCell>
                  {row.categoryLabel || row.category || "Unknown"}
                </TableCell>
                <TableCell>{row.description || "No description"}</TableCell>
                <TableCell>{formatCurrency(row.amount)}</TableCell>
              </TableRow>
            ))
          ) : (
            <EmptyTableRow
              colSpan={4}
              message="No expenses matched this range."
            />
          )}
        </TableBody>
      </Table>
    );
  }

  if (metricKey === "revenueByService") {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Service</TableHead>
            <TableHead>Booking</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Paid at</TableHead>
            <TableHead>Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length > 0 ? (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.serviceLabel}</TableCell>
                <TableCell>
                  <BookingCell
                    bookingCode={row.bookingCode}
                    id={row.bookingId}
                  />
                </TableCell>
                <TableCell>
                  <CustomerCell customer={row.customer} />
                </TableCell>
                <TableCell>{formatDateTime(row.paidAt)}</TableCell>
                <TableCell>{formatCurrency(row.amount)}</TableCell>
              </TableRow>
            ))
          ) : (
            <EmptyTableRow
              colSpan={5}
              message="No service revenue matched this range."
            />
          )}
        </TableBody>
      </Table>
    );
  }

  if (metricKey === "scheduleSummary") {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Booking</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Scheduled date</TableHead>
            <TableHead>Status bucket</TableHead>
            <TableHead>Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length > 0 ? (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <BookingCell bookingCode={row.bookingCode} id={row.id} />
                </TableCell>
                <TableCell>
                  <CustomerCell customer={row.customer} />
                </TableCell>
                <TableCell>{formatBusinessDate(row.date)}</TableCell>
                <TableCell className="capitalize">{row.statusBucket}</TableCell>
                <TableCell>{formatCurrency(row.total)}</TableCell>
              </TableRow>
            ))
          ) : (
            <EmptyTableRow
              colSpan={5}
              message="No scheduled bookings matched this range."
            />
          )}
        </TableBody>
      </Table>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Booking</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Scheduled date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>
            {metricKey === "lostValue"
              ? "Lost value"
              : metricKey === "outstandingBalance"
                ? "Outstanding"
                : "Total"}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length > 0 ? (
          rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <BookingCell bookingCode={row.bookingCode} id={row.id} />
              </TableCell>
              <TableCell>
                <CustomerCell customer={row.customer} />
              </TableCell>
              <TableCell>{formatBusinessDate(row.date)}</TableCell>
              <TableCell>
                {row.workflowStatus || row.status || "Unknown"}
              </TableCell>
              <TableCell>
                {metricKey === "completedBookings" ||
                metricKey === "pendingBookings" ||
                metricKey === "cancelledBookings" ||
                metricKey === "recentBookings"
                  ? formatCurrency(row.total)
                  : formatCurrency(
                      row.lostValue ?? row.outstandingBalance ?? row.total,
                    )}
              </TableCell>
            </TableRow>
          ))
        ) : (
          <EmptyTableRow
            colSpan={5}
            message="No bookings matched this range."
          />
        )}
      </TableBody>
    </Table>
  );
}

function DashboardDrilldownDialog({
  error,
  filters,
  loading,
  metricKey,
  onClose,
  onPageChange,
  onRetry,
  open,
  pagination,
  rows,
  total,
}) {
  const title = `${getDrilldownLabel(metricKey)} Details`;
  const rangeLabel = formatDateRange(filters.rangeStart, filters.rangeEnd);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <AdminDialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-6xl"
        description={`Live drill-down rows for ${rangeLabel} in ${REPORT_TIMEZONE}.`}
        title={title}
      >
        <div className="admin-panel-subtle rounded-xl border border-[hsl(var(--admin-border)/0.76)] p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--admin-muted))]">
                Total
              </p>
              <p className="mt-2 text-2xl font-semibold text-[hsl(var(--admin-foreground))]">
                {total?.kind === "count"
                  ? formatCount(total?.value)
                  : formatCurrency(total?.value)}
              </p>
            </div>
            <div className="text-sm text-[hsl(var(--admin-muted))]">
              {pagination ? (
                <p>
                  Page {pagination.page} of {Math.max(pagination.totalPages, 1)}{" "}
                  · {formatCount(pagination.totalRows)} rows
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {loading ? (
          <section
            aria-label="Loading dashboard drill-down"
            className="space-y-3"
          >
            <div className="h-12 rounded-xl border border-[hsl(var(--admin-border)/0.7)] bg-white/[0.04]" />
            <div className="h-72 rounded-xl border border-[hsl(var(--admin-border)/0.7)] bg-white/[0.04]" />
          </section>
        ) : null}

        {!loading && error ? (
          <div className="space-y-4">
            <AdminInlineMessage
              description={error}
              title="Drill-down unavailable"
              tone="danger"
            />
            <Button onClick={onRetry} type="button" variant="outline">
              Retry
            </Button>
          </div>
        ) : null}

        {!loading && !error ? (
          <AdminTablePanel
            description="Range-bound rows returned by the live analytics service."
            title={title}
          >
            <DrilldownTable metricKey={metricKey} rows={rows} />
          </AdminTablePanel>
        ) : null}

        {!loading && !error && pagination ? (
          <div className="flex items-center justify-between gap-3">
            <Button
              className="rounded-xl"
              disabled={!pagination.hasPreviousPage}
              onClick={() => onPageChange(pagination.page - 1)}
              type="button"
              variant="outline"
            >
              Previous page
            </Button>
            <Button
              className="rounded-xl"
              disabled={!pagination.hasNextPage}
              onClick={() => onPageChange(pagination.page + 1)}
              type="button"
              variant="outline"
            >
              Next page
            </Button>
          </div>
        ) : null}
      </AdminDialogContent>
    </Dialog>
  );
}

export default function FinancialReportsPage({ mode = "full" }) {
  const dashboardOnly = mode === "dashboard";
  const [monthValue, setMonthValue] = useState(getDefaultMonthValue);
  const [dashboard, setDashboard] = useState(null);
  const [dashboardError, setDashboardError] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [drilldownState, setDrilldownState] = useState({
    error: null,
    loading: false,
    metricKey: null,
    open: false,
    page: 1,
    pagination: null,
    requestKey: 0,
    rows: [],
    total: null,
  });
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);
  const autoLocatedActivity = useRef(false);

  const selectedMonthLabel = formatMonthLabel(monthValue);
  const { rangeEnd, rangeStart } = getMonthRange(monthValue);

  useEffect(() => {
    if (!dashboardOnly) {
      setDashboard(null);
      setDashboardError(null);
      setDashboardLoading(false);
      return undefined;
    }

    void reloadToken;

    const controller = new AbortController();

    async function loadDashboard() {
      setDashboardLoading(true);
      setDashboardError(null);

      try {
        const response = await fetch(
          buildDashboardQuery({
            rangeEnd,
            rangeStart,
          }),
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Failed to load dashboard analytics");
        }

        if (
          !autoLocatedActivity.current &&
          !hasDashboardActivity(data) &&
          data.latestActivityMonth &&
          data.latestActivityMonth !== monthValue
        ) {
          autoLocatedActivity.current = true;
          setMonthValue(data.latestActivityMonth);
          return;
        }
        setDashboard(data);
      } catch (requestError) {
        if (requestError?.name === "AbortError") {
          return;
        }

        setDashboard(null);
        setDashboardError(
          requestError?.message || "Failed to load dashboard analytics",
        );
      } finally {
        if (!controller.signal.aborted) {
          setDashboardLoading(false);
        }
      }
    }

    loadDashboard();

    return () => controller.abort();
  }, [dashboardOnly, monthValue, rangeEnd, rangeStart, reloadToken]);

  useEffect(() => {
    if (dashboardOnly) {
      setError(null);
      setLoading(false);
      setReport(null);
      return undefined;
    }

    void reloadToken;

    const controller = new AbortController();

    async function loadReport() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          buildReportQuery({
            rangeEnd,
            rangeStart,
          }),
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Failed to load financial reports");
        }

        setReport(data);
      } catch (requestError) {
        if (requestError?.name === "AbortError") {
          return;
        }

        setReport(null);
        setError(requestError?.message || "Failed to load financial reports");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadReport();

    return () => controller.abort();
  }, [dashboardOnly, rangeEnd, rangeStart, reloadToken]);

  useEffect(() => {
    if (!drilldownState.open || !drilldownState.metricKey) {
      return undefined;
    }

    void drilldownState.requestKey;

    const controller = new AbortController();

    async function loadDrilldown() {
      setDrilldownState((current) => ({
        ...current,
        error: null,
        loading: true,
      }));

      try {
        const response = await fetch(
          buildDrilldownQuery({
            metricKey: drilldownState.metricKey,
            page: drilldownState.page,
            rangeEnd,
            rangeStart,
          }),
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Failed to load dashboard drill-down");
        }

        setDrilldownState((current) => ({
          ...current,
          error: null,
          loading: false,
          pagination: data.pagination || null,
          rows: Array.isArray(data.rows) ? data.rows : [],
          total: data.total || null,
        }));
      } catch (requestError) {
        if (requestError?.name === "AbortError") {
          return;
        }

        setDrilldownState((current) => ({
          ...current,
          error: requestError?.message || "Failed to load dashboard drill-down",
          loading: false,
          pagination: null,
          rows: [],
          total: null,
        }));
      }
    }

    loadDrilldown();

    return () => controller.abort();
  }, [
    drilldownState.metricKey,
    drilldownState.open,
    drilldownState.page,
    drilldownState.requestKey,
    rangeEnd,
    rangeStart,
  ]);

  const reportEmpty = !loading && !error && !hasReportActivity(report);
  const csvExportHref = buildExportHref({
    format: "csv",
    rangeEnd,
    rangeStart,
  });
  const excelExportHref = buildExportHref({
    format: "xlsx",
    rangeEnd,
    rangeStart,
  });
  const pdfExportHref = buildExportHref({
    format: "pdf",
    rangeEnd,
    rangeStart,
  });
  const reportStatusCounts = Object.fromEntries(
    (report?.bookingStatus?.buckets || []).map((bucket) => [
      bucket.key,
      bucket.count,
    ]),
  );
  const reportCompleted = Number(
    report?.kpis?.completedBookings ?? reportStatusCounts.completed ?? 0,
  );
  const reportKpis = [
    {
      comparison: report?.comparison?.netRevenue,
      label: "Revenue",
      tone: "emerald",
      value: report?.kpis?.netRevenue,
    },
    {
      comparison: report?.comparison?.completedBookings,
      isCount: true,
      label: "Completed",
      tone: "blue",
      value: reportCompleted,
    },
    {
      comparison: report?.comparison?.cancelledBookings,
      invertTrend: true,
      isCount: true,
      label: "Cancelled",
      tone: "rose",
      value:
        report?.kpis?.cancelledBookings ?? reportStatusCounts.cancelled ?? 0,
    },
    {
      comparison: report?.comparison?.pendingBookings,
      invertTrend: true,
      isCount: true,
      label: "Pending",
      tone: "amber",
      value: report?.kpis?.pendingBookings ?? reportStatusCounts.pending ?? 0,
    },
    {
      comparison: report?.comparison?.averageBookingValue,
      label: "Avg Value",
      tone: "violet",
      value: report?.kpis?.averageBookingValue,
    },
    {
      comparison: report?.comparison?.expenses,
      invertTrend: true,
      label: "Expenses",
      tone: "rose",
      value: report?.kpis?.expenses,
    },
  ];

  function openDrilldown(metricKey) {
    setDrilldownState({
      error: null,
      loading: false,
      metricKey,
      open: true,
      page: 1,
      pagination: null,
      requestKey: 0,
      rows: [],
      total: null,
    });
  }

  function retryDrilldown() {
    setDrilldownState((current) => ({
      ...current,
      error: null,
      loading: false,
      pagination: null,
      requestKey: current.requestKey + 1,
      rows: [],
      total: null,
    }));
  }

  function selectReportMonth(event) {
    autoLocatedActivity.current = true;
    setMonthValue(event.target.value);
  }

  return (
    <AdminPage>
      <AdminPageHeader
        actions={
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-end">
            <label
              className="flex flex-col gap-2 text-sm text-[hsl(var(--admin-muted))]"
              htmlFor="financial-report-month"
            >
              Report month
              <Input
                aria-label="Report month"
                className="admin-input h-9 w-full min-w-48 rounded-lg sm:w-52"
                id="financial-report-month"
                onChange={selectReportMonth}
                style={{ colorScheme: "dark" }}
                type="month"
                value={monthValue}
              />
            </label>
            {dashboardOnly ? (
              <Button asChild className="h-9 rounded-lg" variant="outline">
                <Link href="/admin/analytics">
                  <BarChart3 className="h-4 w-4" />
                  Open Reports
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild className="h-9 rounded-lg" variant="outline">
                  <a aria-label="Export CSV" download href={csvExportHref}>
                    <Download className="h-4 w-4" />
                    Export CSV
                  </a>
                </Button>
                <Button asChild className="h-9 rounded-lg" variant="outline">
                  <a aria-label="Export Excel" download href={excelExportHref}>
                    <Download className="h-4 w-4" />
                    Export Excel
                  </a>
                </Button>
                <Button asChild className="h-9 rounded-lg" variant="outline">
                  <a aria-label="Export PDF" download href={pdfExportHref}>
                    <Download className="h-4 w-4" />
                    Export PDF
                  </a>
                </Button>
              </>
            )}
            <Button
              className="h-9 rounded-lg"
              onClick={() => setReloadToken((value) => value + 1)}
              type="button"
              variant="outline"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        }
        eyebrow={dashboardOnly ? null : "Finance"}
        title={dashboardOnly ? "Dashboard" : "Financial Reports"}
        description={
          dashboardOnly
            ? `Live bookings, revenue, and expenses · ${selectedMonthLabel}`
            : undefined
        }
      />

      {dashboardOnly ? (
        <section aria-label="Dashboard analytics" className="space-y-4">
          {dashboardLoading ? (
            <LoadingState label="Loading dashboard analytics" />
          ) : null}

          {!dashboardLoading && dashboardError ? (
            <div className="space-y-4">
              <AdminInlineMessage
                description={dashboardError}
                title="Dashboard unavailable"
                tone="danger"
              />
              <Button
                onClick={() => setReloadToken((value) => value + 1)}
                type="button"
                variant="outline"
              >
                Retry
              </Button>
            </div>
          ) : null}

          {!dashboardLoading && !dashboardError && dashboard ? (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {DASHBOARD_KPI_CARDS.map((card) => (
                  <DashboardKpiCard
                    key={card.key}
                    comparison={dashboard.comparison?.[card.key]}
                    invertTrend={card.invertTrend}
                    isCount={card.isCount}
                    label={card.label}
                    onViewDetails={() =>
                      openDrilldown(card.drilldownKey || card.key)
                    }
                    tone={card.tone}
                    value={dashboard.kpis?.[card.key]}
                  />
                ))}
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <AdminCard className="xl:col-span-2">
                  <AdminCardHeader className="p-5 pb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-300" />
                      <AdminCardTitle className="text-sm">
                        Revenue Trend
                      </AdminCardTitle>
                    </div>
                  </AdminCardHeader>
                  <AdminCardContent>
                    <TrendChart
                      buckets={dashboard.revenueTrend?.buckets}
                      title={`Dashboard ${dashboard.revenueTrend?.granularity || "day"} buckets`}
                    />
                  </AdminCardContent>
                </AdminCard>

                <AdminCard>
                  <AdminCardHeader className="p-5 pb-1">
                    <div className="flex items-center justify-between gap-3">
                      <AdminCardTitle className="text-sm">
                        Revenue by Service
                      </AdminCardTitle>
                      <span className="text-[10px] text-zinc-500">
                        {selectedMonthLabel}
                      </span>
                    </div>
                  </AdminCardHeader>
                  <AdminCardContent className="p-5 pt-1">
                    <DonutChart
                      centerLabel="total revenue"
                      data={(dashboard.revenueByService || []).map(
                        (service) => ({
                          key: service.key,
                          label: service.label,
                          value: service.amount,
                        }),
                      )}
                      formatValue={formatCurrency}
                      title={`Revenue by service for ${selectedMonthLabel}`}
                    />
                  </AdminCardContent>
                </AdminCard>
              </div>

              <div className="space-y-4">
                <AdminCard>
                  <AdminCardHeader className="border-b border-zinc-800 p-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <AdminCardTitle className="text-sm">
                          Today&apos;s Schedule
                        </AdminCardTitle>
                        <p className="mt-1 text-xs text-zinc-500">
                          {formatBusinessDate(
                            dashboard.todaySchedule?.businessDate,
                          )}
                          {" · "}
                          {formatCount(
                            dashboard.todaySchedule?.bookings?.length,
                          )}{" "}
                          shoots ·{" "}
                          {formatCurrency(dashboard.todaySchedule?.total)}
                        </p>
                      </div>
                      <Button
                        asChild
                        className="h-8 rounded-lg text-xs"
                        variant="ghost"
                      >
                        <Link href="/admin/scheduling-calendar">
                          Full calendar →
                        </Link>
                      </Button>
                    </div>
                  </AdminCardHeader>
                  <AdminCardContent className="p-0">
                    {(dashboard.todaySchedule?.bookings || []).length > 0 ? (
                      <div className="divide-y divide-zinc-800">
                        {dashboard.todaySchedule.bookings.map((booking) => (
                          <div
                            className="grid gap-4 border-l-2 border-l-amber-500 px-5 py-4 md:grid-cols-[120px_1fr_1.2fr_180px] md:items-start"
                            key={booking.id}
                          >
                            <div>
                              <p className="font-bold text-white">
                                {formatScheduleTime(booking.startTime)}
                              </p>
                              <p className="mt-0.5 text-[10px] uppercase tracking-wider text-zinc-600">
                                Slot {booking.slot || "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-white">
                                {booking.property?.label ||
                                  booking.bookingCode ||
                                  `Booking #${booking.id}`}
                              </p>
                              <p className="mt-0.5 text-xs text-zinc-500">
                                {[
                                  booking.property?.type,
                                  booking.property?.size,
                                ]
                                  .filter(Boolean)
                                  .join(" · ") || "Property details pending"}
                              </p>
                            </div>
                            <div>
                              <p className="mb-1.5 text-sm text-zinc-300">
                                {booking.customer?.fullName ||
                                  booking.customer?.email ||
                                  "No customer"}
                              </p>
                              <ServiceBadges services={booking.services} />
                            </div>
                            <div className="md:text-right">
                              <p className="font-bold text-white">
                                {formatCurrency(booking.total)}
                              </p>
                              <div className="mt-1">
                                <BookingStatusBadge booking={booking} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-10 text-center">
                        <CalendarDays className="mx-auto h-5 w-5 text-zinc-600" />
                        <p className="mt-2 text-sm text-zinc-500">
                          No shoots scheduled today
                        </p>
                      </div>
                    )}
                  </AdminCardContent>
                </AdminCard>

                <AdminTablePanel
                  title="Recent Bookings"
                  actions={
                    <Button
                      asChild
                      className="h-8 rounded-lg text-xs"
                      variant="ghost"
                    >
                      <Link href="/admin/bookings">View all →</Link>
                    </Button>
                  }
                >
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Property</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Services</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(dashboard.recentBookings || []).length > 0 ? (
                        dashboard.recentBookings.map((booking) => (
                          <TableRow key={booking.id}>
                            <TableCell>
                              <p className="font-medium text-white">
                                {booking.property?.label ||
                                  booking.bookingCode ||
                                  `Booking #${booking.id}`}
                              </p>
                              <p className="mt-0.5 text-xs text-zinc-500">
                                {[
                                  booking.property?.type,
                                  booking.property?.size,
                                ]
                                  .filter(Boolean)
                                  .join(" · ") ||
                                  booking.bookingCode ||
                                  "—"}
                              </p>
                            </TableCell>
                            <TableCell>
                              {booking.customer?.fullName ||
                                booking.customer?.email ||
                                "No customer"}
                            </TableCell>
                            <TableCell>
                              {formatBusinessDate(booking.date)}
                            </TableCell>
                            <TableCell>
                              <ServiceBadges services={booking.services} />
                            </TableCell>
                            <TableCell className="font-semibold">
                              {formatCurrency(booking.total)}
                            </TableCell>
                            <TableCell>
                              <BookingStatusBadge booking={booking} />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <EmptyTableRow
                          colSpan={6}
                          message="No recent bookings in this range."
                        />
                      )}
                    </TableBody>
                  </Table>
                </AdminTablePanel>
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      {!dashboardOnly ? (
        <>
          <section
            aria-labelledby="financial-reports-heading"
            className="space-y-5"
          >
            <h2 className="sr-only" id="financial-reports-heading">
              Financial Reports
            </h2>

            {loading ? (
              <LoadingState label="Loading financial reports" />
            ) : null}

            {!loading && error ? (
              <div className="space-y-4">
                <AdminInlineMessage
                  description={error}
                  title="Financial report unavailable"
                  tone="danger"
                />
                <Button
                  onClick={() => setReloadToken((value) => value + 1)}
                  type="button"
                >
                  Retry
                </Button>
              </div>
            ) : null}

            {!loading && !error && reportEmpty ? (
              <AdminEmptyState
                description={`Live reporting returned no payments, refunds, expenses, or tracked bookings for ${selectedMonthLabel}.`}
                title="No financial activity in this range"
              />
            ) : null}

            {!loading && !error && report ? (
              <>
                <div className="rounded-xl border border-zinc-800 border-l-4 border-l-emerald-600 bg-zinc-900 p-5">
                  <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
                    <div>
                      <p className="text-xs font-semibold text-emerald-400">
                        Net revenue
                      </p>
                      <p className="mt-1 text-2xl font-bold">
                        {formatCurrency(report.kpis?.netRevenue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-red-400">
                        Expenses
                      </p>
                      <p className="mt-1 text-2xl font-bold">
                        {formatCurrency(report.kpis?.expenses)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-blue-400">
                        Net profit
                      </p>
                      <p className="mt-1 text-2xl font-bold">
                        {formatCurrency(report.kpis?.netProfit)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-amber-400">
                        Margin
                      </p>
                      <p className="mt-1 text-2xl font-bold">
                        {formatPercent(report.profitAndLoss?.margin)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                  {reportKpis.map((kpi) => (
                    <ReportKpiCard key={kpi.label} {...kpi} />
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr,0.9fr]">
                  <AdminCard>
                    <AdminCardHeader>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-emerald-300" />
                        <AdminCardTitle className="text-xl">
                          Weekly Net Revenue
                        </AdminCardTitle>
                      </div>
                      <AdminCardDescription>
                        Live weekly buckets for {selectedMonthLabel}.
                      </AdminCardDescription>
                    </AdminCardHeader>
                    <AdminCardContent>
                      <TrendChart
                        buckets={report.weeklyTrend?.buckets}
                        title="Week-by-week net revenue"
                      />
                    </AdminCardContent>
                  </AdminCard>

                  <AdminCard>
                    <AdminCardHeader>
                      <AdminCardTitle className="text-xl">
                        Profit and Loss
                      </AdminCardTitle>
                      <AdminCardDescription>
                        Cash-based view for the selected month.
                      </AdminCardDescription>
                    </AdminCardHeader>
                    <AdminCardContent className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[hsl(var(--admin-muted))]">
                          Net revenue
                        </span>
                        <span className="font-medium">
                          {formatCurrency(report.profitAndLoss?.netRevenue)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[hsl(var(--admin-muted))]">
                          Expenses
                        </span>
                        <span className="font-medium">
                          {formatCurrency(report.profitAndLoss?.expenses)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[hsl(var(--admin-muted))]">
                          Net profit
                        </span>
                        <span className="font-medium">
                          {formatCurrency(report.profitAndLoss?.netProfit)}
                        </span>
                      </div>
                      <div className="rounded-lg border border-[hsl(var(--admin-success)/0.24)] bg-[hsl(var(--admin-success)/0.12)] p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--admin-success)/0.82)]">
                          Margin
                        </p>
                        <p className="mt-2 text-3xl font-semibold text-[hsl(var(--admin-success))]">
                          {formatPercent(report.profitAndLoss?.margin)}
                        </p>
                      </div>
                    </AdminCardContent>
                  </AdminCard>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr,0.9fr]">
                  <AdminTablePanel
                    description={`Six business months ending in ${selectedMonthLabel}.`}
                    title="Monthly Comparison"
                  >
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Month</TableHead>
                          <TableHead>Net Revenue</TableHead>
                          <TableHead>Expenses</TableHead>
                          <TableHead>Net Profit</TableHead>
                          <TableHead>Completed</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(report.monthlyComparison || []).map((row) => (
                          <TableRow key={row.monthStartBusinessDate}>
                            <TableCell className="font-medium">
                              {row.monthLabel}
                            </TableCell>
                            <TableCell>
                              {formatCurrency(row.netRevenue)}
                            </TableCell>
                            <TableCell>
                              {formatCurrency(row.expenses)}
                            </TableCell>
                            <TableCell>
                              {formatCurrency(row.netProfit)}
                            </TableCell>
                            <TableCell>
                              {formatCount(row.completedBookings)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </AdminTablePanel>

                  <AdminCard>
                    <AdminCardHeader>
                      <AdminCardTitle className="text-xl">
                        Six-Month Trend
                      </AdminCardTitle>
                      <AdminCardDescription>
                        Net revenue trajectory leading into the selected month.
                      </AdminCardDescription>
                    </AdminCardHeader>
                    <AdminCardContent>
                      <TrendChart
                        buckets={report.sixMonthTrend?.buckets?.map(
                          (bucket, index) => ({
                            ...bucket,
                            monthLabel:
                              report.monthlyComparison?.[index]?.monthLabel ||
                              bucket.bucketStartBusinessDate,
                          }),
                        )}
                        title="Month-over-month net revenue"
                      />
                    </AdminCardContent>
                  </AdminCard>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <AdminCard>
                    <AdminCardHeader className="pb-2">
                      <AdminCardTitle className="text-xl">
                        Booking Status
                      </AdminCardTitle>
                      <AdminCardDescription>
                        {selectedMonthLabel}
                      </AdminCardDescription>
                    </AdminCardHeader>
                    <AdminCardContent>
                      <DonutChart
                        centerLabel="bookings"
                        data={(report.bookingStatus?.buckets || []).map(
                          (bucket) => ({
                            color:
                              bucket.key === "completed"
                                ? "#10b981"
                                : bucket.key === "cancelled"
                                  ? "#f43f5e"
                                  : "#f59e0b",
                            key: bucket.key,
                            label: bucket.label,
                            value: bucket.count,
                          }),
                        )}
                        title={`Booking status for ${selectedMonthLabel}`}
                      />
                    </AdminCardContent>
                  </AdminCard>

                  <AdminCard>
                    <AdminCardHeader className="pb-2">
                      <AdminCardTitle className="text-xl">
                        Revenue by Service
                      </AdminCardTitle>
                      <AdminCardDescription>
                        {selectedMonthLabel}
                      </AdminCardDescription>
                    </AdminCardHeader>
                    <AdminCardContent>
                      <DonutChart
                        centerLabel="total revenue"
                        data={(report.revenueByService || []).map(
                          (service) => ({
                            key: service.key,
                            label: service.label,
                            value: service.amount,
                          }),
                        )}
                        formatValue={formatCurrency}
                        title={`Revenue by service for ${selectedMonthLabel}`}
                      />
                    </AdminCardContent>
                  </AdminCard>
                </div>
              </>
            ) : null}
          </section>

          <ExpenseTrackerSection
            onDataChanged={() => setReloadToken((value) => value + 1)}
            rangeEnd={rangeEnd}
            rangeStart={rangeStart}
            reloadToken={reloadToken}
            selectedMonthLabel={selectedMonthLabel}
          />
        </>
      ) : null}

      <DashboardDrilldownDialog
        error={drilldownState.error}
        filters={{ rangeEnd, rangeStart }}
        loading={drilldownState.loading}
        metricKey={drilldownState.metricKey}
        onClose={() =>
          setDrilldownState((current) => ({
            ...current,
            open: false,
          }))
        }
        onPageChange={(page) =>
          setDrilldownState((current) => ({
            ...current,
            page,
          }))
        }
        onRetry={retryDrilldown}
        open={drilldownState.open}
        pagination={drilldownState.pagination}
        rows={drilldownState.rows}
        total={drilldownState.total}
      />
    </AdminPage>
  );
}
