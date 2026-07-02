import { NextResponse } from "next/server";
import { auth } from "@/lib/helpers/auth";
import {
  createCalendarEvent,
  SchedulingConflictError,
} from "@/lib/services/adminCalendarEvents";
import { POST } from "../route";

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
  createCalendarEvent: jest.fn(),
  isCalendarEventValidationError: jest.fn((error) =>
    String(error?.message || "").includes("Calendar event "),
  ),
}));

describe("Admin scheduling calendar events POST route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auth.mockResolvedValue({ id: 1, role: "SUPERADMIN" });
  });

  it("creates a calendar event for an authorized actor", async () => {
    createCalendarEvent.mockResolvedValue({
      id: 15,
      title: "Owner hold",
      date: "2026-07-08",
      status: "ACTIVE",
    });

    const response = await POST({
      json: jest.fn().mockResolvedValue({
        title: "Owner hold",
        date: "2026-07-08",
        period: "afternoon",
      }),
    });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(createCalendarEvent).toHaveBeenCalledWith({
      actorUser: { id: 1, role: "SUPERADMIN" },
      input: {
        title: "Owner hold",
        date: "2026-07-08",
        period: "afternoon",
      },
    });
    expect(data.title).toBe("Owner hold");
  });

  it("rejects anonymous and non-superadmin access", async () => {
    auth.mockResolvedValueOnce(null);

    const unauthorizedResponse = await POST({
      json: jest.fn(),
    });

    expect(unauthorizedResponse.status).toBe(401);
    expect(createCalendarEvent).not.toHaveBeenCalled();

    auth.mockResolvedValueOnce({ id: 2, role: "CUSTOMER" });

    const forbiddenResponse = await POST({
      json: jest.fn(),
    });

    expect(forbiddenResponse.status).toBe(403);
    expect(createCalendarEvent).not.toHaveBeenCalled();
  });

  it("returns scheduling conflicts as 409", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    createCalendarEvent.mockRejectedValue(
      new SchedulingConflictError("Conflict", {
        status: 409,
        reasonCode: "schedule_conflict_existing_entries",
        conflicts: [{ date: "2026-07-08" }],
      }),
    );

    const response = await POST({
      json: jest.fn().mockResolvedValue({
        title: "Owner hold",
        date: "2026-07-08",
        period: "afternoon",
      }),
    });

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
