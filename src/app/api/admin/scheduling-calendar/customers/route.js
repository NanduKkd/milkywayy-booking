import { NextResponse } from "next/server";
import { USER_ROLES } from "@/lib/config/app.config";
import { auth } from "@/lib/helpers/auth";
import { searchAdminBookingPreparationCustomers } from "@/lib/services/adminBookingPreparation";

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
    const customers = await searchAdminBookingPreparationCustomers({
      actorUser: {
        id: Number(session.id),
        role: session.role,
      },
      query: url.searchParams.get("query") || "",
      limit: url.searchParams.get("limit") || undefined,
    });

    return NextResponse.json({ customers });
  } catch (error) {
    console.error("Error searching scheduling calendar customers:", error);

    return NextResponse.json(
      {
        error: error?.message || "Failed to search customers",
      },
      { status: 500 },
    );
  }
}
