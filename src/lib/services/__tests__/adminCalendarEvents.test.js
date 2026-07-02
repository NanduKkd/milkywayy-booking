import { sequelize } from "@/lib/db/db";
import models from "@/lib/db/models";
import {
  cancelCalendarEvent,
  createCalendarEvent,
  restoreCalendarEvent,
  updateCalendarEvent,
} from "../adminCalendarEvents";

const mockTransaction = {
  LOCK: {
    UPDATE: "UPDATE",
  },
};

jest.mock("@/lib/db/db", () => ({
  sequelize: {
    transaction: jest.fn((callback) => callback(mockTransaction)),
  },
}));

jest.mock("@/lib/db/models", () => ({
  __esModule: true,
  default: {
    User: {},
    CalendarEvent: {
      create: jest.fn(),
      findByPk: jest.fn(),
    },
  },
}));

jest.mock("../schedulingConflictRevalidation", () => ({
  SchedulingConflictError: class SchedulingConflictError extends Error {
    constructor(message, details = {}) {
      super(message);
      this.name = "SchedulingConflictError";
      Object.assign(this, details);
    }
  },
}));

function buildHydratedEvent(overrides = {}) {
  const state = {
    id: 15,
    title: "Owner hold",
    description: "Waiting for confirmation",
    businessDate: "2099-07-08",
    period: "afternoon",
    startTime: "13:00",
    endTime: "16:00",
    propertySummary: { label: "Palm Jumeirah penthouse" },
    contactSummary: { label: "Property manager" },
    consumesCapacity: false,
    reservedCapacityUnits: "0.00",
    status: "ACTIVE",
    createdByUserId: 4,
    updatedByUserId: 4,
    cancelledByUserId: null,
    cancelledAt: null,
    cancellationReason: null,
    createdByUser: {
      id: 4,
      fullName: "Schedule Admin",
      email: "admin@example.com",
    },
    updatedByUser: {
      id: 4,
      fullName: "Schedule Admin",
      email: "admin@example.com",
    },
    cancelledByUser: null,
    save: jest.fn(async () => hydratedEvent),
    get: jest.fn(({ plain } = {}) => (plain ? { ...state } : { ...state })),
    ...overrides,
  };

  const hydratedEvent = state;
  hydratedEvent.save.mockImplementation(async () => hydratedEvent);
  hydratedEvent.get.mockImplementation(({ plain } = {}) =>
    plain ? { ...hydratedEvent } : { ...hydratedEvent },
  );

  return hydratedEvent;
}

describe("adminCalendarEvents service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates an all-day informational event without capacity reservations", async () => {
    const createdEvent = buildHydratedEvent({
      period: null,
      startTime: null,
      endTime: null,
    });
    models.CalendarEvent.create.mockResolvedValue({ id: 15 });
    models.CalendarEvent.findByPk.mockResolvedValue(createdEvent);

    const result = await createCalendarEvent({
      actorUser: { id: 4, role: "SUPERADMIN" },
      input: {
        title: "Owner hold",
        description: "Waiting for confirmation",
        date: "2099-07-08",
        allDay: true,
        propertySummary: { label: "Palm Jumeirah penthouse" },
        contactSummary: { label: "Property manager" },
      },
    });

    expect(models.CalendarEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Owner hold",
        period: null,
        startTime: null,
        endTime: null,
        consumesCapacity: false,
        reservedCapacityUnits: "0.00",
        createdByUserId: 4,
        updatedByUserId: 4,
      }),
      { transaction: mockTransaction },
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 15,
        title: "Owner hold",
        isAllDay: true,
        reservedCapacityUnits: 0,
      }),
    );
  });

  it("updates an active event to a timed informational entry", async () => {
    const event = buildHydratedEvent({
      period: null,
      startTime: null,
      endTime: null,
    });
    models.CalendarEvent.findByPk
      .mockResolvedValueOnce(event)
      .mockResolvedValueOnce(
        buildHydratedEvent({
          title: "Updated hold",
          startTime: "10:00",
          endTime: "11:00",
          period: "morning",
        }),
      );

    const result = await updateCalendarEvent({
      actorUser: { id: 7, role: "SUPERADMIN" },
      eventId: 15,
      input: {
        title: "Updated hold",
        allDay: false,
        startTime: "10:00",
        endTime: "11:00",
      },
    });

    expect(event.title).toBe("Updated hold");
    expect(event.startTime).toBe("10:00");
    expect(event.endTime).toBe("11:00");
    expect(event.period).toBe("morning");
    expect(event.reservedCapacityUnits).toBe("0.00");
    expect(event.updatedByUserId).toBe(7);
    expect(event.save).toHaveBeenCalledWith({ transaction: mockTransaction });
    expect(result.title).toBe("Updated hold");
  });

  it("cancels and restores a future event with audit fields", async () => {
    const event = buildHydratedEvent();
    models.CalendarEvent.findByPk
      .mockResolvedValueOnce(event)
      .mockResolvedValueOnce(
        buildHydratedEvent({
          status: "CANCELLED",
          cancelledByUser: {
            id: 9,
            fullName: "Shift Lead",
            email: "lead@example.com",
          },
          cancelledByUserId: 9,
          cancellationReason: "Client asked to hold",
          cancelledAt: new Date("2099-07-02T10:00:00.000Z"),
        }),
      )
      .mockResolvedValueOnce(
        buildHydratedEvent({
          status: "CANCELLED",
          cancelledByUserId: 9,
          cancelledAt: new Date("2099-07-02T10:00:00.000Z"),
          cancellationReason: "Client asked to hold",
        }),
      )
      .mockResolvedValueOnce(buildHydratedEvent());

    const cancelledResult = await cancelCalendarEvent({
      actorUser: { id: 9, role: "SUPERADMIN" },
      eventId: 15,
      cancellationReason: "Client asked to hold",
    });
    const restoredResult = await restoreCalendarEvent({
      actorUser: { id: 4, role: "SUPERADMIN" },
      eventId: 15,
    });

    expect(cancelledResult.status).toBe("CANCELLED");
    expect(restoredResult.status).toBe("ACTIVE");
  });

  it("rejects invalid event inputs before hitting the database", async () => {
    await expect(
      createCalendarEvent({
        actorUser: { id: 4, role: "SUPERADMIN" },
        input: {
          title: "",
          date: "2099-07-08",
          allDay: true,
        },
      }),
    ).rejects.toThrow("Calendar event title is required");

    expect(models.CalendarEvent.create).not.toHaveBeenCalled();
  });

  it("rejects mutations for past events", async () => {
    const pastEvent = buildHydratedEvent({
      businessDate: "2026-07-01",
    });
    models.CalendarEvent.findByPk.mockResolvedValue(pastEvent);

    await expect(
      cancelCalendarEvent({
        actorUser: { id: 4, role: "SUPERADMIN" },
        eventId: 15,
      }),
    ).rejects.toThrow("Past calendar events are read-only");
  });

  it("rejects unauthorized actors", async () => {
    await expect(
      createCalendarEvent({
        actorUser: { id: 4, role: "CUSTOMER" },
        input: {
          title: "Owner hold",
          date: "2099-07-08",
          allDay: true,
        },
      }),
    ).rejects.toThrow(
      "Unauthorized: Scheduling calendar admin access required",
    );

    expect(sequelize.transaction).not.toHaveBeenCalled();
  });
});
