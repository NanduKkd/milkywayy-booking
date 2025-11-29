"use server";

import "@/lib/db/relations";
import { Op } from "sequelize";
import Stripe from "stripe";
import { getDiscounts } from "@/lib/actions/discounts";
import { getPricingConfig } from "@/lib/helpers/pricing";
import { sequelize as db } from "@/lib/db/db";
import Booking from "@/lib/db/models/booking";
import Coupon from "@/lib/db/models/coupon";
import Transaction from "@/lib/db/models/transaction";
import WalletTransaction from "@/lib/db/models/wallettransaction";
import { auth } from "@/lib/helpers/auth";
import { actionWrapper } from "@/lib/actions/utils";
import { USER_ROLES } from "../config/app.config";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const SLOT_MAPPING = {
  morning: 1,
  afternoon: 2,
  evening: 3,
};

const REVERSE_SLOT_MAPPING = {
  1: "morning",
  2: "afternoon",
  3: "evening",
};

const isSlotBlocked = (booking) => {
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

    const blockedSlots = bookings
      .filter((b) => {
        // If it's the current user's draft, it doesn't count as unavailable for them
        if (
          currentUserId &&
          b.userId === currentUserId &&
          b.status === "DRAFT"
        ) {
          return false;
        }
        return isSlotBlocked(b);
      })
      .map((b) => REVERSE_SLOT_MAPPING[b.slot])
      .filter(Boolean);

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
        const slotName = REVERSE_SLOT_MAPPING[b.slot];
        if (slotName) {
          availabilityMap[dateStr].add(slotName);
          // Block subsequent slots based on duration
          const duration = b.duration || 1;
          for (let i = 1; i < duration; i++) {
            const nextSlot = b.slot + i;
            const nextSlotName = REVERSE_SLOT_MAPPING[nextSlot];
            if (nextSlotName) {
              availabilityMap[dateStr].add(nextSlotName);
            }
          }
        }
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

  for (const property of properties) {
    if (!property.preferredDate || !property.timeSlot) continue;

    const startSlot = SLOT_MAPPING[property.timeSlot];
    if (!startSlot) continue;

    // Calculate duration
    let duration = 1;
    if (property.propertyType && property.propertySize && property.services) {
      const typeConfig = pricingConfig[property.propertyType];
      const sizeConfig = typeConfig?.sizes.find(
        (s) => s.label === property.propertySize,
      );
      if (sizeConfig) {
        property.services.forEach((s) => {
          const sConfig = sizeConfig.prices[s];
          if (sConfig) {
            const sDuration =
              typeof sConfig === "object" ? sConfig.slots || 1 : 1;
            if (sDuration > duration) duration = sDuration;
          }
        });
      }
    }

    const requiredSlots = [];
    for (let i = 0; i < duration; i++) {
      requiredSlots.push(startSlot + i);
    }

    const whereClause = {
      date: property.preferredDate,
      // Check if ANY of the required slots are taken
      // We need to find bookings that overlap with our required slots.
      // A booking overlaps if:
      // booking.slot <= requiredEnd AND (booking.slot + booking.duration - 1) >= requiredStart
      // But here we are checking specific slots.
      // Simpler: Check if any existing booking covers any of our required slots.
      // Existing booking covers slot S if booking.slot <= S < booking.slot + booking.duration.
    };

    if (excludeBookingIds.length > 0) {
      whereClause.id = { [Op.notIn]: excludeBookingIds };
    }

    const existingBookings = await Booking.findAll({
      where: {
        date: property.preferredDate,
        [Op.and]: [whereClause.id ? { id: whereClause.id } : {}],
      },
      include: [{ model: Transaction, as: "transaction" }],
    });

    // Filter bookings that overlap
    const overlappingBookings = existingBookings.filter((b) => {
      const bStart = b.slot;
      const bEnd = b.slot + (b.duration || 1) - 1;
      const reqStart = startSlot;
      const reqEnd = startSlot + duration - 1;

      return Math.max(bStart, reqStart) <= Math.min(bEnd, reqEnd);
    });

    const isBlocked = overlappingBookings.some(isSlotBlocked);

    if (isBlocked) {
      throw new Error(
        `Slot ${property.timeSlot} on ${property.preferredDate} is no longer available.`,
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

  return property.services.reduce((total, service) => {
    const priceConfig = sizeConfig.prices[service];
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

const getDraftsHandler = async () => {
  try {
    const session = await auth();
    if (!session?.id) return [];

    const drafts = await Booking.findAll({
      where: {
        userId: session.id,
        status: "DRAFT",
      },
      order: [["id", "ASC"]],
    });

    return drafts.map((d) => d.get({ plain: true }));
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

    if (!session?.id) throw new Error("Unauthorized: Please login to save drafts");

    const userId = session.id;

    console.log(session, 'HHHHHHHHHHHH');



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

  for (const property of properties) {
    const price = calculatePropertyPrice(property, pricingConfig);

    // Calculate duration
    let duration = 1;
    if (property.propertyType && property.propertySize && property.services) {
      const typeConfig = pricingConfig[property.propertyType];
      const sizeConfig = typeConfig?.sizes.find(
        (s) => s.label === property.propertySize,
      );
      if (sizeConfig) {
        property.services.forEach((s) => {
          const sConfig = sizeConfig.prices[s];
          if (sConfig) {
            const sDuration =
              typeof sConfig === "object" ? sConfig.slots || 1 : 1;
            if (sDuration > duration) duration = sDuration;
          }
        });
      }
    }

    const booking = await Booking.create({
      userId: userId,
      shootDetails: { services: property.services },
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
      slot: SLOT_MAPPING[property.timeSlot] || null,
      duration: duration,
      total: price,
      status: "DRAFT",
    });
    createdBookings.push(booking);
  }

  return createdBookings.map((b) => b.id);
};
export const saveDrafts = actionWrapper(saveDraftsHandler);

export const createBookings = saveDrafts;

const createTransactionAndPaymentIntentHandler = async (

  bookingIds,

  couponCode,

) => {

    const session = await auth();

    if (!session?.id) throw new Error("Unauthorized");

    const userId = session.id;



    // Fetch bookings to calculate total and verify ownership


  const bookings = await Booking.findAll({
    where: {
      id: bookingIds,
      userId: userId,
    },
  });

  if (bookings.length !== bookingIds.length) {
    throw new Error("Some bookings not found or unauthorized");
  }

  // Check availability again (excluding these bookings)
  // We need to reconstruct the properties object for checkAvailability
  const propertiesToCheck = bookings.map((b) => ({
    preferredDate: b.date,
    timeSlot: REVERSE_SLOT_MAPPING[b.slot],
  }));
  await checkAvailability(propertiesToCheck, bookingIds);

  const totalAmount = bookings.reduce((sum, b) => Number(sum) + Number(b.total), 0);

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
  const stripeSession = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
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
  });

  if (!booking) throw new Error("Booking not found");

  await booking.update({
    cancelledAt: new Date(),
  });

  return { success: true };
};
export const cancelBooking = actionWrapper(cancelBookingHandler);

const verifyStripeSessionHandler = async (sessionId) => {
  if (!sessionId) throw new Error("No session ID");

  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status === "paid") {
    const transactionId = session.metadata.transactionId;

    if (transactionId) {
      const transaction = await Transaction.findByPk(transactionId);

      if (transaction && transaction.status !== "success") {
        await transaction.update({
          status: "success",
          stripePaymentIntentId: session.payment_intent,
          paidAt: new Date(),
        });

        await Booking.update(
          { status: "CONFIRMED" },
          { where: { transactionId: transaction.id } },
        );

        // Generate Invoice
        try {
          const user = await db.models.User.findByPk(transaction.userId);
          if (user) {
            const { generateAndUploadInvoice } = await import(
              "@/lib/helpers/invoice"
            );
            const invoiceUrl = await generateAndUploadInvoice(
              transaction,
              user,
            );
            if (invoiceUrl) {
              await transaction.update({ invoiceUrl });
            }
          }
        } catch (invoiceError) {
          console.error(
            "Error generating invoice in verifyStripeSession:",
            invoiceError,
          );
          // Don't fail the verification if invoice generation fails, just log it
        }

        return {
          message: "Payment verified and bookings confirmed",
        };
      }
    }
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
          { cancelledAt: new Date() },
          { where: { transactionId: t.id } },
        );
        return { success: true };
      }
    }
    throw new Error("Transaction not found");
  }

  await transaction.update({ status: "failed" });
  await Booking.update(
    { cancelledAt: new Date() },
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
