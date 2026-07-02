import { sequelize } from "@/lib/db/db";
import Booking from "@/lib/db/models/booking";
import CalendarEvent from "@/lib/db/models/calendarevent";
import DynamicConfig from "@/lib/db/models/dynamicconfig";
import {
  revalidateSchedulingRequests,
  SchedulingConflictError,
} from "../schedulingConflictRevalidation";

const mockTransaction = {
  LOCK: {
    UPDATE: "UPDATE",
  },
};

jest.mock("@/lib/db/db", () => ({
  sequelize: {
    query: jest.fn(),
  },
}));

jest.mock("@/lib/db/models/booking", () => ({
  findAll: jest.fn(),
}));

jest.mock("@/lib/db/models/calendarevent", () => ({
  findAll: jest.fn(),
}));

jest.mock("@/lib/db/models/dynamicconfig", () => ({
  findOne: jest.fn(),
}));

jest.mock("@/lib/db/models/transaction", () => ({}));

describe("schedulingConflictRevalidation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    DynamicConfig.findOne.mockResolvedValue({
      value: {
        version: 2,
        weeklyRules: {},
        dateOverrides: {},
        slotRules: [],
        systemSettings: {
          rollingWindowDays: 90,
          workingDays: {
            Monday: true,
            Tuesday: true,
            Wednesday: true,
            Thursday: true,
            Friday: true,
            Saturday: true,
            Sunday: true,
          },
          blockDefinitions: {},
        },
      },
    });
    Booking.findAll.mockResolvedValue([]);
    CalendarEvent.findAll.mockResolvedValue([]);
  });

  it("locks requested dates inside the transaction before revalidating", async () => {
    await revalidateSchedulingRequests({
      dates: ["2026-07-10", "2026-07-11"],
      requests: [
        {
          type: "booking",
          date: "2026-07-10",
          startTime: "09:00",
          durationHours: 1,
        },
      ],
      transaction: mockTransaction,
    });

    expect(sequelize.query).toHaveBeenCalledTimes(2);
    expect(sequelize.query).toHaveBeenNthCalledWith(
      1,
      "SELECT pg_advisory_xact_lock(:namespace, :resourceKey)",
      expect.objectContaining({
        replacements: {
          namespace: 24071,
          resourceKey: 20260710,
        },
        transaction: mockTransaction,
      }),
    );
  });

  it("throws an actionable conflict when a booking overlaps an existing scheduled entry", async () => {
    Booking.findAll.mockResolvedValue([
      {
        id: 88,
        bookingCode: "MWB-1088",
        date: "2026-07-12",
        startTime: "09:00",
        duration: 1,
        status: "CONFIRMED",
        shootDetails: { services: ["Photography"] },
        propertyDetails: { type: "Apartment", size: "1 Bed" },
      },
    ]);

    await expect(
      revalidateSchedulingRequests({
        dates: ["2026-07-12"],
        requests: [
          {
            type: "booking",
            date: "2026-07-12",
            startTime: "09:00",
            durationHours: 1,
          },
        ],
      }),
    ).rejects.toMatchObject({
      name: "SchedulingConflictError",
      reasonCode: "schedule_conflict_existing_entries",
      conflicts: [
        expect.objectContaining({
          date: "2026-07-12",
          bookings: [
            expect.objectContaining({
              bookingCode: "MWB-1088",
            }),
          ],
        }),
      ],
    });
  });

  it("blocks a new schedule block when it overlaps an active booking", async () => {
    Booking.findAll.mockResolvedValue([
      {
        id: 5,
        bookingCode: "MWB-1005",
        date: "2026-07-13",
        startTime: "09:00",
        duration: 1,
        status: "CONFIRMED",
        shootDetails: { services: ["Photography"] },
        propertyDetails: { type: "Apartment", size: "1 Bed" },
      },
    ]);
    CalendarEvent.findAll.mockResolvedValue([
      {
        id: 9,
        title: "Studio hold",
        businessDate: "2026-07-13",
        period: "morning",
        status: "ACTIVE",
        consumesCapacity: false,
      },
    ]);

    let receivedError = null;

    try {
      await revalidateSchedulingRequests({
        dates: ["2026-07-13"],
        requests: [
          {
            type: "block",
            date: "2026-07-13",
            blockedPeriods: ["morning"],
          },
        ],
      });
    } catch (error) {
      receivedError = error;
    }

    expect(receivedError).toBeInstanceOf(SchedulingConflictError);
    expect(receivedError.reasonCode).toBe(
      "schedule_conflict_existing_bookings",
    );
    expect(receivedError.conflicts[0].bookings).toHaveLength(1);
    expect(receivedError.conflicts[0].events).toHaveLength(0);
  });

  it("allows blocks to coexist with informational events", async () => {
    CalendarEvent.findAll.mockResolvedValue([
      {
        id: 9,
        title: "Studio hold",
        businessDate: "2026-07-13",
        period: "morning",
        status: "ACTIVE",
        consumesCapacity: false,
      },
    ]);

    await expect(
      revalidateSchedulingRequests({
        dates: ["2026-07-13"],
        requests: [
          {
            type: "block",
            date: "2026-07-13",
            blockedPeriods: ["morning"],
          },
        ],
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        requests: [
          expect.objectContaining({
            type: "block",
            date: "2026-07-13",
          }),
        ],
      }),
    );
  });

  it("rejects an exact time-range block that overlaps an active booking even with override enabled", async () => {
    Booking.findAll.mockResolvedValue([
      {
        id: 5,
        bookingCode: "MWB-1005",
        date: "2026-07-13",
        startTime: "09:00",
        duration: 1,
        status: "CONFIRMED",
        shootDetails: { services: ["Photography"] },
        propertyDetails: { type: "Apartment", size: "1 Bed" },
      },
    ]);

    await expect(
      revalidateSchedulingRequests({
        dates: ["2026-07-13"],
        requests: [
          {
            type: "block",
            date: "2026-07-13",
            timeBlocks: [
              {
                startTime: "10:00",
                endTime: "10:30",
              },
            ],
            allowOverride: true,
          },
        ],
      }),
    ).rejects.toMatchObject({
      name: "SchedulingConflictError",
      reasonCode: "schedule_conflict_existing_bookings",
      conflicts: [
        expect.objectContaining({
          date: "2026-07-13",
          blockedTimeRanges: [{ startTime: "10:00", endTime: "10:30" }],
          bookings: [
            expect.objectContaining({
              bookingCode: "MWB-1005",
            }),
          ],
        }),
      ],
    });
  });
});
