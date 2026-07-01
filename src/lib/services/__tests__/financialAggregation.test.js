import {
  aggregateFinancialOverview,
  normalizeFinancialAggregationFilters,
  REPORTING_TIMEZONE,
} from "../financialAggregation";

describe("normalizeFinancialAggregationFilters", () => {
  it("normalizes Dubai business-day ranges from date-only input", () => {
    expect(
      normalizeFinancialAggregationFilters({
        rangeEnd: "2026-06-30",
        rangeStart: "2026-06-01",
      }),
    ).toMatchObject({
      rangeEnd: "2026-06-30T20:00:00.000Z",
      rangeEndBusinessDateExclusive: "2026-07-01",
      rangeStart: "2026-05-31T20:00:00.000Z",
      rangeStartBusinessDate: "2026-06-01",
      timezone: REPORTING_TIMEZONE,
    });
  });

  it("rejects non-Dubai reporting timezones", () => {
    expect(() =>
      normalizeFinancialAggregationFilters({
        rangeEnd: "2026-06-30",
        rangeStart: "2026-06-01",
        timezone: "UTC",
      }),
    ).toThrow("Financial aggregation timezone must be Asia/Dubai");
  });
});

describe("aggregateFinancialOverview", () => {
  it("computes revenue, expenses, profit, booking counts, averages, and service splits", () => {
    const pricingConfig = {
      Apartment: {
        sizes: [
          {
            label: "1 Bed",
            prices: {
              Photography: { price: 450 },
              Videography: {
                "Short Form": { price: 550 },
              },
              "360° Tour": 600,
            },
          },
        ],
      },
    };

    const result = aggregateFinancialOverview({
      bookings: [
        {
          cancelledAt: null,
          completedAt: "2026-06-12T06:00:00.000Z",
          date: "2026-06-10",
          id: 101,
          propertyDetails: { size: "1 Bed", type: "Apartment" },
          shootDetails: {
            services: ["Photography", "Videography"],
            videographySubService: "Short Form",
          },
          status: "COMPLETED",
          total: 1000,
          transactionId: 1,
          workflowStatus: "PROJECT_COMPLETED",
        },
        {
          cancelledAt: null,
          date: "2026-06-20",
          id: 102,
          propertyDetails: { size: "Penthouse", type: "Apartment" },
          shootDetails: {
            services: ["Photography", "360° Tour"],
          },
          status: "CONFIRMED",
          total: 500,
          transactionId: 2,
          workflowStatus: "SHOOT_BOOKED",
        },
        {
          cancelledAt: "2026-06-18T05:00:00.000Z",
          date: "2026-06-25",
          id: 103,
          status: "CANCELLED",
          total: 300,
          workflowStatus: "SHOOT_BOOKED",
        },
        {
          cancelledAt: null,
          date: "2026-06-21",
          id: 104,
          status: "CONFIRMED",
          total: 400,
          workflowStatus: "EDITING",
        },
        {
          cancelledAt: null,
          date: "2026-06-22",
          id: 105,
          status: "DRAFT",
          total: 200,
          workflowStatus: "SHOOT_BOOKED",
        },
      ],
      expenses: [
        {
          amount: 100,
          deletedAt: null,
          expenseDate: "2026-06-05",
          id: 201,
        },
        {
          amount: 50,
          deletedAt: null,
          expenseDate: "2026-06-23",
          id: 202,
        },
        {
          amount: 25,
          deletedAt: "2026-06-24T00:00:00.000Z",
          expenseDate: "2026-06-24",
          id: 203,
        },
      ],
      filters: {
        rangeEnd: "2026-06-30",
        rangeStart: "2026-06-01",
      },
      pricingConfig,
      transactions: [
        {
          amount: 1000,
          id: 1,
          metadata: {},
          paidAt: "2026-06-10T08:00:00.000Z",
          refundedAmount: 0,
          status: "success",
        },
        {
          amount: 500,
          id: 2,
          metadata: {
            lastRefund: {
              amount: 100,
              refundedAt: "2026-06-25T06:00:00.000Z",
            },
          },
          paidAt: "2026-06-20T11:00:00.000Z",
          refundedAmount: 100,
          status: "success",
        },
        {
          amount: 300,
          id: 3,
          metadata: {},
          paidAt: "2026-06-15T07:00:00.000Z",
          refundedAmount: 0,
          status: "pending",
        },
      ],
    });

    expect(result.totals).toEqual({
      expenses: 150,
      grossPayments: 1500,
      lostValue: 300,
      netProfit: 1250,
      netRevenue: 1400,
      refunds: 100,
    });
    expect(result.counts).toEqual({
      cancelledBookings: 1,
      completedBookings: 1,
      paidBookings: 2,
      pendingBookings: 2,
    });
    expect(result.averages).toEqual({
      averageBookingValue: 700,
    });
    expect(result.breakdowns.serviceRevenue).toEqual([
      { amount: 450, key: "photography", label: "Photography" },
      { amount: 500, key: "unallocated", label: "Unallocated" },
      { amount: 550, key: "videography", label: "Videography" },
    ]);
  });

  it("uses Dubai business-time boundaries for payment inclusion", () => {
    const result = aggregateFinancialOverview({
      bookings: [
        {
          id: 1,
          propertyDetails: { size: "1 Bed", type: "Apartment" },
          shootDetails: { services: [] },
          status: "CONFIRMED",
          total: 200,
          transactionId: 10,
          workflowStatus: "SHOOT_BOOKED",
        },
      ],
      expenses: [],
      filters: {
        rangeEnd: "2026-06-01",
        rangeStart: "2026-06-01",
      },
      transactions: [
        {
          amount: 200,
          id: 10,
          metadata: {},
          paidAt: "2026-05-31T20:30:00.000Z",
          refundedAmount: 0,
          status: "success",
        },
      ],
    });

    expect(result.totals.grossPayments).toBe(200);
    expect(result.counts.paidBookings).toBe(1);
    expect(result.breakdowns.serviceRevenue).toEqual([
      { amount: 200, key: "unallocated", label: "Unallocated" },
    ]);
  });

  it("returns zero-safe values when the range has no matching records", () => {
    const result = aggregateFinancialOverview({
      bookings: [],
      expenses: [],
      filters: {
        rangeEnd: "2026-06-30",
        rangeStart: "2026-06-01",
      },
      transactions: [],
    });

    expect(result.totals).toEqual({
      expenses: 0,
      grossPayments: 0,
      lostValue: 0,
      netProfit: 0,
      netRevenue: 0,
      refunds: 0,
    });
    expect(result.counts).toEqual({
      cancelledBookings: 0,
      completedBookings: 0,
      paidBookings: 0,
      pendingBookings: 0,
    });
    expect(result.averages.averageBookingValue).toBe(0);
    expect(result.breakdowns.serviceRevenue).toEqual([]);
  });
});
