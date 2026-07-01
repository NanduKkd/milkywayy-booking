import { NextResponse } from "next/server";
import models from "@/lib/db/models";
import { auth } from "@/lib/helpers/auth";
import { getPricingConfig } from "@/lib/helpers/pricing";
import { buildFinancialReports } from "@/lib/services/financialAggregation";
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
    buildFinancialReports: jest.fn(),
  };
});

describe("Admin financial reports API route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auth.mockResolvedValue({ id: 1, role: "SUPERADMIN" });
    getPricingConfig.mockResolvedValue({ Apartment: {} });
    models.Booking.findAll.mockResolvedValue([{ id: 10 }]);
    models.Transaction.findAll.mockResolvedValue([{ id: 20 }]);
    models.Expense.findAll.mockResolvedValue([{ id: 30 }]);
  });

  it("returns reports data for an authorized superadmin", async () => {
    buildFinancialReports.mockReturnValue({
      filters: {
        groupBy: "week",
        rangeEnd: "2026-06-30T20:00:00.000Z",
        rangeStart: "2026-05-31T20:00:00.000Z",
      },
      kpis: { netRevenue: 500 },
      monthlyComparison: [],
    });

    const response = await GET({
      url: "http://localhost:3000/api/admin/analytics/reports?rangeStart=2026-06-01&rangeEnd=2026-06-30&groupBy=week",
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(buildFinancialReports).toHaveBeenCalledWith({
      bookings: [{ id: 10 }],
      expenses: [{ id: 30 }],
      filters: {
        comparisonMode: undefined,
        groupBy: "week",
        rangeEnd: "2026-06-30",
        rangeStart: "2026-06-01",
        timezone: undefined,
      },
      pricingConfig: { Apartment: {} },
      transactions: [{ id: 20 }],
    });
    expect(data.kpis.netRevenue).toBe(500);
  });

  it("rejects anonymous and non-superadmin callers", async () => {
    auth.mockResolvedValueOnce(null);

    const unauthorizedResponse = await GET({
      url: "http://localhost:3000/api/admin/analytics/reports?rangeStart=2026-06-01&rangeEnd=2026-06-30",
    });

    expect(unauthorizedResponse.status).toBe(401);
    expect(buildFinancialReports).not.toHaveBeenCalled();

    auth.mockResolvedValueOnce({ id: 2, role: "CUSTOMER" });

    const forbiddenResponse = await GET({
      url: "http://localhost:3000/api/admin/analytics/reports?rangeStart=2026-06-01&rangeEnd=2026-06-30",
    });

    expect(forbiddenResponse.status).toBe(403);
  });

  it("returns report validation errors as 400", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    buildFinancialReports.mockImplementation(() => {
      throw new Error("Financial report groupBy must be week or month");
    });

    const response = await GET({
      url: "http://localhost:3000/api/admin/analytics/reports?rangeStart=2026-06-01&rangeEnd=2026-06-30&groupBy=quarter",
    });

    expect(response.status).toBe(400);
    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: "Financial report groupBy must be week or month" },
      { status: 400 },
    );

    consoleSpy.mockRestore();
  });
});
