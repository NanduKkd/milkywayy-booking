import models from "@/lib/db/models";
import { getPricingConfig } from "@/lib/helpers/pricing";
import { buildFinancialReports } from "@/lib/services/financialAggregation";

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
  const [pricingConfig, bookings, transactions, expenses] = await Promise.all([
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
  ]);

  return buildFinancialReports({
    bookings,
    expenses,
    filters,
    pricingConfig,
    transactions,
  });
}
