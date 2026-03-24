import { GET } from "../route";
import Booking from "../../../../../lib/db/models/booking";
import DynamicConfig from "../../../../../lib/db/models/dynamicconfig";
import { Op } from "sequelize";

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

jest.mock("../../../../../lib/db/models/dynamicconfig", () => ({
  findOne: jest.fn(),
  findOrCreate: jest.fn(),
}));

describe("Admin TimeSlots API Route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
