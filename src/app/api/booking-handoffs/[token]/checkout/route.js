import { NextResponse } from "next/server";
import { createAdminBookingHandoffCheckout } from "@/lib/services/adminBookingHandoffs";

export async function POST(request, context) {
  try {
    const params = await context.params;
    const body = await request.json();
    const result = await createAdminBookingHandoffCheckout({
      token: params.token,
      properties: Array.isArray(body?.properties) ? body.properties : [],
      enteredCode: body?.promotionCode || "",
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error creating booking handoff checkout:", error);

    return NextResponse.json(
      {
        error: error?.message || "Failed to start checkout",
      },
      {
        status: 400,
      },
    );
  }
}
