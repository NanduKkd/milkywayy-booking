import puppeteer from "puppeteer";
import * as XLSX from "xlsx";
import {
  buildFinancialReportCsv,
  buildFinancialReportCsvFilename,
  buildFinancialReportPdf,
  buildFinancialReportPdfFilename,
  buildFinancialReportPdfHtml,
  buildFinancialReportWorkbook,
  buildFinancialReportWorkbookFilename,
} from "../financialReportExport";

jest.mock("puppeteer", () => ({
  launch: jest.fn(),
}));

function createSampleReport() {
  return {
    bookingStatus: {
      buckets: [{ count: 3, key: "completed", label: "Completed" }],
    },
    comparison: {
      completedBookings: { delta: 1 },
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
      averageBookingValue: 466.67,
      completedBookings: 3,
      expenses: 450,
      grossPayments: 1500,
      lostValue: 250,
      netProfit: 950,
      netRevenue: 1400,
      refunds: 100,
    },
    monthlyComparison: [
      {
        averageBookingValue: 466.67,
        cancelledBookings: 1,
        completedBookings: 3,
        expenses: 450,
        grossPayments: 1500,
        lostValue: 250,
        monthEndBusinessDateExclusive: "2026-07-01",
        monthLabel: "Jun 2026",
        monthStartBusinessDate: "2026-06-01",
        netProfit: 950,
        netRevenue: 1400,
        refunds: 100,
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
    ],
    sixMonthTrend: {
      buckets: [
        {
          bucketEndBusinessDateExclusive: "2026-07-01",
          bucketStartBusinessDate: "2026-06-01",
          monthLabel: "Jun 2026",
          netRevenue: 1400,
        },
      ],
    },
    weeklyTrend: {
      buckets: [
        {
          bucketEndBusinessDateExclusive: "2026-06-08",
          bucketStartBusinessDate: "2026-06-01",
          netRevenue: 400,
        },
      ],
    },
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

describe("buildFinancialReportCsv", () => {
  it("serializes report sections into a deterministic CSV payload", () => {
    const csv = buildFinancialReportCsv(createSampleReport());

    expect(csv).toContain(
      "section,rowKey,label,valueType,numericValue,textValue,bucketStartBusinessDate",
    );
    expect(csv).toContain("kpis,netRevenue,netRevenue,amount,1400");
    expect(csv).toContain(
      "monthlyComparison,netProfit,Jun 2026 net profit,amount,950",
    );
    expect(csv).toContain("profitAndLoss,margin,Margin,percent,67.86");
    expect(csv).toContain("bookingStatus,completed,Completed,count,3");
  });

  it("neutralizes spreadsheet formulas in text cells", () => {
    const report = {
      comparisonMode: "previous_period",
      filters: {
        groupBy: "week",
        rangeEndBusinessDateExclusive: "2026-07-01",
        rangeStartBusinessDate: "2026-06-01",
        timezone: "Asia/Dubai",
      },
      revenueByService: [
        { amount: 10, key: "equals", label: "=2+3" },
        { amount: 11, key: "plus", label: "+SUM(A1:A2)" },
        { amount: 12, key: "minus", label: "-cmd|' /C calc'!A0" },
        { amount: 13, key: "at", label: "@SUM(1+1)" },
      ],
    };
    const csv = buildFinancialReportCsv(report);
    const csvRows = parseCsvRows(csv);
    const workbook = XLSX.read(buildFinancialReportWorkbook(report), {
      cellDates: true,
      type: "buffer",
    });
    const reportDataRows = XLSX.utils.sheet_to_json(
      workbook.Sheets["Report Data"],
      {
        defval: "",
        raw: true,
      },
    );

    expect(csvRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "'=2+3", rowKey: "equals" }),
        expect.objectContaining({ label: "'+SUM(A1:A2)", rowKey: "plus" }),
        expect.objectContaining({
          label: "'-cmd|' /C calc'!A0",
          rowKey: "minus",
        }),
        expect.objectContaining({ label: "'@SUM(1+1)", rowKey: "at" }),
      ]),
    );
    expect(reportDataRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "'=2+3", rowKey: "equals" }),
        expect.objectContaining({ label: "'+SUM(A1:A2)", rowKey: "plus" }),
        expect.objectContaining({
          label: "'-cmd|' /C calc'!A0",
          rowKey: "minus",
        }),
        expect.objectContaining({ label: "'@SUM(1+1)", rowKey: "at" }),
      ]),
    );
  });

  it("keeps CSV rows aligned with the report payload totals and filters", () => {
    const report = createSampleReport();
    const csvRows = parseCsvRows(buildFinancialReportCsv(report));

    expect(csvRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rowKey: "rangeStartBusinessDate",
          section: "metadata",
          textValue: "2026-06-01",
        }),
        expect.objectContaining({
          rowKey: "rangeEndBusinessDateExclusive",
          section: "metadata",
          textValue: "2026-07-01",
        }),
        expect.objectContaining({
          numericValue: String(report.kpis.netRevenue),
          rowKey: "netRevenue",
          section: "kpis",
          valueType: "amount",
        }),
        expect.objectContaining({
          numericValue: String(report.kpis.completedBookings),
          rowKey: "completedBookings",
          section: "kpis",
          valueType: "count",
        }),
        expect.objectContaining({
          numericValue: String(report.profitAndLoss.netProfit),
          rowKey: "netProfit",
          section: "profitAndLoss",
          valueType: "amount",
        }),
        expect.objectContaining({
          numericValue: String(report.profitAndLoss.margin),
          rowKey: "margin",
          section: "profitAndLoss",
          valueType: "percent",
        }),
      ]),
    );
  });
});

describe("buildFinancialReportCsvFilename", () => {
  it("uses the normalized report business-date range", () => {
    expect(
      buildFinancialReportCsvFilename({
        filters: {
          rangeEndBusinessDateExclusive: "2026-07-01",
          rangeStartBusinessDate: "2026-06-01",
        },
      }),
    ).toBe("financial-report-2026-06-01-to-2026-07-01.csv");
  });
});

describe("buildFinancialReportWorkbook", () => {
  it("serializes the report into a typed workbook with overview and data sheets", () => {
    const workbookBuffer = buildFinancialReportWorkbook({
      ...createSampleReport(),
      monthlyComparison: [],
      revenueByService: [{ amount: 10, key: "marketing", label: "=2+3" }],
      sixMonthTrend: { buckets: [] },
      weeklyTrend: { buckets: [] },
    });

    const workbook = XLSX.read(workbookBuffer, {
      cellDates: true,
      type: "buffer",
    });
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

    expect(workbook.SheetNames).toEqual(["Overview", "Report Data"]);
    expect(overviewRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Generated at",
          section: "metadata",
          valueType: "datetime",
        }),
        expect.objectContaining({
          label: "Net revenue",
          section: "kpis",
          value: 1400,
          valueType: "amount",
        }),
      ]),
    );
    expect(
      overviewRows.find((row) => row.label === "Generated at")?.value,
    ).toBeInstanceOf(Date);
    expect(reportDataRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "netRevenue",
          numericValue: 1400,
          rowKey: "netRevenue",
          section: "kpis",
          valueType: "amount",
        }),
        expect.objectContaining({
          label: "'=2+3",
          numericValue: 10,
          rowKey: "marketing",
          section: "revenueByService",
          valueType: "amount",
        }),
      ]),
    );
    expect(
      reportDataRows.find((row) => row.rowKey === "netRevenue")?.numericValue,
    ).toBe(1400);
  });

  it("keeps workbook overview and report data aligned with the report payload", () => {
    const report = createSampleReport();
    const workbook = XLSX.read(buildFinancialReportWorkbook(report), {
      cellDates: true,
      type: "buffer",
    });
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
      overviewRows.find((row) => row.label === "Report range start")?.value,
    ).toBeInstanceOf(Date);
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
  });
});

describe("buildFinancialReportWorkbookFilename", () => {
  it("uses the normalized report business-date range", () => {
    expect(
      buildFinancialReportWorkbookFilename({
        filters: {
          rangeEndBusinessDateExclusive: "2026-07-01",
          rangeStartBusinessDate: "2026-06-01",
        },
      }),
    ).toBe("financial-report-2026-06-01-to-2026-07-01.xlsx");
  });
});

describe("buildFinancialReportPdfHtml", () => {
  it("renders a readable, filter-labelled HTML document for PDF export", () => {
    const html = buildFinancialReportPdfHtml(createSampleReport());

    expect(html).toContain("Financial report export");
    expect(html).toContain(
      "Server-generated PDF using the same validated report dataset",
    );
    expect(html).toContain("Range start");
    expect(html).toContain("Jun 2026");
    expect(html).toContain("Weekly net revenue");
    expect(html).toContain("Revenue by service");
    expect(html).toContain(
      "This export reconciles to the live Financial Reports screen",
    );
    expect(html).toContain("Jun 1, 2026");
    expect(html).toContain("Jun 30, 2026");
    expect(html).toContain("67.86%");
    expect(html).toMatch(/1,400\.00/u);
    expect(html).toMatch(/950\.00/u);
  });
});

describe("buildFinancialReportPdf", () => {
  it("renders the report HTML through puppeteer and returns a PDF buffer", async () => {
    const close = jest.fn().mockResolvedValue(undefined);
    const emulateMediaType = jest.fn().mockResolvedValue(undefined);
    const pdf = jest.fn().mockResolvedValue(Buffer.from("%PDF-1.4\nmock"));
    const setContent = jest.fn().mockResolvedValue(undefined);
    const newPage = jest.fn().mockResolvedValue({
      emulateMediaType,
      pdf,
      setContent,
    });

    puppeteer.launch.mockResolvedValue({
      close,
      newPage,
    });

    const buffer = await buildFinancialReportPdf(createSampleReport());

    expect(puppeteer.launch).toHaveBeenCalledWith({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: "new",
    });
    expect(newPage).toHaveBeenCalled();
    expect(setContent).toHaveBeenCalledWith(
      expect.stringContaining("Financial report export"),
      expect.objectContaining({ waitUntil: "networkidle0" }),
    );
    expect(emulateMediaType).toHaveBeenCalledWith("screen");
    expect(pdf).toHaveBeenCalledWith(
      expect.objectContaining({
        format: "A4",
        printBackground: true,
      }),
    );
    expect(close).toHaveBeenCalled();
    expect(buffer.toString("utf8")).toContain("%PDF-1.4");
  });
});

describe("buildFinancialReportPdfFilename", () => {
  it("uses the normalized report business-date range", () => {
    expect(
      buildFinancialReportPdfFilename({
        filters: {
          rangeEndBusinessDateExclusive: "2026-07-01",
          rangeStartBusinessDate: "2026-06-01",
        },
      }),
    ).toBe("financial-report-2026-06-01-to-2026-07-01.pdf");
  });
});
