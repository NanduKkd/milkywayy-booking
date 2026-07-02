import { NextResponse } from "next/server";
import { USER_ROLES } from "@/lib/config/app.config";
import { auth } from "@/lib/helpers/auth";
import {
  createCalendarEvent,
  isCalendarEventValidationError,
  SchedulingConflictError,
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
    error: error.message || "Failed to create calendar event",
  };
}

export async function POST(request) {
  try {
    const authorization = await authorizeCalendarEventRequest();

    if (authorization.error) {
      return authorization.error;
    }

    const body = await request.json();
    const event = await createCalendarEvent({
      actorUser: authorization.actorUser,
      input: body,
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error("Error creating calendar event:", error);
    return NextResponse.json(buildErrorPayload(error), {
      status: getErrorStatus(error),
    });
  }
}
