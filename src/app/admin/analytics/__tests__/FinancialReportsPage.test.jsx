import { render, screen, waitFor } from "../../../../test-utils";
import FinancialReportsPage from "../FinancialReportsPage";

global.fetch = jest.fn();

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

describe("FinancialReportsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders live KPI, chart, table, and P&L data", async () => {
    global.fetch.mockResolvedValue({
      json: async () => reportPayload,
      ok: true,
    });

    render(<FinancialReportsPage />);

    expect(screen.getByLabelText("Loading financial reports")).toBeInTheDocument();

    expect(await screen.findByText("Weekly Net Revenue")).toBeInTheDocument();
    expect(screen.getAllByText("Net Revenue").length).toBeGreaterThan(0);
    expect(screen.getByText("Monthly Comparison")).toBeInTheDocument();
    expect(screen.getByText("Profit and Loss")).toBeInTheDocument();
    expect(screen.getByText("Photography")).toBeInTheDocument();
    expect(screen.getAllByText("Jun 2026").length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/analytics/reports?"),
        expect.objectContaining({ cache: "no-store" }),
      );
    });
  });

  it("shows an empty state when live data has no activity", async () => {
    global.fetch.mockResolvedValue({
      json: async () => ({
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
      }),
      ok: true,
    });

    render(<FinancialReportsPage />);

    expect(
      await screen.findByText("No financial activity in this range"),
    ).toBeInTheDocument();
  });

  it("shows an error state when the API request fails", async () => {
    global.fetch.mockResolvedValue({
      json: async () => ({ error: "Failed to load financial reports" }),
      ok: false,
    });

    render(<FinancialReportsPage />);

    expect(
      await screen.findByText("Financial report unavailable"),
    ).toBeInTheDocument();
    expect(screen.getByText("Failed to load financial reports")).toBeInTheDocument();
  });
});
