import { NextResponse } from "next/server";
import models from "@/lib/db/models";
import { auth } from "@/lib/helpers/auth";
import { getPricingConfig } from "@/lib/helpers/pricing";
import { buildDashboardAnalytics } from "@/lib/services/financialAggregation";
import { GET } from "../route";

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200,
    })),
  },
}));

jest.mock("@/lib/db/models", () => ({
  __esModule: true,
  default: {
    Booking: {
      findAll: jest.fn(),
    },
    Expense: {
      findAll: jest.fn(),
    },
    Transaction: {
      findAll: jest.fn(),
    },
    User: {},
  },
}));

jest.mock("@/lib/helpers/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/helpers/pricing", () => ({
  getPricingConfig: jest.fn(),
}));

jest.mock("@/lib/db/relations", () => ({}));

jest.mock("@/lib/services/financialAggregation", () => {
  const actual = jest.requireActual("@/lib/services/financialAggregation");

  return {
    ...actual,
    buildDashboardAnalytics: jest.fn(),
  };
});

describe("Admin dashboard analytics API route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auth.mockResolvedValue({ id: 1, role: "SUPERADMIN" });
    getPricingConfig.mockResolvedValue({ Apartment: {} });
    models.Booking.findAll.mockResolvedValue([{ id: 10 }]);
    models.Transaction.findAll.mockResolvedValue([{ id: 20 }]);
    models.Expense.findAll.mockResolvedValue([{ id: 30 }]);
  });

  it("returns analytics data for an authorized superadmin", async () => {
    buildDashboardAnalytics.mockReturnValue({
      comparison: {},
      filters: {
        rangeEnd: "2026-07-01T00:00:00.000Z",
        rangeStart: "2026-06-01T00:00:00.000Z",
      },
      kpis: { netRevenue: 500 },
    });

    const response = await GET({
      url: "http://localhost:3000/api/admin/analytics/dashboard?rangeStart=2026-06-01&rangeEnd=2026-06-30",
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(buildDashboardAnalytics).toHaveBeenCalledWith({
      bookings: [{ id: 10 }],
      transactions: [{ id: 20 }],
      expenses: [{ id: 30 }],
      pricingConfig: { Apartment: {} },
      filters: {
        comparisonMode: undefined,
        rangeEnd: "2026-06-30",
        rangeStart: "2026-06-01",
        timezone: undefined,
      },
    });
    expect(data.kpis.netRevenue).toBe(500);
  });

  it("rejects anonymous and non-superadmin callers", async () => {
    auth.mockResolvedValueOnce(null);

    const unauthorizedResponse = await GET({
      url: "http://localhost:3000/api/admin/analytics/dashboard?rangeStart=2026-06-01&rangeEnd=2026-06-30",
    });

    expect(unauthorizedResponse.status).toBe(401);
    expect(buildDashboardAnalytics).not.toHaveBeenCalled();

    auth.mockResolvedValueOnce({ id: 2, role: "CUSTOMER" });

    const forbiddenResponse = await GET({
      url: "http://localhost:3000/api/admin/analytics/dashboard?rangeStart=2026-06-01&rangeEnd=2026-06-30",
    });

    expect(forbiddenResponse.status).toBe(403);
  });

  it("returns dashboard validation errors as 400", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    buildDashboardAnalytics.mockImplementation(() => {
      throw new Error("Dashboard analytics filter metricKey is unsupported");
    });

    const response = await GET({
      url: "http://localhost:3000/api/admin/analytics/dashboard?rangeStart=2026-06-01&rangeEnd=2026-06-30",
    });

    expect(response.status).toBe(400);
    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: "Dashboard analytics filter metricKey is unsupported" },
      { status: 400 },
    );

    consoleSpy.mockRestore();
  });
});
