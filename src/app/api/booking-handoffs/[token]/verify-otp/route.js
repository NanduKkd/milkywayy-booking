import { NextResponse } from "next/server";
import { setSessionUser } from "@/lib/helpers/auth";
import { getRequestSource } from "@/lib/helpers/requestSource";
import { verifyAdminBookingHandoffOtp } from "@/lib/services/adminBookingHandoffs";

export async function POST(request, context) {
  try {
    const params = await context.params;
    const body = await request.json();
    const result = await verifyAdminBookingHandoffOtp({
      token: params.token,
      verificationId: body?.verificationId,
      otp: body?.otp,
      requestSource: await getRequestSource(),
    });

    await setSessionUser(result);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error verifying booking handoff OTP:", error);

    return NextResponse.json(
      {
        error: error?.message || "Failed to verify OTP",
      },
      {
        status: 400,
      },
    );
  }
}
