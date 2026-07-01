import { fireEvent, render, screen, waitFor } from "../../../../test-utils";
import FinancialReportsPage from "../FinancialReportsPage";

global.fetch = jest.fn();

const expenseCategories = [
  { key: "marketing", label: "Marketing" },
  { key: "office", label: "Office" },
  { key: "rent", label: "Rent" },
];

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
    completedBookings: { delta: 1 },
    expenses: { delta: 150 },
    netProfit: { delta: 550 },
    netRevenue: { delta: 700 },
  },
  kpis: {
    completedBookings: 3,
    expenses: 450,
    netProfit: 950,
    netRevenue: 1400,
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
    jest.clearAllMocks();
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
    expect(screen.getByText("Category Breakdown")).toBeInTheDocument();
    expect(screen.getByText("Tracked Expenses")).toBeInTheDocument();
    expect(screen.getByText("Campaign shoot boost")).toBeInTheDocument();
    expect(screen.getAllByText("Marketing").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Jun 2026").length).toBeGreaterThan(0);
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
