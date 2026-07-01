import { NextResponse } from "next/server";
import { USER_ROLES } from "@/lib/config/app.config";
import "@/lib/db/relations";
import { auth } from "@/lib/helpers/auth";
import { listAdminSchedulingCalendarRange } from "@/lib/services/adminSchedulingCalendar";

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDefaultRange() {
  const today = new Date();
  return {
    startDate: toDateKey(new Date(today.getFullYear(), today.getMonth(), 1)),
    endDate: toDateKey(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
  };
}

function isCalendarValidationError(error) {
  return String(error?.message || "").startsWith("Calendar range ");
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

    const url = new URL(request.url);
    const defaults = getDefaultRange();
    const result = await listAdminSchedulingCalendarRange({
      startDate: url.searchParams.get("start") || defaults.startDate,
      endDate: url.searchParams.get("end") || defaults.endDate,
    });

    return NextResponse.json(result);
  } catch (error) {
    const status = isCalendarValidationError(error) ? 400 : 500;

    console.error("Error loading admin scheduling calendar:", error);

    return NextResponse.json(
      {
        error: error?.message || "Failed to load admin scheduling calendar",
      },
      { status },
    );
  }
}
