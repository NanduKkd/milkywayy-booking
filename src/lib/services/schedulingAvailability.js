export const PERIODS = ["morning", "afternoon", "evening"];

export const PERIOD_TO_HOURLY = {
  morning: ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"],
  afternoon: ["13:00", "13:30", "14:00", "14:30", "15:00", "15:30"],
  evening: ["17:00", "17:30", "18:00", "18:30", "19:00", "19:30"],
};
export const BUSINESS_DAY_START_TIME = "09:00";
export const BUSINESS_DAY_END_TIME = "20:00";
export const BUSINESS_DAY_TIME_OPTIONS = Array.from(
  { length: 23 },
  (_, index) => {
    const totalMinutes = 9 * 60 + index * 30;
    const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
    const minutes = String(totalMinutes % 60).padStart(2, "0");
    return `${hours}:${minutes}`;
  },
);

export const DEFAULT_WORKING_DAYS = {
  Monday: true,
  Tuesday: true,
  Wednesday: true,
  Thursday: true,
  Friday: true,
  Saturday: true,
  Sunday: false,
};

export const DEFAULT_BLOCK_DEFINITIONS = {
  morning: { label: "Morning", startTime: "09:00", endTime: "12:00" },
  afternoon: { label: "Afternoon", startTime: "13:00", endTime: "16:00" },
  evening: { label: "Evening", startTime: "17:00", endTime: "20:00" },
};

const DEFAULT_TIME_SLOT_CONFIG = {
  version: 2,
  weeklyRules: {},
  dateOverrides: {},
  slotRules: [],
  systemSettings: {
    rollingWindowDays: 90,
    slotCapacity: 6,
    weightModel: {},
    workingDays: DEFAULT_WORKING_DAYS,
    blockDefinitions: DEFAULT_BLOCK_DEFINITIONS,
  },
};

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function cloneDefaultConfig() {
  return {
    ...DEFAULT_TIME_SLOT_CONFIG,
    weeklyRules: {},
    dateOverrides: {},
    slotRules: [],
    systemSettings: {
      ...DEFAULT_TIME_SLOT_CONFIG.systemSettings,
      weightModel: {
        ...(DEFAULT_TIME_SLOT_CONFIG.systemSettings.weightModel || {}),
      },
      workingDays: {
        ...DEFAULT_WORKING_DAYS,
      },
      blockDefinitions: {
        ...DEFAULT_BLOCK_DEFINITIONS,
      },
    },
  };
}

function timeStringToMinutes(timeStr) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(timeStr || "").trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

function minutesToTimeString(totalMinutes) {
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const minutes = String(totalMinutes % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function isHalfHourIncrement(timeStr) {
  const minutes = timeStringToMinutes(timeStr);
  return minutes != null && minutes % 30 === 0;
}

export function normalizeBlockTimeRange(timeRange) {
  const startTime = String(timeRange?.startTime || "").trim();
  const endTime = String(timeRange?.endTime || "").trim();

  if (!isHalfHourIncrement(startTime) || !isHalfHourIncrement(endTime)) {
    return null;
  }

  const startMinutes = timeStringToMinutes(startTime);
  const endMinutes = timeStringToMinutes(endTime);
  const businessDayStart = timeStringToMinutes(BUSINESS_DAY_START_TIME);
  const businessDayEnd = timeStringToMinutes(BUSINESS_DAY_END_TIME);

  if (
    startMinutes == null ||
    endMinutes == null ||
    startMinutes < businessDayStart ||
    endMinutes > businessDayEnd ||
    endMinutes <= startMinutes
  ) {
    return null;
  }

  return {
    startTime,
    endTime,
  };
}

export function normalizeBlockTimeRanges(timeRanges) {
  const seen = new Set();

  return (Array.isArray(timeRanges) ? timeRanges : [])
    .map(normalizeBlockTimeRange)
    .filter(Boolean)
    .sort((left, right) => {
      if (left.startTime !== right.startTime) {
        return left.startTime.localeCompare(right.startTime);
      }

      return left.endTime.localeCompare(right.endTime);
    })
    .filter((timeRange) => {
      const key = `${timeRange.startTime}-${timeRange.endTime}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function expandPeriodsToSlotTimes(periods = []) {
  const blockedSlots = new Set();

  periods.forEach((period) => {
    (PERIOD_TO_HOURLY[period] || []).forEach((slot) => {
      blockedSlots.add(slot);
    });
  });

  return [...blockedSlots];
}

export function expandTimeRangeToSlotTimes(timeRange) {
  const normalizedRange = normalizeBlockTimeRange(timeRange);
  if (!normalizedRange) return [];

  const startMinutes = timeStringToMinutes(normalizedRange.startTime);
  const endMinutes = timeStringToMinutes(normalizedRange.endTime);
  const blockedSlots = [];

  for (
    let cursor = startMinutes;
    cursor != null && endMinutes != null && cursor < endMinutes;
    cursor += 30
  ) {
    blockedSlots.push(minutesToTimeString(cursor));
  }

  return blockedSlots.filter((slot) =>
    PERIODS.some((period) => (PERIOD_TO_HOURLY[period] || []).includes(slot)),
  );
}

export function parseDateOnly(dateStr) {
  const [year, month, day] = String(dateStr || "")
    .split("-")
    .map((value) => Number(value));

  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
}

export function enumerateDateRange(startDate, endDate) {
  const cursor = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  const dates = [];

  while (cursor <= end) {
    const year = cursor.getUTCFullYear();
    const month = String(cursor.getUTCMonth() + 1).padStart(2, "0");
    const day = String(cursor.getUTCDate()).padStart(2, "0");
    dates.push(`${year}-${month}-${day}`);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

export function getDayNameFromDateStr(dateStr) {
  return DAY_NAMES[parseDateOnly(dateStr).getUTCDay()];
}

export function normalizeTimeSlotConfig(value) {
  const fallback = cloneDefaultConfig();

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }

  const weekdayKeys = Object.keys(DEFAULT_WORKING_DAYS);
  const hasLegacyWeekdayRoot = weekdayKeys.some((key) =>
    Array.isArray(value[key]),
  );

  if (hasLegacyWeekdayRoot) {
    return {
      ...fallback,
      weeklyRules: value,
    };
  }

  return {
    ...fallback,
    ...value,
    weeklyRules: value.weeklyRules || {},
    dateOverrides: value.dateOverrides || {},
    slotRules: Array.isArray(value.slotRules) ? value.slotRules : [],
    systemSettings: {
      ...fallback.systemSettings,
      ...(value.systemSettings || {}),
      slotCapacity: 6,
      weightModel: {
        ...(fallback.systemSettings.weightModel || {}),
        ...(value.systemSettings?.weightModel || {}),
      },
      workingDays: {
        ...DEFAULT_WORKING_DAYS,
        ...(value.systemSettings?.workingDays || {}),
      },
      blockDefinitions: {
        ...DEFAULT_BLOCK_DEFINITIONS,
        ...(value.systemSettings?.blockDefinitions || {}),
      },
    },
  };
}

export function getEffectiveBlockForDate(dateStr, configValue) {
  const config = normalizeTimeSlotConfig(configValue);
  const dayName = getDayNameFromDateStr(dateStr);
  const workingDays =
    config.systemSettings?.workingDays || DEFAULT_WORKING_DAYS;
  const blockDefinitions =
    config.systemSettings?.blockDefinitions || DEFAULT_BLOCK_DEFINITIONS;
  const isWorkingDay = Boolean(workingDays[dayName]);
  const override = config.dateOverrides?.[dateStr] || {};
  const blockedPeriods = new Set();
  const blockedTimeRanges =
    override.fullDayBlocked === true
      ? []
      : normalizeBlockTimeRanges(override.timeBlocks);

  if (!isWorkingDay) {
    PERIODS.forEach((period) => {
      blockedPeriods.add(period);
    });
  }

  const weeklyRules = config.weeklyRules?.[dayName] || [];
  weeklyRules.forEach((rule) => {
    if (rule?.period && rule.isActive === false) {
      blockedPeriods.add(rule.period);
    }
  });

  if (override.fullDayBlocked === true) {
    PERIODS.forEach((period) => {
      blockedPeriods.add(period);
    });
  }

  PERIODS.forEach((period) => {
    if (override.blocks?.[period] === "blocked") {
      blockedPeriods.add(period);
    }
  });

  const resolvedBlockedPeriods = PERIODS.filter((period) =>
    blockedPeriods.has(period),
  );

  return {
    date: dateStr,
    dayName,
    isWorkingDay,
    fullDayBlocked:
      !isWorkingDay ||
      override.fullDayBlocked === true ||
      resolvedBlockedPeriods.length === PERIODS.length,
    blockedPeriods: resolvedBlockedPeriods,
    blockedTimeRanges,
    blockDefinitions,
  };
}

export function getBlockedSlotTimesForDate(dateStr, configValue) {
  const block = getEffectiveBlockForDate(dateStr, configValue);
  const blockedSlots = new Set();

  expandPeriodsToSlotTimes(block.blockedPeriods).forEach((slot) => {
    blockedSlots.add(slot);
  });
  block.blockedTimeRanges.forEach((timeRange) => {
    expandTimeRangeToSlotTimes(timeRange).forEach((slot) => {
      blockedSlots.add(slot);
    });
  });

  return new Set(
    BUSINESS_DAY_TIME_OPTIONS.filter((slot) => blockedSlots.has(slot)),
  );
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getRollingWindowBounds(configValue, now = new Date()) {
  const config = normalizeTimeSlotConfig(configValue);
  const rollingWindowDays = Math.max(
    parseInt(config?.systemSettings?.rollingWindowDays, 10) || 90,
    1,
  );
  const min = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const max = new Date(min);
  max.setDate(max.getDate() + (rollingWindowDays - 1));

  return {
    minDate: toDateKey(min),
    maxDate: toDateKey(max),
    rollingWindowDays,
  };
}

export function isDateOutsideRollingWindow(
  dateStr,
  configValue,
  now = new Date(),
) {
  if (!dateStr) return false;

  const { minDate, maxDate } = getRollingWindowBounds(configValue, now);
  return dateStr < minDate || dateStr > maxDate;
}
