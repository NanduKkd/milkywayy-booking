import { NextResponse } from "next/server";
import { USER_ROLES } from "@/lib/config/app.config";
import { auth } from "@/lib/helpers/auth";
import {
  isAdminBookingPreparationValidationError,
  previewAdminBookingPreparation,
} from "@/lib/services/adminBookingPreparation";

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
    const result = await previewAdminBookingPreparation({
      actorUser: {
        id: Number(session.id),
        role: session.role,
      },
      input: body,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error previewing admin booking preparation:", error);

    return NextResponse.json(
      {
        error: error?.message || "Failed to preview admin booking preparation",
      },
      {
        status: isAdminBookingPreparationValidationError(error)
          ? 400
          : isSchedulingAvailabilityConflict(error)
            ? 409
            : 500,
      },
    );
  }
}
