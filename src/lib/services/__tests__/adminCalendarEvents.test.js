import { sequelize } from "@/lib/db/db";
import models from "@/lib/db/models";
import {
  cancelCalendarEvent,
  createCalendarEvent,
  restoreCalendarEvent,
  SchedulingConflictError,
  updateCalendarEvent,
} from "../adminCalendarEvents";
import { revalidateSchedulingRequests } from "../schedulingConflictRevalidation";

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
  revalidateSchedulingRequests: jest.fn(),
}));

function buildHydratedEvent(overrides = {}) {
  const state = {
    id: 15,
    title: "Owner hold",
    description: "Waiting for confirmation",
    businessDate: "2026-07-08",
    period: "afternoon",
    startTime: "13:00",
    endTime: "16:00",
    propertySummary: { label: "Palm Jumeirah penthouse" },
    contactSummary: { label: "Property manager" },
    consumesCapacity: true,
    reservedCapacityUnits: "2.50",
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

  it("creates a capacity-consuming event after conflict revalidation", async () => {
    const createdEvent = buildHydratedEvent();
    models.CalendarEvent.create.mockResolvedValue({ id: 15 });
    models.CalendarEvent.findByPk.mockResolvedValue(createdEvent);

    const result = await createCalendarEvent({
      actorUser: { id: 4, role: "SUPERADMIN" },
      input: {
        title: "Owner hold",
        description: "Waiting for confirmation",
        date: "2026-07-08",
        period: "afternoon",
        startTime: "13:00",
        endTime: "16:00",
        propertySummary: { label: "Palm Jumeirah penthouse" },
        contactSummary: { label: "Property manager" },
        consumesCapacity: true,
        reservedCapacityUnits: "2.5",
      },
    });

    expect(revalidateSchedulingRequests).toHaveBeenCalledWith({
      dates: ["2026-07-08"],
      transaction: mockTransaction,
      requests: [
        expect.objectContaining({
          type: "event",
          date: "2026-07-08",
          period: "afternoon",
          consumesCapacity: true,
        }),
      ],
    });
    expect(models.CalendarEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Owner hold",
        consumesCapacity: true,
        reservedCapacityUnits: "2.50",
        createdByUserId: 4,
        updatedByUserId: 4,
      }),
      { transaction: mockTransaction },
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 15,
        title: "Owner hold",
        date: "2026-07-08",
        reservedCapacityUnits: 2.5,
      }),
    );
  });

  it("updates an active event and excludes the same event from revalidation", async () => {
    const event = buildHydratedEvent();
    models.CalendarEvent.findByPk
      .mockResolvedValueOnce(event)
      .mockResolvedValueOnce(
        buildHydratedEvent({
          title: "Updated hold",
          reservedCapacityUnits: "3.00",
        }),
      );

    const result = await updateCalendarEvent({
      actorUser: { id: 7, role: "SUPERADMIN" },
      eventId: 15,
      input: {
        title: "Updated hold",
        reservedCapacityUnits: "3",
      },
    });

    expect(revalidateSchedulingRequests).toHaveBeenCalledWith({
      dates: ["2026-07-08"],
      transaction: mockTransaction,
      requests: [
        expect.objectContaining({
          type: "event",
          date: "2026-07-08",
        }),
      ],
      excludeEventIds: [15],
    });
    expect(event.title).toBe("Updated hold");
    expect(event.reservedCapacityUnits).toBe("3.00");
    expect(event.updatedByUserId).toBe(7);
    expect(event.save).toHaveBeenCalledWith({ transaction: mockTransaction });
    expect(result.title).toBe("Updated hold");
  });

  it("cancels an event and records cancellation audit fields", async () => {
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
          cancelledAt: new Date("2026-07-02T10:00:00.000Z"),
        }),
      );

    const result = await cancelCalendarEvent({
      actorUser: { id: 9, role: "SUPERADMIN" },
      eventId: 15,
      cancellationReason: "Client asked to hold",
    });

    expect(revalidateSchedulingRequests).not.toHaveBeenCalled();
    expect(event.status).toBe("CANCELLED");
    expect(event.cancelledByUserId).toBe(9);
    expect(event.cancellationReason).toBe("Client asked to hold");
    expect(event.updatedByUserId).toBe(9);
    expect(result.status).toBe("CANCELLED");
    expect(result.cancellationReason).toBe("Client asked to hold");
  });

  it("restores a cancelled event only after conflict revalidation passes", async () => {
    const cancelledEvent = buildHydratedEvent({
      status: "CANCELLED",
      cancelledByUserId: 9,
      cancelledByUser: {
        id: 9,
        fullName: "Shift Lead",
        email: "lead@example.com",
      },
      cancelledAt: new Date("2026-07-02T10:00:00.000Z"),
      cancellationReason: "Client asked to hold",
    });
    models.CalendarEvent.findByPk
      .mockResolvedValueOnce(cancelledEvent)
      .mockResolvedValueOnce(buildHydratedEvent());

    const result = await restoreCalendarEvent({
      actorUser: { id: 4, role: "SUPERADMIN" },
      eventId: 15,
    });

    expect(revalidateSchedulingRequests).toHaveBeenCalledWith({
      dates: ["2026-07-08"],
      transaction: mockTransaction,
      requests: [
        expect.objectContaining({
          type: "event",
          date: "2026-07-08",
          consumesCapacity: true,
        }),
      ],
      excludeEventIds: [15],
    });
    expect(cancelledEvent.status).toBe("ACTIVE");
    expect(cancelledEvent.cancelledByUserId).toBeNull();
    expect(cancelledEvent.cancelledAt).toBeNull();
    expect(cancelledEvent.cancellationReason).toBeNull();
    expect(result.status).toBe("ACTIVE");
  });

  it("rejects invalid event inputs before hitting the database", async () => {
    await expect(
      createCalendarEvent({
        actorUser: { id: 4, role: "SUPERADMIN" },
        input: {
          title: "",
          date: "2026-07-08",
          period: "afternoon",
        },
      }),
    ).rejects.toThrow("Calendar event title is required");

    expect(revalidateSchedulingRequests).not.toHaveBeenCalled();
    expect(models.CalendarEvent.create).not.toHaveBeenCalled();
  });

  it("surfaces scheduling conflicts from restore", async () => {
    const cancelledEvent = buildHydratedEvent({
      status: "CANCELLED",
      cancelledAt: new Date("2026-07-02T10:00:00.000Z"),
      cancellationReason: "Client asked to hold",
    });
    models.CalendarEvent.findByPk.mockResolvedValue(cancelledEvent);
    revalidateSchedulingRequests.mockRejectedValue(
      new SchedulingConflictError("Conflict", {
        reasonCode: "schedule_conflict_existing_entries",
      }),
    );

    await expect(
      restoreCalendarEvent({
        actorUser: { id: 4, role: "SUPERADMIN" },
        eventId: 15,
      }),
    ).rejects.toMatchObject({
      name: "SchedulingConflictError",
      reasonCode: "schedule_conflict_existing_entries",
    });
  });

  it("rejects unauthorized actors", async () => {
    await expect(
      createCalendarEvent({
        actorUser: { id: 4, role: "CUSTOMER" },
        input: {
          title: "Owner hold",
          date: "2026-07-08",
          period: "afternoon",
        },
      }),
    ).rejects.toThrow(
      "Unauthorized: Scheduling calendar admin access required",
    );

    expect(sequelize.transaction).not.toHaveBeenCalled();
  });
});
