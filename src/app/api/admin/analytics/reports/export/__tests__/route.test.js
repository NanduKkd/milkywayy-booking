import * as XLSX from "xlsx";
import models from "@/lib/db/models";
import { auth } from "@/lib/helpers/auth";
import { getPricingConfig } from "@/lib/helpers/pricing";
import { GET } from "../route";

global.Response = class MockResponse {
  constructor(body, init = {}) {
    this.body = body;
    this.status = init.status || 200;
    const normalizedHeaders = new Map(
      Object.entries(init.headers || {}).map(([key, value]) => [
        String(key).toLowerCase(),
        value,
      ]),
    );

    this.headers = {
      get(name) {
        return normalizedHeaders.get(String(name).toLowerCase()) || null;
      },
    };
  }

  async text() {
    if (typeof this.body === "string") {
      return this.body;
    }

    if (this.body instanceof ArrayBuffer) {
      return Buffer.from(this.body).toString("utf8");
    }

    if (ArrayBuffer.isView(this.body)) {
      return Buffer.from(this.body.buffer).toString("utf8");
    }

    return String(this.body);
  }

  async arrayBuffer() {
    if (this.body instanceof ArrayBuffer) {
      return this.body;
    }

    if (ArrayBuffer.isView(this.body)) {
      const view = this.body;

      return view.buffer.slice(
        view.byteOffset,
        view.byteOffset + view.byteLength,
      );
    }

    return new TextEncoder().encode(String(this.body)).buffer;
  }
};

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

jest.mock("@/lib/services/financialAggregation", () => ({
  buildFinancialReports: jest.fn(() => ({
    bookingStatus: {
      buckets: [{ count: 3, key: "completed", label: "Completed" }],
    },
    comparison: {
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
    monthlyComparison: [],
    profitAndLoss: {
      expenses: 450,
      margin: 67.86,
      netProfit: 950,
      netRevenue: 1400,
    },
    revenueByService: [],
    sixMonthTrend: { buckets: [] },
    weeklyTrend: { buckets: [] },
  })),
}));

describe("Admin financial report CSV export route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auth.mockResolvedValue({ id: 1, role: "SUPERADMIN" });
    getPricingConfig.mockResolvedValue({ Apartment: {} });
    models.Booking.findAll.mockResolvedValue([{ id: 10 }]);
    models.Transaction.findAll.mockResolvedValue([{ id: 20 }]);
    models.Expense.findAll.mockResolvedValue([{ id: 30 }]);
  });

  it("returns a CSV attachment for an authorized superadmin", async () => {
    const response = await GET({
      url: "http://localhost:3000/api/admin/analytics/reports/export?rangeStart=2026-06-01&rangeEnd=2026-06-30&groupBy=week&format=csv",
    });
    const csv = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "text/csv; charset=utf-8",
    );
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="financial-report-2026-06-01-to-2026-07-01.csv"',
    );
    expect(csv).toContain(
      "section,rowKey,label,valueType,numericValue,textValue",
    );
    expect(csv).toContain("kpis,netRevenue,netRevenue,amount,1400");
  });

  it("returns an Excel attachment for an authorized superadmin", async () => {
    const response = await GET({
      url: "http://localhost:3000/api/admin/analytics/reports/export?rangeStart=2026-06-01&rangeEnd=2026-06-30&groupBy=week&format=xlsx",
    });
    const workbookBuffer = Buffer.from(await response.arrayBuffer());
    const workbook = XLSX.read(workbookBuffer, {
      cellDates: true,
      type: "buffer",
    });
    const overviewRows = XLSX.utils.sheet_to_json(workbook.Sheets.Overview, {
      defval: "",
      raw: true,
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="financial-report-2026-06-01-to-2026-07-01.xlsx"',
    );
    expect(workbook.SheetNames).toEqual(["Overview", "Report Data"]);
    expect(overviewRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Net revenue",
          section: "kpis",
          value: 1400,
        }),
      ]),
    );
  });

  it("rejects unsupported export formats", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    const response = await GET({
      url: "http://localhost:3000/api/admin/analytics/reports/export?rangeStart=2026-06-01&rangeEnd=2026-06-30&format=pdf",
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Financial report export format must be csv or xlsx",
    });

    consoleSpy.mockRestore();
  });
});
