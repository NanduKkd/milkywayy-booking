import { NextResponse } from "next/server";
import { USER_ROLES } from "@/lib/config/app.config";
import "@/lib/db/relations";
import { auth } from "@/lib/helpers/auth";
import { buildDashboardAnalytics } from "@/lib/services/financialAggregation";
import { loadDashboardAnalyticsDependencies } from "@/lib/services/financialAnalyticsData";

function buildDashboardFilterInput(requestUrl) {
  const url = new URL(requestUrl);

  return {
    comparisonMode: url.searchParams.get("comparisonMode") || undefined,
    rangeEnd: url.searchParams.get("rangeEnd") || undefined,
    rangeStart: url.searchParams.get("rangeStart") || undefined,
    timezone: url.searchParams.get("timezone") || undefined,
  };
}

function isDashboardValidationError(error) {
  const message = error?.message || "";

  return (
    message.startsWith("Dashboard analytics") ||
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

    const filters = buildDashboardFilterInput(request.url);
    const {
      bookings,
      transactions,
      expenses,
      pricingConfig,
      currentBusinessDate,
      latestActivityMonth,
    } = await loadDashboardAnalyticsDependencies(filters);

    const result = buildDashboardAnalytics({
      bookings,
      transactions,
      expenses,
      pricingConfig,
      currentBusinessDate,
      filters,
    });

    return NextResponse.json({ ...result, latestActivityMonth });
  } catch (error) {
    const status = isDashboardValidationError(error) ? 400 : 500;

    console.error("Error loading admin dashboard analytics:", error);

    return NextResponse.json(
      { error: error?.message || "Failed to load dashboard analytics" },
      { status },
    );
  }
}
