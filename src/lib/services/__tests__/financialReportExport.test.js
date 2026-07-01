import {
  buildFinancialReportCsv,
  buildFinancialReportCsvFilename,
} from "../financialReportExport";

describe("buildFinancialReportCsv", () => {
  it("serializes report sections into a deterministic CSV payload", () => {
    const csv = buildFinancialReportCsv({
      bookingStatus: {
        buckets: [{ count: 3, key: "completed", label: "Completed" }],
      },
      comparison: {
        completedBookings: { delta: 1 },
        netRevenue: { delta: 250 },
      },
      comparisonMode: "previous_period",
      comparisonPeriod: {
        rangeEndBusinessDateExclusive: "2026-06-01",
        rangeStartBusinessDate: "2026-05-01",
      },
      filters: {
        comparisonMode: "previous_period",
        groupBy: "week",
        rangeEndBusinessDateExclusive: "2026-07-01",
        rangeStartBusinessDate: "2026-06-01",
        timezone: "Asia/Dubai",
      },
      kpis: {
        completedBookings: 3,
        netRevenue: 1400,
      },
      monthlyComparison: [
        {
          averageBookingValue: 466.67,
          cancelledBookings: 1,
          completedBookings: 3,
          expenses: 450,
          grossPayments: 1500,
          lostValue: 250,
          monthEndBusinessDateExclusive: "2026-07-01",
          monthLabel: "Jun 2026",
          monthStartBusinessDate: "2026-06-01",
          netProfit: 950,
          netRevenue: 1400,
          refunds: 100,
        },
      ],
      profitAndLoss: {
        expenses: 450,
        margin: 67.86,
        netProfit: 950,
        netRevenue: 1400,
      },
      revenueByService: [
        { amount: 850, key: "photography", label: "Photography" },
      ],
      sixMonthTrend: {
        buckets: [
          {
            bucketEndBusinessDateExclusive: "2026-07-01",
            bucketStartBusinessDate: "2026-06-01",
            netRevenue: 1400,
          },
        ],
      },
      weeklyTrend: {
        buckets: [
          {
            bucketEndBusinessDateExclusive: "2026-06-08",
            bucketStartBusinessDate: "2026-06-01",
            netRevenue: 400,
          },
        ],
      },
    });

    expect(csv).toContain(
      "section,rowKey,label,valueType,numericValue,textValue,bucketStartBusinessDate",
    );
    expect(csv).toContain("kpis,netRevenue,netRevenue,amount,1400");
    expect(csv).toContain(
      "monthlyComparison,netProfit,Jun 2026 net profit,amount,950",
    );
    expect(csv).toContain("profitAndLoss,margin,Margin,percent,67.86");
    expect(csv).toContain("bookingStatus,completed,Completed,count,3");
  });

  it("neutralizes spreadsheet formulas in text cells", () => {
    const csv = buildFinancialReportCsv({
      comparisonMode: "previous_period",
      filters: {
        groupBy: "week",
        rangeEndBusinessDateExclusive: "2026-07-01",
        rangeStartBusinessDate: "2026-06-01",
        timezone: "Asia/Dubai",
      },
      revenueByService: [{ amount: 10, key: "marketing", label: "=2+3" }],
    });

    expect(csv).toContain("revenueByService,marketing,'=2+3,amount,10");
  });
});

describe("buildFinancialReportCsvFilename", () => {
  it("uses the normalized report business-date range", () => {
    expect(
      buildFinancialReportCsvFilename({
        filters: {
          rangeEndBusinessDateExclusive: "2026-07-01",
          rangeStartBusinessDate: "2026-06-01",
        },
      }),
    ).toBe("financial-report-2026-06-01-to-2026-07-01.csv");
  });
});
