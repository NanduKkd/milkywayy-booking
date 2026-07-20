import {
  aggregateFinancialOverview,
  buildDashboardAnalytics,
  buildFinancialDrilldown,
  buildFinancialReports,
  DASHBOARD_COMPARISON_MODE,
  FINANCIAL_REPORT_GROUP_BY_WEEK,
  normalizeDashboardAnalyticsFilters,
  normalizeFinancialAggregationFilters,
  normalizeFinancialDrilldownFilters,
  normalizeFinancialReportFilters,
  REPORTING_TIMEZONE,
} from "../financialAggregation";

function buildReconciliationFixture() {
  return {
    bookings: [
      {
        cancelledAt: null,
        completedAt: "2026-06-12T06:00:00.000Z",
        createdAt: "2026-06-01T08:00:00.000Z",
        date: "2026-06-10",
        id: 101,
        paidAmount: 600,
        propertyDetails: { size: "1 Bed", type: "Apartment" },
        shootDetails: {
          services: ["Photography", "Videography"],
          videographySubService: "Short Form",
        },
        status: "COMPLETED",
        total: 600,
        transactionId: 1,
        user: {
          email: "booking-101@example.com",
          fullName: "Booking 101",
          id: 501,
          phone: "+971500000101",
        },
        workflowStatus: "PROJECT_COMPLETED",
      },
      {
        cancelledAt: null,
        createdAt: "2026-06-02T08:00:00.000Z",
        date: "2026-06-15",
        id: 102,
        paidAmount: 0,
        status: "CONFIRMED",
        total: 500,
        transactionId: 2,
        user: {
          email: "booking-102@example.com",
          fullName: "Booking 102",
          id: 502,
          phone: "+971500000102",
        },
        workflowStatus: "SHOOT_BOOKED",
      },
      {
        cancelledAt: "2026-06-20T05:00:00.000Z",
        createdAt: "2026-06-03T08:00:00.000Z",
        date: "2026-06-22",
        id: 103,
        status: "CANCELLED",
        total: 300,
        user: {
          email: "booking-103@example.com",
          fullName: "Booking 103",
          id: 503,
          phone: "+971500000103",
        },
        workflowStatus: "SHOOT_BOOKED",
      },
      {
        cancelledAt: null,
        completedAt: "2026-05-29T05:00:00.000Z",
        createdAt: "2026-05-20T08:00:00.000Z",
        date: "2026-05-28",
        id: 104,
        paidAmount: 400,
        shootDetails: { services: [] },
        status: "COMPLETED",
        total: 400,
        transactionId: 3,
        user: {
          email: "booking-104@example.com",
          fullName: "Booking 104",
          id: 504,
          phone: "+971500000104",
        },
        workflowStatus: "PROJECT_COMPLETED",
      },
      {
        cancelledAt: null,
        createdAt: "2026-06-05T08:00:00.000Z",
        date: "2026-06-25",
        id: 105,
        paidAmount: 0,
        status: "CONFIRMED",
        total: 250,
        transactionId: 5,
        user: {
          email: "booking-105@example.com",
          fullName: "Booking 105",
          id: 505,
          phone: "+971500000105",
        },
        workflowStatus: "EDITING",
      },
      {
        cancelledAt: null,
        createdAt: "2026-06-06T08:00:00.000Z",
        date: "2026-06-18",
        id: 106,
        paidAmount: 0,
        status: "DRAFT",
        total: 120,
        workflowStatus: "SHOOT_BOOKED",
      },
    ],
    expenses: [
      {
        amount: 100,
        deletedAt: null,
        expenseDate: "2026-06-03",
        id: 201,
      },
      {
        amount: 25,
        deletedAt: null,
        expenseDate: "2026-06-18",
        id: 202,
      },
      {
        amount: 80,
        deletedAt: null,
        expenseDate: "2026-05-20",
        id: 203,
      },
      {
        amount: 50,
        deletedAt: "2026-06-19T00:00:00.000Z",
        expenseDate: "2026-06-19",
        id: 204,
      },
    ],
    filters: {
      currentMonth: {
        rangeEnd: "2026-06-30",
        rangeStart: "2026-06-01",
      },
      emptyMonth: {
        rangeEnd: "2026-07-31",
        rangeStart: "2026-07-01",
      },
      previousMonth: {
        rangeEnd: "2026-05-31",
        rangeStart: "2026-05-01",
      },
    },
    pricingConfig: {
      Apartment: {
        sizes: [
          {
            label: "1 Bed",
            prices: {
              Photography: { price: 400 },
              Videography: {
                "Short Form": { price: 200 },
              },
            },
          },
        ],
      },
    },
    transactions: [
      {
        amount: 600,
        id: 1,
        metadata: {},
        paidAt: "2026-06-02T08:00:00.000Z",
        refundedAmount: 0,
        status: "success",
      },
      {
        amount: 500,
        id: 2,
        metadata: {},
        paidAt: "2026-06-15T08:00:00.000Z",
        refundedAmount: 0,
        status: "pending",
      },
      {
        amount: 400,
        id: 3,
        metadata: {
          lastRefund: {
            amount: 150,
            refundedAt: "2026-06-05T10:00:00.000Z",
          },
        },
        paidAt: "2026-05-29T09:00:00.000Z",
        refundedAmount: 150,
        status: "success",
      },
      {
        amount: 250,
        id: 5,
        metadata: {},
        paidAt: "2026-06-25T09:00:00.000Z",
        refundedAmount: 0,
        status: "failed",
      },
    ],
  };
}

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

  it("rejects ranges wider than 366 Dubai business days", () => {
    expect(() =>
      normalizeFinancialAggregationFilters({
        rangeEnd: "2027-01-02",
        rangeStart: "2026-01-01",
      }),
    ).toThrow("Financial aggregation range cannot exceed 366 days");
  });
});

describe("normalizeDashboardAnalyticsFilters", () => {
  it("defaults the dashboard comparison mode to previous_period", () => {
    expect(
      normalizeDashboardAnalyticsFilters({
        rangeEnd: "2026-06-30",
        rangeStart: "2026-06-01",
      }),
    ).toMatchObject({
      comparisonMode: DASHBOARD_COMPARISON_MODE,
      rangeEndBusinessDateExclusive: "2026-07-01",
      rangeStartBusinessDate: "2026-06-01",
    });
  });

  it("rejects unsupported dashboard filter keys", () => {
    expect(() =>
      normalizeDashboardAnalyticsFilters({
        metricKey: "netRevenue",
        rangeEnd: "2026-06-30",
        rangeStart: "2026-06-01",
      }),
    ).toThrow("Dashboard analytics filter metricKey is unsupported");
  });
});

describe("normalizeFinancialReportFilters", () => {
  it("defaults the report grouping to week", () => {
    expect(
      normalizeFinancialReportFilters({
        rangeEnd: "2026-06-30",
        rangeStart: "2026-06-01",
      }),
    ).toMatchObject({
      comparisonMode: DASHBOARD_COMPARISON_MODE,
      groupBy: FINANCIAL_REPORT_GROUP_BY_WEEK,
      rangeEndBusinessDateExclusive: "2026-07-01",
      rangeStartBusinessDate: "2026-06-01",
    });
  });

  it("rejects unsupported report keys", () => {
    expect(() =>
      normalizeFinancialReportFilters({
        metricKey: "netRevenue",
        rangeEnd: "2026-06-30",
        rangeStart: "2026-06-01",
      }),
    ).toThrow("Financial report filter metricKey is unsupported");
  });
});

describe("normalizeFinancialDrilldownFilters", () => {
  it("normalizes pagination, sorting, and supported overlay filters", () => {
    expect(
      normalizeFinancialDrilldownFilters({
        bookingStatusBucket: "all",
        metricKey: "recentBookings",
        page: "2",
        pageSize: "10",
        rangeEnd: "2026-06-30",
        rangeStart: "2026-06-01",
        sortDirection: "asc",
        sortKey: "date",
      }),
    ).toMatchObject({
      bookingStatusBucket: "all",
      metricKey: "recentBookings",
      page: 2,
      pageSize: 10,
      rangeEndBusinessDateExclusive: "2026-07-01",
      rangeStartBusinessDate: "2026-06-01",
      sortDirection: "asc",
      sortKey: "date",
    });
  });

  it("rejects metric-specific unsupported filters", () => {
    expect(() =>
      normalizeFinancialDrilldownFilters({
        expenseCategory: "rent",
        metricKey: "netRevenue",
        rangeEnd: "2026-06-30",
        rangeStart: "2026-06-01",
      }),
    ).toThrow(
      "Financial drill-down metric netRevenue does not support expenseCategory",
    );
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
          paidAmount: 1000,
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
          paidAmount: 500,
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
          paidAmount: 0,
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
      outstandingBalance: 400,
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
          paidAmount: 200,
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
      outstandingBalance: 0,
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

  it("reconciles cross-month payments and refunds while excluding pending and failed transactions", () => {
    const fixture = buildReconciliationFixture();

    const juneOverview = aggregateFinancialOverview({
      bookings: fixture.bookings,
      expenses: fixture.expenses,
      filters: fixture.filters.currentMonth,
      pricingConfig: fixture.pricingConfig,
      transactions: fixture.transactions,
    });
    const mayOverview = aggregateFinancialOverview({
      bookings: fixture.bookings,
      expenses: fixture.expenses,
      filters: fixture.filters.previousMonth,
      pricingConfig: fixture.pricingConfig,
      transactions: fixture.transactions,
    });

    expect(juneOverview.totals).toEqual({
      expenses: 125,
      grossPayments: 600,
      lostValue: 300,
      netProfit: 325,
      netRevenue: 450,
      outstandingBalance: 750,
      refunds: 150,
    });
    expect(juneOverview.counts).toEqual({
      cancelledBookings: 1,
      completedBookings: 1,
      paidBookings: 1,
      pendingBookings: 2,
    });
    expect(juneOverview.averages).toEqual({
      averageBookingValue: 450,
    });
    expect(juneOverview.breakdowns.serviceRevenue).toEqual([
      { amount: 400, key: "photography", label: "Photography" },
      { amount: 200, key: "videography", label: "Videography" },
    ]);

    expect(mayOverview.totals).toEqual({
      expenses: 80,
      grossPayments: 400,
      lostValue: 0,
      netProfit: 320,
      netRevenue: 400,
      outstandingBalance: 0,
      refunds: 0,
    });
    expect(mayOverview.counts).toEqual({
      cancelledBookings: 0,
      completedBookings: 1,
      paidBookings: 1,
      pendingBookings: 0,
    });
    expect(mayOverview.averages).toEqual({
      averageBookingValue: 400,
    });
    expect(mayOverview.breakdowns.serviceRevenue).toEqual([
      { amount: 400, key: "unallocated", label: "Unallocated" },
    ]);
  });
});

describe("buildFinancialDrilldown", () => {
  it("builds paginated net revenue rows that reconcile to the aggregate total", () => {
    const result = buildFinancialDrilldown({
      bookings: [
        {
          bookingCode: "BK-101",
          createdAt: "2026-06-01T08:00:00.000Z",
          date: "2026-06-10",
          id: 101,
          paidAmount: 1000,
          status: "COMPLETED",
          total: 1000,
          transactionId: 1,
          user: {
            email: "june-1@example.com",
            fullName: "June One",
            id: 501,
            phone: "+971500000001",
          },
          workflowStatus: "PROJECT_COMPLETED",
        },
        {
          bookingCode: "BK-102",
          createdAt: "2026-06-02T09:00:00.000Z",
          date: "2026-06-20",
          id: 102,
          paidAmount: 500,
          status: "CONFIRMED",
          total: 500,
          transactionId: 2,
          user: {
            email: "june-2@example.com",
            fullName: "June Two",
            id: 502,
            phone: "+971500000002",
          },
          workflowStatus: "SHOOT_BOOKED",
        },
      ],
      expenses: [
        {
          amount: 100,
          category: "rent",
          createdAt: "2026-06-03T08:00:00.000Z",
          deletedAt: null,
          expenseDate: "2026-06-03",
          id: 201,
          updatedAt: "2026-06-03T08:00:00.000Z",
        },
      ],
      filters: {
        metricKey: "netRevenue",
        page: 1,
        pageSize: 2,
        rangeEnd: "2026-06-30",
        rangeStart: "2026-06-01",
      },
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
      ],
    });

    expect(result.total).toEqual({
      currency: "AED",
      kind: "amount",
      value: 1400,
    });
    expect(result.pagination).toMatchObject({
      hasNextPage: true,
      page: 1,
      pageSize: 2,
      totalPages: 2,
      totalRows: 3,
    });
    expect(result.rows).toEqual([
      expect.objectContaining({
        eventAt: "2026-06-25T06:00:00.000Z",
        netAmount: -100,
        transactionId: 2,
        type: "refund",
      }),
      expect.objectContaining({
        eventAt: "2026-06-20T11:00:00.000Z",
        netAmount: 500,
        transactionId: 2,
        type: "payment",
      }),
    ]);
  });

  it("filters and totals expense rows by category", () => {
    const result = buildFinancialDrilldown({
      expenses: [
        {
          amount: 100,
          category: "rent",
          createdAt: "2026-06-03T08:00:00.000Z",
          deletedAt: null,
          description: "Office rent",
          expenseDate: "2026-06-03",
          id: 201,
          updatedAt: "2026-06-03T08:00:00.000Z",
        },
        {
          amount: 50,
          category: "marketing",
          createdAt: "2026-06-23T08:00:00.000Z",
          deletedAt: null,
          description: "Ads",
          expenseDate: "2026-06-23",
          id: 202,
          updatedAt: "2026-06-23T08:00:00.000Z",
        },
      ],
      filters: {
        expenseCategory: "marketing",
        metricKey: "expenses",
        rangeEnd: "2026-06-30",
        rangeStart: "2026-06-01",
      },
    });

    expect(result.total.value).toBe(50);
    expect(result.rows).toEqual([
      expect.objectContaining({
        amount: 50,
        category: "marketing",
        categoryLabel: "Marketing",
        id: 202,
      }),
    ]);
  });
});

describe("buildDashboardAnalytics", () => {
  it("returns bounded dashboard KPIs, comparisons, trends, schedule summaries, and recent bookings", () => {
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
            },
          },
        ],
      },
    };

    const result = buildDashboardAnalytics({
      currentBusinessDate: "2026-06-21",
      bookings: [
        {
          cancelledAt: null,
          completedAt: "2026-06-12T06:00:00.000Z",
          createdAt: "2026-06-01T08:00:00.000Z",
          date: "2026-06-10",
          id: 101,
          paidAmount: 1000,
          propertyDetails: { size: "1 Bed", type: "Apartment" },
          shootDetails: {
            services: ["Photography", "Videography"],
            videographySubService: "Short Form",
          },
          status: "COMPLETED",
          total: 1000,
          transactionId: 1,
          user: {
            email: "june-1@example.com",
            fullName: "June One",
            id: 501,
            phone: "+971500000001",
          },
          workflowStatus: "PROJECT_COMPLETED",
        },
        {
          cancelledAt: null,
          createdAt: "2026-06-02T09:00:00.000Z",
          date: "2026-06-20",
          id: 102,
          paidAmount: 500,
          propertyDetails: { size: "Penthouse", type: "Apartment" },
          shootDetails: {
            services: ["Photography"],
          },
          status: "CONFIRMED",
          total: 500,
          transactionId: 2,
          user: {
            email: "june-2@example.com",
            fullName: "June Two",
            id: 502,
            phone: "+971500000002",
          },
          workflowStatus: "SHOOT_BOOKED",
        },
        {
          cancelledAt: "2026-06-18T05:00:00.000Z",
          createdAt: "2026-06-03T10:00:00.000Z",
          date: "2026-06-25",
          id: 103,
          status: "CANCELLED",
          total: 300,
          user: {
            email: "june-3@example.com",
            fullName: "June Three",
            id: 503,
            phone: "+971500000003",
          },
          workflowStatus: "SHOOT_BOOKED",
        },
        {
          cancelledAt: null,
          createdAt: "2026-06-04T11:00:00.000Z",
          date: "2026-06-21",
          id: 104,
          paidAmount: 0,
          status: "CONFIRMED",
          total: 400,
          user: {
            email: "june-4@example.com",
            fullName: "June Four",
            id: 504,
            phone: "+971500000004",
          },
          workflowStatus: "EDITING",
        },
        {
          cancelledAt: null,
          completedAt: "2026-05-15T07:00:00.000Z",
          createdAt: "2026-05-10T12:00:00.000Z",
          date: "2026-05-15",
          id: 105,
          paidAmount: 200,
          propertyDetails: { size: "Studio", type: "Apartment" },
          shootDetails: { services: [] },
          status: "COMPLETED",
          total: 200,
          transactionId: 4,
          user: {
            email: "may@example.com",
            fullName: "May Booking",
            id: 505,
            phone: "+971500000005",
          },
          workflowStatus: "PROJECT_COMPLETED",
        },
        {
          createdAt: "2026-06-05T13:00:00.000Z",
          date: "2026-06-22",
          id: 106,
          status: "DRAFT",
          total: 150,
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
          amount: 80,
          deletedAt: null,
          expenseDate: "2026-05-20",
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
        {
          amount: 200,
          id: 4,
          metadata: {},
          paidAt: "2026-05-15T09:00:00.000Z",
          refundedAmount: 0,
          status: "success",
        },
      ],
    });

    expect(result.kpis).toEqual({
      averageBookingValue: 700,
      cancelledBookings: 1,
      completedBookings: 1,
      expenses: 150,
      grossPayments: 1500,
      lostValue: 300,
      netProfit: 1250,
      netRevenue: 1400,
      outstandingBalance: 400,
      paidBookings: 2,
      pendingBookings: 2,
      refunds: 100,
    });
    expect(result.comparison.netRevenue).toEqual({
      current: 1400,
      previous: 200,
      delta: 1200,
      deltaPercentage: 600,
      direction: "up",
    });
    expect(result.revenueTrend.granularity).toBe("day");
    expect(result.revenueTrend.buckets).toHaveLength(30);
    expect(
      result.revenueTrend.buckets.find(
        (bucket) => bucket.bucketStartBusinessDate === "2026-06-25",
      ),
    ).toEqual({
      bucketStartBusinessDate: "2026-06-25",
      bucketEndBusinessDateExclusive: "2026-06-26",
      grossPayments: 0,
      refunds: 100,
      netRevenue: -100,
    });
    expect(result.revenueByService).toEqual([
      { amount: 450, key: "photography", label: "Photography" },
      { amount: 500, key: "unallocated", label: "Unallocated" },
      { amount: 550, key: "videography", label: "Videography" },
    ]);
    expect(result.scheduleSummary.totals).toEqual({
      cancelled: 1,
      completed: 1,
      pending: 2,
      total: 4,
    });
    expect(result.scheduleSummary.days).toEqual(
      expect.arrayContaining([
        {
          bucketStartBusinessDate: "2026-06-10",
          cancelled: 0,
          completed: 1,
          pending: 0,
          total: 1,
        },
        {
          bucketStartBusinessDate: "2026-06-20",
          cancelled: 0,
          completed: 0,
          pending: 1,
          total: 1,
        },
      ]),
    );
    expect(result.recentBookings.map((booking) => booking.id)).toEqual([
      104, 103, 102, 101,
    ]);
    expect(result.recentBookings[0]).toEqual({
      id: 104,
      bookingCode: null,
      createdAt: "2026-06-04T11:00:00.000Z",
      date: "2026-06-21",
      property: {
        label: null,
        size: null,
        type: null,
      },
      services: [],
      slot: null,
      startTime: null,
      status: "CONFIRMED",
      total: 400,
      workflowStatus: "EDITING",
      customer: {
        email: "june-4@example.com",
        fullName: "June Four",
        id: 504,
        phone: "+971500000004",
      },
    });
    expect(result.todaySchedule).toMatchObject({
      businessDate: "2026-06-21",
      total: 400,
    });
    expect(result.todaySchedule.bookings.map((booking) => booking.id)).toEqual([
      104,
    ]);
  });
});

describe("buildFinancialReports", () => {
  it("returns live KPI, trend, monthly comparison, and P&L data", () => {
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
            },
          },
        ],
      },
    };

    const result = buildFinancialReports({
      bookings: [
        {
          cancelledAt: null,
          completedAt: "2026-06-12T06:00:00.000Z",
          date: "2026-06-10",
          id: 101,
          paidAmount: 1000,
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
          paidAmount: 500,
          propertyDetails: { size: "Penthouse", type: "Apartment" },
          shootDetails: {
            services: ["Photography"],
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
          paidAmount: 0,
          status: "CONFIRMED",
          total: 400,
          workflowStatus: "EDITING",
        },
        {
          cancelledAt: null,
          completedAt: "2026-05-15T07:00:00.000Z",
          date: "2026-05-15",
          id: 105,
          paidAmount: 200,
          propertyDetails: { size: "Studio", type: "Apartment" },
          shootDetails: { services: [] },
          status: "COMPLETED",
          total: 200,
          transactionId: 4,
          workflowStatus: "PROJECT_COMPLETED",
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
          amount: 80,
          deletedAt: null,
          expenseDate: "2026-05-20",
          id: 203,
        },
      ],
      filters: {
        groupBy: "week",
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
          amount: 200,
          id: 4,
          metadata: {},
          paidAt: "2026-05-15T09:00:00.000Z",
          refundedAmount: 0,
          status: "success",
        },
      ],
    });

    expect(result.kpis).toEqual({
      averageBookingValue: 700,
      cancelledBookings: 1,
      completedBookings: 1,
      expenses: 150,
      grossPayments: 1500,
      lostValue: 300,
      netProfit: 1250,
      netRevenue: 1400,
      pendingBookings: 2,
      refunds: 100,
    });
    expect(result.profitAndLoss).toEqual({
      expenses: 150,
      margin: 89.29,
      netProfit: 1250,
      netRevenue: 1400,
    });
    expect(result.weeklyTrend.granularity).toBe("week");
    expect(result.sixMonthTrend.granularity).toBe("month");
    expect(result.bookingStatus).toEqual({
      buckets: [
        { count: 2, key: "pending", label: "Pending" },
        { count: 1, key: "completed", label: "Completed" },
        { count: 1, key: "cancelled", label: "Cancelled" },
      ],
      total: 4,
    });
    expect(result.monthlyComparison.at(-1)).toMatchObject({
      completedBookings: 1,
      expenses: 150,
      monthStartBusinessDate: "2026-06-01",
      netProfit: 1250,
      netRevenue: 1400,
    });
  });

  it("keeps dashboard, reports, and drill-down totals reconciled for current, prior, and empty months", () => {
    const fixture = buildReconciliationFixture();

    const juneDashboard = buildDashboardAnalytics({
      bookings: fixture.bookings,
      expenses: fixture.expenses,
      filters: fixture.filters.currentMonth,
      pricingConfig: fixture.pricingConfig,
      transactions: fixture.transactions,
    });
    const juneReports = buildFinancialReports({
      bookings: fixture.bookings,
      expenses: fixture.expenses,
      filters: {
        ...fixture.filters.currentMonth,
        groupBy: "week",
      },
      pricingConfig: fixture.pricingConfig,
      transactions: fixture.transactions,
    });
    const juneNetRevenueDrilldown = buildFinancialDrilldown({
      bookings: fixture.bookings,
      expenses: fixture.expenses,
      filters: {
        ...fixture.filters.currentMonth,
        metricKey: "netRevenue",
      },
      pricingConfig: fixture.pricingConfig,
      transactions: fixture.transactions,
    });
    const junePendingDrilldown = buildFinancialDrilldown({
      bookings: fixture.bookings,
      expenses: fixture.expenses,
      filters: {
        ...fixture.filters.currentMonth,
        metricKey: "pendingBookings",
      },
      pricingConfig: fixture.pricingConfig,
      transactions: fixture.transactions,
    });
    const juneCancelledDrilldown = buildFinancialDrilldown({
      bookings: fixture.bookings,
      expenses: fixture.expenses,
      filters: {
        ...fixture.filters.currentMonth,
        metricKey: "cancelledBookings",
      },
      pricingConfig: fixture.pricingConfig,
      transactions: fixture.transactions,
    });
    const juneRefundDrilldown = buildFinancialDrilldown({
      bookings: fixture.bookings,
      expenses: fixture.expenses,
      filters: {
        ...fixture.filters.currentMonth,
        metricKey: "refunds",
      },
      pricingConfig: fixture.pricingConfig,
      transactions: fixture.transactions,
    });
    const mayDashboard = buildDashboardAnalytics({
      bookings: fixture.bookings,
      expenses: fixture.expenses,
      filters: fixture.filters.previousMonth,
      pricingConfig: fixture.pricingConfig,
      transactions: fixture.transactions,
    });
    const emptyDashboard = buildDashboardAnalytics({
      bookings: fixture.bookings,
      expenses: fixture.expenses,
      filters: fixture.filters.emptyMonth,
      pricingConfig: fixture.pricingConfig,
      transactions: fixture.transactions,
    });
    const emptyReports = buildFinancialReports({
      bookings: fixture.bookings,
      expenses: fixture.expenses,
      filters: {
        ...fixture.filters.emptyMonth,
        groupBy: "week",
      },
      pricingConfig: fixture.pricingConfig,
      transactions: fixture.transactions,
    });
    const emptyDrilldown = buildFinancialDrilldown({
      bookings: fixture.bookings,
      expenses: fixture.expenses,
      filters: {
        ...fixture.filters.emptyMonth,
        metricKey: "netRevenue",
      },
      pricingConfig: fixture.pricingConfig,
      transactions: fixture.transactions,
    });

    expect(juneDashboard.kpis).toMatchObject({
      cancelledBookings: 1,
      completedBookings: 1,
      expenses: 125,
      grossPayments: 600,
      lostValue: 300,
      netProfit: 325,
      netRevenue: 450,
      outstandingBalance: 750,
      paidBookings: 1,
      pendingBookings: 2,
      refunds: 150,
    });
    expect(juneReports.kpis).toMatchObject({
      averageBookingValue: 450,
      completedBookings: 1,
      expenses: 125,
      grossPayments: 600,
      lostValue: 300,
      netProfit: 325,
      netRevenue: 450,
      refunds: 150,
    });
    expect(juneReports.bookingStatus).toEqual({
      buckets: [
        { count: 2, key: "pending", label: "Pending" },
        { count: 1, key: "completed", label: "Completed" },
        { count: 1, key: "cancelled", label: "Cancelled" },
      ],
      total: 4,
    });
    expect(juneNetRevenueDrilldown.total.value).toBe(450);
    expect(juneNetRevenueDrilldown.rows.map((row) => row.netAmount)).toEqual([
      -150, 600,
    ]);
    expect(junePendingDrilldown.total.value).toBe(2);
    expect(junePendingDrilldown.rows.map((row) => row.id)).toEqual([105, 102]);
    expect(juneCancelledDrilldown.total.value).toBe(1);
    expect(juneCancelledDrilldown.rows.map((row) => row.id)).toEqual([103]);
    expect(juneRefundDrilldown.total.value).toBe(150);
    expect(juneRefundDrilldown.rows).toEqual([
      expect.objectContaining({
        amount: 150,
        refundedAt: "2026-06-05T10:00:00.000Z",
        transactionId: 3,
      }),
    ]);

    expect(mayDashboard.kpis).toMatchObject({
      completedBookings: 1,
      expenses: 80,
      grossPayments: 400,
      netProfit: 320,
      netRevenue: 400,
      refunds: 0,
    });
    expect(mayDashboard.comparison.netRevenue).toEqual({
      current: 400,
      previous: 0,
      delta: 400,
      deltaPercentage: null,
      direction: "up",
    });

    expect(emptyDashboard.kpis).toEqual({
      averageBookingValue: 0,
      cancelledBookings: 0,
      completedBookings: 0,
      expenses: 0,
      grossPayments: 0,
      lostValue: 0,
      netProfit: 0,
      netRevenue: 0,
      outstandingBalance: 0,
      paidBookings: 0,
      pendingBookings: 0,
      refunds: 0,
    });
    expect(emptyReports.kpis).toEqual({
      averageBookingValue: 0,
      cancelledBookings: 0,
      completedBookings: 0,
      expenses: 0,
      grossPayments: 0,
      lostValue: 0,
      netProfit: 0,
      netRevenue: 0,
      pendingBookings: 0,
      refunds: 0,
    });
    expect(emptyDrilldown.total).toEqual({
      currency: "AED",
      kind: "amount",
      value: 0,
    });
    expect(emptyDrilldown.pagination).toMatchObject({
      hasNextPage: false,
      hasPreviousPage: false,
      totalPages: 0,
      totalRows: 0,
    });
    expect(emptyDrilldown.rows).toEqual([]);
  });
});
