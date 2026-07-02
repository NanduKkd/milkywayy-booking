import { Op } from "sequelize";
import { sequelize } from "../../../../../lib/db/db";
import Booking from "../../../../../lib/db/models/booking";
import CalendarEvent from "../../../../../lib/db/models/calendarevent";
import DynamicConfig from "../../../../../lib/db/models/dynamicconfig";
import { auth } from "../../../../../lib/helpers/auth";
import { GET, PUT } from "../route";

const mockTransaction = {
  LOCK: {
    UPDATE: "UPDATE",
  },
};

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200,
    })),
  },
}));

jest.mock("../../../../../lib/db/models/booking", () => ({
  findAll: jest.fn(),
}));

jest.mock("../../../../../lib/db/models/calendarevent", () => ({
  findAll: jest.fn(),
}));

jest.mock("../../../../../lib/db/models/dynamicconfig", () => ({
  findOne: jest.fn(),
  findOrCreate: jest.fn(),
}));

jest.mock("../../../../../lib/db/models/transaction", () => ({}));

jest.mock("../../../../../lib/helpers/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("../../../../../lib/db/relations", () => ({}));

jest.mock("../../../../../lib/db/db", () => ({
  sequelize: {
    query: jest.fn(),
    transaction: jest.fn((callback) => callback(mockTransaction)),
  },
}));

describe("Admin TimeSlots API Route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auth.mockResolvedValue({ id: 1, role: "SUPERADMIN" });
    CalendarEvent.findAll.mockResolvedValue([]);
  });

  it("rejects anonymous and non-superadmin access", async () => {
    auth.mockResolvedValueOnce(null);

    const unauthorizedGetResponse = await GET({
      url: "http://localhost:3000/api/admin/timeslots",
    });

    expect(unauthorizedGetResponse.status).toBe(401);
    expect(DynamicConfig.findOne).not.toHaveBeenCalled();

    auth.mockResolvedValueOnce({ id: 2, role: "CUSTOMER" });

    const forbiddenPutResponse = await PUT({
      json: jest.fn(),
    });

    expect(forbiddenPutResponse.status).toBe(403);
    expect(DynamicConfig.findOrCreate).not.toHaveBeenCalled();
  });

  it("returns config and bookedMap with booked slots", async () => {
    DynamicConfig.findOne.mockResolvedValue({
      value: {
        version: 2,
        weeklyRules: {},
        dateOverrides: {},
        slotRules: [],
        systemSettings: {
          rollingWindowDays: 90,
          workingDays: {},
          blockDefinitions: {},
        },
      },
    });

    Booking.findAll.mockResolvedValue([
      {
        id: 1,
        bookingCode: "BK-001",
        date: "2026-02-24",
        slot: 1,
        startTime: "09:00",
        duration: 2,
        status: "CONFIRMED",
        shootDetails: { services: ["Photography"] },
        propertyDetails: { type: "Apartment", size: "2BR" },
      },
      {
        id: 2,
        bookingCode: "BK-002",
        date: "2026-02-24",
        slot: null,
        startTime: "13:00",
        duration: 1,
        status: "COMPLETED",
        shootDetails: {
          services: ["Videography"],
          videographySubService: "Long Form.Night Light",
        },
        propertyDetails: { type: "Villa/Townhouse", size: "3BR" },
      },
    ]);

    const request = {
      url: "http://localhost:3000/api/admin/timeslots?start=2026-02-01&end=2026-02-28",
    };

    const response = await GET(request);
    const data = await response.json();

    expect(data.bookedMap).toEqual({
      "2026-02-24": ["morning", "afternoon"],
    });
    expect(data.bookedDetailsMap["2026-02-24"].morning[0]).toEqual(
      expect.objectContaining({
        bookingCode: "BK-001",
        propertyLabel: "Apartment - 2BR",
        serviceLabel: "Photography",
        arrival: "09:00 - 09:30",
      }),
    );
    expect(data.bookedDetailsMap["2026-02-24"].afternoon).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          bookingCode: "BK-001",
          propertyLabel: "Apartment - 2BR",
        }),
        expect.objectContaining({
          bookingCode: "BK-002",
          propertyLabel: "Villa/Townhouse - 3BR",
        }),
      ]),
    );

    expect(Booking.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          cancelledAt: null,
          status: {
            [Op.in]: ["CONFIRMED", "COMPLETED"],
          },
          date: {
            [Op.between]: ["2026-02-01", "2026-02-28"],
          },
        }),
        attributes: [
          "id",
          "bookingCode",
          "date",
          "slot",
          "startTime",
          "duration",
          "status",
          "shootDetails",
          "propertyDetails",
        ],
      }),
    );
  });

  it("returns 500 when load fails", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    DynamicConfig.findOne.mockRejectedValue(new Error("DB error"));

    const request = { url: "http://localhost:3000/api/admin/timeslots" };
    const response = await GET(request);

    expect(response.status).toBe(500);

    consoleSpy.mockRestore();
  });

  it("includes apartment 5 bed and villa 7 bed in default weight config", async () => {
    DynamicConfig.findOne.mockResolvedValue(null);
    Booking.findAll.mockResolvedValue([]);

    const request = { url: "http://localhost:3000/api/admin/timeslots" };
    const response = await GET(request);
    const data = await response.json();

    expect(
      data.config.systemSettings.weightModel.propertyWeights.Apartment["5 Bed"],
    ).toBe(3.5);
    expect(
      data.config.systemSettings.weightModel.propertyWeights["Villa/Townhouse"][
        "7 Bed"
      ],
    ).toBe(5.5);
  });

  it("returns 409 when a new block conflicts with an existing booking", async () => {
    const existingEntry = {
      value: {
        version: 2,
        weeklyRules: {},
        dateOverrides: {},
        slotRules: [],
        systemSettings: {
          rollingWindowDays: 90,
          workingDays: {},
          blockDefinitions: {},
        },
      },
      save: jest.fn(),
    };

    DynamicConfig.findOrCreate.mockResolvedValue([existingEntry, false]);
    Booking.findAll.mockResolvedValue([
      {
        id: 1,
        bookingCode: "BK-001",
        date: "2026-07-12",
        slot: 1,
        startTime: "09:00",
        duration: 1,
        status: "CONFIRMED",
      },
    ]);

    const request = {
      json: jest.fn().mockResolvedValue({
        timeSlots: {
          version: 2,
          weeklyRules: {},
          dateOverrides: {
            "2026-07-12": {
              blocks: {
                morning: "blocked",
              },
            },
          },
          slotRules: [],
          systemSettings: {
            rollingWindowDays: 90,
            workingDays: {},
            blockDefinitions: {},
          },
        },
      }),
    };

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.reasonCode).toBe("schedule_conflict_existing_records");
    expect(data.conflicts[0].bookings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          bookingCode: "BK-001",
          date: "2026-07-12",
        }),
      ]),
    );
    expect(existingEntry.save).not.toHaveBeenCalled();
  });

  it("persists new blocks when no scheduled records conflict", async () => {
    const existingEntry = {
      value: {
        version: 2,
        weeklyRules: {},
        dateOverrides: {},
        slotRules: [],
        systemSettings: {
          rollingWindowDays: 90,
          workingDays: {},
          blockDefinitions: {},
        },
      },
      save: jest.fn(),
    };

    DynamicConfig.findOrCreate.mockResolvedValue([existingEntry, false]);
    Booking.findAll.mockResolvedValue([]);

    const request = {
      json: jest.fn().mockResolvedValue({
        timeSlots: {
          version: 2,
          weeklyRules: {},
          dateOverrides: {
            "2026-07-13": {
              fullDayBlocked: true,
            },
          },
          slotRules: [],
          systemSettings: {
            rollingWindowDays: 90,
            workingDays: {},
            blockDefinitions: {},
          },
        },
      }),
    };

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
    expect(sequelize.transaction).toHaveBeenCalledTimes(1);
    expect(existingEntry.save).toHaveBeenCalledTimes(1);
  });

  it("allows an explicit override save for conflicting blocks", async () => {
    const existingEntry = {
      value: {
        version: 2,
        weeklyRules: {},
        dateOverrides: {},
        slotRules: [],
        systemSettings: {
          rollingWindowDays: 90,
          workingDays: {},
          blockDefinitions: {},
        },
      },
      save: jest.fn(),
    };

    DynamicConfig.findOrCreate.mockResolvedValue([existingEntry, false]);
    Booking.findAll.mockResolvedValue([
      {
        id: 1,
        bookingCode: "BK-001",
        date: "2026-07-14",
        slot: 1,
        startTime: "09:00",
        duration: 1,
        status: "CONFIRMED",
      },
    ]);

    const request = {
      json: jest.fn().mockResolvedValue({
        allowConflictOverride: true,
        timeSlots: {
          version: 2,
          weeklyRules: {},
          dateOverrides: {
            "2026-07-14": {
              blocks: {
                morning: "blocked",
              },
            },
          },
          slotRules: [],
          systemSettings: {
            rollingWindowDays: 90,
            workingDays: {},
            blockDefinitions: {},
          },
        },
      }),
    };

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
    expect(existingEntry.save).toHaveBeenCalledTimes(1);
  });
});
