"use server";

import "@/lib/db/relations";
import { Op } from "sequelize";
import Stripe from "stripe";
import { getDiscounts } from "@/lib/actions/discounts";
import {
  sendBookingConfirmation,
  sendCancellationConfirmation,
  sendRescheduleConfirmation,
} from "@/lib/actions/notifications";
import { actionWrapper } from "@/lib/actions/utils";
import { sequelize as db } from "@/lib/db/db";
import Booking from "@/lib/db/models/booking";
import BookingDeliveryFile from "@/lib/db/models/bookingdeliveryfile";
import BookingRevision from "@/lib/db/models/bookingrevision";
import DynamicConfig from "@/lib/db/models/dynamicconfig";
import Transaction from "@/lib/db/models/transaction";
import User from "@/lib/db/models/user";
import WalletTransaction from "@/lib/db/models/wallettransaction";
import { auth } from "@/lib/helpers/auth";
import {
  calculateBookingDuration,
  getBookingArrivalWindowFromDetails,
  getBookingBlockedPeriods,
} from "@/lib/helpers/bookingUtils";
import {
  BOOKING_WORKFLOW_STATUS,
  isBookingDispatched,
} from "@/lib/helpers/bookingWorkflow";
import {
  buildBookingReferenceFromId,
  formatBookingReference,
} from "@/lib/helpers/invoice-format";
import { getPricingConfig } from "@/lib/helpers/pricing";
import { calculateWalletCreditPreview } from "@/lib/helpers/promotionPricing";
import {
  buildTransactionPaymentSummary,
  getTransactionGrossAmount,
} from "@/lib/helpers/transactionPricing";
import {
  isAdminBookingHandoffExpired,
  isAdminBookingHandoffTransaction,
} from "@/lib/services/adminBookingHandoffState";
import {
  assertBookingPropertiesAvailable,
  calculatePropertyPrice,
  REVERSE_SLOT_MAPPING,
  SLOT_MAPPING,
  START_TIME_TO_SLOT,
} from "@/lib/services/bookingPreparation";
import {
  completeDeliveredBookingState,
  updateBookingWorkflowState,
} from "@/lib/services/bookingWorkflow";
import {
  DELIVERY_FILE_INCLUDE,
  finishBookingDeliveryState,
  requestFileRevisionState,
} from "@/lib/services/fileDelivery";
import {
  applyPromotionForCheckoutTransaction,
  PROMOTION_CHECKOUT_RESERVATION_WINDOW_MS,
  releasePromotionForCheckoutTransaction,
  reservePromotionForCheckoutTransaction,
} from "@/lib/services/promotionCheckout";
import {
  evaluateCheckoutPromotionPricing,
  isPromotionCodeValidationSuccessful,
} from "@/lib/services/promotionPricing";
import {
  enumerateDateRange,
  getBlockedSlotTimesForDate,
  normalizeTimeSlotConfig,
  PERIOD_TO_HOURLY,
} from "@/lib/services/schedulingAvailability";
import { USER_ROLES } from "../config/app.config";

let stripe;
if (process.env.STRIPE_SECRET_KEY)
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
else stripe = {};

const RESCHEDULE_CUTOFF_HOURS = 6;
const PARTIAL_REFUND_CUTOFF_HOURS = 3;
const PARTIAL_REFUND_PERCENT = 50;

const SERVICE_DELIVERY_ESTIMATES = {
  Photography: "Photos delivered within 24h",
  Videography: "Video walkthrough delivered within 24-48h",
  "360° Tour": "360° tour delivered within 48-72h",
};

const formatArrivalWindowLabel = (booking) => {
  if (!booking) return "";
  const dateLabel = booking.date
    ? new Date(`${booking.date}T00:00:00`).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";
  const arrivalWindow =
    getBookingArrivalWindowFromDetails({
      startTime: booking.startTime || "",
      slot: booking.slot,
      propertyType:
        booking?.propertyDetails?.type ||
        booking?.propertyDetails?.propertyType,
      propertySize:
        booking?.propertyDetails?.size ||
        booking?.propertyDetails?.propertySize,
      services: booking?.shootDetails?.services || [],
      videographySubService:
        booking?.propertyDetails?.videographySubService ||
        booking?.shootDetails?.videographySubService ||
        "",
    }) || "";
  const timeLabel =
    arrivalWindow ||
    booking.startTime ||
    REVERSE_SLOT_MAPPING[booking.slot] ||
    "";
  if (!dateLabel && !timeLabel) return "";
  return [dateLabel, timeLabel].filter(Boolean).join(" · ");
};

const formatDeliveryTimelineText = (services) => {
  if (!services || services.length === 0) {
    return "Delivery timeline will be shared shortly.";
  }
  const uniqueServices = Array.from(new Set(services));
  return uniqueServices
    .map((service) =>
      SERVICE_DELIVERY_ESTIMATES[service]
        ? SERVICE_DELIVERY_ESTIMATES[service]
        : `${service} delivery timing coming soon`,
    )
    .join(" · ");
};

const normalizeDisplayText = (value) =>
  String(value || "")
    .replace(/360(?:Â°|°)?\s*Tour/gi, "360° Tour")
    .replace(/_/g, " ")
    .trim();

const dedupeTextValues = (values) => {
  const seen = new Set();
  return values.filter((value) => {
    const normalized = String(value || "")
      .trim()
      .toLowerCase();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
};

const getBookingLocationLabel = (booking) => {
  const property = booking?.propertyDetails || {};
  const locationParts = dedupeTextValues(
    [
      property.unitNumber || property.unit || property.name,
      property.building,
      property.community,
    ].filter(Boolean),
  );

  return locationParts.join(", ");
};

const parseVideographySelections = (value) =>
  String(value || "")
    .split("|")
    .map((entry) => entry.trim())
    .filter(Boolean);

const formatServiceSelectionLabel = (service) => {
  const normalized = normalizeDisplayText(service);
  return normalized || "Service";
};

const formatVideographySelectionLabel = (selection) => {
  const detail = normalizeDisplayText(selection)
    .split(".")
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" - ");

  return detail ? `Videography - ${detail}` : "Videography";
};

const getUniqueBookingServices = (booking) =>
  Array.from(
    new Set(
      Array.isArray(booking?.shootDetails?.services)
        ? booking.shootDetails.services
        : [],
    ),
  );

const getSelectedBookingServiceLabels = (booking) => {
  const services = getUniqueBookingServices(booking);
  const videographySelections = parseVideographySelections(
    booking?.shootDetails?.videographySubService,
  );

  return dedupeTextValues(
    services.flatMap((service) => {
      if (service !== "Videography") {
        return [formatServiceSelectionLabel(service)];
      }

      if (videographySelections.length === 0) {
        return ["Videography"];
      }

      return videographySelections.map(formatVideographySelectionLabel);
    }),
  );
};

const buildBookingSummaryPayload = (booking, fallbackAmount = 0) => {
  if (!booking) return null;
  const property = booking.propertyDetails || {};
  const services = getSelectedBookingServiceLabels(booking);
  const deliveryServices = getUniqueBookingServices(booking).map(
    formatServiceSelectionLabel,
  );

  const propertyTitle = [
    property.propertySize || property.size,
    property.propertyType || property.type,
    property.community,
  ]
    .filter(Boolean)
    .join(" - ");

  return {
    bookingReference: formatBookingReference(booking),
    propertyTitle: propertyTitle || "Property booking",
    location: getBookingLocationLabel(booking),
    services: services.join(", "),
    arrivalWindow: formatArrivalWindowLabel(booking),
    deliveryTimeline: formatDeliveryTimelineText(deliveryServices),
    amount: Number(booking.total || fallbackAmount || 0),
  };
};

const toCents = (value) => Math.round(Number(value || 0) * 100);

const findBookingSubsetByAmount = (bookings, targetCents) => {
  const matches = [];
  const candidates = Array.isArray(bookings)
    ? bookings
        .map((booking) => ({
          booking,
          cents: toCents(booking?.total),
        }))
        .filter((entry) => entry.cents > 0)
    : [];

  const search = (index, total, selected) => {
    if (matches.length > 1) return;
    if (total === targetCents) {
      matches.push([...selected]);
      return;
    }
    if (index >= candidates.length || total > targetCents) return;

    const current = candidates[index];
    selected.push(current.booking);
    search(index + 1, total + current.cents, selected);
    selected.pop();
    search(index + 1, total, selected);
  };

  search(0, 0, []);

  return matches.length === 1 ? matches[0] : [];
};

const recoverTransactionBookings = async (transaction) => {
  const transactionCreatedAt = transaction?.createdAt
    ? new Date(transaction.createdAt)
    : null;
  const hasValidTimestamp =
    transactionCreatedAt instanceof Date &&
    !Number.isNaN(transactionCreatedAt.getTime());
  const expectedGrossCents = toCents(getTransactionGrossAmount(transaction));

  if (
    !transaction?.id ||
    !transaction?.userId ||
    !hasValidTimestamp ||
    expectedGrossCents <= 0
  ) {
    return [];
  }

  const windowStart = new Date(
    transactionCreatedAt.getTime() - 2 * 60 * 60 * 1000,
  );
  const windowEnd = new Date(transactionCreatedAt.getTime() + 15 * 60 * 1000);
  const candidates = await Booking.findAll({
    where: {
      userId: transaction.userId,
      status: { [Op.in]: ["DRAFT", "CONFIRMED"] },
      createdAt: { [Op.between]: [windowStart, windowEnd] },
      [Op.or]: [{ transactionId: null }, { transactionId: transaction.id }],
    },
    order: [
      ["createdAt", "DESC"],
      ["id", "DESC"],
    ],
  });

  const matchedBookings = findBookingSubsetByAmount(
    candidates,
    expectedGrossCents,
  );
  if (matchedBookings.length === 0) {
    console.warn("[PAYMENT] Unable to recover bookings for paid transaction", {
      transactionId: transaction.id,
      userId: transaction.userId,
      candidateCount: candidates.length,
      expectedGrossCents,
    });
    return [];
  }

  const matchedIds = matchedBookings.map((booking) => booking.id);
  await Booking.update(
    { transactionId: transaction.id, status: "CONFIRMED" },
    { where: { id: matchedIds } },
  );
  console.log("[PAYMENT] Recovered bookings for paid transaction", {
    transactionId: transaction.id,
    userId: transaction.userId,
    matchedIds,
  });

  return Booking.findAll({
    where: { id: matchedIds },
    order: [["id", "ASC"]],
  });
};

const buildDummyVerifyStripeSessionResponse = () => {
  const bookingSummaries = [
    {
      bookingReference: "MWB-1321",
      propertyTitle: "2 Bed Apartment - Dubai Marina",
      location: "1204, Marina Gate, Dubai Marina",
      services: "Photography, Videography",
      arrivalWindow: "17 Mar 2026 · 09:00",
      deliveryTimeline:
        "Photos delivered within 24h · Video walkthrough delivered within 24-48h",
      amount: 600,
    },
    {
      bookingReference: "MWB-1322",
      propertyTitle: "Villa - Palm Jumeirah",
      location: "Villa 14, Frond A, Palm Jumeirah",
      services: "360° Tour",
      arrivalWindow: "17 Mar 2026 · 13:00",
      deliveryTimeline: "360° tour delivered within 48-72h",
      amount: 650,
    },
  ];

  return {
    message: "Payment verified and bookings confirmed",
    paymentVerified: true,
    bookingSummary: bookingSummaries[0],
    bookingSummaries,
    bookingReferences: bookingSummaries.map(
      (summary) => summary.bookingReference,
    ),
    totalPaidAmount: bookingSummaries.reduce(
      (sum, summary) => sum + Number(summary.amount || 0),
      0,
    ),
    paymentSummary: {
      subtotal: bookingSummaries.reduce(
        (sum, summary) => sum + Number(summary.amount || 0),
        0,
      ),
      promotion: null,
      totalPaidAmount: bookingSummaries.reduce(
        (sum, summary) => sum + Number(summary.amount || 0),
        0,
      ),
    },
  };
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

  const [y, m, d] = String(dateStr)
    .split("-")
    .map((n) => parseInt(n, 10));
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
  const requiredPeriods = getBookingBlockedPeriods({
    startTime,
    durationHours,
    isNightService: Boolean(options.isNightService),
  });
  if (requiredPeriods.length === 0) return [];
  return requiredPeriods.flatMap((period) => PERIOD_TO_HOURLY[period] || []);
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
      if (
        isAdminBookingHandoffTransaction(booking.transaction) &&
        isAdminBookingHandoffExpired(booking.transaction)
      ) {
        return false;
      }

      // If transaction is pending or success, blocked
      if (["pending", "success"].includes(booking.transaction.status))
        return true;
      // If failed, not blocked
      return false;
    }

    // If no transaction, check 15 min rule
    const diff = Date.now() - new Date(booking.createdAt);
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
      const blockedByAdmin = getBlockedSlotTimesForDate(
        dateStr,
        timeSlotConfig,
      );
      if (blockedByAdmin.size === 0) return;
      if (!availabilityMap[dateStr]) {
        availabilityMap[dateStr] = new Set();
      }
      blockedByAdmin.forEach((slot) => {
        availabilityMap[dateStr].add(slot);
      });
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

        bSlots.forEach((slot) => {
          availabilityMap[dateStr].add(slot);
        });
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

const checkAvailability = async (
  properties,
  excludeBookingIds = [],
  { transaction = null } = {},
) =>
  assertBookingPropertiesAvailable(properties, excludeBookingIds, {
    transaction,
  });

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
        {
          model: BookingRevision,
          as: "revisions",
          separate: true,
          order: [["revisionNumber", "DESC"]],
        },
        {
          model: BookingDeliveryFile,
          as: "deliveryFiles",
          include: DELIVERY_FILE_INCLUDE,
          separate: true,
          order: [["createdAt", "ASC"]],
        },
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

export const rescheduleBookingByCode = actionWrapper(
  async (bookingCode, updateData) => {
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
    if (isBookingDispatched(booking)) {
      throw new Error("This booking can no longer be rescheduled");
    }

    const hoursUntil = getHoursUntilBooking(booking);
    if (
      typeof hoursUntil === "number" &&
      hoursUntil < RESCHEDULE_CUTOFF_HOURS
    ) {
      throw new Error(
        `Reschedule is allowed only up to ${RESCHEDULE_CUTOFF_HOURS} hours before shoot time.`,
      );
    }

    const selectedDate = updateData?.date || booking.date;
    const rawStart =
      updateData?.startTime ||
      updateData?.slot ||
      booking.startTime ||
      booking.slot;
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
    const videographySubService =
      normalizedShootDetails.videographySubService || "";
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

    await db.transaction(async (transaction) => {
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
        { transaction },
      );

      await booking.update(
        {
          date: selectedDate,
          startTime: normalizedStartTime,
          slot: slotNumber,
          duration: computedDuration,
          rescheduledAt: new Date(),
          rescheduleCount: (booking.rescheduleCount || 0) + 1,
        },
        { transaction },
      );
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
  },
);

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
        if (isAdminBookingHandoffTransaction(d.transaction)) {
          return false;
        }

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

  const pricingConfig = await getPricingConfig();

  return db.transaction(async (transaction) => {
    await Booking.destroy({
      where: {
        userId: userId,
        status: "DRAFT",
      },
      transaction,
    });

    const { timeSlotConfig } = await checkAvailability(properties, [], {
      transaction,
    });

    const createdBookings = [];

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

      const booking = await Booking.create(
        {
          userId: userId,
          shootDetails: {
            services: property.services,
            videographySubService: property.videographySubService || null,
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
          startTime:
            property.startTime ||
            (property.timeSlot === "morning"
              ? "09:00"
              : property.timeSlot === "afternoon"
                ? "13:00"
                : property.timeSlot === "evening"
                  ? "17:00"
                  : null),
          slot:
            SLOT_MAPPING[property.timeSlot] ||
            START_TIME_TO_SLOT[property.startTime] ||
            null,
          duration: property.duration || duration,
          total: price,
          status: "DRAFT",
        },
        { transaction },
      );
      createdBookings.push(booking);
    }

    for (const booking of createdBookings) {
      const bookingCode = buildBookingReferenceFromId(booking.id);
      await booking.update({ bookingCode }, { transaction });
    }

    return createdBookings.map((booking) => ({
      id: booking.id,
      bookingCode: booking.bookingCode,
    }));
  });
};
export const saveDrafts = actionWrapper(saveDraftsHandler);

export const createBookings = saveDrafts;

const previewPromotionPricingHandler = async (
  eligibleSubtotal,
  enteredCode,
) => {
  const session = await auth();

  return evaluateCheckoutPromotionPricing({
    userId: session?.id || null,
    eligibleSubtotal,
    enteredCode,
  });
};
export const previewPromotionPricing = actionWrapper(
  previewPromotionPricingHandler,
);

const createTransactionAndPaymentIntentHandler = async (
  bookingIds,
  couponCode,
  promotionContext = null,
) => {
  console.log("[PAYMENT] createTransactionAndPaymentIntent start", {
    bookingIds,
    hasPromotionCode: Boolean(couponCode),
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
    const missingBookingIds = bookingIds.filter(
      (id) => !foundBookingIds.includes(id),
    );
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
  const reservationExpiresAt = new Date(
    Date.now() + PROMOTION_CHECKOUT_RESERVATION_WINDOW_MS,
  );

  const normalizedPromotionCode = String(
    couponCode || promotionContext?.enteredCode || "",
  )
    .trim()
    .toUpperCase();
  const promotionPricing = await evaluateCheckoutPromotionPricing({
    userId,
    eligibleSubtotal: totalAmount,
    enteredCode: normalizedPromotionCode,
  });

  if (
    normalizedPromotionCode &&
    !isPromotionCodeValidationSuccessful(promotionPricing.codeValidation)
  ) {
    throw new Error(
      promotionPricing.codeValidation?.message || "Invalid promo code",
    );
  }

  // Wallet-credit rewards stay separate from promotion selection.
  const discountsRes = await getDiscounts();
  const discounts = discountsRes.success ? discountsRes.data : [];
  const walletPreview = calculateWalletCreditPreview(discounts, totalAmount);
  const promotionDeduction = Number(
    promotionPricing.selectedPromotion?.benefitAmount || 0,
  );
  const finalAmount = Math.max(0, totalAmount - promotionDeduction);

  // Create Transaction
  const transaction = await Transaction.create({
    userId: userId,
    amount: finalAmount, // Store the final amount to be paid
    status: "pending",
    couponId: null,
    couponDeduction: 0,
    bulkDeduction: 0,
    metadata: {
      appliedDiscounts: walletPreview.appliedDiscounts,
      creditExpiresAt: walletPreview.creditExpiresAt,
      bookingIds,
    },
  });

  if (walletPreview.amount > 0) {
    await WalletTransaction.create({
      userId: userId,
      amount: walletPreview.amount,
      creditExpiresAt: walletPreview.creditExpiresAt,
      status: "pending",
      transactionId: transaction.id,
    });
  }

  // Update Bookings with Transaction ID
  await Booking.update(
    { transactionId: transaction.id },
    { where: { id: bookingIds } },
  );

  try {
    if (promotionPricing.selectedPromotion) {
      await reservePromotionForCheckoutTransaction({
        transactionId: transaction.id,
        userId,
        bookingIds,
        eligibleSubtotal: totalAmount,
        selectedPromotion: promotionPricing.selectedPromotion,
        reservationExpiresAt,
      });
    }

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
      expires_at: Math.floor(reservationExpiresAt.getTime() / 1000),
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
  } catch (error) {
    await Transaction.update(
      { status: "failed" },
      { where: { id: transaction.id, status: "pending" } },
    );
    await Booking.update(
      { cancelledAt: null, status: "DRAFT" },
      {
        where: {
          transactionId: transaction.id,
          status: "DRAFT",
        },
      },
    );

    if (promotionPricing.selectedPromotion) {
      try {
        await releasePromotionForCheckoutTransaction({
          transactionId: transaction.id,
          reason: "checkout_session_create_failed",
        });
      } catch (releaseError) {
        console.error("Failed to release promotion after Stripe error", {
          transactionId: transaction.id,
          error: releaseError?.message || String(releaseError),
        });
      }
    }

    throw error;
  }
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
  if (isBookingDispatched(booking)) {
    throw new Error("This booking can no longer be cancelled");
  }
  if (
    booking.status === "COMPLETED" ||
    booking.workflowStatus === BOOKING_WORKFLOW_STATUS.PROJECT_COMPLETED
  ) {
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
            bookingCode: String(formatBookingReference(booking)),
            refundType: policy.partialEligible ? "partial" : "full",
          },
        });
        stripeRefundId = stripeRefund?.id || null;
      } else {
        // Payment intent not yet normalized (legacy session id kept in field).
        const stripeSession =
          await stripe.checkout.sessions.retrieve(paymentIntentId);
        if (!stripeSession?.payment_intent) {
          throw new Error("Unable to process refund for this booking.");
        }
        const stripeRefund = await stripe.refunds.create({
          payment_intent: stripeSession.payment_intent,
          amount: Math.round(refundAmount * 100),
          metadata: {
            bookingId: String(booking.id),
            bookingCode: String(formatBookingReference(booking)),
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

  if (
    process.env.NODE_ENV !== "production" &&
    String(sessionId).toLowerCase().startsWith("dummy-success")
  ) {
    console.log("[PAYMENT] Using dummy verifyStripeSession response", {
      sessionId,
    });
    return buildDummyVerifyStripeSessionResponse();
  }

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
    await applyPromotionForCheckoutTransaction({
      transactionId: transaction.id,
    });

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

    // Always run the invoice helper so stale invoices can be regenerated when
    // booking linkage is repaired later.
    try {
      const user = await db.models.User.findByPk(transaction.userId);
      if (user) {
        const { ensureTransactionInvoiceUrl } = await import(
          "@/lib/helpers/invoice"
        );
        const generatedInvoiceUrl = await ensureTransactionInvoiceUrl(
          transaction,
          user,
        );
        if (generatedInvoiceUrl) {
          invoiceUrl = generatedInvoiceUrl;
        }
      }
    } catch (invoiceError) {
      console.error(
        "Error generating invoice in verifyStripeSession:",
        invoiceError,
      );
      // Don't fail the verification if invoice generation fails, just log it
    }

    let confirmedBookings = await Booking.findAll({
      where: { transactionId: transaction.id },
    });
    const metadataBookingIds = Array.isArray(transaction.metadata?.bookingIds)
      ? transaction.metadata.bookingIds
          .map((id) => Number(id))
          .filter((id) => Number.isInteger(id) && id > 0)
      : [];
    if (confirmedBookings.length === 0 && metadataBookingIds.length > 0) {
      await Booking.update(
        { transactionId: transaction.id, status: "CONFIRMED" },
        { where: { id: metadataBookingIds, userId: transaction.userId } },
      );
      confirmedBookings = await Booking.findAll({
        where: { id: metadataBookingIds, userId: transaction.userId },
        order: [["id", "ASC"]],
      });
    }
    if (confirmedBookings.length === 0) {
      confirmedBookings = await recoverTransactionBookings(transaction);
    }

    if (!confirmationAlreadySent) {
      try {
        const user = await db.models.User.findByPk(transaction.userId);
        if (user) {
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
            console.error(
              "[PAYMENT] Some WhatsApp booking confirmations failed",
              {
                sessionId,
                transactionId: transaction.id,
                bookingCount: confirmedBookings.length,
              },
            );
          }
        }
      } catch (notifyError) {
        console.error("WhatsApp booking confirmation failed:", notifyError);
      }
    }

    const bookingSummaries = confirmedBookings
      .map((booking) => buildBookingSummaryPayload(booking))
      .filter(Boolean);
    const bookingReferences = confirmedBookings
      .map((booking) => formatBookingReference(booking))
      .filter(Boolean);
    const paymentSummary = buildTransactionPaymentSummary(
      transaction,
      bookingSummaries,
    );

    return {
      message: "Payment verified and bookings confirmed",
      paymentVerified: true,
      bookingSummary: bookingSummaries[0] || null,
      bookingSummaries,
      bookingReferences,
      totalPaidAmount: Number(transaction.amount || 0),
      paymentSummary,
    };
  }
  return {
    message: "Payment is still processing. Please refresh in a few seconds.",
    paymentVerified: false,
    bookingSummary: null,
    bookingSummaries: [],
    bookingReferences: [],
    totalPaidAmount: 0,
    paymentSummary: null,
  };
};
export const verifyStripeSession = actionWrapper(verifyStripeSessionHandler);

const cancelBookingBySessionIdHandler = async (sessionId) => {
  if (!sessionId) throw new Error("No session ID provided");

  const restoreDraftsForFailedCheckout = async (transaction) => {
    if (!transaction) throw new Error("Transaction not found");

    // If payment has already succeeded (webhook race/manual revisit), do not
    // downgrade paid bookings back to draft.
    if (transaction.status === "success") {
      return { restoredDrafts: false, alreadyPaid: true };
    }

    if (transaction.status !== "failed") {
      await transaction.update({ status: "failed" });
    }

    await releasePromotionForCheckoutTransaction({
      transactionId: transaction.id,
      reason: "checkout_cancelled",
    });

    await Booking.update(
      { cancelledAt: null, status: "DRAFT" },
      {
        where: {
          transactionId: transaction.id,
          status: { [Op.in]: ["DRAFT", "CANCELLED"] },
        },
      },
    );

    return { restoredDrafts: true, alreadyPaid: false };
  };

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
    if (session?.metadata?.transactionId) {
      const tId = session.metadata.transactionId;
      const t = await Transaction.findByPk(tId);
      if (t) {
        return restoreDraftsForFailedCheckout(t);
      }
    }
    throw new Error("Transaction not found");
  }

  return restoreDraftsForFailedCheckout(transaction);
};
export const cancelBookingBySessionId = actionWrapper(
  cancelBookingBySessionIdHandler,
);

const requireAdmin = async () => {
  const session = await auth();
  if (!session?.id) throw new Error("Unauthorized");

  const user = await db.models.User.findByPk(session.id);
  if (!user || user.role !== USER_ROLES.SUPERADMIN) {
    throw new Error("Unauthorized: Admin access required");
  }
  return session;
};

const updateBookingWorkflowHandler = async (bookingId, nextStatus) => {
  await requireAdmin();
  return updateBookingWorkflowState(bookingId, nextStatus);
};
export const updateBookingWorkflow = actionWrapper(
  updateBookingWorkflowHandler,
);

const completeDeliveredBookingHandler = async (bookingId) => {
  const session = await auth();
  if (!session?.id) throw new Error("Unauthorized");
  return completeDeliveredBookingState(bookingId, session.id);
};
export const completeDeliveredBooking = actionWrapper(
  completeDeliveredBookingHandler,
);

const requestFileRevisionHandler = async (fileId, note) => {
  const session = await auth();
  if (!session?.id) throw new Error("Unauthorized");
  return requestFileRevisionState(fileId, session.id, note);
};
export const requestFileRevision = actionWrapper(requestFileRevisionHandler);
export const requestBookingRevision = requestFileRevision;

const finishBookingDeliveryHandler = async (bookingId) => {
  await requireAdmin();
  return finishBookingDeliveryState(bookingId);
};
export const finishBookingDelivery = actionWrapper(
  finishBookingDeliveryHandler,
);
