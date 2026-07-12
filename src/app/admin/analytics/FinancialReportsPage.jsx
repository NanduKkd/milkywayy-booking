"use client";

import {
  BarChart3,
  CalendarDays,
  Download,
  Eye,
  RefreshCcw,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  AdminBadge,
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
  { isCount: false, key: "grossPayments", label: "Gross Payments" },
  { isCount: false, key: "refunds", label: "Refunds" },
  { isCount: false, key: "netRevenue", label: "Net Revenue" },
  { isCount: false, key: "expenses", label: "Expenses" },
  { isCount: false, key: "netProfit", label: "Net Profit" },
  { isCount: false, key: "outstandingBalance", label: "Outstanding Balance" },
  { isCount: true, key: "completedBookings", label: "Completed Bookings" },
  { isCount: true, key: "pendingBookings", label: "Pending Bookings" },
  { isCount: true, key: "cancelledBookings", label: "Cancelled Bookings" },
  { isCount: false, key: "lostValue", label: "Lost Value" },
];
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

function formatDelta(entry, formatter) {
  if (!entry) {
    return "No prior period";
  }

  const delta = Number(entry.delta || 0);
  const prefix = delta > 0 ? "+" : delta < 0 ? "-" : "";

  return `${prefix}${formatter(Math.abs(delta))} vs previous period`;
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

function ReportKpiCard({ label, value, comparison, isCount = false }) {
  return (
    <AdminCard>
      <AdminCardHeader className="pb-3">
        <AdminCardDescription>{label}</AdminCardDescription>
        <AdminCardTitle className="text-2xl">
          {isCount ? formatCount(value) : formatCurrency(value)}
        </AdminCardTitle>
      </AdminCardHeader>
      <AdminCardContent>
        <p className="text-xs text-[hsl(var(--admin-muted))]">
          {formatDelta(comparison, isCount ? formatCount : formatCurrency)}
        </p>
      </AdminCardContent>
    </AdminCard>
  );
}

function DashboardKpiCard({
  comparison,
  isCount = false,
  label,
  onViewDetails,
  value,
}) {
  return (
    <AdminCard>
      <AdminCardHeader className="pb-3">
        <AdminCardDescription>{label}</AdminCardDescription>
        <AdminCardTitle className="text-2xl">
          {isCount ? formatCount(value) : formatCurrency(value)}
        </AdminCardTitle>
      </AdminCardHeader>
      <AdminCardContent className="space-y-3">
        <p className="text-xs text-[hsl(var(--admin-muted))]">
          {formatDelta(comparison, isCount ? formatCount : formatCurrency)}
        </p>
        <Button
          aria-label={`View ${label.toLowerCase()} details`}
          className="rounded-xl"
          onClick={onViewDetails}
          type="button"
          variant="outline"
        >
          <Eye className="h-4 w-4" />
          View details
        </Button>
      </AdminCardContent>
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
            className="h-32 rounded-2xl border border-white/10 bg-white/[0.04]"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="h-80 rounded-2xl border border-white/10 bg-white/[0.04]" />
        <div className="h-80 rounded-2xl border border-white/10 bg-white/[0.04]" />
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
        <div className="admin-panel-subtle rounded-[1.5rem] border border-[hsl(var(--admin-border)/0.76)] p-4">
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
  }, [monthValue, rangeEnd, rangeStart, reloadToken]);

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

  const dashboardEmpty =
    !dashboardLoading && !dashboardError && !hasDashboardActivity(dashboard);
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
                className="admin-input h-11 w-full min-w-48 rounded-2xl sm:w-52"
                id="financial-report-month"
                onChange={selectReportMonth}
                style={{ colorScheme: "dark" }}
                type="month"
                value={monthValue}
              />
            </label>
            {dashboardOnly ? (
              <Button asChild className="rounded-xl" variant="outline">
                <Link href="/admin/analytics">
                  <BarChart3 className="h-4 w-4" />
                  Open Reports
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild className="rounded-xl" variant="outline">
                  <a aria-label="Export CSV" download href={csvExportHref}>
                    <Download className="h-4 w-4" />
                    Export CSV
                  </a>
                </Button>
                <Button asChild className="rounded-xl" variant="outline">
                  <a aria-label="Export Excel" download href={excelExportHref}>
                    <Download className="h-4 w-4" />
                    Export Excel
                  </a>
                </Button>
                <Button asChild className="rounded-xl" variant="outline">
                  <a aria-label="Export PDF" download href={pdfExportHref}>
                    <Download className="h-4 w-4" />
                    Export PDF
                  </a>
                </Button>
              </>
            )}
            <Button
              className="rounded-xl"
              onClick={() => setReloadToken((value) => value + 1)}
              type="button"
              variant="outline"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        }
        eyebrow={dashboardOnly ? "Operations" : "Accounts"}
        title={dashboardOnly ? "Admin Dashboard" : "Admin Analytics"}
      >
        <div className="flex flex-wrap items-center gap-2">
          <AdminBadge tone="success">Live finance data</AdminBadge>
          <AdminBadge>{REPORT_TIMEZONE}</AdminBadge>
          <div className="admin-panel-subtle inline-flex items-center gap-2 rounded-full border border-[hsl(var(--admin-border)/0.75)] px-3 py-1.5 text-xs text-[hsl(var(--admin-muted))]">
            <CalendarDays className="h-3.5 w-3.5 text-[hsl(var(--admin-accent))]" />
            <span>{formatDateRange(rangeStart, rangeEnd)}</span>
          </div>
        </div>
      </AdminPageHeader>

      <section
        aria-labelledby="dashboard-analytics-heading"
        className="space-y-6"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Dashboard
            </p>
            <h2
              className="text-2xl font-semibold tracking-tight"
              id="dashboard-analytics-heading"
            >
              Dashboard Analytics
            </h2>
          </div>
          <AdminBadge>{formatDateRange(rangeStart, rangeEnd)}</AdminBadge>
        </div>

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

        {!dashboardLoading && !dashboardError && dashboardEmpty ? (
          <AdminEmptyState title="No dashboard activity in this range" />
        ) : null}

        {!dashboardLoading && !dashboardError && dashboard ? (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {DASHBOARD_KPI_CARDS.map((card) => (
                <DashboardKpiCard
                  key={card.key}
                  comparison={dashboard.comparison?.[card.key]}
                  isCount={card.isCount}
                  label={card.label}
                  onViewDetails={() => openDrilldown(card.key)}
                  value={dashboard.kpis?.[card.key]}
                />
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr,0.9fr]">
              <AdminCard>
                <AdminCardHeader>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-300" />
                    <AdminCardTitle className="text-xl">
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
                <AdminCardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <AdminCardTitle className="text-xl">
                        Revenue by Service
                      </AdminCardTitle>
                      <AdminCardDescription>
                        Paid-service contribution from the same dashboard range.
                      </AdminCardDescription>
                    </div>
                    <Button
                      className="rounded-xl"
                      onClick={() => openDrilldown("revenueByService")}
                      type="button"
                      variant="outline"
                    >
                      <Eye className="h-4 w-4" />
                      View rows
                    </Button>
                  </div>
                </AdminCardHeader>
                <AdminCardContent className="space-y-3">
                  {(dashboard.revenueByService || []).length > 0 ? (
                    dashboard.revenueByService.map((service) => (
                      <div
                        key={service.key}
                        className="admin-panel-subtle flex items-center justify-between rounded-xl border border-[hsl(var(--admin-border)/0.72)] px-4 py-3"
                      >
                        <span className="text-sm text-[hsl(var(--admin-muted))]">
                          {service.label}
                        </span>
                        <span className="text-sm font-medium">
                          {formatCurrency(service.amount)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[hsl(var(--admin-muted))]">
                      No attributable paid service revenue for this range.
                    </p>
                  )}
                </AdminCardContent>
              </AdminCard>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr,0.85fr]">
              <AdminCard>
                <AdminCardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <AdminCardTitle className="text-xl">
                        Schedule Summary
                      </AdminCardTitle>
                      <AdminCardDescription>
                        Operational booking volume for the same bounded range.
                      </AdminCardDescription>
                    </div>
                    <Button
                      className="rounded-xl"
                      onClick={() => openDrilldown("scheduleSummary")}
                      type="button"
                      variant="outline"
                    >
                      <Eye className="h-4 w-4" />
                      View rows
                    </Button>
                  </div>
                </AdminCardHeader>
                <AdminCardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <div className="admin-panel-subtle rounded-xl border border-[hsl(var(--admin-border)/0.72)] p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--admin-muted))]">
                        Total
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-[hsl(var(--admin-foreground))]">
                        {formatCount(dashboard.scheduleSummary?.totals?.total)}
                      </p>
                    </div>
                    <div className="admin-panel-subtle rounded-xl border border-[hsl(var(--admin-border)/0.72)] p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--admin-muted))]">
                        Pending
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-[hsl(var(--admin-foreground))]">
                        {formatCount(
                          dashboard.scheduleSummary?.totals?.pending,
                        )}
                      </p>
                    </div>
                    <div className="admin-panel-subtle rounded-xl border border-[hsl(var(--admin-border)/0.72)] p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--admin-muted))]">
                        Completed
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-[hsl(var(--admin-foreground))]">
                        {formatCount(
                          dashboard.scheduleSummary?.totals?.completed,
                        )}
                      </p>
                    </div>
                    <div className="admin-panel-subtle rounded-xl border border-[hsl(var(--admin-border)/0.72)] p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--admin-muted))]">
                        Cancelled
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-[hsl(var(--admin-foreground))]">
                        {formatCount(
                          dashboard.scheduleSummary?.totals?.cancelled,
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {(dashboard.scheduleSummary?.recentDayDetails || [])
                      .length > 0 ? (
                      dashboard.scheduleSummary.recentDayDetails.map((day) => (
                        <div
                          key={day.bucketStartBusinessDate}
                          className="admin-panel-subtle flex items-center justify-between rounded-xl border border-[hsl(var(--admin-border)/0.72)] px-4 py-3"
                        >
                          <div>
                            <p className="font-medium text-[hsl(var(--admin-foreground))]">
                              {formatBusinessDate(day.bucketStartBusinessDate)}
                            </p>
                            <p className="text-xs text-[hsl(var(--admin-muted))]">
                              {formatCount(day.total)} bookings ·{" "}
                              {formatCount(day.pending)} pending ·{" "}
                              {formatCount(day.completed)} completed ·{" "}
                              {formatCount(day.cancelled)} cancelled
                            </p>
                          </div>
                          <span className="text-sm font-medium">
                            {formatCount(day.total)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-[hsl(var(--admin-muted))]">
                        No scheduled bookings intersect this range.
                      </p>
                    )}
                  </div>
                </AdminCardContent>
              </AdminCard>

              <AdminCard>
                <AdminCardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <AdminCardTitle className="text-xl">
                        Recent Bookings
                      </AdminCardTitle>
                      <AdminCardDescription>
                        Most recently created non-draft bookings in range.
                      </AdminCardDescription>
                    </div>
                    <Button
                      className="rounded-xl"
                      onClick={() => openDrilldown("recentBookings")}
                      type="button"
                      variant="outline"
                    >
                      <Eye className="h-4 w-4" />
                      View rows
                    </Button>
                  </div>
                </AdminCardHeader>
                <AdminCardContent className="space-y-3">
                  {(dashboard.recentBookings || []).length > 0 ? (
                    dashboard.recentBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="admin-panel-subtle rounded-xl border border-[hsl(var(--admin-border)/0.72)] px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-[hsl(var(--admin-foreground))]">
                              {booking.bookingCode || `Booking #${booking.id}`}
                            </p>
                            <p className="text-xs text-[hsl(var(--admin-muted))]">
                              {booking.customer?.fullName ||
                                booking.customer?.email ||
                                "No customer"}
                            </p>
                          </div>
                          <span className="text-sm font-medium">
                            {formatCurrency(booking.total)}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-[hsl(var(--admin-muted))]">
                          Created {formatDateTime(booking.createdAt)} ·
                          Scheduled {formatBusinessDate(booking.date)} ·{" "}
                          {booking.workflowStatus ||
                            booking.status ||
                            "Unknown"}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[hsl(var(--admin-muted))]">
                      No recent bookings intersect this range.
                    </p>
                  )}
                </AdminCardContent>
              </AdminCard>
            </div>
          </>
        ) : null}
      </section>

      {!dashboardOnly ? (
        <>
          <section
            aria-labelledby="financial-reports-heading"
            className="space-y-6"
          >
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Reports
              </p>
              <h2
                className="text-2xl font-semibold tracking-tight"
                id="financial-reports-heading"
              >
                Financial Reports
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Revenue, refunds, expenses, profit, and month-over-month
                movement for {selectedMonthLabel}.
              </p>
            </div>

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
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <ReportKpiCard
                    comparison={report.comparison?.netRevenue}
                    label="Net Revenue"
                    value={report.kpis?.netRevenue}
                  />
                  <ReportKpiCard
                    comparison={report.comparison?.expenses}
                    label="Expenses"
                    value={report.kpis?.expenses}
                  />
                  <ReportKpiCard
                    comparison={report.comparison?.netProfit}
                    label="Net Profit"
                    value={report.kpis?.netProfit}
                  />
                  <ReportKpiCard
                    comparison={report.comparison?.completedBookings}
                    isCount
                    label="Completed Bookings"
                    value={report.kpis?.completedBookings}
                  />
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
                      <div className="rounded-2xl border border-[hsl(var(--admin-success)/0.24)] bg-[hsl(var(--admin-success)/0.12)] p-4">
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
                    <AdminCardHeader>
                      <AdminCardTitle className="text-xl">
                        Booking Status
                      </AdminCardTitle>
                      <AdminCardDescription>
                        Operational counts tied to the same live reporting
                        range.
                      </AdminCardDescription>
                    </AdminCardHeader>
                    <AdminCardContent className="space-y-3">
                      {(report.bookingStatus?.buckets || []).map((bucket) => (
                        <div
                          key={bucket.key}
                          className="admin-panel-subtle flex items-center justify-between rounded-xl border border-[hsl(var(--admin-border)/0.72)] px-4 py-3"
                        >
                          <span className="text-sm text-[hsl(var(--admin-muted))]">
                            {bucket.label}
                          </span>
                          <span className="text-sm font-medium">
                            {formatCount(bucket.count)}
                          </span>
                        </div>
                      ))}
                    </AdminCardContent>
                  </AdminCard>

                  <AdminCard>
                    <AdminCardHeader>
                      <AdminCardTitle className="text-xl">
                        Revenue by Service
                      </AdminCardTitle>
                      <AdminCardDescription>
                        Paid-service contribution from the same live dataset.
                      </AdminCardDescription>
                    </AdminCardHeader>
                    <AdminCardContent className="space-y-3">
                      {(report.revenueByService || []).length > 0 ? (
                        report.revenueByService.map((service) => (
                          <div
                            key={service.key}
                            className="admin-panel-subtle flex items-center justify-between rounded-xl border border-[hsl(var(--admin-border)/0.72)] px-4 py-3"
                          >
                            <span className="text-sm text-[hsl(var(--admin-muted))]">
                              {service.label}
                            </span>
                            <span className="text-sm font-medium">
                              {formatCurrency(service.amount)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-[hsl(var(--admin-muted))]">
                          No attributable paid service revenue for this range.
                        </p>
                      )}
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
