import { act, fireEvent, render, screen, waitFor, within } from "@/test-utils";
import SchedulingCalendarPage from "../SchedulingCalendarPage";

const baseTimeSlotsConfig = {
  version: 2,
  weeklyRules: {},
  dateOverrides: {},
  slotRules: [],
  systemSettings: {
    rollingWindowDays: 90,
    workingDays: {},
    blockDefinitions: {
      morning: { startTime: "09:00", endTime: "12:00" },
      afternoon: { startTime: "13:00", endTime: "16:00" },
      evening: { startTime: "17:00", endTime: "20:00" },
    },
  },
};

const julyPayload = {
  range: {
    startDate: "2026-07-01",
    endDate: "2026-07-31",
    dayCount: 31,
  },
  summary: {
    totalBookings: 2,
    totalEvents: 2,
    totalActiveEvents: 2,
    totalCapacityConsumingEvents: 1,
    totalFullyBlockedDays: 1,
    totalPartiallyBlockedDays: 1,
  },
  days: Array.from({ length: 31 }, (_, index) => {
    const day = index + 1;
    const date = `2026-07-${String(day).padStart(2, "0")}`;

    return {
      date,
      dayName: ["Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][
        index % 5
      ],
      isWorkingDay: day !== 5,
      block:
        day === 2
          ? {
              fullDayBlocked: false,
              blockedPeriods: ["afternoon"],
              blockDefinitions: {},
            }
          : day === 5
            ? {
                fullDayBlocked: true,
                blockedPeriods: ["morning", "afternoon", "evening"],
                blockDefinitions: {},
              }
            : {
                fullDayBlocked: false,
                blockedPeriods: [],
                blockDefinitions: {},
              },
      counts:
        day === 2
          ? {
              bookings: 0,
              events: 1,
              activeEvents: 1,
              capacityConsumingEvents: 1,
            }
          : day === 3
            ? {
                bookings: 1,
                events: 0,
                activeEvents: 0,
                capacityConsumingEvents: 0,
              }
            : {
                bookings: 0,
                events: 0,
                activeEvents: 0,
                capacityConsumingEvents: 0,
              },
    };
  }),
  bookings: [
    {
      id: 15,
      bookingCode: "MWB-1015",
      date: "2026-07-03",
      status: "CONFIRMED",
      amount: 1350,
      paymentStatus: "success",
      customer: {
        id: 7,
        fullName: "Ava Agent",
        email: "ava@example.com",
        phone: "+971500000000",
      },
      property: {
        type: "Villa/Townhouse",
        size: "4BR",
        community: "Dubai Hills",
        label: "Villa/Townhouse - 4BR",
      },
      service: {
        services: ["Photography", "Videography"],
        videographySelections: ["Daylight + Night"],
        label: "Photography, Videography (Daylight + Night)",
      },
      slot: {
        startTime: "17:00",
        durationHours: 2,
        startPeriod: "evening",
        blockedPeriods: ["afternoon", "evening"],
        label: "Twilight",
        arrivalWindow: "16:30 - 17:00",
      },
    },
    {
      id: 20,
      bookingCode: "MWB-1020",
      date: "2026-07-20",
      status: "DRAFT",
      amount: 950,
      paymentStatus: null,
      customer: {
        id: 8,
        fullName: "Noah Navigator",
        email: "noah@example.com",
        phone: "+971511111111",
      },
      property: {
        type: "Apartment",
        size: "2BR",
        community: "Dubai Marina",
        label: "Apartment - 2BR",
      },
      service: {
        services: ["Photography"],
        videographySelections: [],
        label: "Photography",
      },
      slot: {
        startTime: "09:00",
        durationHours: 1,
        startPeriod: "morning",
        blockedPeriods: ["morning"],
        label: "Morning",
        arrivalWindow: "08:30 - 09:00",
      },
    },
  ],
  events: [
    {
      id: 5,
      title: "Owner hold",
      description: "Waiting for confirmation",
      date: "2026-07-02",
      status: "ACTIVE",
      period: "afternoon",
      startTime: "13:00",
      endTime: "16:00",
      consumesCapacity: true,
      reservedCapacityUnits: 2.5,
      propertySummary: {
        label: "Palm Jumeirah penthouse",
      },
      contactSummary: null,
      createdByUser: null,
      updatedByUser: null,
      cancelledAt: null,
      cancellationReason: null,
    },
    {
      id: 6,
      title: "Team briefing",
      description: "Prep before the shoot",
      date: "2026-07-22",
      status: "ACTIVE",
      period: "morning",
      startTime: "10:00",
      endTime: "11:00",
      consumesCapacity: false,
      reservedCapacityUnits: 0,
      propertySummary: {
        label: "Office",
      },
      contactSummary: null,
      createdByUser: null,
      updatedByUser: null,
      cancelledAt: null,
      cancellationReason: null,
    },
  ],
};

const augustPayload = {
  ...julyPayload,
  range: {
    startDate: "2026-08-01",
    endDate: "2026-08-31",
    dayCount: 31,
  },
  summary: {
    totalBookings: 0,
    totalEvents: 0,
    totalActiveEvents: 0,
    totalCapacityConsumingEvents: 0,
    totalFullyBlockedDays: 0,
    totalPartiallyBlockedDays: 0,
  },
  days: Array.from({ length: 31 }, (_, index) => ({
    date: `2026-08-${String(index + 1).padStart(2, "0")}`,
    dayName: "Monday",
    isWorkingDay: true,
    block: {
      fullDayBlocked: false,
      blockedPeriods: [],
      blockDefinitions: {},
    },
    counts: {
      bookings: 0,
      events: 0,
      activeEvents: 0,
      capacityConsumingEvents: 0,
    },
  })),
  bookings: [],
  events: [],
};

function clonePayload(payload) {
  return JSON.parse(JSON.stringify(payload));
}

function recalculateCalendarPayload(payload) {
  const nextPayload = clonePayload(payload);

  nextPayload.days = nextPayload.days.map((day) => {
    const dayEvents = nextPayload.events.filter(
      (event) => event.date === day.date,
    );

    return {
      ...day,
      counts: {
        ...day.counts,
        events: dayEvents.length,
        activeEvents: dayEvents.filter((event) => event.status === "ACTIVE")
          .length,
        capacityConsumingEvents: dayEvents.filter(
          (event) => event.status === "ACTIVE" && event.consumesCapacity,
        ).length,
      },
    };
  });

  nextPayload.summary = {
    ...nextPayload.summary,
    totalEvents: nextPayload.events.length,
    totalActiveEvents: nextPayload.events.filter(
      (event) => event.status === "ACTIVE",
    ).length,
    totalCapacityConsumingEvents: nextPayload.events.filter(
      (event) => event.status === "ACTIVE" && event.consumesCapacity,
    ).length,
  };

  return nextPayload;
}

describe("SchedulingCalendarPage", () => {
  let timeSlotPutBodies;
  let currentJulyPayload;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-07-15T08:00:00.000Z"));
    timeSlotPutBodies = [];
    currentJulyPayload = clonePayload(julyPayload);
    global.fetch = jest.fn((input, init) => {
      const url = String(input);

      if (url.includes("start=2026-07-01") && url.includes("end=2026-07-31")) {
        if (url.includes("/api/admin/timeslots")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ config: baseTimeSlotsConfig }),
          });
        }

        return Promise.resolve({
          ok: true,
          json: async () => recalculateCalendarPayload(currentJulyPayload),
        });
      }

      if (url.includes("start=2026-08-01") && url.includes("end=2026-08-31")) {
        return Promise.resolve({
          ok: true,
          json: async () => augustPayload,
        });
      }

      if (url === "/api/admin/timeslots") {
        const body = JSON.parse(init?.body || "{}");
        timeSlotPutBodies.push(body);

        if (body.allowConflictOverride === true) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ success: true }),
          });
        }

        return Promise.resolve({
          ok: false,
          status: 409,
          json: async () => ({
            error: "Conflict",
            reasonCode: "schedule_conflict_existing_records",
            conflicts: [
              {
                date: "2026-07-03",
                blockedPeriods: ["morning", "afternoon", "evening"],
                bookings: [
                  {
                    id: 15,
                    bookingCode: "MWB-1015",
                    periods: ["afternoon", "evening"],
                  },
                ],
                events: [],
              },
            ],
          }),
        });
      }

      if (url === "/api/admin/scheduling-calendar/events") {
        const body = JSON.parse(init?.body || "{}");
        const newEvent = {
          id: 99,
          title: body.title,
          description: body.description || "",
          date: body.date,
          status: "ACTIVE",
          period: body.period || "afternoon",
          startTime: body.startTime || null,
          endTime: body.endTime || null,
          consumesCapacity: Boolean(body.consumesCapacity),
          reservedCapacityUnits: body.consumesCapacity
            ? Number(body.reservedCapacityUnits || 1)
            : 0,
          propertySummary: body.propertySummary || null,
          contactSummary: body.contactSummary || null,
          createdByUser: null,
          updatedByUser: null,
          cancelledByUser: null,
          cancelledAt: null,
          cancellationReason: null,
        };

        currentJulyPayload.events.push(newEvent);

        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => newEvent,
        });
      }

      if (url === "/api/admin/scheduling-calendar/events/99") {
        const method = init?.method;
        const body = JSON.parse(init?.body || "{}");
        const existingEvent = currentJulyPayload.events.find(
          (event) => event.id === 99,
        );

        if (method === "PUT") {
          Object.assign(existingEvent, {
            title: body.title,
            description: body.description || "",
            date: body.date,
            period: body.period || "afternoon",
            startTime: body.startTime || null,
            endTime: body.endTime || null,
            consumesCapacity: Boolean(body.consumesCapacity),
            reservedCapacityUnits: body.consumesCapacity
              ? Number(body.reservedCapacityUnits || 1)
              : 0,
            propertySummary: body.propertySummary || null,
            contactSummary: body.contactSummary || null,
          });

          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => existingEvent,
          });
        }

        if (method === "PATCH" && body.action === "cancel") {
          Object.assign(existingEvent, {
            status: "CANCELLED",
            cancelledAt: "2026-07-15T08:30:00.000Z",
            cancellationReason: null,
          });

          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => existingEvent,
          });
        }

        if (method === "PATCH" && body.action === "restore") {
          Object.assign(existingEvent, {
            status: "ACTIVE",
            cancelledAt: null,
            cancellationReason: null,
          });

          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => existingEvent,
          });
        }
      }

      return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("renders the month grid, legend, and selected-day details from live API data", async () => {
    render(<SchedulingCalendarPage />);

    expect(
      await screen.findByRole("heading", { name: /Scheduling Calendar/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("July 2026")).toBeInTheDocument();
    expect(screen.getByText(/Calendar legend/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: /Friday, July 3, 2026\..*1 booking/i,
        }),
      ).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: /Friday, July 3, 2026\..*1 booking/i,
      }),
    );

    expect(await screen.findAllByText("MWB-1015")).toHaveLength(2);
    expect(screen.getAllByText("Ava Agent")).toHaveLength(2);
    expect(
      screen.getByText("Photography, Videography (Daylight + Night)"),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: /Thursday, July 2, 2026\..*1 active event/i,
      }),
    );

    expect(await screen.findAllByText("Owner hold")).toHaveLength(2);
    expect(screen.getByText("Waiting for confirmation")).toBeInTheDocument();
    expect(screen.getByText(/Reserves 2.5 capacity/i)).toBeInTheDocument();
  });

  it("navigates months and refetches the bounded range", async () => {
    render(<SchedulingCalendarPage />);

    expect(await screen.findByText("July 2026")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: /Next month/i,
      }),
    );

    expect(await screen.findByText("August 2026")).toBeInTheDocument();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/scheduling-calendar?start=2026-08-01&end=2026-08-31",
        expect.objectContaining({
          method: "GET",
        }),
      );
    });
  });

  it("keeps the upcoming schedule table bounded to the selected range and filters row types", async () => {
    render(<SchedulingCalendarPage />);

    expect(
      await screen.findByRole("heading", { name: /Upcoming schedule/i }),
    ).toBeInTheDocument();

    const upcomingTable = screen.getByRole("table", {
      name: /Upcoming schedule/i,
    });

    await waitFor(() => {
      expect(within(upcomingTable).getByText("MWB-1020")).toBeInTheDocument();
    });

    expect(
      within(upcomingTable).getByText("Team briefing"),
    ).toBeInTheDocument();
    expect(
      within(upcomingTable).queryByText("MWB-1015"),
    ).not.toBeInTheDocument();
    expect(
      within(upcomingTable).queryByText("Owner hold"),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Events \(1\)/i }));

    expect(
      within(upcomingTable).queryByText("MWB-1020"),
    ).not.toBeInTheDocument();
    expect(
      within(upcomingTable).getByText("Team briefing"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /All \(2\)/i }));
    fireEvent.click(
      within(upcomingTable).getAllByRole("button", { name: /View day/i })[1],
    );

    expect(
      await screen.findByRole("heading", {
        name: /Wednesday, July 22, 2026/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Prep before the shoot")).toBeInTheDocument();
  });

  it("bounds selected-day navigation to the loaded month range", async () => {
    render(<SchedulingCalendarPage />);

    expect(
      await screen.findByRole("heading", { name: /Scheduling Calendar/i }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", {
        name: /Friday, July 3, 2026\..*1 booking/i,
      }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: /Wednesday, July 1, 2026/i,
      }),
    );

    expect(
      await screen.findByRole("heading", {
        name: /Wednesday, July 1, 2026/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Previous date/i }),
    ).toBeDisabled();

    fireEvent.click(
      screen.getByRole("button", {
        name: /Thursday, July 30, 2026/i,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Next date/i }));

    expect(
      await screen.findByRole("heading", {
        name: /Friday, July 31, 2026/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Next date/i })).toBeDisabled();
  });

  it("warns before saving a conflicting block and supports an explicit override", async () => {
    render(<SchedulingCalendarPage />);

    expect(
      await screen.findByRole("heading", { name: /Scheduling Calendar/i }),
    ).toBeInTheDocument();

    expect(
      await screen.findByRole("button", {
        name: /Friday, July 3, 2026\..*1 booking/i,
      }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: /Friday, July 3, 2026\..*1 booking/i,
      }),
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /Block full day/i,
      }),
    );

    const conflictDialog = await screen.findByRole("dialog", {
      name: /Review block conflict/i,
    });
    expect(conflictDialog).toBeInTheDocument();
    expect(
      within(conflictDialog).getAllByText("MWB-1015").length,
    ).toBeGreaterThan(0);
    expect(
      within(conflictDialog).getByText("Afternoon, Evening"),
    ).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", {
          name: /Save block anyway/i,
        }),
      );
    });

    await waitFor(() => {
      expect(timeSlotPutBodies).toHaveLength(2);
    });

    expect(timeSlotPutBodies[0]).toMatchObject({
      allowConflictOverride: false,
      timeSlots: expect.objectContaining({
        dateOverrides: expect.objectContaining({
          "2026-07-03": expect.objectContaining({
            fullDayBlocked: true,
          }),
        }),
      }),
    });
    expect(timeSlotPutBodies[1]).toMatchObject({
      allowConflictOverride: true,
    });

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: /Review block conflict/i }),
      ).not.toBeInTheDocument();
    });
  });

  it("creates, edits, cancels, and restores a calendar-only event from the selected day", async () => {
    render(<SchedulingCalendarPage />);

    expect(
      await screen.findByRole("heading", { name: /Scheduling Calendar/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Create event/i }));

    const createDialog = await screen.findByRole("dialog", {
      name: /Create calendar event/i,
    });

    fireEvent.change(within(createDialog).getByLabelText("Title"), {
      target: { value: "Walkthrough hold" },
    });
    fireEvent.change(within(createDialog).getByLabelText("Property summary"), {
      target: { value: "Dubai Hills villa" },
    });
    fireEvent.click(
      within(createDialog).getByLabelText("Reserve scheduling capacity"),
    );
    fireEvent.change(
      within(createDialog).getByLabelText("Reserved capacity units"),
      {
        target: { value: "1.5" },
      },
    );

    fireEvent.click(
      within(createDialog).getByRole("button", { name: /Create event/i }),
    );

    expect(await screen.findAllByText("Walkthrough hold")).toHaveLength(2);
    expect(screen.getByText(/Reserves 1.5 capacity/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Edit event/i }));

    const editDialog = await screen.findByRole("dialog", {
      name: /Edit calendar event/i,
    });
    fireEvent.change(within(editDialog).getByLabelText("Title"), {
      target: { value: "Updated walkthrough hold" },
    });

    fireEvent.click(
      within(editDialog).getByRole("button", { name: /Save changes/i }),
    );

    expect(await screen.findAllByText("Updated walkthrough hold")).toHaveLength(
      2,
    );

    fireEvent.click(screen.getByRole("button", { name: /Cancel event/i }));

    expect(await screen.findByText("Capacity released")).toBeInTheDocument();
    expect(screen.getAllByText("CANCELLED")).not.toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: /Restore event/i }));

    await waitFor(() => {
      expect(screen.queryByText("Capacity released")).not.toBeInTheDocument();
    });
    expect(screen.getAllByText("ACTIVE")).not.toHaveLength(0);
  });
});
