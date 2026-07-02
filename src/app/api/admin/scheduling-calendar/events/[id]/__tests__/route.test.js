import { NextResponse } from "next/server";
import { auth } from "@/lib/helpers/auth";
import {
  cancelCalendarEvent,
  restoreCalendarEvent,
  SchedulingConflictError,
  updateCalendarEvent,
} from "@/lib/services/adminCalendarEvents";
import { PATCH, PUT } from "../route";

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200,
    })),
  },
}));

jest.mock("@/lib/helpers/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/services/adminCalendarEvents", () => ({
  SchedulingConflictError: class SchedulingConflictError extends Error {
    constructor(message, details = {}) {
      super(message);
      this.name = "SchedulingConflictError";
      Object.assign(this, details);
    }
  },
  cancelCalendarEvent: jest.fn(),
  restoreCalendarEvent: jest.fn(),
  updateCalendarEvent: jest.fn(),
  isCalendarEventValidationError: jest.fn((error) =>
    String(error?.message || "").includes("Calendar event "),
  ),
}));

describe("Admin scheduling calendar event [id] route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auth.mockResolvedValue({ id: 1, role: "SUPERADMIN" });
  });

  it("updates an event for an authorized actor", async () => {
    updateCalendarEvent.mockResolvedValue({
      id: 15,
      title: "Updated hold",
      status: "ACTIVE",
    });

    const response = await PUT(
      {
        json: jest.fn().mockResolvedValue({
          title: "Updated hold",
        }),
      },
      { params: Promise.resolve({ id: "15" }) },
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(updateCalendarEvent).toHaveBeenCalledWith({
      actorUser: { id: 1, role: "SUPERADMIN" },
      eventId: "15",
      input: {
        title: "Updated hold",
      },
    });
    expect(data.title).toBe("Updated hold");
  });

  it("cancels and restores an event with PATCH actions", async () => {
    cancelCalendarEvent.mockResolvedValue({
      id: 15,
      status: "CANCELLED",
    });
    restoreCalendarEvent.mockResolvedValue({
      id: 15,
      status: "ACTIVE",
    });

    const cancelResponse = await PATCH(
      {
        json: jest.fn().mockResolvedValue({
          action: "cancel",
          cancellationReason: "Client asked to hold",
        }),
      },
      { params: Promise.resolve({ id: "15" }) },
    );
    const restoreResponse = await PATCH(
      {
        json: jest.fn().mockResolvedValue({
          action: "restore",
        }),
      },
      { params: Promise.resolve({ id: "15" }) },
    );

    expect(cancelResponse.status).toBe(200);
    expect(restoreResponse.status).toBe(200);
    expect(cancelCalendarEvent).toHaveBeenCalledWith({
      actorUser: { id: 1, role: "SUPERADMIN" },
      eventId: "15",
      cancellationReason: "Client asked to hold",
    });
    expect(restoreCalendarEvent).toHaveBeenCalledWith({
      actorUser: { id: 1, role: "SUPERADMIN" },
      eventId: "15",
    });
  });

  it("rejects unsupported patch actions", async () => {
    const response = await PATCH(
      {
        json: jest.fn().mockResolvedValue({
          action: "archive",
        }),
      },
      { params: Promise.resolve({ id: "15" }) },
    );

    expect(response.status).toBe(400);
    expect(cancelCalendarEvent).not.toHaveBeenCalled();
    expect(restoreCalendarEvent).not.toHaveBeenCalled();
  });

  it("returns scheduling conflicts from restore as 409", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    restoreCalendarEvent.mockRejectedValue(
      new SchedulingConflictError("Conflict", {
        status: 409,
        reasonCode: "schedule_conflict_existing_entries",
        conflicts: [{ date: "2026-07-08" }],
      }),
    );

    const response = await PATCH(
      {
        json: jest.fn().mockResolvedValue({
          action: "restore",
        }),
      },
      { params: Promise.resolve({ id: "15" }) },
    );

    expect(response.status).toBe(409);
    expect(NextResponse.json).toHaveBeenCalledWith(
      {
        error: "Conflict",
        reasonCode: "schedule_conflict_existing_entries",
        conflicts: [{ date: "2026-07-08" }],
      },
      { status: 409 },
    );

    consoleSpy.mockRestore();
  });
});
