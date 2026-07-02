import { Op } from "sequelize";
import models from "@/lib/db/models";
import { listAdminSchedulingCalendarRange } from "../adminSchedulingCalendar";

jest.mock("@/lib/db/models", () => ({
  __esModule: true,
  default: {
    Booking: {
      findAll: jest.fn(),
    },
    CalendarEvent: {
      findAll: jest.fn(),
    },
    DynamicConfig: {
      findOne: jest.fn(),
    },
    Transaction: {},
    User: {},
  },
}));

function buildBookingRecord(overrides = {}) {
  const state = {
    id: 15,
    bookingCode: null,
    date: "2026-07-03",
    slot: 3,
    startTime: "17:00",
    duration: 2,
    status: "CONFIRMED",
    total: "1350.00",
    propertyDetails: {
      type: "Villa/Townhouse",
      size: "4BR",
      community: "Dubai Hills",
    },
    shootDetails: {
      services: ["Photography", "Videography"],
      videographySubService: "Daylight + Night",
    },
    user: {
      id: 7,
      fullName: "Ava Agent",
      email: "ava@example.com",
      phone: "+971500000000",
    },
    transaction: {
      id: 99,
      amount: "1350.00",
      status: "success",
      invoiceNumber: "MW-2026-0703-004",
    },
    createdAt: new Date("2026-07-01T10:00:00.000Z"),
    ...overrides,
  };

  return {
    ...state,
    get: jest.fn(({ plain } = {}) => (plain ? { ...state } : { ...state })),
  };
}

function buildEventRecord(overrides = {}) {
  const state = {
    id: 5,
    title: "Owner hold",
    description: "Waiting for confirmation",
    businessDate: "2026-07-02",
    period: "afternoon",
    startTime: "13:00",
    endTime: "16:00",
    consumesCapacity: true,
    reservedCapacityUnits: "2.50",
    status: "ACTIVE",
    propertySummary: { label: "Palm Jumeirah penthouse" },
    contactSummary: { name: "Property manager" },
    createdByUser: {
      id: 11,
      fullName: "Calendar Admin",
      email: "calendar@example.com",
    },
    updatedByUser: {
      id: 11,
      fullName: "Calendar Admin",
      email: "calendar@example.com",
    },
    cancelledAt: null,
    cancellationReason: null,
    createdAt: new Date("2026-07-01T09:00:00.000Z"),
    ...overrides,
  };

  return {
    ...state,
    get: jest.fn(({ plain } = {}) => (plain ? { ...state } : { ...state })),
  };
}

describe("adminSchedulingCalendar service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns bookings, events, and effective block metadata for a bounded range", async () => {
    models.DynamicConfig.findOne.mockResolvedValue({
      value: {
        weeklyRules: {
          Friday: [{ period: "evening", isActive: false }],
        },
        dateOverrides: {
          "2026-07-02": {
            blocks: {
              afternoon: "blocked",
            },
            timeBlocks: [
              {
                startTime: "10:00",
                endTime: "10:30",
              },
            ],
          },
        },
        systemSettings: {
          workingDays: {
            Sunday: false,
          },
        },
      },
    });
    models.Booking.findAll.mockResolvedValue([buildBookingRecord()]);
    models.CalendarEvent.findAll.mockResolvedValue([buildEventRecord()]);

    const result = await listAdminSchedulingCalendarRange({
      startDate: "2026-07-02",
      endDate: "2026-07-05",
    });

    expect(models.Booking.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          date: {
            [Op.between]: ["2026-07-02", "2026-07-05"],
          },
          status: {
            [Op.in]: ["DRAFT", "CONFIRMED", "COMPLETED", "CANCELLED"],
          },
        },
      }),
    );
    expect(models.CalendarEvent.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          businessDate: {
            [Op.between]: ["2026-07-02", "2026-07-05"],
          },
          status: {
            [Op.in]: ["ACTIVE", "CANCELLED"],
          },
        },
      }),
    );
    expect(result.range).toEqual({
      startDate: "2026-07-02",
      endDate: "2026-07-05",
      dayCount: 4,
    });
    expect(result.bookings[0]).toEqual(
      expect.objectContaining({
        bookingCode: "MWB-1015",
        date: "2026-07-03",
        status: "CONFIRMED",
        amount: 1350,
        customer: expect.objectContaining({
          fullName: "Ava Agent",
        }),
        property: expect.objectContaining({
          label: "Villa/Townhouse - 4BR",
        }),
        service: expect.objectContaining({
          label: "Photography, Videography (Daylight + Night)",
        }),
        slot: expect.objectContaining({
          startPeriod: "evening",
          blockedPeriods: ["afternoon", "evening"],
        }),
      }),
    );
    expect(result.events[0]).toEqual(
      expect.objectContaining({
        title: "Owner hold",
        date: "2026-07-02",
        isAllDay: false,
        consumesCapacity: false,
        reservedCapacityUnits: 0,
      }),
    );
    expect(result.days).toEqual([
      expect.objectContaining({
        date: "2026-07-02",
        dayName: "Thursday",
        isWorkingDay: true,
        block: expect.objectContaining({
          fullDayBlocked: false,
          blockedPeriods: ["afternoon"],
          blockedTimeRanges: [{ startTime: "10:00", endTime: "10:30" }],
        }),
        counts: {
          bookings: 0,
          events: 1,
          activeEvents: 1,
          capacityConsumingEvents: 0,
        },
      }),
      expect.objectContaining({
        date: "2026-07-03",
        dayName: "Friday",
        isWorkingDay: true,
        block: expect.objectContaining({
          fullDayBlocked: false,
          blockedPeriods: ["evening"],
          blockedTimeRanges: [],
        }),
        counts: {
          bookings: 1,
          events: 0,
          activeEvents: 0,
          capacityConsumingEvents: 0,
        },
      }),
      expect.objectContaining({
        date: "2026-07-04",
        dayName: "Saturday",
        isWorkingDay: true,
        block: expect.objectContaining({
          fullDayBlocked: false,
          blockedPeriods: [],
          blockedTimeRanges: [],
        }),
      }),
      expect.objectContaining({
        date: "2026-07-05",
        dayName: "Sunday",
        isWorkingDay: false,
        block: expect.objectContaining({
          fullDayBlocked: true,
          blockedPeriods: ["morning", "afternoon", "evening"],
          blockedTimeRanges: [],
        }),
      }),
    ]);
    expect(result.summary).toEqual({
      totalBookings: 1,
      totalEvents: 1,
      totalActiveEvents: 1,
      totalCapacityConsumingEvents: 0,
      totalFullyBlockedDays: 1,
      totalPartiallyBlockedDays: 2,
    });
  });

  it("rejects invalid or oversized ranges", async () => {
    await expect(
      listAdminSchedulingCalendarRange({
        startDate: "2026-07-01",
        endDate: "2026-06-30",
      }),
    ).rejects.toThrow(
      "Calendar range endDate must be on or after Calendar range startDate",
    );

    await expect(
      listAdminSchedulingCalendarRange({
        startDate: "2026-07-01",
        endDate: "2026-11-10",
      }),
    ).rejects.toThrow("Calendar range must be 124 days or fewer");

    expect(models.DynamicConfig.findOne).not.toHaveBeenCalled();
    expect(models.Booking.findAll).not.toHaveBeenCalled();
    expect(models.CalendarEvent.findAll).not.toHaveBeenCalled();
  });
});
