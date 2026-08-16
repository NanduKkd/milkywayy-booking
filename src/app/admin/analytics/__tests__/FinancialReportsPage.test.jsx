import { fireEvent, render, screen, waitFor } from "../../../../test-utils";
import FinancialReportsPage from "../FinancialReportsPage";

global.fetch = jest.fn();

const expenseCategories = [
  { key: "marketing", label: "Marketing" },
  { key: "office", label: "Office" },
  { key: "rent", label: "Rent" },
];

function createComparison(current, previous) {
  const delta = current - previous;
  return {
    current,
    delta,
    deltaPercentage:
      previous === 0 ? (current === 0 ? 0 : null) : (delta / previous) * 100,
    direction: delta === 0 ? "flat" : delta > 0 ? "up" : "down",
    previous,
  };
}

const reportPayload = {
  bookingStatus: {
    buckets: [
      { count: 2, key: "pending", label: "Pending" },
      { count: 3, key: "completed", label: "Completed" },
      { count: 1, key: "cancelled", label: "Cancelled" },
    ],
    total: 6,
  },
  comparison: {
    averageBookingValue: createComparison(466.67, 350),
    cancelledBookings: createComparison(1, 2),
    completedBookings: createComparison(3, 2),
    expenses: createComparison(450, 300),
    netProfit: createComparison(950, 400),
    netRevenue: createComparison(1400, 700),
    pendingBookings: createComparison(2, 3),
  },
  kpis: {
    averageBookingValue: 466.67,
    cancelledBookings: 1,
    completedBookings: 3,
    expenses: 450,
    netProfit: 950,
    netRevenue: 1400,
    pendingBookings: 2,
  },
  monthlyComparison: [
    {
      completedBookings: 2,
      expenses: 300,
      monthLabel: "May 2026",
      monthStartBusinessDate: "2026-05-01",
      netProfit: 500,
      netRevenue: 800,
    },
    {
      completedBookings: 3,
      expenses: 450,
      monthLabel: "Jun 2026",
      monthStartBusinessDate: "2026-06-01",
      netProfit: 950,
      netRevenue: 1400,
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
    { amount: 550, key: "videography", label: "Videography" },
  ],
  sixMonthTrend: {
    buckets: [
      {
        bucketStartBusinessDate: "2026-05-01",
        netRevenue: 800,
      },
      {
        bucketStartBusinessDate: "2026-06-01",
        netRevenue: 1400,
      },
    ],
  },
  weeklyTrend: {
    buckets: [
      {
        bucketStartBusinessDate: "2026-06-01",
        netRevenue: 400,
      },
      {
        bucketStartBusinessDate: "2026-06-08",
        netRevenue: 1000,
      },
    ],
  },
};

const dashboardPayload = {
  comparison: {
    averageBookingValue: createComparison(466.67, 350),
    cancelledBookings: createComparison(1, 0),
    completedBookings: createComparison(3, 1),
    expenses: createComparison(450, 300),
    grossPayments: createComparison(1500, 700),
    lostValue: createComparison(300, 0),
    netProfit: createComparison(950, 400),
    netRevenue: createComparison(1400, 700),
    outstandingBalance: createComparison(225, 100),
    pendingBookings: createComparison(2, 1),
    refunds: createComparison(100, 0),
  },
  kpis: {
    cancelledBookings: 1,
    completedBookings: 3,
    expenses: 450,
    grossPayments: 1500,
    lostValue: 300,
    netProfit: 950,
    netRevenue: 1400,
    outstandingBalance: 225,
    paidBookings: 3,
    pendingBookings: 2,
    refunds: 100,
  },
  recentBookings: [
    {
      bookingCode: "BK-201",
      createdAt: "2026-06-24T09:00:00.000Z",
      customer: {
        email: "alex@example.com",
        fullName: "Alex Tenant",
        id: 9001,
        phone: "+971500000900",
      },
      date: "2026-06-28",
      id: 201,
      property: {
        label: "21 Marina Walk",
        size: "2 Bed",
        type: "Apartment",
      },
      services: ["Photography", "Videography"],
      slot: 1,
      startTime: "09:00",
      status: "CONFIRMED",
      total: 650,
      workflowStatus: "SHOOT_BOOKED",
    },
  ],
  revenueByService: [
    { amount: 850, key: "photography", label: "Photography" },
    { amount: 550, key: "videography", label: "Videography" },
  ],
  revenueTrend: {
    buckets: [
      {
        bucketStartBusinessDate: "2026-06-01",
        netRevenue: 450,
      },
      {
        bucketStartBusinessDate: "2026-06-02",
        netRevenue: 950,
      },
    ],
    granularity: "day",
  },
  scheduleSummary: {
    recentDayDetails: [
      {
        bucketStartBusinessDate: "2026-06-28",
        cancelled: 0,
        completed: 1,
        pending: 1,
        total: 2,
      },
    ],
    totals: {
      cancelled: 1,
      completed: 3,
      pending: 2,
      total: 6,
    },
  },
  todaySchedule: {
    bookings: [],
    businessDate: "2026-07-20",
    total: 0,
  },
};

const drilldownPayload = {
  metricKey: "netRevenue",
  pagination: {
    hasNextPage: false,
    hasPreviousPage: false,
    page: 1,
    pageSize: 10,
    totalPages: 1,
    totalRows: 2,
  },
  rows: [
    {
      eventAt: "2026-06-25T06:00:00.000Z",
      id: 2,
      linkedBookings: [
        {
          bookingCode: "BK-102",
          customer: {
            email: "june-2@example.com",
            fullName: "June Two",
            id: 502,
            phone: "+971500000002",
          },
          date: "2026-06-20",
          id: 102,
          status: "CONFIRMED",
          total: 500,
          workflowStatus: "SHOOT_BOOKED",
        },
      ],
      netAmount: -100,
      transactionId: 2,
      type: "refund",
    },
    {
      eventAt: "2026-06-20T11:00:00.000Z",
      id: 2,
      linkedBookings: [
        {
          bookingCode: "BK-102",
          customer: {
            email: "june-2@example.com",
            fullName: "June Two",
            id: 502,
            phone: "+971500000002",
          },
          date: "2026-06-20",
          id: 102,
          status: "CONFIRMED",
          total: 500,
          workflowStatus: "SHOOT_BOOKED",
        },
      ],
      netAmount: 500,
      transactionId: 2,
      type: "payment",
    },
  ],
  sort: {
    allowedKeys: ["eventAt", "id", "netAmount"],
    direction: "desc",
    key: "eventAt",
  },
  total: {
    currency: "AED",
    kind: "amount",
    value: 1400,
  },
};

function createJsonResponse(payload, { ok = true, status = 200 } = {}) {
  return {
    json: async () => payload,
    ok,
    status,
  };
}

function createExpense(id, fields) {
  return {
    amount: Number(fields.amount),
    category: fields.category,
    categoryLabel:
      expenseCategories.find((category) => category.key === fields.category)
        ?.label || fields.category,
    createdAt: fields.createdAt || "2026-06-20T09:00:00.000Z",
    description: fields.description || null,
    expenseDate: fields.expenseDate,
    id,
    updatedAt: fields.updatedAt || "2026-06-20T09:00:00.000Z",
  };
}

function setupFetch({
  dashboardError = "Failed to load dashboard analytics",
  dashboardOk = true,
  dashboardPayloadOverride = dashboardPayload,
  drilldownError = "Failed to load dashboard drill-down",
  drilldownOk = true,
  drilldownPayloadOverride = drilldownPayload,
  expenseItems = [],
  reportOk = true,
  reportPayloadOverride = reportPayload,
  reportError = "Failed to load financial reports",
} = {}) {
  let mutableExpenseItems = [...expenseItems];

  global.fetch.mockImplementation(async (url, options = {}) => {
    const requestUrl = String(url);
    const method = options.method || "GET";

    if (requestUrl.includes("/api/admin/analytics/reports?")) {
      if (!reportOk) {
        return createJsonResponse(
          { error: reportError },
          { ok: false, status: 500 },
        );
      }

      return createJsonResponse(reportPayloadOverride);
    }

    if (requestUrl.includes("/api/admin/analytics/dashboard?")) {
      if (!dashboardOk) {
        return createJsonResponse(
          { error: dashboardError },
          { ok: false, status: 500 },
        );
      }

      return createJsonResponse(dashboardPayloadOverride);
    }

    if (requestUrl.includes("/api/admin/analytics/drill-down?")) {
      if (!drilldownOk) {
        return createJsonResponse(
          { error: drilldownError },
          { ok: false, status: 500 },
        );
      }

      return createJsonResponse(drilldownPayloadOverride);
    }

    if (requestUrl.includes("/api/admin/expenses?")) {
      return createJsonResponse({
        authorizationMode: "SUPERADMIN_COMPAT",
        categories: expenseCategories,
        filters: {
          category: null,
          includeDeleted: false,
          rangeEnd: "2026-07-31",
          rangeStart: "2026-07-01",
        },
        items: mutableExpenseItems,
      });
    }

    if (requestUrl === "/api/admin/expenses" && method === "POST") {
      const body = JSON.parse(options.body);
      const nextId =
        Math.max(0, ...mutableExpenseItems.map((item) => item.id)) + 1;
      const createdExpense = createExpense(nextId, body);

      mutableExpenseItems = [createdExpense, ...mutableExpenseItems];

      return createJsonResponse(createdExpense, { status: 201 });
    }

    if (requestUrl.startsWith("/api/admin/expenses/") && method === "PUT") {
      const body = JSON.parse(options.body);
      const expenseId = Number(requestUrl.split("/").pop());

      mutableExpenseItems = mutableExpenseItems.map((item) =>
        item.id === expenseId ? createExpense(expenseId, body) : item,
      );

      return createJsonResponse(
        mutableExpenseItems.find((item) => item.id === expenseId),
      );
    }

    if (requestUrl.startsWith("/api/admin/expenses/") && method === "DELETE") {
      const body = JSON.parse(options.body);
      const expenseId = Number(requestUrl.split("/").pop());
      const deletedExpense = mutableExpenseItems.find(
        (item) => item.id === expenseId,
      );

      mutableExpenseItems = mutableExpenseItems.filter(
        (item) => item.id !== expenseId,
      );

      return createJsonResponse({
        ...deletedExpense,
        deleteReason: body.reason,
        deletedAt: "2026-06-29T10:00:00.000Z",
      });
    }

    throw new Error(`Unexpected fetch request: ${requestUrl}`);
  });
}

describe("FinancialReportsPage", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-07-15T08:00:00.000Z"));
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders live KPI, report, and expense tracker data", async () => {
    setupFetch({
      expenseItems: [
        createExpense(8, {
          amount: "300.00",
          category: "marketing",
          description: "Campaign shoot boost",
          expenseDate: "2026-07-18",
        }),
        createExpense(7, {
          amount: "150.00",
          category: "rent",
          description: "Studio desk add-on",
          expenseDate: "2026-07-05",
        }),
      ],
    });

    render(<FinancialReportsPage />);

    expect(
      screen.getByLabelText("Loading financial reports"),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Loading expense tracker"),
    ).toBeInTheDocument();

    expect(await screen.findByText("Weekly Net Revenue")).toBeInTheDocument();
    expect(await screen.findByText("Expense Tracker")).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Dashboard analytics" }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("Net revenue").length).toBeGreaterThan(0);
    expect(screen.getByText("Breakdown by Category")).toBeInTheDocument();
    expect(screen.getByText("Tracked Expenses")).toBeInTheDocument();
    expect(screen.getByText("Campaign shoot boost")).toBeInTheDocument();
    expect(screen.getAllByText("Marketing").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Jun 2026").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("img", { name: "Booking status for July 2026" }),
    ).toBeInTheDocument();
    expect(
      screen
        .getByRole("img", { name: "Booking status for July 2026" })
        .closest("[data-donut-layout]"),
    ).toHaveAttribute("data-donut-layout", "standard");
    expect(
      screen
        .getByRole("img", { name: "Booking status for July 2026" })
        .closest("[data-donut-direction]"),
    ).toHaveAttribute("data-donut-direction", "vertical");
    expect(
      screen
        .getByRole("img", {
          name: "Revenue by service for July 2026",
        })
        .closest("[data-donut-layout]"),
    ).toHaveAttribute("data-donut-layout", "standard");
    expect(
      screen
        .getByRole("img", {
          name: "Revenue by service for July 2026",
        })
        .closest("[data-donut-direction]"),
    ).toHaveAttribute("data-donut-direction", "vertical");
    expect(screen.getByRole("link", { name: "Export CSV" })).toHaveAttribute(
      "href",
      expect.stringContaining("/api/admin/analytics/reports/export?"),
    );
    expect(screen.getByRole("link", { name: "Export CSV" })).toHaveAttribute(
      "href",
      expect.stringContaining("format=csv"),
    );
    expect(screen.getByRole("link", { name: "Export Excel" })).toHaveAttribute(
      "href",
      expect.stringContaining("/api/admin/analytics/reports/export?"),
    );
    expect(screen.getByRole("link", { name: "Export Excel" })).toHaveAttribute(
      "href",
      expect.stringContaining("format=xlsx"),
    );
    expect(screen.getByRole("link", { name: "Export PDF" })).toHaveAttribute(
      "href",
      expect.stringContaining("/api/admin/analytics/reports/export?"),
    );
    expect(screen.getByRole("link", { name: "Export PDF" })).toHaveAttribute(
      "href",
      expect.stringContaining("format=pdf"),
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/analytics/reports?"),
        expect.objectContaining({ cache: "no-store" }),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/expenses?"),
        expect.objectContaining({ cache: "no-store" }),
      );
    });
  });

  it("applies an explicitly selected report month to every report surface", async () => {
    setupFetch({ expenseItems: [] });

    render(<FinancialReportsPage />);

    await screen.findByText("Expense Tracker");

    fireEvent.change(screen.getByLabelText("Report month"), {
      target: { value: "2026-03" },
    });

    expect(screen.getByLabelText("Report month")).toHaveValue("2026-03");
    expect(
      await screen.findByText(
        /Log and categorise business expenses · March 2026/,
      ),
    ).toBeInTheDocument();

    for (const format of ["csv", "xlsx", "pdf"]) {
      expect(
        screen.getByRole("link", {
          name:
            format === "csv"
              ? "Export CSV"
              : format === "xlsx"
                ? "Export Excel"
                : "Export PDF",
        }),
      ).toHaveAttribute(
        "href",
        expect.stringContaining("rangeStart=2026-03-01"),
      );
    }

    await waitFor(() => {
      for (const path of [
        "/api/admin/analytics/reports?",
        "/api/admin/expenses?",
      ]) {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringMatching(
            new RegExp(`${path.replace("?", "\\?")}.*rangeStart=2026-03-01`),
          ),
          expect.objectContaining({ cache: "no-store" }),
        );
      }
    });
  });

  it("opens a KPI drill-down modal for the active dashboard range", async () => {
    setupFetch({
      expenseItems: [],
    });

    render(<FinancialReportsPage mode="dashboard" />);

    fireEvent.click(
      await screen.findByRole("button", { name: "View total revenue details" }),
    );

    expect(await screen.findByText("Net Revenue Details")).toBeInTheDocument();
    expect((await screen.findAllByText("June Two")).length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/analytics/drill-down?"),
        expect.objectContaining({ cache: "no-store" }),
      );
    });
  });

  it("renders a dashboard-only admin view without loading reports or expenses", async () => {
    setupFetch({
      expenseItems: [],
    });

    render(<FinancialReportsPage mode="dashboard" />);

    expect(
      await screen.findByRole("heading", { name: "Dashboard" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Reports" })).toHaveAttribute(
      "href",
      "/admin/analytics",
    );
    expect(screen.queryByText("Financial Reports")).not.toBeInTheDocument();
    expect(screen.queryByText("Expense Tracker")).not.toBeInTheDocument();
    expect(
      (
        await screen.findByRole("img", {
          name: "Revenue by service for July 2026",
        })
      ).closest("[data-donut-layout]"),
    ).toHaveAttribute("data-donut-layout", "compact");
    expect(
      screen
        .getByRole("img", {
          name: "Revenue by service for July 2026",
        })
        .closest("[data-donut-direction]"),
    ).toHaveAttribute("data-donut-direction", "vertical");
    expect(screen.queryByText("Dashboard day buckets")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View all →" })).toHaveAttribute(
      "href",
      "/admin/bookings",
    );
    expect(
      screen.getByRole("link", { name: "Full calendar →" }),
    ).toHaveAttribute("href", "/admin/scheduling-calendar");
    expect(screen.getByText("Today's Schedule")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Export CSV" }),
    ).not.toBeInTheDocument();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/analytics/dashboard?"),
        expect.objectContaining({ cache: "no-store" }),
      );
    });

    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining("/api/admin/analytics/reports?"),
      expect.anything(),
    );
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining("/api/admin/expenses?"),
      expect.anything(),
    );
  });

  it("creates, edits, and deletes expenses from the tracker", async () => {
    setupFetch({
      expenseItems: [
        createExpense(8, {
          amount: "150.00",
          category: "marketing",
          description: "Campaign shoot boost",
          expenseDate: "2026-07-18",
        }),
      ],
    });

    render(<FinancialReportsPage />);

    expect(await screen.findByText("Expense Tracker")).toBeInTheDocument();
    expect(await screen.findByText("Campaign shoot boost")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /add expense/i }));

    fireEvent.change(screen.getByLabelText("Expense amount"), {
      target: { value: "275.50" },
    });
    fireEvent.change(screen.getByLabelText("Expense date"), {
      target: { value: "2026-07-20" },
    });
    fireEvent.change(screen.getByLabelText("Expense category"), {
      target: { value: "office" },
    });
    fireEvent.change(screen.getByLabelText("Expense description"), {
      target: { value: "Printer paper" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create expense/i }));

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Add expense" }),
      ).not.toBeInTheDocument();
    });
    expect(await screen.findByText("Printer paper")).toBeInTheDocument();

    fireEvent.click(
      await screen.findByRole("button", { name: "Edit expense 9" }),
    );
    fireEvent.change(screen.getByLabelText("Expense amount"), {
      target: { value: "300.00" },
    });
    fireEvent.change(screen.getByLabelText("Expense description"), {
      target: { value: "Printer paper restock" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Edit expense" }),
      ).not.toBeInTheDocument();
    });
    expect(
      await screen.findByText("Printer paper restock"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete expense 9" }));

    expect(await screen.findByText("Delete expense")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Delete reason"), {
      target: { value: "duplicate entry" },
    });
    fireEvent.click(screen.getByRole("button", { name: /confirm delete/i }));

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Delete expense" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText("Printer paper restock"),
      ).not.toBeInTheDocument();
    });
    expect(screen.getByText("Campaign shoot boost")).toBeInTheDocument();
  });

  it("paginates expense rows without changing the tracker totals", async () => {
    setupFetch({
      expenseItems: Array.from({ length: 6 }, (_, index) =>
        createExpense(index + 1, {
          amount: "25.00",
          category: "office",
          description: `Expense row ${index + 1}`,
          expenseDate: `2026-07-${String(index + 1).padStart(2, "0")}`,
        }),
      ),
    });

    render(<FinancialReportsPage />);

    expect(await screen.findByText("Expense row 1")).toBeInTheDocument();
    expect(screen.queryByText("Expense row 6")).not.toBeInTheDocument();
    expect(screen.getByText("Page 1 of 2 · 6 entries")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next expense page" }));

    expect(await screen.findByText("Expense row 6")).toBeInTheDocument();
    expect(screen.getByText("Page 2 of 2 · 6 entries")).toBeInTheDocument();
    expect(screen.getAllByText("AED 150.00").length).toBeGreaterThan(0);
  });

  it("shows empty report and expense states when no activity exists", async () => {
    setupFetch({
      expenseItems: [],
      reportPayloadOverride: {
        bookingStatus: {
          buckets: [
            { count: 0, key: "pending", label: "Pending" },
            { count: 0, key: "completed", label: "Completed" },
            { count: 0, key: "cancelled", label: "Cancelled" },
          ],
          total: 0,
        },
        comparison: {},
        kpis: {
          completedBookings: 0,
          expenses: 0,
          netProfit: 0,
          netRevenue: 0,
        },
        monthlyComparison: [],
        profitAndLoss: {
          expenses: 0,
          margin: 0,
          netProfit: 0,
          netRevenue: 0,
        },
        revenueByService: [],
        sixMonthTrend: { buckets: [] },
        weeklyTrend: { buckets: [] },
      },
    });

    render(<FinancialReportsPage />);

    expect(
      await screen.findByText("No financial activity in this range"),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/No expenses have been added for/i),
    ).toBeInTheDocument();
  });

  it("shows the report error state without hiding the expense tracker", async () => {
    setupFetch({
      expenseItems: [
        createExpense(8, {
          amount: "150.00",
          category: "marketing",
          description: "Campaign shoot boost",
          expenseDate: "2026-07-18",
        }),
      ],
      reportOk: false,
    });

    render(<FinancialReportsPage />);

    expect(
      await screen.findByText("Financial report unavailable"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Failed to load financial reports"),
    ).toBeInTheDocument();
    expect(await screen.findByText("Expense Tracker")).toBeInTheDocument();
    expect(screen.getByText("Campaign shoot boost")).toBeInTheDocument();
  });
});
