import { NextResponse } from "next/server";
import { getRequestSource } from "@/lib/helpers/requestSource";
import {
  isAdminBookingHandoffRateLimitError,
  previewAdminBookingHandoffPromotionPricing,
} from "@/lib/services/adminBookingHandoffs";

const SAFE_HANDOFF_PREVIEW_ERRORS = new Set([
  "Invalid booking handoff link",
  "Booking handoff not found",
  "This booking handoff link is no longer active",
  "This booking handoff has already been paid",
  "This booking handoff link has expired",
  "Phone verification is required before pricing or payment",
  "Customer not found",
  "Customer ownership could not be verified",
]);

export async function POST(request, context) {
  try {
    const params = await context.params;
    const body = await request.json();
    const result = await previewAdminBookingHandoffPromotionPricing({
      token: params.token,
      eligibleSubtotal: body?.eligibleSubtotal,
      enteredCode: body?.promotionCode || "",
      requestSource: await getRequestSource(),
    });

    return NextResponse.json(result);
  } catch (error) {
    const isRateLimited = isAdminBookingHandoffRateLimitError(error);
    const isSafeHandoffError = SAFE_HANDOFF_PREVIEW_ERRORS.has(error?.message);

    if (!isRateLimited) {
      console.error(
        "Error previewing booking handoff promotion pricing:",
        error,
      );
    }

    return NextResponse.json(
      {
        error: isRateLimited
          ? "Too many pricing requests. Please wait before trying again."
          : isSafeHandoffError
            ? error.message
            : "Unable to load promotion pricing",
      },
      {
        status: isRateLimited ? 429 : isSafeHandoffError ? 400 : 500,
        ...(isRateLimited && error?.retryAfterSeconds
          ? {
              headers: {
                "Retry-After": String(error.retryAfterSeconds),
              },
            }
          : {}),
      },
    );
  }
}
