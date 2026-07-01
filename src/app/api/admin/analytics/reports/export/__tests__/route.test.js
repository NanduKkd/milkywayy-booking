import puppeteer from "puppeteer";
import * as XLSX from "xlsx";
import models from "@/lib/db/models";
import { auth } from "@/lib/helpers/auth";
import { getPricingConfig } from "@/lib/helpers/pricing";
import { buildFinancialReports } from "@/lib/services/financialAggregation";
import { GET as getReports } from "../../route";
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
jest.mock("puppeteer", () => ({
  launch: jest.fn(),
}));

jest.mock("@/lib/services/financialAggregation", () => {
  const actual = jest.requireActual("@/lib/services/financialAggregation");

  return {
    ...actual,
    buildFinancialReports: jest.fn(),
  };
});

function createMockReport() {
  return {
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
      expenses: 450,
      netProfit: 950,
      netRevenue: 1400,
    },
    monthlyComparison: [],
    profitAndLoss: {
      expenses: 450,
      margin: 67.86,
      netProfit: 950,
      netRevenue: 1400,
    },
    revenueByService: [{ amount: 20, key: "equals", label: "=2+3" }],
    sixMonthTrend: { buckets: [] },
    weeklyTrend: { buckets: [] },
  };
}

function parseCsvRows(csv) {
  const parseCsvLine = (line) => {
    const values = [];
    let current = "";
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];

      if (character === '"') {
        if (inQuotes && line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }

        continue;
      }

      if (character === "," && !inQuotes) {
        values.push(current);
        current = "";
        continue;
      }

      current += character;
    }

    values.push(current);

    return values;
  };
  const [headerLine, ...rowLines] = String(csv).trim().split(/\r?\n/u);
  const headers = parseCsvLine(headerLine.replace(/^\uFEFF/u, ""));

  return rowLines.filter(Boolean).map((rowLine) => {
    const values = parseCsvLine(rowLine);

    return Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? ""]),
    );
  });
}

describe("Admin financial report CSV export route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auth.mockResolvedValue({ id: 1, role: "SUPERADMIN" });
    getPricingConfig.mockResolvedValue({ Apartment: {} });
    models.Booking.findAll.mockResolvedValue([{ id: 10 }]);
    models.Transaction.findAll.mockResolvedValue([{ id: 20 }]);
    models.Expense.findAll.mockResolvedValue([{ id: 30 }]);
    buildFinancialReports.mockReturnValue(createMockReport());
    puppeteer.launch.mockResolvedValue({
      close: jest.fn().mockResolvedValue(undefined),
      newPage: jest.fn().mockResolvedValue({
        emulateMediaType: jest.fn().mockResolvedValue(undefined),
        pdf: jest.fn().mockResolvedValue(Buffer.from("%PDF-1.4\nmock")),
        setContent: jest.fn().mockResolvedValue(undefined),
      }),
    });
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

  it("keeps CSV export totals aligned with the reports API response", async () => {
    const requestUrl =
      "http://localhost:3000/api/admin/analytics/reports?rangeStart=2026-06-01&rangeEnd=2026-06-30&groupBy=week";
    const reportResponse = await getReports({ url: requestUrl });
    const report = await reportResponse.json();
    const exportResponse = await GET({
      url: `${requestUrl}&format=csv`.replace("/reports?", "/reports/export?"),
    });
    const csvRows = parseCsvRows(await exportResponse.text());

    expect(csvRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rowKey: "rangeStartBusinessDate",
          section: "metadata",
          textValue: report.filters.rangeStartBusinessDate,
        }),
        expect.objectContaining({
          rowKey: "rangeEndBusinessDateExclusive",
          section: "metadata",
          textValue: report.filters.rangeEndBusinessDateExclusive,
        }),
        expect.objectContaining({
          rowKey: "netRevenue",
          section: "kpis",
          numericValue: String(report.kpis.netRevenue),
        }),
        expect.objectContaining({
          rowKey: "expenses",
          section: "kpis",
          numericValue: String(report.kpis.expenses),
        }),
        expect.objectContaining({
          rowKey: "completedBookings",
          section: "kpis",
          numericValue: String(report.kpis.completedBookings),
        }),
        expect.objectContaining({
          rowKey: "netProfit",
          section: "profitAndLoss",
          numericValue: String(report.profitAndLoss.netProfit),
        }),
        expect.objectContaining({
          rowKey: "margin",
          section: "profitAndLoss",
          numericValue: String(report.profitAndLoss.margin),
        }),
        expect.objectContaining({
          rowKey: "equals",
          section: "revenueByService",
          label: "'=2+3",
          numericValue: "20",
        }),
      ]),
    );
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

  it("keeps Excel export totals aligned with the reports API response", async () => {
    const requestUrl =
      "http://localhost:3000/api/admin/analytics/reports?rangeStart=2026-06-01&rangeEnd=2026-06-30&groupBy=week";
    const reportResponse = await getReports({ url: requestUrl });
    const report = await reportResponse.json();
    const exportResponse = await GET({
      url: `${requestUrl}&format=xlsx`.replace("/reports?", "/reports/export?"),
    });
    const workbook = XLSX.read(
      Buffer.from(await exportResponse.arrayBuffer()),
      {
        cellDates: true,
        type: "buffer",
      },
    );
    const overviewRows = XLSX.utils.sheet_to_json(workbook.Sheets.Overview, {
      defval: "",
      raw: true,
    });
    const reportDataRows = XLSX.utils.sheet_to_json(
      workbook.Sheets["Report Data"],
      {
        defval: "",
        raw: true,
      },
    );

    expect(
      overviewRows
        .find((row) => row.label === "Report range start")
        ?.value.toISOString()
        .slice(0, 10),
    ).toBe(report.filters.rangeStartBusinessDate);
    expect(overviewRows.find((row) => row.label === "Net revenue")?.value).toBe(
      report.kpis.netRevenue,
    );
    expect(overviewRows.find((row) => row.label === "Net profit")?.value).toBe(
      report.kpis.netProfit,
    );
    expect(
      reportDataRows.find(
        (row) => row.section === "profitAndLoss" && row.rowKey === "margin",
      )?.numericValue,
    ).toBe(report.profitAndLoss.margin);
    expect(
      reportDataRows.find(
        (row) => row.section === "revenueByService" && row.rowKey === "equals",
      )?.label,
    ).toBe("'=2+3");
  });

  it("returns a PDF attachment for an authorized superadmin", async () => {
    const response = await GET({
      url: "http://localhost:3000/api/admin/analytics/reports/export?rangeStart=2026-06-01&rangeEnd=2026-06-30&groupBy=week&format=pdf",
    });
    const pdfBuffer = Buffer.from(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="financial-report-2026-06-01-to-2026-07-01.pdf"',
    );
    expect(pdfBuffer.toString("utf8")).toContain("%PDF-1.4");
  });

  it("rejects unsupported export formats", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    const response = await GET({
      url: "http://localhost:3000/api/admin/analytics/reports/export?rangeStart=2026-06-01&rangeEnd=2026-06-30&format=json",
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Financial report export format must be csv, xlsx, or pdf",
    });

    consoleSpy.mockRestore();
  });
});
