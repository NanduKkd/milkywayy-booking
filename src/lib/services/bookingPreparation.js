import {
  calculateBookingDuration,
  getBookingArrivalWindowFromDetails,
} from "@/lib/helpers/bookingUtils";
import { isDateOutsideRollingWindow } from "@/lib/services/schedulingAvailability";
import {
  assertSchedulingRequestsAvailable,
  loadSchedulingConflictContext,
  SchedulingConflictError,
} from "@/lib/services/schedulingConflictRevalidation";

export const SLOT_MAPPING = {
  morning: 1,
  afternoon: 2,
  evening: 3,
};

export const START_TIME_TO_SLOT = {
  "09:00": 1,
  "13:00": 2,
  "17:00": 3,
  "10:00": 1,
  "16:00": 3,
};

export const REVERSE_SLOT_MAPPING = {
  1: "morning",
  2: "afternoon",
  3: "evening",
};

export const START_TIME_TO_PERIOD = {
  "09:00": "morning",
  "13:00": "afternoon",
  "17:00": "evening",
  "10:00": "morning",
  "16:00": "evening",
};

export function isNightServiceFromProperty(property) {
  const services = Array.isArray(property?.services) ? property.services : [];
  if (!services.includes("Videography")) return false;
  const sub = property?.videographySubService || "";
  return sub.includes("Night Light") || sub.includes("Daylight + Night");
}

export function calculatePropertyPrice(property, pricingConfig) {
  if (!property.propertyType || !property.propertySize || !property.services) {
    return 0;
  }

  const typeConfig = pricingConfig[property.propertyType];
  if (!typeConfig) return 0;

  const sizeConfig = typeConfig.sizes.find(
    (size) => size.label === property.propertySize,
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
    .map((value) => value.trim())
    .filter(Boolean);

  return property.services.reduce((total, service) => {
    const priceConfig = sizeConfig.prices[service];

    if (
      service === "Videography" &&
      property.videographySubService &&
      typeof priceConfig === "object"
    ) {
      const videographyTotal = videographySelections.reduce(
        (sum, selection) => {
          const config = resolveVideographyPriceConfig(priceConfig, selection);
          const value =
            typeof config === "object"
              ? Number(config?.price || 0)
              : Number(config || 0);
          return sum + (Number.isFinite(value) ? value : 0);
        },
        0,
      );
      return total + videographyTotal;
    }

    const price =
      typeof priceConfig === "object"
        ? priceConfig.price || 0
        : priceConfig || 0;
    return total + price;
  }, 0);
}

export function getBookingDurationForProperty(property, timeSlotConfig) {
  const explicitDuration = Number(property?.duration);
  if (Number.isFinite(explicitDuration) && explicitDuration > 0) {
    return explicitDuration;
  }

  return calculateBookingDuration(
    {
      id: property?.services || [],
      videographySubService: property?.videographySubService || "",
    },
    {
      type: property?.propertyType,
      size: property?.propertySize,
      videographySubService: property?.videographySubService || "",
    },
    {
      slotCapacity: timeSlotConfig?.systemSettings?.slotCapacity,
      weightModel: timeSlotConfig?.systemSettings?.weightModel,
    },
  );
}

export function normalizePreparedPropertyStartTime(property) {
  const rawStartTime = property?.startTime || property?.timeSlot || "";

  if (START_TIME_TO_SLOT[rawStartTime]) {
    return rawStartTime;
  }

  if (
    rawStartTime === "morning" ||
    rawStartTime === 1 ||
    rawStartTime === "1"
  ) {
    return "09:00";
  }

  if (
    rawStartTime === "afternoon" ||
    rawStartTime === 2 ||
    rawStartTime === "2"
  ) {
    return "13:00";
  }

  if (
    rawStartTime === "evening" ||
    rawStartTime === 3 ||
    rawStartTime === "3"
  ) {
    return "17:00";
  }

  return String(rawStartTime || "");
}

export function buildPreparedPropertySummary(
  property,
  pricingConfig,
  timeSlotConfig,
) {
  const normalizedStartTime = normalizePreparedPropertyStartTime(property);
  const durationHours = getBookingDurationForProperty(property, timeSlotConfig);
  const total = calculatePropertyPrice(property, pricingConfig);

  return {
    propertyType: property.propertyType,
    propertySize: property.propertySize,
    services: Array.isArray(property.services) ? property.services : [],
    videographySubService: property.videographySubService || "",
    preferredDate: property.preferredDate,
    startTime: normalizedStartTime,
    durationHours,
    total,
    building: property.building || "",
    community: property.community || "",
    unitNumber: property.unitNumber || "",
    arrivalWindow: getBookingArrivalWindowFromDetails({
      startTime: normalizedStartTime,
      slot:
        property.timeSlot ||
        REVERSE_SLOT_MAPPING[START_TIME_TO_SLOT[normalizedStartTime]] ||
        "",
      propertyType: property.propertyType,
      propertySize: property.propertySize,
      services: property.services || [],
      videographySubService: property.videographySubService || "",
    }),
  };
}

export async function assertBookingPropertiesAvailable(
  properties,
  excludeBookingIds = [],
  { transaction = null } = {},
) {
  const datesToCheck = [
    ...new Set(
      (Array.isArray(properties) ? properties : [])
        .map((property) => property.preferredDate)
        .filter(Boolean),
    ),
  ];
  const schedulingContext = await loadSchedulingConflictContext({
    dates: datesToCheck,
    transaction,
  });
  const timeSlotConfig = schedulingContext.timeSlotConfig;
  const normalizedRequests = [];

  for (const property of properties) {
    if (!property.preferredDate) continue;

    if (isDateOutsideRollingWindow(property.preferredDate, timeSlotConfig)) {
      throw new Error(
        `Selected date ${property.preferredDate} is outside the booking window.`,
      );
    }

    const startTime = normalizePreparedPropertyStartTime(property);
    if (!startTime) continue;

    const durationHours = getBookingDurationForProperty(
      property,
      timeSlotConfig,
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

    normalizedRequests.push({
      type: "booking",
      date: property.preferredDate,
      startTime,
      durationHours,
      isNightService: isNightCompatible,
    });
  }

  try {
    assertSchedulingRequestsAvailable({
      context: schedulingContext,
      requests: normalizedRequests,
      excludeBookingIds,
    });
  } catch (error) {
    if (error instanceof SchedulingConflictError) {
      const conflictDate =
        error.conflicts?.[0]?.date || normalizedRequests[0]?.date;

      if (error.reasonCode === "schedule_conflict_blocked_period") {
        throw new Error(
          `Selected time on ${conflictDate} is blocked by admin calendar rules.`,
        );
      }

      throw new Error(
        `Selected time on ${conflictDate} is no longer available.`,
      );
    }

    throw error;
  }

  return {
    schedulingContext,
    timeSlotConfig,
  };
}
