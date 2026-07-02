import { NextResponse } from "next/server";
import { getRequestSource } from "@/lib/helpers/requestSource";
import {
  isAdminBookingHandoffValidationError,
  sendAdminBookingHandoffOtp,
} from "@/lib/services/adminBookingHandoffs";

export async function POST(request, context) {
  try {
    const params = await context.params;
    const body = await request.json();
    const result = await sendAdminBookingHandoffOtp({
      token: params.token,
      customer: body?.customer || body,
      requestSource: await getRequestSource(),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error sending booking handoff OTP:", error);

    return NextResponse.json(
      {
        error: error?.message || "Failed to send OTP",
      },
      {
        status: isAdminBookingHandoffValidationError(error) ? 400 : 500,
      },
    );
  }
}
