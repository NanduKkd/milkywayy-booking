import {
  enumerateDateRange,
  getBlockedSlotTimesForDate,
  getEffectiveBlockForDate,
  getRollingWindowBounds,
  isDateOutsideRollingWindow,
  normalizeTimeSlotConfig,
} from "../schedulingAvailability";

describe("schedulingAvailability", () => {
  it("normalizes versioned and legacy time slot configs with shared defaults", () => {
    expect(
      normalizeTimeSlotConfig({
        systemSettings: {
          workingDays: { Sunday: true },
        },
      }),
    ).toEqual(
      expect.objectContaining({
        version: 2,
        weeklyRules: {},
        dateOverrides: {},
        slotRules: [],
        systemSettings: expect.objectContaining({
          slotCapacity: 6,
          workingDays: expect.objectContaining({
            Monday: true,
            Sunday: true,
          }),
          blockDefinitions: expect.objectContaining({
            morning: expect.objectContaining({
              startTime: "09:00",
            }),
          }),
        }),
      }),
    );

    expect(
      normalizeTimeSlotConfig({
        Monday: [{ period: "morning", isActive: false }],
      }),
    ).toEqual(
      expect.objectContaining({
        weeklyRules: {
          Monday: [{ period: "morning", isActive: false }],
        },
      }),
    );
  });

  it("evaluates effective blocks using working-day, weekly, and date override precedence", () => {
    const config = normalizeTimeSlotConfig({
      weeklyRules: {
        Friday: [{ period: "evening", isActive: false }],
      },
      dateOverrides: {
        "2026-07-03": {
          blocks: {
            morning: "blocked",
          },
        },
        "2026-07-05": {
          fullDayBlocked: true,
        },
      },
    });

    expect(getEffectiveBlockForDate("2026-07-03", config)).toEqual(
      expect.objectContaining({
        dayName: "Friday",
        isWorkingDay: true,
        fullDayBlocked: false,
        blockedPeriods: ["morning", "evening"],
      }),
    );

    expect(getEffectiveBlockForDate("2026-07-05", config)).toEqual(
      expect.objectContaining({
        dayName: "Sunday",
        isWorkingDay: false,
        fullDayBlocked: true,
        blockedPeriods: ["morning", "afternoon", "evening"],
      }),
    );
  });

  it("expands blocked periods into hourly customer slot blocks", () => {
    const blockedSlots = getBlockedSlotTimesForDate("2026-07-03", {
      dateOverrides: {
        "2026-07-03": {
          blocks: {
            afternoon: "blocked",
          },
        },
      },
    });

    expect([...blockedSlots]).toEqual([
      "13:00",
      "13:30",
      "14:00",
      "14:30",
      "15:00",
      "15:30",
    ]);
  });

  it("shares date range and rolling-window calculations", () => {
    expect(enumerateDateRange("2026-07-01", "2026-07-03")).toEqual([
      "2026-07-01",
      "2026-07-02",
      "2026-07-03",
    ]);

    const bounds = getRollingWindowBounds(
      {
        systemSettings: {
          rollingWindowDays: 3,
        },
      },
      new Date("2026-07-02T10:30:00.000Z"),
    );

    expect(bounds).toEqual({
      minDate: "2026-07-02",
      maxDate: "2026-07-04",
      rollingWindowDays: 3,
    });
    expect(
      isDateOutsideRollingWindow(
        "2026-07-01",
        {
          systemSettings: {
            rollingWindowDays: 3,
          },
        },
        new Date("2026-07-02T10:30:00.000Z"),
      ),
    ).toBe(true);
    expect(
      isDateOutsideRollingWindow(
        "2026-07-04",
        {
          systemSettings: {
            rollingWindowDays: 3,
          },
        },
        new Date("2026-07-02T10:30:00.000Z"),
      ),
    ).toBe(false);
  });
});
