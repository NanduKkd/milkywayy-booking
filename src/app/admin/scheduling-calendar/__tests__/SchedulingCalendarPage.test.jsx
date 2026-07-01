import { fireEvent, render, screen, waitFor } from "@/test-utils";
import SchedulingCalendarPage from "../SchedulingCalendarPage";

const julyPayload = {
  range: {
    startDate: "2026-07-01",
    endDate: "2026-07-31",
    dayCount: 31,
  },
  summary: {
    totalBookings: 1,
    totalEvents: 2,
    totalActiveEvents: 1,
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

describe("SchedulingCalendarPage", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-07-15T08:00:00.000Z"));
    global.fetch = jest.fn((input) => {
      const url = String(input);

      if (url.includes("start=2026-07-01") && url.includes("end=2026-07-31")) {
        return Promise.resolve({
          ok: true,
          json: async () => julyPayload,
        });
      }

      if (url.includes("start=2026-08-01") && url.includes("end=2026-08-31")) {
        return Promise.resolve({
          ok: true,
          json: async () => augustPayload,
        });
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

    expect(await screen.findByText("MWB-1015")).toBeInTheDocument();
    expect(screen.getByText("Ava Agent")).toBeInTheDocument();
    expect(
      screen.getByText("Photography, Videography (Daylight + Night)"),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: /Thursday, July 2, 2026\..*1 active event/i,
      }),
    );

    expect(await screen.findByText("Owner hold")).toBeInTheDocument();
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
});
