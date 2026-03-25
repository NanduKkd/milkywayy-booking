import { NextResponse } from "next/server";
import { Op } from "sequelize";
import Booking from "@/lib/db/models/booking";
import DynamicConfig from "@/lib/db/models/dynamicconfig";
import { formatBookingReference } from "@/lib/helpers/invoice-format";

const CONFIG_KEY = "timeSlots";
const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const DEFAULT_PERIODS = [
  {
    period: "morning",
    label: "Morning",
    startTime: "09:00",
    endTime: "12:00",
    maxBookings: 3,
    isActive: true,
    serviceCombinations: [],
    propertyType: "",
    propertySize: "",
    slotRestriction: "",
    slotsRequired: 1,
  },
  {
    period: "afternoon",
    label: "Afternoon",
    startTime: "13:00",
    endTime: "16:00",
    maxBookings: 5,
    isActive: true,
    serviceCombinations: [],
    propertyType: "",
    propertySize: "",
    slotRestriction: "",
    slotsRequired: 1,
  },
  {
    period: "evening",
    label: "Evening",
    startTime: "17:00",
    endTime: "20:00",
    maxBookings: 4,
    isActive: true,
    serviceCombinations: [],
    propertyType: "",
    propertySize: "",
    slotRestriction: "",
    slotsRequired: 1,
  },
];

const DEFAULT_SYSTEM_SETTINGS = {
  rollingWindowDays: 90,
  slotCapacity: 6,
  workingDays: {
    Monday: true,
    Tuesday: true,
    Wednesday: true,
    Thursday: true,
    Friday: true,
    Saturday: true,
    Sunday: false,
  },
  blockDefinitions: {
    morning: { label: "Morning", startTime: "09:00", endTime: "12:00" },
    afternoon: { label: "Afternoon", startTime: "13:00", endTime: "16:00" },
    evening: { label: "Evening", startTime: "17:00", endTime: "20:00" },
  },
  weightModel: {
    propertyWeights: {
      Apartment: {
        Studio: 1,
        "1BR": 1.5,
        "1 Bed": 1.5,
        "2BR": 2,
        "2 Bed": 2,
        "3BR": 2.5,
        "3 Bed": 2.5,
        "4BR": 3,
        "4 Bed": 3,
        "5BR": 3.5,
        "5 Bed": 3.5,
      },
      "Villa/Townhouse": {
        "2BR": 2.5,
        "2 Bed": 2.5,
        "3BR": 3,
        "3 Bed": 3,
        "4BR": 3.5,
        "4 Bed": 3.5,
        "5BR": 4,
        "5 Bed": 4,
        "6BR": 5,
        "6 Bed": 5,
        "7BR": 5.5,
        "7 Bed": 5.5,
      },
      Commercial: {
        Basic: 2,
        Essential: 3.5,
        Premium: 5,
        Executive: 7,
        Elite: 7,
      },
    },
    serviceWeights: {
      Photo: { weight: 1, active: true },
      "Short Form Video": { weight: 1.5, active: true },
      "Long Form - Daylight": { weight: 2, active: true },
      "Long Form - Night": { weight: 2, active: true },
      "Long Form - Day + Night": { weight: 3, active: true },
      "360 Virtual Tour": { weight: 1.5, active: true },
    },
    eveningCompatibleServices: ["Long Form - Night", "Long Form - Day + Night"],
  },
};

const getDefaultWeeklyRules = () => {
  const config = {};
  DAYS_OF_WEEK.forEach((day) => {
    config[day] = DEFAULT_PERIODS.map((slot) => ({ ...slot }));
  });
  return config;
};

const getDefaultConfig = () => ({
  version: 2,
  weeklyRules: getDefaultWeeklyRules(),
  dateOverrides: {},
  slotRules: [],
  systemSettings: DEFAULT_SYSTEM_SETTINGS,
});

const normalizeConfig = (value) => {
  if (!value || typeof value !== "object") {
    return getDefaultConfig();
  }

  if (value.version === 2) {
    return {
      ...getDefaultConfig(),
      ...value,
      weeklyRules: {
        ...getDefaultWeeklyRules(),
        ...(value.weeklyRules || {}),
      },
      dateOverrides: value.dateOverrides || {},
      slotRules: Array.isArray(value.slotRules) ? value.slotRules : [],
      systemSettings: {
        ...DEFAULT_SYSTEM_SETTINGS,
        ...(value.systemSettings || {}),
        slotCapacity: 6,
        workingDays: {
          ...DEFAULT_SYSTEM_SETTINGS.workingDays,
          ...(value.systemSettings?.workingDays || {}),
        },
        blockDefinitions: {
          ...DEFAULT_SYSTEM_SETTINGS.blockDefinitions,
          ...(value.systemSettings?.blockDefinitions || {}),
        },
      },
    };
  }

  // Backward compatibility with old shape: { Monday: [..], Tuesday: [..] }
  const hasWeekdayKeys = DAYS_OF_WEEK.some((day) => Array.isArray(value[day]));
  if (hasWeekdayKeys) {
    return {
      ...getDefaultConfig(),
      weeklyRules: {
        ...getDefaultWeeklyRules(),
        ...value,
      },
    };
  }

  return getDefaultConfig();
};

const toDateKey = (dateObj) => {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const mapBookingToPeriod = (booking) => {
  if (booking.slot === 1) return "morning";
  if (booking.slot === 2) return "afternoon";
  if (booking.slot === 3) return "evening";

  const startTime = booking.startTime;
  if (!startTime) return null;

  if (startTime >= "09:00" && startTime < "12:00") return "morning";
  if (startTime >= "13:00" && startTime < "17:00") return "afternoon";
  if (startTime >= "17:00" && startTime <= "20:00") return "evening";
  return null;
};

const addMinutesToTime = (timeStr, minutesToAdd = 30) => {
  if (!timeStr || !timeStr.includes(":")) return "--:--";
  const [h, m] = timeStr.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return "--:--";

  const total = h * 60 + m + minutesToAdd;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
};

export async function GET(request) {
  try {
    const today = new Date();
    const url = new URL(request.url);
    const startParam = url.searchParams.get("start");
    const endParam = url.searchParams.get("end");
    const startDate =
      startParam ||
      toDateKey(new Date(today.getFullYear(), today.getMonth(), 1));
    const endDate =
      endParam ||
      toDateKey(new Date(today.getFullYear(), today.getMonth() + 1, 0));

    const existing = await DynamicConfig.findOne({
      where: { key: CONFIG_KEY },
    });
    const config = normalizeConfig(existing?.value);

    const bookings = await Booking.findAll({
      where: {
        cancelledAt: null,
        status: {
          [Op.in]: ["CONFIRMED", "COMPLETED"],
        },
        date: {
          [Op.between]: [startDate, endDate],
        },
      },
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
    });

    const bookedMap = {};
    const bookedDetailsMap = {};
    bookings.forEach((booking) => {
      if (!booking.date) return;
      const period = mapBookingToPeriod(booking);
      if (!period) return;

      if (!bookedMap[booking.date]) bookedMap[booking.date] = [];
      if (!bookedMap[booking.date].includes(period)) {
        bookedMap[booking.date].push(period);
      }

      if (!bookedDetailsMap[booking.date]) bookedDetailsMap[booking.date] = {};
      if (!bookedDetailsMap[booking.date][period]) {
        bookedDetailsMap[booking.date][period] = [];
      }

      const propertyType = booking.propertyDetails?.type || "Property";
      const propertySize = booking.propertyDetails?.size || "";
      const services = Array.isArray(booking.shootDetails?.services)
        ? booking.shootDetails.services
        : [];
      const videographySubService =
        booking.shootDetails?.videographySubService || "";
      const videographySelections = String(videographySubService)
        .split("|")
        .map((v) => v.trim())
        .filter(Boolean);
      const serviceLabel = [
        services.length ? services.join(", ") : "",
        videographySelections.length
          ? `(${videographySelections.join(", ")})`
          : "",
      ]
        .filter(Boolean)
        .join(" ");
      const arrivalStart = booking.startTime || "--:--";
      const arrivalEnd = addMinutesToTime(arrivalStart, 30);

      bookedDetailsMap[booking.date][period].push({
        bookingCode: formatBookingReference(booking),
        propertyLabel: [propertyType, propertySize].filter(Boolean).join(" - "),
        serviceLabel,
        arrival: `${arrivalStart} - ${arrivalEnd}`,
      });
    });

    return NextResponse.json({
      config,
      bookedMap,
      bookedDetailsMap,
    });
  } catch (error) {
    console.error("Error loading admin time slots:", error);
    return NextResponse.json(
      { error: "Failed to load time slots" },
      { status: 500 },
    );
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const timeSlots = normalizeConfig(body?.timeSlots);

    if (!timeSlots || typeof timeSlots !== "object") {
      return NextResponse.json(
        { error: "Invalid time slots payload" },
        { status: 400 },
      );
    }

    const [entry, created] = await DynamicConfig.findOrCreate({
      where: { key: CONFIG_KEY },
      defaults: { value: timeSlots },
    });

    if (!created) {
      entry.value = timeSlots;
      await entry.save();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving admin time slots:", error);
    return NextResponse.json(
      { error: "Failed to save time slots" },
      { status: 500 },
    );
  }
}
