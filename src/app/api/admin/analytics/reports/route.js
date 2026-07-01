import { NextResponse } from "next/server";
import { USER_ROLES } from "@/lib/config/app.config";
import "@/lib/db/relations";
import { auth } from "@/lib/helpers/auth";
import {
  buildFinancialReportFilterInput,
  isFinancialReportValidationError,
  loadFinancialReportData,
} from "./_lib/reportData";

export async function GET(request) {
  try {
    const session = await auth();

    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== USER_ROLES.SUPERADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const filters = buildFinancialReportFilterInput(request.url);
    const result = await loadFinancialReportData(filters);

    return NextResponse.json(result);
  } catch (error) {
    const status = isFinancialReportValidationError(error) ? 400 : 500;

    console.error("Error loading admin financial reports:", error);

    return NextResponse.json(
      { error: error?.message || "Failed to load financial reports" },
      { status },
    );
  }
}
