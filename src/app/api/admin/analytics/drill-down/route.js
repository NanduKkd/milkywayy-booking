import { NextResponse } from "next/server";
import { USER_ROLES } from "@/lib/config/app.config";
import "@/lib/db/relations";
import { auth } from "@/lib/helpers/auth";
import { buildFinancialDrilldown } from "@/lib/services/financialAggregation";
import { loadFinancialDrilldownDependencies } from "@/lib/services/financialAnalyticsData";

function buildFinancialDrilldownFilterInput(requestUrl) {
  const url = new URL(requestUrl);

  return {
    bookingStatusBucket:
      url.searchParams.get("bookingStatusBucket") || undefined,
    expenseCategory: url.searchParams.get("expenseCategory") || undefined,
    metricKey: url.searchParams.get("metricKey") || undefined,
    page: url.searchParams.get("page") || undefined,
    pageSize: url.searchParams.get("pageSize") || undefined,
    rangeEnd: url.searchParams.get("rangeEnd") || undefined,
    rangeStart: url.searchParams.get("rangeStart") || undefined,
    serviceKey: url.searchParams.get("serviceKey") || undefined,
    sortDirection: url.searchParams.get("sortDirection") || undefined,
    sortKey: url.searchParams.get("sortKey") || undefined,
    timezone: url.searchParams.get("timezone") || undefined,
  };
}

function isFinancialDrilldownValidationError(error) {
  const message = error?.message || "";

  return (
    message.startsWith("Financial drill-down") ||
    message.startsWith("Financial aggregation")
  );
}

export async function GET(request) {
  try {
    const session = await auth();

    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== USER_ROLES.SUPERADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const filters = buildFinancialDrilldownFilterInput(request.url);
    const { bookings, transactions, expenses, pricingConfig } =
      await loadFinancialDrilldownDependencies(filters);

    const result = buildFinancialDrilldown({
      bookings,
      expenses,
      filters,
      pricingConfig,
      transactions,
    });

    return NextResponse.json(result);
  } catch (error) {
    const status = isFinancialDrilldownValidationError(error) ? 400 : 500;

    console.error("Error loading admin financial drill-down:", error);

    return NextResponse.json(
      { error: error?.message || "Failed to load financial drill-down" },
      { status },
    );
  }
}
