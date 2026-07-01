import { NextResponse } from "next/server";
import { USER_ROLES } from "@/lib/config/app.config";
import "@/lib/db/relations";
import { auth } from "@/lib/helpers/auth";
import {
  buildFinancialReportCsv,
  buildFinancialReportCsvFilename,
  buildFinancialReportWorkbook,
  buildFinancialReportWorkbookFilename,
} from "@/lib/services/financialReportExport";
import {
  buildFinancialReportFilterInput,
  isFinancialReportValidationError,
  loadFinancialReportData,
} from "../_lib/reportData";

function normalizeExportFormat(requestUrl) {
  const url = new URL(requestUrl);
  const format = String(url.searchParams.get("format") || "csv")
    .trim()
    .toLowerCase();

  if (format !== "csv" && format !== "xlsx") {
    throw new Error("Financial report export format must be csv or xlsx");
  }

  return format;
}

function isFinancialReportExportValidationError(error) {
  return (
    isFinancialReportValidationError(error) ||
    String(error?.message || "").startsWith("Financial report export")
  );
}

export async function GET(request) {
  try {
    const session = await auth();

    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== USER_ROLES.SUPERADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const format = normalizeExportFormat(request.url);

    const filters = buildFinancialReportFilterInput(request.url);
    const report = await loadFinancialReportData(filters);

    if (format === "xlsx") {
      const workbook = buildFinancialReportWorkbook(report);
      const filename = buildFinancialReportWorkbookFilename(report);

      return new Response(workbook, {
        headers: {
          "Cache-Control": "no-store",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
        status: 200,
      });
    }

    const csv = buildFinancialReportCsv(report);
    const filename = buildFinancialReportCsvFilename(report);

    return new Response(csv, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type": "text/csv; charset=utf-8",
      },
      status: 200,
    });
  } catch (error) {
    const status = isFinancialReportExportValidationError(error) ? 400 : 500;

    console.error("Error exporting admin financial reports:", error);

    return NextResponse.json(
      { error: error?.message || "Failed to export financial reports" },
      { status },
    );
  }
}
