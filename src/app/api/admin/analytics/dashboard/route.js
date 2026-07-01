import { NextResponse } from "next/server";
import { USER_ROLES } from "@/lib/config/app.config";
import models from "@/lib/db/models";
import "@/lib/db/relations";
import { auth } from "@/lib/helpers/auth";
import { getPricingConfig } from "@/lib/helpers/pricing";
import { buildDashboardAnalytics } from "@/lib/services/financialAggregation";

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
    const [pricingConfig, bookings, transactions, expenses] = await Promise.all(
      [
        getPricingConfig(),
        models.Booking.findAll({
          include: [
            {
              model: models.User,
              as: "user",
              attributes: ["id", "fullName", "email", "phone"],
              required: false,
            },
          ],
          order: [["createdAt", "DESC"]],
        }),
        models.Transaction.findAll({
          where: { status: "success" },
          order: [["paidAt", "DESC"]],
        }),
        models.Expense.findAll({
          order: [["expenseDate", "DESC"]],
        }),
      ],
    );

    const result = buildDashboardAnalytics({
      bookings,
      transactions,
      expenses,
      pricingConfig,
      filters,
    });

    return NextResponse.json(result);
  } catch (error) {
    const status = isDashboardValidationError(error) ? 400 : 500;

    console.error("Error loading admin dashboard analytics:", error);

    return NextResponse.json(
      { error: error?.message || "Failed to load dashboard analytics" },
      { status },
    );
  }
}
