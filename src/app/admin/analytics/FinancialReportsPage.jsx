"use client";

import {
  AlertCircle,
  BarChart3,
  Download,
  RefreshCcw,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

function buildReportParams(monthValue) {
  return new URLSearchParams({
    groupBy: "week",
    timezone: REPORT_TIMEZONE,
    ...getMonthRange(monthValue),
  });
}

function buildQuery(monthValue) {
  return `/api/admin/analytics/reports?${buildReportParams(monthValue).toString()}`;
}

function buildExportHref(monthValue, format) {
  const params = buildReportParams(monthValue);

  params.set("format", format);

  return `/api/admin/analytics/reports/export?${params.toString()}`;
}

function TrendChart({ buckets = [], title, valueKey = "netRevenue" }) {
  const maxValue = Math.max(
    ...buckets.map((bucket) => Math.abs(Number(bucket?.[valueKey] || 0))),
    1,
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-emerald-300" />
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
      </div>

      <div className="space-y-2">
        {buckets.map((bucket) => {
          const value = Number(bucket?.[valueKey] || 0);
          const width = `${Math.max((Math.abs(value) / maxValue) * 100, 4)}%`;
          const label =
            bucket.monthLabel || bucket.bucketStartBusinessDate || "Bucket";

          return (
            <div key={label} className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>{label}</span>
                <span className="font-medium text-foreground">
                  {formatCurrency(value)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/5">
                <div
                  className={
                    value >= 0
                      ? "h-2 rounded-full bg-emerald-400/80"
                      : "h-2 rounded-full bg-amber-400/80"
                  }
                  style={{ width }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KpiCard({ label, value, comparison, isCount = false }) {
  return (
    <Card className="rounded-2xl border-white/10 bg-card/70">
      <CardHeader className="pb-3">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">
          {isCount ? formatCount(value) : formatCurrency(value)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">
          {formatDelta(comparison, isCount ? formatCount : formatCurrency)}
        </p>
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <section
      aria-label="Loading financial reports"
      className="space-y-6 animate-pulse"
    >
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

export default function FinancialReportsPage() {
  const [monthValue, setMonthValue] = useState(getDefaultMonthValue);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    void reloadToken;

    const controller = new AbortController();

    async function loadReport() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(buildQuery(monthValue), {
          cache: "no-store",
          signal: controller.signal,
        });
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
  }, [monthValue, reloadToken]);

  const empty = !loading && !error && !hasReportActivity(report);
  const csvExportHref = buildExportHref(monthValue, "csv");
  const excelExportHref = buildExportHref(monthValue, "xlsx");
  const pdfExportHref = buildExportHref(monthValue, "pdf");
  const selectedMonthLabel = formatMonthLabel(monthValue);
  const { rangeEnd, rangeStart } = getMonthRange(monthValue);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
            >
              Live finance data
            </Badge>
            <Badge
              variant="outline"
              className="border-white/10 text-muted-foreground"
            >
              {REPORT_TIMEZONE}
            </Badge>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Accounts
            </p>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Financial Reports
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Revenue, refunds, expenses, profit, and month-over-month movement
              for {selectedMonthLabel}.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label
            className="flex flex-col gap-2 text-sm text-muted-foreground"
            htmlFor="financial-report-month"
          >
            Report month
            <Input
              aria-label="Report month"
              className="w-full min-w-48 rounded-xl border-white/10 bg-card/70 sm:w-52"
              id="financial-report-month"
              onChange={(event) => setMonthValue(event.target.value)}
              type="month"
              value={monthValue}
            />
          </label>
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
      </div>

      {loading ? <LoadingState /> : null}

      {!loading && error ? (
        <Card className="rounded-2xl border-red-400/20 bg-red-500/10">
          <CardHeader>
            <div className="flex items-center gap-2 text-red-200">
              <AlertCircle className="h-5 w-5" />
              <CardTitle className="text-xl">
                Financial report unavailable
              </CardTitle>
            </div>
            <CardDescription className="text-red-100/80">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setReloadToken((value) => value + 1)}
              type="button"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!loading && !error && empty ? (
        <Card className="rounded-2xl border-dashed border-white/15 bg-card/60">
          <CardHeader>
            <CardTitle className="text-xl">
              No financial activity in this range
            </CardTitle>
            <CardDescription>
              Live reporting returned no payments, refunds, expenses, or tracked
              bookings for {selectedMonthLabel}.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {!loading && !error && report ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              comparison={report.comparison?.netRevenue}
              label="Net Revenue"
              value={report.kpis?.netRevenue}
            />
            <KpiCard
              comparison={report.comparison?.expenses}
              label="Expenses"
              value={report.kpis?.expenses}
            />
            <KpiCard
              comparison={report.comparison?.netProfit}
              label="Net Profit"
              value={report.kpis?.netProfit}
            />
            <KpiCard
              comparison={report.comparison?.completedBookings}
              isCount
              label="Completed Bookings"
              value={report.kpis?.completedBookings}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr,0.9fr]">
            <Card className="rounded-2xl border-white/10 bg-card/70">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-300" />
                  <CardTitle className="text-xl">Weekly Net Revenue</CardTitle>
                </div>
                <CardDescription>
                  Live weekly buckets for {selectedMonthLabel}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TrendChart
                  buckets={report.weeklyTrend?.buckets}
                  title="Week-by-week net revenue"
                />
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-white/10 bg-card/70">
              <CardHeader>
                <CardTitle className="text-xl">Profit and Loss</CardTitle>
                <CardDescription>
                  Cash-based view for the selected month.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Net revenue</span>
                  <span className="font-medium">
                    {formatCurrency(report.profitAndLoss?.netRevenue)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Expenses</span>
                  <span className="font-medium">
                    {formatCurrency(report.profitAndLoss?.expenses)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Net profit</span>
                  <span className="font-medium">
                    {formatCurrency(report.profitAndLoss?.netProfit)}
                  </span>
                </div>
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-emerald-100/70">
                    Margin
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-emerald-100">
                    {formatPercent(report.profitAndLoss?.margin)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr,0.9fr]">
            <Card className="rounded-2xl border-white/10 bg-card/70">
              <CardHeader>
                <CardTitle className="text-xl">Monthly Comparison</CardTitle>
                <CardDescription>
                  Six business months ending in {selectedMonthLabel}.
                </CardDescription>
              </CardHeader>
              <CardContent>
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
                        <TableCell>{formatCurrency(row.netRevenue)}</TableCell>
                        <TableCell>{formatCurrency(row.expenses)}</TableCell>
                        <TableCell>{formatCurrency(row.netProfit)}</TableCell>
                        <TableCell>
                          {formatCount(row.completedBookings)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-white/10 bg-card/70">
              <CardHeader>
                <CardTitle className="text-xl">Six-Month Trend</CardTitle>
                <CardDescription>
                  Net revenue trajectory leading into the selected month.
                </CardDescription>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card className="rounded-2xl border-white/10 bg-card/70">
              <CardHeader>
                <CardTitle className="text-xl">Booking Status</CardTitle>
                <CardDescription>
                  Operational counts tied to the same live reporting range.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(report.bookingStatus?.buckets || []).map((bucket) => (
                  <div
                    key={bucket.key}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                  >
                    <span className="text-sm text-muted-foreground">
                      {bucket.label}
                    </span>
                    <span className="text-sm font-medium">
                      {formatCount(bucket.count)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-white/10 bg-card/70">
              <CardHeader>
                <CardTitle className="text-xl">Revenue by Service</CardTitle>
                <CardDescription>
                  Paid-service contribution from the same live dataset.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(report.revenueByService || []).length > 0 ? (
                  report.revenueByService.map((service) => (
                    <div
                      key={service.key}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                    >
                      <span className="text-sm text-muted-foreground">
                        {service.label}
                      </span>
                      <span className="text-sm font-medium">
                        {formatCurrency(service.amount)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No attributable paid service revenue for this range.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}

      <ExpenseTrackerSection
        onDataChanged={() => setReloadToken((value) => value + 1)}
        rangeEnd={rangeEnd}
        rangeStart={rangeStart}
        reloadToken={reloadToken}
        selectedMonthLabel={selectedMonthLabel}
      />
    </div>
  );
}
