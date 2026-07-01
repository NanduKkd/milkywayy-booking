import { NextResponse } from "next/server";
import { auth } from "@/lib/helpers/auth";
import { listAdminSchedulingCalendarRange } from "@/lib/services/adminSchedulingCalendar";
import { GET } from "../route";

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

jest.mock("@/lib/db/relations", () => ({}));

jest.mock("@/lib/services/adminSchedulingCalendar", () => ({
  listAdminSchedulingCalendarRange: jest.fn(),
}));

describe("Admin scheduling calendar API route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auth.mockResolvedValue({ id: 1, role: "SUPERADMIN" });
  });

  it("returns the calendar range for an authorized actor", async () => {
    listAdminSchedulingCalendarRange.mockResolvedValue({
      range: {
        startDate: "2026-07-01",
        endDate: "2026-07-31",
        dayCount: 31,
      },
      bookings: [],
      events: [],
      days: [],
      summary: {
        totalBookings: 0,
        totalEvents: 0,
        totalActiveEvents: 0,
        totalCapacityConsumingEvents: 0,
        totalFullyBlockedDays: 0,
        totalPartiallyBlockedDays: 0,
      },
    });

    const response = await GET({
      url: "http://localhost:3000/api/admin/scheduling-calendar?start=2026-07-01&end=2026-07-31",
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(listAdminSchedulingCalendarRange).toHaveBeenCalledWith({
      startDate: "2026-07-01",
      endDate: "2026-07-31",
    });
    expect(data.range.dayCount).toBe(31);
  });

  it("rejects anonymous and non-superadmin access", async () => {
    auth.mockResolvedValueOnce(null);

    const unauthorizedResponse = await GET({
      url: "http://localhost:3000/api/admin/scheduling-calendar",
    });

    expect(unauthorizedResponse.status).toBe(401);
    expect(listAdminSchedulingCalendarRange).not.toHaveBeenCalled();

    auth.mockResolvedValueOnce({ id: 2, role: "CUSTOMER" });

    const forbiddenResponse = await GET({
      url: "http://localhost:3000/api/admin/scheduling-calendar",
    });

    expect(forbiddenResponse.status).toBe(403);
    expect(listAdminSchedulingCalendarRange).not.toHaveBeenCalled();
  });

  it("returns validation failures as 400", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    listAdminSchedulingCalendarRange.mockRejectedValue(
      new Error("Calendar range endDate must use YYYY-MM-DD"),
    );

    const response = await GET({
      url: "http://localhost:3000/api/admin/scheduling-calendar?start=2026-07-01&end=bad",
    });

    expect(response.status).toBe(400);
    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: "Calendar range endDate must use YYYY-MM-DD" },
      { status: 400 },
    );

    consoleSpy.mockRestore();
  });
});
