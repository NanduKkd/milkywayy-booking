import { performance } from "node:perf_hooks";
import {
  buildDashboardAnalytics,
  buildFinancialDrilldown,
  buildFinancialReports,
} from "../financialAggregation";

function pad(value) {
  return String(value).padStart(2, "0");
}

function buildBusinessDate(month, day) {
  return `2026-${pad(month)}-${pad(day)}`;
}

function buildIso(month, day, hour = 8) {
  return `2026-${pad(month)}-${pad(day)}T${pad(hour)}:00:00.000Z`;
}

function buildRepresentativeFixture() {
  const bookings = [];
  const expenses = [];
  const transactions = [];

  for (let id = 1; id <= 3600; id += 1) {
    const month = (id % 6) + 1;
    const day = (id % 28) + 1;
    const statusVariant = id % 10;
    const transactionStatus =
      statusVariant === 8
        ? "failed"
        : statusVariant === 9
          ? "pending"
          : "success";
    const refundedAmount =
      transactionStatus === "success" && id % 7 === 0 ? 75 : 0;

    transactions.push({
      amount: 450,
      id,
      metadata:
        refundedAmount > 0
          ? {
              lastRefund: {
                amount: refundedAmount,
                refundedAt: buildIso(6, (id % 20) + 1, 11),
              },
            }
          : {},
      paidAt: buildIso(month, day, 9),
      refundedAmount,
      status: transactionStatus,
    });

    bookings.push({
      cancelledAt:
        statusVariant === 6 || statusVariant === 7
          ? buildIso(month, day, 7)
          : null,
      completedAt: statusVariant <= 4 ? buildIso(month, day, 12) : null,
      createdAt: buildIso(month, Math.max(day - 1, 1), 6),
      date: buildBusinessDate(month, day),
      id,
      paidAmount: transactionStatus === "success" ? 450 : 0,
      propertyDetails: { size: "1 Bed", type: "Apartment" },
      shootDetails: {
        services: ["Photography", "Videography"],
        videographySubService: "Short Form",
      },
      status:
        statusVariant === 6 || statusVariant === 7
          ? "CANCELLED"
          : statusVariant <= 4
            ? "COMPLETED"
            : "CONFIRMED",
      total: 450,
      transactionId: id,
      user: {
        email: `customer-${id}@example.com`,
        fullName: `Customer ${id}`,
        id: 5000 + id,
        phone: `+9715000${pad(id % 10000)}`,
      },
      workflowStatus:
        statusVariant === 6 || statusVariant === 7
          ? "SHOOT_BOOKED"
          : statusVariant <= 4
            ? "PROJECT_COMPLETED"
            : "EDITING",
    });
  }

  for (let id = 1; id <= 1200; id += 1) {
    const month = (id % 6) + 1;
    const day = (id % 28) + 1;

    expenses.push({
      amount: 40 + (id % 9) * 5,
      category: "travel",
      createdAt: buildIso(month, day, 4),
      deletedAt: id % 11 === 0 ? buildIso(month, day, 22) : null,
      description: `Expense ${id}`,
      expenseDate: buildBusinessDate(month, day),
      id,
      updatedAt: buildIso(month, day, 5),
    });
  }

  return {
    bookings,
    expenses,
    filters: {
      currentMonth: {
        rangeEnd: "2026-06-30",
        rangeStart: "2026-06-01",
      },
    },
    pricingConfig: {
      Apartment: {
        sizes: [
          {
            label: "1 Bed",
            prices: {
              Photography: { price: 325 },
              Videography: {
                "Short Form": { price: 125 },
              },
            },
          },
        ],
      },
    },
    transactions,
  };
}

function measureDuration(run) {
  const start = performance.now();
  const result = run();

  return {
    durationMs: performance.now() - start,
    result,
  };
}

describe("financial analytics representative volume", () => {
  jest.setTimeout(10000);

  it("stays within the representative dashboard/report/drill-down response budget", () => {
    const fixture = buildRepresentativeFixture();
    const dashboard = measureDuration(() =>
      buildDashboardAnalytics({
        bookings: fixture.bookings,
        expenses: fixture.expenses,
        filters: fixture.filters.currentMonth,
        pricingConfig: fixture.pricingConfig,
        transactions: fixture.transactions,
      }),
    );
    const reports = measureDuration(() =>
      buildFinancialReports({
        bookings: fixture.bookings,
        expenses: fixture.expenses,
        filters: {
          ...fixture.filters.currentMonth,
          groupBy: "week",
        },
        pricingConfig: fixture.pricingConfig,
        transactions: fixture.transactions,
      }),
    );
    const drilldown = measureDuration(() =>
      buildFinancialDrilldown({
        bookings: fixture.bookings,
        expenses: fixture.expenses,
        filters: {
          ...fixture.filters.currentMonth,
          metricKey: "netRevenue",
          page: 1,
          pageSize: 100,
        },
        pricingConfig: fixture.pricingConfig,
        transactions: fixture.transactions,
      }),
    );

    expect(dashboard.result.kpis.netRevenue).toBeGreaterThan(0);
    expect(reports.result.kpis.netRevenue).toBeGreaterThan(0);
    expect(drilldown.result.pagination.totalRows).toBeGreaterThan(0);
    expect(dashboard.durationMs).toBeLessThan(1500);
    expect(reports.durationMs).toBeLessThan(2500);
    expect(drilldown.durationMs).toBeLessThan(1000);
  });
});
