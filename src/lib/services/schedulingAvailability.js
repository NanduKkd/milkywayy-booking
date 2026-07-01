export const PERIODS = ["morning", "afternoon", "evening"];

export const PERIOD_TO_HOURLY = {
  morning: ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"],
  afternoon: ["13:00", "13:30", "14:00", "14:30", "15:00", "15:30"],
  evening: ["17:00", "17:30", "18:00", "18:30", "19:00", "19:30"],
};

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
    blockDefinitions,
  };
}

export function getBlockedSlotTimesForDate(dateStr, configValue) {
  const block = getEffectiveBlockForDate(dateStr, configValue);
  const blockedSlots = new Set();

  block.blockedPeriods.forEach((period) => {
    (PERIOD_TO_HOURLY[period] || []).forEach((slot) => {
      blockedSlots.add(slot);
    });
  });

  return blockedSlots;
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
