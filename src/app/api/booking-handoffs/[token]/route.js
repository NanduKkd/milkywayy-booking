import { NextResponse } from "next/server";
import { getAdminBookingHandoffByToken } from "@/lib/services/adminBookingHandoffs";

export async function GET(_request, context) {
  try {
    const params = await context.params;
    const result = await getAdminBookingHandoffByToken({
      token: params.token,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error loading booking handoff:", error);

    return NextResponse.json(
      {
        error: error?.message || "Failed to load booking handoff",
      },
      {
        status: 400,
      },
    );
  }
}
