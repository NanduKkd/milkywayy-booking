import { NextResponse } from "next/server";
import models from "@/lib/db/models";
import { auth } from "@/lib/helpers/auth";
import { getPricingConfig } from "@/lib/helpers/pricing";
import { buildFinancialDrilldown } from "@/lib/services/financialAggregation";
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
    buildFinancialDrilldown: jest.fn(),
  };
});

describe("Admin financial drill-down API route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auth.mockResolvedValue({ id: 1, role: "SUPERADMIN" });
    getPricingConfig.mockResolvedValue({ Apartment: {} });
    models.Booking.findAll.mockResolvedValue([{ id: 10 }]);
    models.Transaction.findAll.mockResolvedValue([{ id: 20 }]);
    models.Expense.findAll.mockResolvedValue([{ id: 30 }]);
  });

  it("returns drill-down data for an authorized superadmin", async () => {
    buildFinancialDrilldown.mockReturnValue({
      metricKey: "netRevenue",
      rows: [],
      total: { kind: "amount", value: 500 },
    });

    const response = await GET({
      url: "http://localhost:3000/api/admin/analytics/drill-down?metricKey=netRevenue&rangeStart=2026-06-01&rangeEnd=2026-06-30&page=2&pageSize=10&sortKey=eventAt&sortDirection=asc",
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(buildFinancialDrilldown).toHaveBeenCalledWith({
      bookings: [{ id: 10 }],
      expenses: [{ id: 30 }],
      filters: {
        bookingStatusBucket: undefined,
        expenseCategory: undefined,
        metricKey: "netRevenue",
        page: "2",
        pageSize: "10",
        rangeEnd: "2026-06-30",
        rangeStart: "2026-06-01",
        serviceKey: undefined,
        sortDirection: "asc",
        sortKey: "eventAt",
        timezone: undefined,
      },
      pricingConfig: { Apartment: {} },
      transactions: [{ id: 20 }],
    });
    expect(data.total.value).toBe(500);
  });

  it("rejects anonymous and non-superadmin callers", async () => {
    auth.mockResolvedValueOnce(null);

    const unauthorizedResponse = await GET({
      url: "http://localhost:3000/api/admin/analytics/drill-down?metricKey=netRevenue&rangeStart=2026-06-01&rangeEnd=2026-06-30",
    });

    expect(unauthorizedResponse.status).toBe(401);
    expect(buildFinancialDrilldown).not.toHaveBeenCalled();

    auth.mockResolvedValueOnce({ id: 2, role: "CUSTOMER" });

    const forbiddenResponse = await GET({
      url: "http://localhost:3000/api/admin/analytics/drill-down?metricKey=netRevenue&rangeStart=2026-06-01&rangeEnd=2026-06-30",
    });

    expect(forbiddenResponse.status).toBe(403);
  });

  it("returns drill-down validation errors as 400", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    buildFinancialDrilldown.mockImplementation(() => {
      throw new Error("Financial drill-down metricKey is required");
    });

    const response = await GET({
      url: "http://localhost:3000/api/admin/analytics/drill-down?rangeStart=2026-06-01&rangeEnd=2026-06-30",
    });

    expect(response.status).toBe(400);
    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: "Financial drill-down metricKey is required" },
      { status: 400 },
    );

    consoleSpy.mockRestore();
  });
});
