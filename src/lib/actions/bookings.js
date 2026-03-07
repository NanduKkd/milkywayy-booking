"use server";

import "@/lib/db/relations";
import { Op } from "sequelize";
import Stripe from "stripe";
import { getDiscounts } from "@/lib/actions/discounts";
import { actionWrapper } from "@/lib/actions/utils";
import { sequelize as db } from "@/lib/db/db";
import Booking from "@/lib/db/models/booking";
import Coupon from "@/lib/db/models/coupon";
import DynamicConfig from "@/lib/db/models/dynamicconfig";
import Transaction from "@/lib/db/models/transaction";
import User from "@/lib/db/models/user";
import WalletTransaction from "@/lib/db/models/wallettransaction";
import { auth } from "@/lib/helpers/auth";
import { calculateBookingDuration } from "@/lib/helpers/bookingUtils";
import { getPricingConfig } from "@/lib/helpers/pricing";
import { USER_ROLES } from "../config/app.config";
import {
  sendBookingConfirmation,
  sendCancellationConfirmation,
  sendRescheduleConfirmation,
} from "@/lib/actions/notifications";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const SLOT_MAPPING = {
  morning: 1,
  afternoon: 2,
  evening: 3,
};

const START_TIME_TO_SLOT = {
  "09:00": 1,
  "13:00": 2,
  "17:00": 3,
  "10:00": 1, // legacy
  "16:00": 3, // legacy
};

const REVERSE_SLOT_MAPPING = {
  1: "morning",
  2: "afternoon",
  3: "evening",
};

const PERIOD_TO_HOURLY = {
  morning: ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"],
  afternoon: ["13:00", "13:30", "14:00", "14:30", "15:00", "15:30"],
  evening: ["17:00", "17:30", "18:00", "18:30", "19:00", "19:30"],
};

const START_TIME_TO_PERIOD = {
  "09:00": "morning",
  "13:00": "afternoon",
  "17:00": "evening",
  "10:00": "morning", // legacy
  "16:00": "evening", // legacy
};

const PERIOD_ORDER = ["morning", "afternoon", "evening"];
const RESCHEDULE_CUTOFF_HOURS = 6;
const PARTIAL_REFUND_CUTOFF_HOURS = 3;
const PARTIAL_REFUND_PERCENT = 50;

const isNightServiceFromProperty = (property) => {
  const services = Array.isArray(property?.services) ? property.services : [];
  if (!services.includes("Videography")) return false;
  const sub = property?.videographySubService || "";
  return sub.includes("Night Light") || sub.includes("Daylight + Night");
};

const isNightServiceFromBooking = (booking) => {
  const services = Array.isArray(booking?.shootDetails?.services)
    ? booking.shootDetails.services
    : [];
  if (!services.includes("Videography")) return false;
  const sub = booking?.shootDetails?.videographySubService || "";
  return sub.includes("Night Light") || sub.includes("Daylight + Night");
};

const getBookingDateTime = (bookingLike) => {
  const dateStr = bookingLike?.date;
  if (!dateStr) return null;

  const rawStart =
    bookingLike?.startTime ||
    (bookingLike?.slot === 1
      ? "09:00"
      : bookingLike?.slot === 2
        ? "13:00"
        : bookingLike?.slot === 3
          ? "17:00"
          : null);
  if (!rawStart || typeof rawStart !== "string" || !rawStart.includes(":")) {
    return null;
  }

  const [hStr, mStr] = rawStart.split(":");
  const hours = parseInt(hStr, 10);
  const minutes = parseInt(mStr, 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

  const [y, m, d] = String(dateStr).split("-").map((n) => parseInt(n, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return null;
  }

  return new Date(y, m - 1, d, hours, minutes, 0, 0);
};

const getHoursUntilBooking = (bookingLike, now = new Date()) => {
  const dt = getBookingDateTime(bookingLike);
  if (!dt) return null;
  return (dt.getTime() - now.getTime()) / (1000 * 60 * 60);
};

const getCancellationPolicy = (bookingLike, now = new Date()) => {
  const hoursLeft = getHoursUntilBooking(bookingLike, now);
  const isPast = typeof hoursLeft === "number" ? hoursLeft < 0 : false;
  const partialEligible =
    typeof hoursLeft === "number" &&
    hoursLeft >= 0 &&
    hoursLeft <= PARTIAL_REFUND_CUTOFF_HOURS;
  const refundPercent = partialEligible ? PARTIAL_REFUND_PERCENT : 100;

  return {
    hoursLeft,
    isPast,
    partialEligible,
    refundPercent,
  };
};

const getTimeSlots = (startTime, durationHours, options = {}) => {
  if (!startTime) return [];
  const isNightService = Boolean(options.isNightService);

  const startPeriod = START_TIME_TO_PERIOD[startTime] || startTime;
  const blocksNeeded = Math.min(Math.max(parseInt(durationHours, 10) || 1, 1), 2);

  let requiredPeriods = [startPeriod];
  if (blocksNeeded === 2) {
    if (isNightService && startPeriod === "evening") {
      requiredPeriods = ["afternoon", "evening"];
    } else if (!isNightService && startPeriod === "morning") {
      requiredPeriods = ["morning", "afternoon"];
    } else if (!isNightService && startPeriod === "afternoon") {
      requiredPeriods = ["afternoon", "evening"];
    } else {
      return [];
    }
  }

  return requiredPeriods.flatMap((period) => PERIOD_TO_HOURLY[period] || []);
};

const PERIODS = ["morning", "afternoon", "evening"];

const DEFAULT_WORKING_DAYS = {
  Monday: true,
  Tuesday: true,
  Wednesday: true,
  Thursday: true,
  Friday: true,
  Saturday: true,
  Sunday: false,
};

const getDayNameFromDateStr = (dateStr) => {
  const date = new Date(`${dateStr}T00:00:00`);
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return dayNames[date.getDay()];
};

const enumerateDateRange = (startDate, endDate) => {
  const out = [];
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const cursor = new Date(start);
  while (cursor <= end) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    const d = String(cursor.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${d}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
};

const normalizeTimeSlotConfig = (value) => {
  const fallback = {
    version: 2,
    weeklyRules: {},
    dateOverrides: {},
    slotRules: [],
    systemSettings: {
      rollingWindowDays: 90,
      slotCapacity: 6,
      weightModel: {},
      workingDays: DEFAULT_WORKING_DAYS,
      blockDefinitions: {},
    },
  };

  if (!value || typeof value !== "object") return fallback;

  // Backward compatibility: old format with weekday keys at root.
  const weekdayKeys = Object.keys(DEFAULT_WORKING_DAYS);
  const hasWeekdayRoot = weekdayKeys.some((k) => Array.isArray(value[k]));
  if (hasWeekdayRoot) {
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
    },
  };
};

const getAdminBlockedSlotsForDate = (dateStr, config) => {
  const blocked = new Set();
  if (!config) return blocked;

  const dayName = getDayNameFromDateStr(dateStr);
  const workingDays = config.systemSettings?.workingDays || DEFAULT_WORKING_DAYS;
  const isWorkingDay = Boolean(workingDays[dayName]);

  if (!isWorkingDay) {
    PERIODS.forEach((period) =>
      getTimeSlots(period, 1).forEach((slot) => blocked.add(slot)),
    );
    return blocked;
  }

  const override = config.dateOverrides?.[dateStr] || {};
  if (override.fullDayBlocked) {
    PERIODS.forEach((period) =>
      getTimeSlots(period, 1).forEach((slot) => blocked.add(slot)),
    );
    return blocked;
  }

  // Weekly-level inactive periods
  const dayRules = config.weeklyRules?.[dayName] || [];
  dayRules.forEach((periodRule) => {
    if (periodRule?.period && periodRule.isActive === false) {
      getTimeSlots(periodRule.period, 1).forEach((slot) => blocked.add(slot));
    }
  });

  // Date override block flags
  PERIODS.forEach((period) => {
    if (override.blocks?.[period] === "blocked") {
      getTimeSlots(period, 1).forEach((slot) => blocked.add(slot));
    }
  });

  return blocked;
};

const getRollingWindowBounds = (config) => {
  const rollingWindowDays = Math.max(
    parseInt(config?.systemSettings?.rollingWindowDays, 10) || 90,
    1,
  );
  const today = new Date();
  const min = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const max = new Date(min);
  // Inclusive range: today counts as day 1.
  max.setDate(max.getDate() + (rollingWindowDays - 1));
  return { min, max };
};

const isDateOutsideRollingWindow = (dateStr, config) => {
  if (!dateStr) return false;
  const selected = new Date(`${dateStr}T00:00:00`);
  const { min, max } = getRollingWindowBounds(config);
  return selected < min || selected > max;
};

const isSlotBlocked = (booking) => {
  if (booking.cancelledAt) return false;

  // If confirmed, it's blocked
  if (booking.status === "CONFIRMED") return true;

  // If draft
  if (booking.status === "DRAFT") {
    // If explicitly cancelled, not blocked
    if (booking.cancelledAt) return false;

    // If has transaction
    if (booking.transaction) {
      // If transaction is pending or success, blocked
      if (["pending", "success"].includes(booking.transaction.status))
        return true;
      // If failed, not blocked
      return false;
    }

    // If no transaction, check 15 min rule
    const diff = new Date() - new Date(booking.createdAt);
    const minutes = diff / 1000 / 60;
    return minutes < 15;
  }

  return false;
};

const getUnavailableSlotsHandler = async (date) => {
  try {
    const session = await auth();
    const currentUserId = session?.id;

    const bookings = await Booking.findAll({
      where: {
        date: date,
      },
      include: [{ model: Transaction, as: "transaction" }],
    });

    const blockedSlots = [];
    bookings.forEach((b) => {
      // If it's the current user's draft, it doesn't count as unavailable for them
      if (currentUserId && b.userId === currentUserId && b.status === "DRAFT") {
        return;
      }
      if (isSlotBlocked(b)) {
        const bStartTime = b.startTime || REVERSE_SLOT_MAPPING[b.slot];
        const bDuration = b.duration || 1;
        const bSlots = getTimeSlots(bStartTime, bDuration, {
          isNightService: isNightServiceFromBooking(b),
        });
        blockedSlots.push(...bSlots);
      }
    });

    // Return unique slots
    return [...new Set(blockedSlots)];
  } catch (error) {
    console.error("Error fetching unavailable slots:", error);
    return [];
  }
};
export const getUnavailableSlots = actionWrapper(getUnavailableSlotsHandler);

const getAvailabilityForRangeHandler = async (startDate, endDate) => {
  try {
    const session = await auth();
    const currentUserId = session?.id;

    const bookings = await Booking.findAll({
      where: {
        date: {
          [Op.between]: [startDate, endDate],
        },
      },
      include: [{ model: Transaction, as: "transaction" }],
    });

    const availabilityMap = {};
    const configEntry = await DynamicConfig.findOne({
      where: { key: "timeSlots" },
      attributes: ["value"],
    });
    const timeSlotConfig = normalizeTimeSlotConfig(configEntry?.value);

    // Merge admin calendar blocks into availability first.
    enumerateDateRange(startDate, endDate).forEach((dateStr) => {
      const blockedByAdmin = getAdminBlockedSlotsForDate(dateStr, timeSlotConfig);
      if (blockedByAdmin.size === 0) return;
      if (!availabilityMap[dateStr]) {
        availabilityMap[dateStr] = new Set();
      }
      blockedByAdmin.forEach((slot) => availabilityMap[dateStr].add(slot));
    });

    bookings.forEach((b) => {
      if (!b.date) return;

      // If it's the current user's draft, it doesn't count as unavailable for them
      if (currentUserId && b.userId === currentUserId && b.status === "DRAFT") {
        return;
      }

      if (isSlotBlocked(b)) {
        const dateStr = b.date; // Assuming date is stored as string YYYY-MM-DD or similar
        if (!availabilityMap[dateStr]) {
          availabilityMap[dateStr] = new Set();
        }
        
        const bStartTime = b.startTime || REVERSE_SLOT_MAPPING[b.slot];
        const bDuration = b.duration || 1;
        const bSlots = getTimeSlots(bStartTime, bDuration, {
          isNightService: isNightServiceFromBooking(b),
        });
        
        bSlots.forEach(slot => availabilityMap[dateStr].add(slot));
      }
    });

    // Convert Sets to Arrays
    const result = {};
    for (const [date, slots] of Object.entries(availabilityMap)) {
      result[date] = [...slots];
    }

    return result;
  } catch (error) {
    console.error("Error fetching availability for range:", error);
    return {};
  }
};
export const getAvailabilityForRange = actionWrapper(
  getAvailabilityForRangeHandler,
);

const checkAvailability = async (properties, excludeBookingIds = []) => {
  const pricingConfig = await getPricingConfig();
  const configEntry = await DynamicConfig.findOne({
    where: { key: "timeSlots" },
    attributes: ["value"],
  });
  const timeSlotConfig = normalizeTimeSlotConfig(configEntry?.value);

  for (const property of properties) {
    if (!property.preferredDate) continue;
    if (isDateOutsideRollingWindow(property.preferredDate, timeSlotConfig)) {
      throw new Error(
        `Selected date ${property.preferredDate} is outside the booking window.`,
      );
    }
    const startTime = property.startTime || property.timeSlot;
    if (!startTime) continue;

    // Calculate slots required by weight model
    const duration = calculateBookingDuration(
      {
        id: property.services || [],
        videographySubService: property.videographySubService || "",
      },
      {
        type: property.propertyType,
        size: property.propertySize,
        videographySubService: property.videographySubService || "",
      },
      {
        slotCapacity: timeSlotConfig?.systemSettings?.slotCapacity,
        weightModel: timeSlotConfig?.systemSettings?.weightModel,
      },
    );

    const startPeriod = START_TIME_TO_PERIOD[startTime] || startTime;
    const hasServiceContext =
      Array.isArray(property.services) && property.services.length > 0;
    const isNightCompatible = hasServiceContext
      ? isNightServiceFromProperty(property)
      : startPeriod === "evening";
    if (hasServiceContext && isNightCompatible && startPeriod !== "evening") {
      throw new Error(
        `Night service bookings must use Evening slot on ${property.preferredDate}.`,
      );
    }
    if (
      hasServiceContext &&
      !isNightCompatible &&
      !["morning", "afternoon"].includes(startPeriod)
    ) {
      throw new Error(
        `Only Morning/Afternoon are available for non-night services on ${property.preferredDate}.`,
      );
    }

    const requestedSlots = getTimeSlots(startTime, duration, {
      isNightService: isNightCompatible,
    });
    if (requestedSlots.length === 0) continue;

    const blockedByAdmin = getAdminBlockedSlotsForDate(
      property.preferredDate,
      timeSlotConfig,
    );
    const blockedByRules = requestedSlots.some((slot) => blockedByAdmin.has(slot));
    if (blockedByRules) {
      throw new Error(
        `Selected time on ${property.preferredDate} is blocked by admin calendar rules.`,
      );
    }

    const whereClause = {
      date: property.preferredDate,
    };

    if (excludeBookingIds.length > 0) {
      whereClause.id = { [Op.notIn]: excludeBookingIds };
    }

    const existingBookings = await Booking.findAll({
      where: whereClause,
      include: [{ model: Transaction, as: "transaction" }],
    });

    const isBlocked = existingBookings.some((b) => {
      if (!isSlotBlocked(b)) return false;

      const bStartTime = b.startTime || REVERSE_SLOT_MAPPING[b.slot];
      const bDuration = b.duration || 1;
      const bSlots = getTimeSlots(bStartTime, bDuration, {
        isNightService: isNightServiceFromBooking(b),
      });

      // Check for intersection
      return requestedSlots.some(slot => bSlots.includes(slot));
    });

    if (isBlocked) {
      throw new Error(
        `Selected time on ${property.preferredDate} is no longer available.`,
      );
    }
  }
};

const calculatePropertyPrice = (property, pricingConfig) => {
  if (!property.propertyType || !property.propertySize || !property.services)
    return 0;
  const typeConfig = pricingConfig[property.propertyType];
  if (!typeConfig) return 0;

  const sizeConfig = typeConfig.sizes.find(
    (s) => s.label === property.propertySize,
  );
  if (!sizeConfig) return 0;

  const resolveVideographyPriceConfig = (servicePriceConfig, subService) => {
    if (
      !subService ||
      !servicePriceConfig ||
      typeof servicePriceConfig !== "object"
    ) {
      return servicePriceConfig;
    }

    if (subService.includes(".")) {
      const [mainService, category] = subService.split(".");
      const nested = servicePriceConfig?.[mainService]?.[category];
      if (nested !== undefined) return nested;
      const mainConfig = servicePriceConfig?.[mainService];
      if (
        mainConfig &&
        typeof mainConfig === "object" &&
        !Array.isArray(mainConfig) &&
        "price" in mainConfig
      ) {
        return mainConfig;
      }
    }

    const direct = servicePriceConfig?.[subService];
    if (direct !== undefined) return direct;

    return servicePriceConfig;
  };
  const videographySelections = String(property.videographySubService || "")
    .split("|")
    .map((v) => v.trim())
    .filter(Boolean);

  return property.services.reduce((total, service) => {
    let priceConfig = sizeConfig.prices[service];
    
    // Handle videography sub-services
    if (service === "Videography" && property.videographySubService && typeof priceConfig === "object") {
      const videographyTotal = videographySelections.reduce((sum, selection) => {
        const cfg = resolveVideographyPriceConfig(priceConfig, selection);
        const val =
          typeof cfg === "object" ? Number(cfg?.price || 0) : Number(cfg || 0);
        return sum + (Number.isFinite(val) ? val : 0);
      }, 0);
      return total + videographyTotal;
    }
    
    const price =
      typeof priceConfig === "object"
        ? priceConfig.price || 0
        : priceConfig || 0;
    return total + price;
  }, 0);
};

const getBookingsHandler = async (userId) => {
  try {
    const bookings = await Booking.findAll({
      where: {
        userId,
        status: { [Op.ne]: "DRAFT" },
      },
      include: [
        { model: db.models.User, as: "user" },
        { model: db.models.Transaction, as: "transaction" },
      ],
      order: [["createdAt", "DESC"]],
    });
    return bookings;
  } catch (error) {
    console.error("Error fetching bookings:", error);
    throw new Error("Failed to fetch bookings");
  }
};
export const getBookings = actionWrapper(getBookingsHandler);

export const getBookingByCode = actionWrapper(async (bookingCode) => {
  const session = await auth();

  if (!session?.id) throw new Error("Unauthorized");

  const booking = await Booking.findOne({
    where: {
      bookingCode: bookingCode,
      userId: session.id,
    },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

  return { success: true, data: booking.toJSON() };
});

export const rescheduleBookingByCode = actionWrapper(async (bookingCode, updateData) => {
  const session = await auth();

  if (!session?.id) throw new Error("Unauthorized");

  const booking = await Booking.findOne({
    where: {
      bookingCode: bookingCode,
      userId: session.id,
    },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

  if (booking.cancelledAt || booking.status === "COMPLETED") {
    throw new Error("This booking cannot be rescheduled");
  }

  const hoursUntil = getHoursUntilBooking(booking);
  if (typeof hoursUntil === "number" && hoursUntil < RESCHEDULE_CUTOFF_HOURS) {
    throw new Error(
      `Reschedule is allowed only up to ${RESCHEDULE_CUTOFF_HOURS} hours before shoot time.`,
    );
  }

  const selectedDate = updateData?.date || booking.date;
  const rawStart = updateData?.startTime || updateData?.slot || booking.startTime || booking.slot;
  const normalizedStartTime = (() => {
    if (!rawStart) return null;
    if (typeof rawStart === "string") {
      if (START_TIME_TO_SLOT[rawStart]) return rawStart;
      if (SLOT_MAPPING[rawStart]) {
        return rawStart === "morning"
          ? "09:00"
          : rawStart === "afternoon"
            ? "13:00"
            : rawStart === "evening"
              ? "17:00"
              : null;
      }
    }
    if (rawStart === 1 || rawStart === "1") return "09:00";
    if (rawStart === 2 || rawStart === "2") return "13:00";
    if (rawStart === 3 || rawStart === "3") return "17:00";
    return null;
  })();

  if (!selectedDate || !normalizedStartTime) {
    throw new Error("Please select a valid date and time");
  }

  const slotNumber =
    START_TIME_TO_SLOT[normalizedStartTime] ||
    SLOT_MAPPING[updateData?.slot] ||
    booking.slot ||
    null;
  const timeSlotConfigEntry = await DynamicConfig.findOne({
    where: { key: "timeSlots" },
    attributes: ["value"],
  });
  const timeSlotConfig = normalizeTimeSlotConfig(timeSlotConfigEntry?.value);
  const normalizedShootDetails = booking.shootDetails || {};
  const normalizedPropertyDetails = booking.propertyDetails || {};
  const services = Array.isArray(normalizedShootDetails.services)
    ? normalizedShootDetails.services
    : [];
  const videographySubService = normalizedShootDetails.videographySubService || "";
  const propertyType = normalizedPropertyDetails.type || "";
  const propertySize = normalizedPropertyDetails.size || "";

  const computedDuration = calculateBookingDuration(
    {
      id: services,
      videographySubService,
    },
    {
      type: propertyType,
      size: propertySize,
      videographySubService,
    },
    {
      slotCapacity: timeSlotConfig?.systemSettings?.slotCapacity,
      weightModel: timeSlotConfig?.systemSettings?.weightModel,
    },
  );

  await checkAvailability(
    [
      {
        preferredDate: selectedDate,
        startTime: normalizedStartTime,
        timeSlot: REVERSE_SLOT_MAPPING[slotNumber],
        duration: computedDuration,
        services,
        videographySubService,
        propertyType,
        propertySize,
      },
    ],
    [booking.id],
  );

  await booking.update({
    date: selectedDate,
    startTime: normalizedStartTime,
    slot: slotNumber,
    duration: computedDuration,
    rescheduledAt: new Date(),
    rescheduleCount: (booking.rescheduleCount || 0) + 1,
  });

  try {
    const user = await User.findByPk(booking.userId);
    if (user) {
      await sendRescheduleConfirmation(booking, user);
    }
  } catch (err) {
    console.error("WhatsApp reschedule notification failed:", err);
  }

  return { success: true, data: booking.toJSON() };
});

const getDraftsHandler = async () => {
  try {
    const session = await auth();
    if (!session?.id) return [];

    const drafts = await Booking.findAll({
      where: {
        userId: session.id,
        status: "DRAFT",
      },
      include: [{ model: Transaction, as: "transaction" }],
      order: [["id", "ASC"]],
    });

    // Only restore editable drafts. If a draft already has an active/successful
    // transaction, treat it as an in-payment booking and don't prefill form.
    return drafts
      .filter((d) => {
        const txStatus = d.transaction?.status;
        return !txStatus || txStatus === "failed";
      })
      .map((d) => d.get({ plain: true }));
  } catch (error) {
    console.error("Error fetching drafts:", error);
    return [];
  }
};
export const getDrafts = actionWrapper(getDraftsHandler);

const saveDraftsHandler = async (properties) => {
  // No try-catch needed here because wrapper handles it,

  // but original code had it to re-throw. We can keep it clean.

  const session = await auth();

  if (!session?.id)
    throw new Error("Unauthorized: Please login to save drafts");

  const userId = session.id;

  // Delete existing drafts for this user to avoid duplicates

  // We only delete DRAFT status bookings, preserving history of confirmed/cancelled ones
  await Booking.destroy({
    where: {
      userId: userId,
      status: "DRAFT",
    },
  });

  // Check availability first
  await checkAvailability(properties);

  const createdBookings = [];

  const pricingConfig = await getPricingConfig();
  const configEntry = await DynamicConfig.findOne({
    where: { key: "timeSlots" },
    attributes: ["value"],
  });
  const timeSlotConfig = normalizeTimeSlotConfig(configEntry?.value);

  for (const property of properties) {
    const price = calculatePropertyPrice(property, pricingConfig);

    const duration = calculateBookingDuration(
      {
        id: property.services || [],
        videographySubService: property.videographySubService || "",
      },
      {
        type: property.propertyType,
        size: property.propertySize,
        videographySubService: property.videographySubService || "",
      },
      {
        slotCapacity: timeSlotConfig?.systemSettings?.slotCapacity,
        weightModel: timeSlotConfig?.systemSettings?.weightModel,
      },
    );

    const booking = await Booking.create({
      userId: userId,
      shootDetails: { 
        services: property.services,
        videographySubService: property.videographySubService || null
      },
      propertyDetails: {
        type: property.propertyType,
        size: property.propertySize,
        building: property.building,
        community: property.community,
        unit: property.unitNumber,
      },
      contactDetails: {
        name: property.contactName,
        phone: property.contactPhone,
        email: property.contactEmail,
      },
      date: property.preferredDate || null,
      startTime: property.startTime || (property.timeSlot === 'morning' ? '09:00' : property.timeSlot === 'afternoon' ? '13:00' : property.timeSlot === 'evening' ? '17:00' : null),
      slot:
        SLOT_MAPPING[property.timeSlot] ||
        START_TIME_TO_SLOT[property.startTime] ||
        null,
      duration: property.duration || duration,
      total: price,
      status: "DRAFT",
    });
    createdBookings.push(booking);
  }

  // Generate booking codes for new bookings
  for (const booking of createdBookings) {
    const bookingCode = `MWY-${String(booking.id).padStart(6, '0')}`;
    await booking.update({ bookingCode });
  }

  return createdBookings.map((b) => ({ id: b.id, bookingCode: b.bookingCode }));
};
export const saveDrafts = actionWrapper(saveDraftsHandler);

export const createBookings = saveDrafts;

const createTransactionAndPaymentIntentHandler = async (
  bookingIds,

  couponCode,
) => {
  console.log("[PAYMENT] createTransactionAndPaymentIntent start", {
    bookingIds,
    hasCoupon: Boolean(couponCode),
  });
  const session = await auth();

  if (!session?.id) throw new Error("Unauthorized");

  const userId = session.id;

  // Fetch bookings to calculate total and verify ownership
  console.log("[PAYMENT] Looking for bookings", { bookingIds, userId });
  const bookings = await Booking.findAll({
    where: {
      id: bookingIds,
      userId: userId,
    },
  });
  const foundBookingIds = bookings.map((b) => b.id);
  console.log("[PAYMENT] Found bookings", {
    userId,
    foundBookingIds,
    foundCount: bookings.length,
    requestedCount: bookingIds.length,
  });

  if (bookings.length !== bookingIds.length) {
    const missingBookingIds = bookingIds.filter((id) => !foundBookingIds.includes(id));
    console.error("[PAYMENT] Booking ownership mismatch", {
      userId,
      requestedBookingIds: bookingIds,
      foundBookingIds,
      missingBookingIds,
      reason: "Some bookings not found or unauthorized",
    });
    throw new Error("Some bookings not found or unauthorized");
  }

  // Check availability again (excluding these bookings)
  // We need to reconstruct the properties object for checkAvailability
  const propertiesToCheck = bookings.map((b) => ({
    preferredDate: b.date,
    startTime: b.startTime,
    timeSlot: REVERSE_SLOT_MAPPING[b.slot],
    duration: b.duration,
  }));
  await checkAvailability(propertiesToCheck, bookingIds);
  console.log("[PAYMENT] Availability re-check passed", {
    bookingIds,
    userId,
  });

  const totalAmount = bookings.reduce(
    (sum, b) => Number(sum) + Number(b.total),
    0,
  );

  // 1. Apply Automatic Discounts
  const discountsRes = await getDiscounts();
  const discounts = discountsRes.success ? discountsRes.data : [];
  let currentAmount = totalAmount;
  let directDiscount = 0;
  let walletCredits = 0;
  let walletExpiryDate = null;
  const appliedDiscounts = [];

  discounts.forEach((d) => {
    if (!d.isActive) return;
    if (totalAmount < d.minAmount) return;

    const val = Math.min((currentAmount * d.percentage) / 100, d.maxDiscount);

    if (d.type === "direct") {
      directDiscount += val;
      currentAmount -= val;
    } else if (d.type === "wallet") {
      walletCredits += val;
      if (d.expiryDays > 0) {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + d.expiryDays);
        // If multiple wallet credits, take the earliest expiry? Or latest?
        // Or just store the logic. For simplicity, let's take the latest expiry if multiple exist, or just the one.
        // Let's assume one main wallet credit rule usually.
        if (!walletExpiryDate || expiry > walletExpiryDate) {
          walletExpiryDate = expiry;
        }
      }
    }
    appliedDiscounts.push({ ...d, value: val });
  });

  // 2. Apply Coupon
  let finalAmount = currentAmount;
  let couponId = null;
  let couponDeduction = 0;

  if (couponCode) {
    const coupon = await Coupon.findOne({
      where: { code: couponCode.toUpperCase() },
    });

    // Validate coupon against the amount AFTER automatic discounts
    if (coupon && coupon.isActive && finalAmount >= coupon.minimumAmount) {
      couponDeduction = Math.min(
        (finalAmount * coupon.percentDiscount) / 100,
        coupon.maxDiscount,
      );
      finalAmount = Math.max(0, finalAmount - couponDeduction);
      couponId = coupon.id;
    }
  }

  // Create Transaction
  const transaction = await Transaction.create({
    userId: userId,
    amount: finalAmount, // Store the final amount to be paid
    status: "pending",
    couponId: couponId,
    couponDeduction: couponDeduction,
    bulkDeduction: directDiscount, // Store automatic direct discounts here
    metadata: { appliedDiscounts, creditExpiresAt: walletExpiryDate },
  });

  if (walletCredits > 0) {
    await WalletTransaction.create({
      userId: userId,
      amount: walletCredits,
      creditExpiresAt: walletExpiryDate,
      status: "pending",
      transactionId: transaction.id,
    });
  }

  // Update Bookings with Transaction ID
  await Booking.update(
    { transactionId: transaction.id },
    { where: { id: bookingIds } },
  );

  // Create Stripe Checkout Session
  const user = await User.findByPk(userId);
  const stripeSession = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    customer_email: user?.email || undefined,
    line_items: [
      {
        price_data: {
          currency: "aed",
          product_data: {
            name: "Property Shoot Booking",
            description: `Booking for ${bookings.length} propert${bookings.length > 1 ? "ies" : "y"}`,
          },
          unit_amount: Math.round(finalAmount * 100), // Stripe expects cents
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/booking/cancel?session_id={CHECKOUT_SESSION_ID}`,
    metadata: {
      transactionId: transaction.id,
      userId: userId,
    },
  });

  // Update Transaction with Session ID (temporarily in stripePaymentIntentId or just rely on webhook)
  // We will store session ID for now to reference it if needed before webhook fires
  await transaction.update({ stripePaymentIntentId: stripeSession.id });
  console.log("[PAYMENT] Stripe checkout session created", {
    userId,
    transactionId: transaction.id,
    stripeSessionId: stripeSession.id,
  });

  return { url: stripeSession.url };
};
export const createTransactionAndPaymentIntent = actionWrapper(
  createTransactionAndPaymentIntentHandler,
);

const cancelBookingHandler = async (bookingId) => {
  const session = await auth();
  if (!session?.id) throw new Error("Unauthorized");

  const booking = await Booking.findOne({
    where: { id: bookingId, userId: session.id },
    include: [{ model: Transaction, as: "transaction" }],
  });

  if (!booking) throw new Error("Booking not found");
  if (booking.cancelledAt) throw new Error("Booking is already cancelled");
  if (booking.status === "COMPLETED") {
    throw new Error("Completed booking cannot be cancelled");
  }

  const policy = getCancellationPolicy(booking);
  if (policy.isPast) {
    throw new Error("Past bookings cannot be cancelled");
  }

  const transaction = booking.transaction || null;
  let refundAmount = 0;
  let refundType = "none";
  let stripeRefundId = null;

  if (
    transaction &&
    transaction.status === "success" &&
    transaction.stripePaymentIntentId
  ) {
    const bookingTotal = Number(booking.total || 0);
    const txAmount = Number(transaction.amount || 0);
    const txRefunded = Number(transaction.refundedAmount || 0);
    const bookingRefunded = Number(booking.refundedAmount || 0);
    const requested = Number(
      ((bookingTotal * (policy.refundPercent || 0)) / 100).toFixed(2),
    );
    const txRemaining = Math.max(0, txAmount - txRefunded);
    const bookingRemaining = Math.max(0, bookingTotal - bookingRefunded);
    refundAmount = Math.max(
      0,
      Number(Math.min(requested, txRemaining, bookingRemaining).toFixed(2)),
    );

    if (refundAmount > 0) {
      const paymentIntentId = transaction.stripePaymentIntentId;
      if (String(paymentIntentId).startsWith("pi_")) {
        const stripeRefund = await stripe.refunds.create({
          payment_intent: paymentIntentId,
          amount: Math.round(refundAmount * 100),
          metadata: {
            bookingId: String(booking.id),
            bookingCode: String(
              booking.bookingCode || `MWY-${String(booking.id).padStart(6, "0")}`,
            ),
            refundType: policy.partialEligible ? "partial" : "full",
          },
        });
        stripeRefundId = stripeRefund?.id || null;
      } else {
        // Payment intent not yet normalized (legacy session id kept in field).
        const stripeSession = await stripe.checkout.sessions.retrieve(
          paymentIntentId,
        );
        if (!stripeSession?.payment_intent) {
          throw new Error("Unable to process refund for this booking.");
        }
        const stripeRefund = await stripe.refunds.create({
          payment_intent: stripeSession.payment_intent,
          amount: Math.round(refundAmount * 100),
          metadata: {
            bookingId: String(booking.id),
            bookingCode: String(
              booking.bookingCode || `MWY-${String(booking.id).padStart(6, "0")}`,
            ),
            refundType: policy.partialEligible ? "partial" : "full",
          },
        });
        stripeRefundId = stripeRefund?.id || null;
      }

      await transaction.update({
        refundedAmount: Number((txRefunded + refundAmount).toFixed(2)),
        metadata: {
          ...(transaction.metadata || {}),
          lastRefund: {
            bookingId: booking.id,
            amount: refundAmount,
            refundType: policy.partialEligible ? "partial" : "full",
            stripeRefundId,
            refundedAt: new Date().toISOString(),
          },
        },
      });
      refundType = policy.partialEligible ? "partial" : "full";
    }
  }

  await booking.update({
    cancelledAt: new Date(),
    status: "CANCELLED",
    refundedAmount: Number(
      (Number(booking.refundedAmount || 0) + Number(refundAmount || 0)).toFixed(
        2,
      ),
    ),
  });

  try {
    const user = await User.findByPk(booking.userId);
    if (user) {
      await sendCancellationConfirmation(booking, user);
    }
  } catch (err) {
    console.error("WhatsApp cancellation notification failed:", err);
  }

  return {
    success: true,
    data: {
      refundType,
      refundAmount,
      policy: {
        partialRefundCutoffHours: PARTIAL_REFUND_CUTOFF_HOURS,
        partialRefundPercent: PARTIAL_REFUND_PERCENT,
      },
    },
  };
};
export const cancelBooking = actionWrapper(cancelBookingHandler);

const verifyStripeSessionHandler = async (sessionId) => {
  if (!sessionId) throw new Error("No session ID");
  console.log("[PAYMENT] verifyStripeSession start", { sessionId });

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  console.log("[PAYMENT] Stripe session retrieved", {
    sessionId,
    paymentStatus: session.payment_status,
    transactionId: session.metadata?.transactionId,
  });

  if (session.payment_status === "paid") {
    const transactionId = session.metadata.transactionId;
    if (!transactionId) {
      throw new Error("Missing transaction ID in Stripe session metadata");
    }

    const transaction = await Transaction.findByPk(transactionId);
    if (!transaction) {
      console.error("[PAYMENT] verifyStripeSession transaction missing", {
        sessionId,
        transactionId,
      });
      throw new Error(`Transaction not found for id ${transactionId}`);
    }

    const shouldGenerateSideEffects = transaction.status !== "success";
    const confirmationAlreadySent = Boolean(
      transaction.metadata?.bookingConfirmationSentAt,
    );
    if (shouldGenerateSideEffects) {
      await transaction.update({
        status: "success",
        stripePaymentIntentId: session.payment_intent,
        paidAt: new Date(),
      });
    }

    // Always ensure bookings move out of DRAFT for paid sessions.
    await Booking.update(
      { status: "CONFIRMED" },
      { where: { transactionId: transaction.id } },
    );
    console.log("[PAYMENT] Bookings set to CONFIRMED", {
      sessionId,
      transactionId: transaction.id,
    });

    let invoiceUrl = transaction.invoiceUrl || null;

    if (shouldGenerateSideEffects || !invoiceUrl) {
      // Generate Invoice
      try {
        const user = await db.models.User.findByPk(transaction.userId);
        if (user) {
          const { generateAndUploadInvoice } = await import(
            "@/lib/helpers/invoice"
          );
          const generatedInvoiceUrl = await generateAndUploadInvoice(
            transaction,
            user,
          );
          if (generatedInvoiceUrl) {
            invoiceUrl = generatedInvoiceUrl;
            await transaction.update({ invoiceUrl: generatedInvoiceUrl });
          }
        }
      } catch (invoiceError) {
        console.error(
          "Error generating invoice in verifyStripeSession:",
          invoiceError,
        );
        // Don't fail the verification if invoice generation fails, just log it
      }

    }

    if (!confirmationAlreadySent) {
      try {
        const user = await db.models.User.findByPk(transaction.userId);
        if (user) {
          const confirmedBookings = await Booking.findAll({
            where: { transactionId: transaction.id },
          });
          const notifyResults = await Promise.allSettled(
            confirmedBookings.map((b) =>
              sendBookingConfirmation(b, user, {
                Invoice_URL: invoiceUrl || transaction.invoiceUrl || "",
              }),
            ),
          );
          notifyResults.forEach((result, idx) => {
            const bookingId = confirmedBookings[idx]?.id;
            if (result.status === "rejected") {
              console.error(
                `WhatsApp confirmation rejected for booking ${bookingId}:`,
                result.reason,
              );
              return;
            }
            if (!result.value?.success) {
              console.error(
                `WhatsApp confirmation failed for booking ${bookingId}:`,
                result.value?.error || "Unknown Twilio error",
              );
            }
          });

          const allNotificationsSuccessful = notifyResults.every(
            (result) => result.status === "fulfilled" && result.value?.success,
          );
          if (allNotificationsSuccessful) {
            await transaction.update({
              metadata: {
                ...(transaction.metadata || {}),
                bookingConfirmationSentAt: new Date().toISOString(),
              },
            });
            console.log("[PAYMENT] WhatsApp booking confirmations sent", {
              sessionId,
              transactionId: transaction.id,
              bookingCount: confirmedBookings.length,
            });
          } else {
            console.error("[PAYMENT] Some WhatsApp booking confirmations failed", {
              sessionId,
              transactionId: transaction.id,
              bookingCount: confirmedBookings.length,
            });
          }
        }
      } catch (notifyError) {
        console.error("WhatsApp booking confirmation failed:", notifyError);
      }
    }

    return {
      message: "Payment verified and bookings confirmed",
    };
  }
  return {};
};
export const verifyStripeSession = actionWrapper(verifyStripeSessionHandler);

const cancelBookingBySessionIdHandler = async (sessionId) => {
  if (!sessionId) throw new Error("No session ID provided");

  // Find transaction by session ID
  const transaction = await Transaction.findOne({
    where: { stripePaymentIntentId: sessionId }, // We stored session ID here temporarily
  });

  // If not found by stripePaymentIntentId, try to retrieve session from Stripe to get metadata
  // But we stored it in stripePaymentIntentId in createTransaction...
  // "await transaction.update({ stripePaymentIntentId: stripeSession.id });"
  // So this should work.

  if (!transaction) {
    // Fallback: retrieve from Stripe to find transaction ID in metadata
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session && session.metadata?.transactionId) {
      const tId = session.metadata.transactionId;
      const t = await Transaction.findByPk(tId);
      if (t) {
        await t.update({ status: "failed" });
        await Booking.update(
          { cancelledAt: new Date(), status: "CANCELLED" },
          { where: { transactionId: t.id } },
        );
        return { success: true };
      }
    }
    throw new Error("Transaction not found");
  }

  await transaction.update({ status: "failed" });
  await Booking.update(
    { cancelledAt: new Date(), status: "CANCELLED" },
    { where: { transactionId: transaction.id } },
  );

  return { success: true };
};
export const cancelBookingBySessionId = actionWrapper(
  cancelBookingBySessionIdHandler,
);

const completeBookingHandler = async (bookingId) => {
  const session = await auth();
  if (!session?.id) throw new Error("Unauthorized");

  const user = await db.models.User.findByPk(session.id);
  if (!user || user.role !== USER_ROLES.SUPERADMIN) {
    throw new Error("Unauthorized: Admin access required");
  }

  const booking = await Booking.findByPk(bookingId);

  if (!booking) throw new Error("Booking not found");

  await booking.update({
    completedAt: new Date(),
    status: "COMPLETED",
  });

  if (booking.transactionId) {
    const pendingBookingsCount = await Booking.count({
      where: {
        transactionId: booking.transactionId,
        status: { [Op.ne]: "COMPLETED" },
      },
    });

    if (pendingBookingsCount === 0) {
      await WalletTransaction.update(
        {
          status: "active",
          creditsAt: new Date(),
        },
        {
          where: {
            transactionId: booking.transactionId,
            status: "pending",
          },
        },
      );
    }
  }

  return { success: true };
};
export const completeBooking = actionWrapper(completeBookingHandler);
