import { buildFinancialReports } from "@/lib/services/financialAggregation";
import { loadFinancialReportDependencies } from "@/lib/services/financialAnalyticsData";

export function buildFinancialReportFilterInput(requestUrl) {
  const url = new URL(requestUrl);

  return {
    comparisonMode: url.searchParams.get("comparisonMode") || undefined,
    groupBy: url.searchParams.get("groupBy") || undefined,
    rangeEnd: url.searchParams.get("rangeEnd") || undefined,
    rangeStart: url.searchParams.get("rangeStart") || undefined,
    timezone: url.searchParams.get("timezone") || undefined,
  };
}

export function isFinancialReportValidationError(error) {
  const message = error?.message || "";

  return (
    message.startsWith("Financial aggregation") ||
    message.startsWith("Financial report")
  );
}

export async function loadFinancialReportData(filters) {
  const { bookings, transactions, expenses, pricingConfig } =
    await loadFinancialReportDependencies(filters);

  return buildFinancialReports({
    bookings,
    expenses,
    filters,
    pricingConfig,
    transactions,
  });
}
