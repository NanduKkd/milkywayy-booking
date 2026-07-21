import { NextResponse } from "next/server";
import { USER_ROLES } from "@/lib/config/app.config";
import "@/lib/db/relations";
import { auth } from "@/lib/helpers/auth";
import { getAdminBookingValidationMessage } from "@/lib/services/adminBookingCustomerValidation";
import {
  createAdminBookingHandoff,
  isAdminBookingHandoffValidationError,
  sendAdminBookingHandoffLink,
} from "@/lib/services/adminBookingHandoffs";

function isSchedulingAvailabilityConflict(error) {
  const message = String(error?.message || "");
  return (
    message.startsWith("Selected time on ") &&
    (message.endsWith(" is no longer available.") ||
      message.endsWith(" is blocked by admin calendar rules."))
  );
}

export async function POST(request) {
  try {
    const session = await auth();

    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== USER_ROLES.SUPERADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    if (body?.action === "send_whatsapp") {
      const result = await sendAdminBookingHandoffLink({
        actorUser: { id: Number(session.id), role: session.role },
        transactionId: body?.transactionId,
      });

      return NextResponse.json(result);
    }

    const result = await createAdminBookingHandoff({
      actorUser: {
        id: Number(session.id),
        role: session.role,
      },
      input: body?.input || body,
      transactionId: body?.transactionId || null,
      sendWhatsApp: Boolean(body?.sendWhatsApp),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error creating admin booking handoff:", error);
    const isValidationError = isAdminBookingHandoffValidationError(error);

    return NextResponse.json(
      {
        error: isValidationError
          ? getAdminBookingValidationMessage(error)
          : error?.message || "Failed to create booking handoff",
      },
      {
        status: isValidationError
          ? 400
          : isSchedulingAvailabilityConflict(error)
            ? 409
            : 500,
      },
    );
  }
}
