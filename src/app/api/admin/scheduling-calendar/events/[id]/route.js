import { NextResponse } from "next/server";
import { USER_ROLES } from "@/lib/config/app.config";
import { auth } from "@/lib/helpers/auth";
import {
  cancelCalendarEvent,
  isCalendarEventValidationError,
  restoreCalendarEvent,
  SchedulingConflictError,
  updateCalendarEvent,
} from "@/lib/services/adminCalendarEvents";

async function authorizeCalendarEventRequest() {
  const session = await auth();

  if (!session?.id) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      actorUser: null,
    };
  }

  if (session.role !== USER_ROLES.SUPERADMIN) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      actorUser: null,
    };
  }

  return {
    error: null,
    actorUser: {
      id: Number(session.id),
      role: session.role,
    },
  };
}

function getErrorStatus(error) {
  if (error instanceof SchedulingConflictError) {
    return error.status || 409;
  }

  if (isCalendarEventValidationError(error)) {
    return error.message === "Calendar event not found" ? 404 : 400;
  }

  return 500;
}

function buildErrorPayload(error) {
  if (error instanceof SchedulingConflictError) {
    return {
      error: error.message || "Scheduling conflict",
      reasonCode: error.reasonCode || "schedule_conflict",
      conflicts: Array.isArray(error.conflicts) ? error.conflicts : [],
    };
  }

  return {
    error: error.message || "Failed to update calendar event",
  };
}

export async function PUT(request, { params }) {
  try {
    const authorization = await authorizeCalendarEventRequest();

    if (authorization.error) {
      return authorization.error;
    }

    const { id } = await params;
    const body = await request.json();
    const event = await updateCalendarEvent({
      actorUser: authorization.actorUser,
      eventId: id,
      input: body,
    });

    return NextResponse.json(event);
  } catch (error) {
    console.error("Error updating calendar event:", error);
    return NextResponse.json(buildErrorPayload(error), {
      status: getErrorStatus(error),
    });
  }
}

export async function PATCH(request, { params }) {
  try {
    const authorization = await authorizeCalendarEventRequest();

    if (authorization.error) {
      return authorization.error;
    }

    const { id } = await params;
    const body = await request.json();
    const action = String(body?.action || "")
      .trim()
      .toLowerCase();

    if (action === "cancel") {
      const event = await cancelCalendarEvent({
        actorUser: authorization.actorUser,
        eventId: id,
        cancellationReason: body?.cancellationReason ?? null,
      });

      return NextResponse.json(event);
    }

    if (action === "restore") {
      const event = await restoreCalendarEvent({
        actorUser: authorization.actorUser,
        eventId: id,
      });

      return NextResponse.json(event);
    }

    return NextResponse.json(
      { error: "Calendar event action is unsupported" },
      { status: 400 },
    );
  } catch (error) {
    console.error("Error mutating calendar event status:", error);
    return NextResponse.json(buildErrorPayload(error), {
      status: getErrorStatus(error),
    });
  }
}
