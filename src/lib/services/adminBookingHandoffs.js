import { randomUUID } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { Op } from "sequelize";
import Stripe from "stripe";
import { z } from "zod";
import { getDiscounts } from "@/lib/actions/discounts";
import { USER_ROLES } from "@/lib/config/app.config";
import { sessionConfig } from "@/lib/config/session";
import { sequelize } from "@/lib/db/db";
import "@/lib/db/relations";
import Booking from "@/lib/db/models/booking";
import Transaction from "@/lib/db/models/transaction";
import User from "@/lib/db/models/user";
import WalletTransaction from "@/lib/db/models/wallettransaction";
import {
  buildBookingReferenceFromId,
  formatBookingReference,
} from "@/lib/helpers/invoice-format";
import { calculateWalletCreditPreview } from "@/lib/helpers/promotionPricing";
import { adminBookingNewCustomerSchema } from "@/lib/services/adminBookingCustomerValidation";
import { sendAdminBookingHandoffWhatsApp } from "@/lib/services/adminBookingHandoffNotifications";
import {
  ADMIN_BOOKING_HANDOFF_TTL_MS,
  getAdminBookingHandoffBookingIds,
  getAdminBookingHandoffMetadata,
  isAdminBookingHandoffCheckoutAllowed,
  isAdminBookingHandoffExpired,
  mergeAdminBookingHandoffMetadata,
} from "@/lib/services/adminBookingHandoffState";
import {
  buildPreparedPropertySummary,
  START_TIME_TO_SLOT,
} from "@/lib/services/bookingPreparation";
import {
  sendCustomerOtp,
  verifyCustomerOtp,
} from "@/lib/services/customerAuth";
import {
  consumeRateLimit,
  RateLimitExceededError,
} from "@/lib/services/oauthRateLimits";
import {
  releasePromotionForCheckoutTransaction,
  reservePromotionForCheckoutTransaction,
} from "@/lib/services/promotionCheckout";
import {
  evaluateCheckoutPromotionPricing,
  isPromotionCodeValidationSuccessful,
} from "@/lib/services/promotionPricing";
import { loadSchedulingConflictContext } from "@/lib/services/schedulingConflictRevalidation";
import { previewAdminBookingPreparation } from "./adminBookingPreparation";

const HANDOFF_TOKEN_AUDIENCE = "admin-booking-handoff";
const HANDOFF_TOKEN_ISSUER = "milkywayy";
const HANDOFF_PROMOTION_PREVIEW_LIMITS = {
  token: {
    bucketType: "booking-handoff-preview-token",
    limit: 120,
    windowMs: 60 * 1000,
  },
  source: {
    bucketType: "booking-handoff-preview-source",
    limit: 180,
    windowMs: 60 * 1000,
  },
};
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

function assertAuthorizedActor(actorUser) {
  if (!actorUser?.id) {
    throw new Error("Unauthorized");
  }

  if (actorUser.role !== USER_ROLES.SUPERADMIN) {
    throw new Error("Unauthorized: Scheduling calendar admin access required");
  }

  return {
    id: Number(actorUser.id),
    role: actorUser.role,
  };
}

function normalizeOptionalString(value) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function normalizePhone(value) {
  return String(value ?? "")
    .replace(/\s/g, "")
    .trim();
}

function buildCustomerSnapshotFromUser(user) {
  if (!user) return null;

  const plainUser =
    typeof user.get === "function" ? user.get({ plain: true }) : user;

  return {
    id: plainUser.id ?? null,
    accountType: plainUser.accountType || "INDIVIDUAL",
    fullName: plainUser.fullName || null,
    companyName: plainUser.companyName || null,
    billingAddress: plainUser.billingAddress || null,
    trn: plainUser.trn || null,
    email: plainUser.email || null,
    phone: plainUser.phone || null,
    displayName:
      plainUser.accountType === "COMPANY"
        ? plainUser.companyName || plainUser.fullName || plainUser.email || ""
        : plainUser.fullName || plainUser.email || plainUser.phone || "",
  };
}

function buildContactDetails(customerSnapshot) {
  return {
    name:
      customerSnapshot?.accountType === "COMPANY"
        ? customerSnapshot.companyName || customerSnapshot.fullName || ""
        : customerSnapshot.fullName ||
          customerSnapshot.companyName ||
          customerSnapshot.email ||
          "",
    phone: customerSnapshot?.phone || "",
    email: customerSnapshot?.email || "",
  };
}

function buildEditablePropertyFromBooking(booking) {
  return {
    propertyType:
      booking?.propertyDetails?.type ||
      booking?.propertyDetails?.propertyType ||
      "",
    propertySize:
      booking?.propertyDetails?.size ||
      booking?.propertyDetails?.propertySize ||
      "",
    services: Array.isArray(booking?.shootDetails?.services)
      ? booking.shootDetails.services
      : [],
    videographySubService: booking?.shootDetails?.videographySubService || "",
    preferredDate: booking?.date || "",
    timeSlot:
      booking?.slot === 1
        ? "morning"
        : booking?.slot === 2
          ? "afternoon"
          : booking?.slot === 3
            ? "evening"
            : "",
    startTime: booking?.startTime || "",
    duration: Number(booking?.duration || 0),
    building: booking?.propertyDetails?.building || "",
    community: booking?.propertyDetails?.community || "",
    unitNumber:
      booking?.propertyDetails?.unit ||
      booking?.propertyDetails?.unitNumber ||
      "",
  };
}

function buildPreparedPropertyResponse(
  property,
  pricingConfig,
  timeSlotConfig,
) {
  const prepared = buildPreparedPropertySummary(
    property,
    pricingConfig,
    timeSlotConfig,
  );

  const services = Array.isArray(prepared.services) ? prepared.services : [];
  const videographySelections = String(prepared.videographySubService || "")
    .split("|")
    .map((value) => value.trim())
    .filter(Boolean);
  const serviceLabel = services
    .map((service) =>
      service === "Videography" && videographySelections.length > 0
        ? `Videography (${videographySelections.join(", ")})`
        : service,
    )
    .join(", ");

  return {
    ...prepared,
    label: [prepared.propertySize, prepared.propertyType]
      .filter(Boolean)
      .join(" "),
    locationLabel: [prepared.unitNumber, prepared.building, prepared.community]
      .filter(Boolean)
      .join(", "),
    serviceLabel,
  };
}

async function buildPropertyPreviews(previewProperties, transaction) {
  if (!Array.isArray(previewProperties) || previewProperties.length === 0) {
    return [];
  }

  const { getPricingConfig } = await import("@/lib/helpers/pricing");
  const pricingConfig = await getPricingConfig();
  const dates = [
    ...new Set(
      previewProperties
        .map((property) => property.preferredDate)
        .filter(Boolean),
    ),
  ];
  const { timeSlotConfig } = await loadSchedulingConflictContext({
    dates,
    transaction,
  });

  return previewProperties.map((property) =>
    buildPreparedPropertyResponse(property, pricingConfig, timeSlotConfig),
  );
}

async function issueHandoffToken({ transactionId, version }) {
  return new SignJWT({
    transactionId: Number(transactionId),
    version: String(version),
    purpose: HANDOFF_TOKEN_AUDIENCE,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(HANDOFF_TOKEN_ISSUER)
    .setAudience(HANDOFF_TOKEN_AUDIENCE)
    .setExpirationTime("30d")
    .sign(sessionConfig.key);
}

async function verifyHandoffToken(token) {
  const { payload } = await jwtVerify(token, sessionConfig.key, {
    issuer: HANDOFF_TOKEN_ISSUER,
    audience: HANDOFF_TOKEN_AUDIENCE,
  });

  return {
    transactionId: Number(payload.transactionId || 0),
    version: String(payload.version || ""),
  };
}

function buildHandoffUrl(token) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  return new URL(`/booking/handoff/${token}`, baseUrl).toString();
}

async function expireCheckoutSession(sessionId) {
  if (!stripe || !sessionId || !String(sessionId).startsWith("cs_")) {
    return;
  }

  try {
    await stripe.checkout.sessions.expire(sessionId);
  } catch (error) {
    if (!String(error?.message || "").includes("already expired")) {
      console.error("Failed to expire Stripe checkout session", {
        error: error?.message || String(error),
      });
    }
  }
}

function normalizeRequestSource(requestSource) {
  const normalized = String(requestSource ?? "").trim();
  return normalized || "unknown";
}

async function applyHandoffPromotionPreviewRateLimits({
  token,
  requestSource,
  now,
}) {
  await consumeRateLimit({
    ...HANDOFF_PROMOTION_PREVIEW_LIMITS.token,
    key: `token:${token}`,
    now,
  });
  await consumeRateLimit({
    ...HANDOFF_PROMOTION_PREVIEW_LIMITS.source,
    key: `source:${normalizeRequestSource(requestSource)}`,
    now,
  });
}

async function ensureUniqueCustomerIdentity(
  customerInput,
  { excludeUserId = null, transaction = null } = {},
) {
  const normalizedPhone = normalizePhone(customerInput.phone);
  const normalizedEmail = normalizeOptionalString(customerInput.email);

  const phoneWhere = {
    phone: normalizedPhone,
  };
  const emailWhere = normalizedEmail
    ? {
        email: normalizedEmail,
      }
    : null;

  if (excludeUserId) {
    phoneWhere.id = { [Op.ne]: Number(excludeUserId) };
    if (emailWhere) {
      emailWhere.id = { [Op.ne]: Number(excludeUserId) };
    }
  }

  const [phoneMatch, emailMatch] = await Promise.all([
    User.findOne({ where: phoneWhere, transaction }),
    normalizedEmail
      ? User.findOne({ where: emailWhere, transaction })
      : Promise.resolve(null),
  ]);

  if (phoneMatch) {
    throw new Error("An account with this phone number already exists");
  }

  if (emailMatch) {
    throw new Error("An account with this email already exists");
  }
}

async function upsertNewCustomerForHandoff(
  customerInput,
  { existingUser = null, transaction = null } = {},
) {
  const normalized = adminBookingNewCustomerSchema.parse(customerInput || {});
  const payload = {
    accountType: normalized.accountType,
    fullName:
      normalized.accountType === "COMPANY"
        ? normalizeOptionalString(normalized.fullName)
        : normalizeOptionalString(normalized.fullName),
    companyName:
      normalized.accountType === "COMPANY"
        ? normalizeOptionalString(normalized.companyName)
        : null,
    billingAddress:
      normalized.accountType === "COMPANY"
        ? normalizeOptionalString(normalized.billingAddress)
        : null,
    trn:
      normalized.accountType === "COMPANY"
        ? normalizeOptionalString(normalized.trn)
        : null,
    email: normalizeOptionalString(normalized.email),
    phone: normalizePhone(normalized.phone),
    role: USER_ROLES.CUSTOMER,
  };

  await ensureUniqueCustomerIdentity(payload, {
    excludeUserId: existingUser?.id || null,
    transaction,
  });

  if (existingUser) {
    await existingUser.update(payload, { transaction });
    return existingUser;
  }

  return User.create(payload, { transaction });
}

function buildBookingPayload(
  preparedProperty,
  customerSnapshot,
  userId,
  transactionId,
) {
  return {
    userId,
    transactionId,
    shootDetails: {
      services: preparedProperty.services,
      videographySubService: preparedProperty.videographySubService || null,
    },
    propertyDetails: {
      type: preparedProperty.propertyType,
      size: preparedProperty.propertySize,
      building: preparedProperty.building,
      community: preparedProperty.community,
      unit: preparedProperty.unitNumber,
    },
    contactDetails: buildContactDetails(customerSnapshot),
    date: preparedProperty.preferredDate,
    startTime: preparedProperty.startTime,
    slot: START_TIME_TO_SLOT[preparedProperty.startTime] || null,
    duration: preparedProperty.durationHours,
    total: preparedProperty.total,
    status: "DRAFT",
    cancelledAt: null,
  };
}

async function syncReservationBookings({
  transactionRecord,
  preparedProperties,
  customerSnapshot,
  transaction,
}) {
  const existingBookings = await Booking.findAll({
    where: { transactionId: transactionRecord.id },
    order: [["id", "ASC"]],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  const retainedBookingIds = [];

  for (const [index, property] of preparedProperties.entries()) {
    const payload = buildBookingPayload(
      property,
      customerSnapshot,
      Number(transactionRecord.userId),
      Number(transactionRecord.id),
    );
    const existingBooking = existingBookings[index];

    if (existingBooking) {
      await existingBooking.update(payload, { transaction });
      retainedBookingIds.push(Number(existingBooking.id));
      continue;
    }

    const createdBooking = await Booking.create(payload, { transaction });
    const bookingCode = buildBookingReferenceFromId(createdBooking.id);
    await createdBooking.update({ bookingCode }, { transaction });
    retainedBookingIds.push(Number(createdBooking.id));
  }

  const staleBookings = existingBookings.slice(preparedProperties.length);
  if (staleBookings.length > 0) {
    await Booking.destroy({
      where: {
        id: staleBookings.map((booking) => Number(booking.id)),
      },
      transaction,
    });
  }

  return retainedBookingIds;
}

async function resolveTransactionFromToken(token, { transaction = null } = {}) {
  const decoded = await verifyHandoffToken(token);

  if (!decoded.transactionId || !decoded.version) {
    throw new Error("Invalid booking handoff link");
  }

  const transactionRecord = await Transaction.findByPk(decoded.transactionId, {
    include: [{ model: User, as: "user" }],
    transaction,
    lock: transaction
      ? { level: transaction.LOCK.UPDATE, of: Transaction }
      : undefined,
  });

  if (!transactionRecord) {
    throw new Error("Booking handoff not found");
  }

  const handoffMetadata = getAdminBookingHandoffMetadata(transactionRecord);
  if (!handoffMetadata || handoffMetadata.version !== decoded.version) {
    throw new Error("This booking handoff link is no longer active");
  }

  return {
    transactionRecord,
    handoffMetadata,
  };
}

function assertHandoffPricingAccess(transactionRecord, handoffMetadata) {
  if (transactionRecord.status === "success") {
    throw new Error("This booking handoff has already been paid");
  }

  if (isAdminBookingHandoffExpired(transactionRecord)) {
    throw new Error("This booking handoff link has expired");
  }

  if (!isAdminBookingHandoffCheckoutAllowed(transactionRecord)) {
    throw new Error("Phone verification is required before pricing or payment");
  }

  if (!transactionRecord.user || !transactionRecord.userId) {
    throw new Error("Customer not found");
  }

  if (Number(transactionRecord.user.id) !== Number(transactionRecord.userId)) {
    throw new Error("Customer ownership could not be verified");
  }

  if (transactionRecord.user.role !== USER_ROLES.CUSTOMER) {
    throw new Error("Customer ownership could not be verified");
  }

  return handoffMetadata;
}

async function buildHandoffResponse(
  transactionRecord,
  { transaction = null } = {},
) {
  const handoffMetadata = getAdminBookingHandoffMetadata(transactionRecord);
  const customerUser =
    transactionRecord.user ||
    (await User.findByPk(transactionRecord.userId, { transaction }));
  const bookings = await Booking.findAll({
    where: { transactionId: transactionRecord.id },
    order: [["id", "ASC"]],
    transaction,
  });
  const editableProperties = bookings.map(buildEditablePropertyFromBooking);
  const propertyPreviews = await buildPropertyPreviews(
    editableProperties,
    transaction,
  );
  const totalAmount = propertyPreviews.reduce(
    (sum, property) => sum + Number(property.total || 0),
    0,
  );

  return {
    transactionId: Number(transactionRecord.id),
    paymentStatus: transactionRecord.status,
    expiresAt: handoffMetadata?.expiresAt || null,
    requiresRegistration: Boolean(handoffMetadata?.requiresRegistration),
    registrationVerifiedAt: handoffMetadata?.registrationVerifiedAt || null,
    isExpired: isAdminBookingHandoffExpired(transactionRecord),
    customer: buildCustomerSnapshotFromUser(customerUser),
    properties: editableProperties,
    propertyPreviews,
    totalAmount,
    bookingReferences: bookings.map((booking) =>
      formatBookingReference(booking),
    ),
  };
}

async function resetCheckoutArtifacts(transactionRecord) {
  if (!transactionRecord) return;

  await expireCheckoutSession(transactionRecord.stripePaymentIntentId);

  try {
    await releasePromotionForCheckoutTransaction({
      transactionId: transactionRecord.id,
      reason: "admin_booking_handoff_checkout_reset",
    });
  } catch (error) {
    console.error("Failed to release promotion for booking handoff reset", {
      transactionId: transactionRecord.id,
      error: error?.message || String(error),
    });
  }

  await WalletTransaction.destroy({
    where: {
      transactionId: transactionRecord.id,
      status: "pending",
    },
  });

  await transactionRecord.update({
    promotionId: null,
    promotionRedemptionId: null,
    promotionSnapshot: null,
    stripePaymentIntentId: null,
  });
}

async function resetCheckoutArtifactsInTransaction(
  transactionRecord,
  transaction,
) {
  await releasePromotionForCheckoutTransaction({
    transactionId: transactionRecord.id,
    reason: "admin_booking_handoff_checkout_reset",
    transaction,
  });
  await WalletTransaction.destroy({
    where: {
      transactionId: transactionRecord.id,
      status: "pending",
    },
    transaction,
  });
  await transactionRecord.update(
    {
      promotionId: null,
      promotionRedemptionId: null,
      promotionSnapshot: null,
      stripePaymentIntentId: null,
    },
    { transaction },
  );
}

export async function createAdminBookingHandoff({
  actorUser,
  input,
  transactionId = null,
  sendWhatsApp = false,
} = {}) {
  const actor = assertAuthorizedActor(actorUser);
  const now = new Date();
  const nextVersion = randomUUID();
  const expiresAt = new Date(now.getTime() + ADMIN_BOOKING_HANDOFF_TTL_MS);

  if (transactionId) {
    const existingTransaction = await Transaction.findByPk(transactionId, {
      include: [{ model: User, as: "user" }],
    });

    if (!existingTransaction) {
      throw new Error("Booking handoff not found");
    }

    const existingMetadata =
      getAdminBookingHandoffMetadata(existingTransaction);
    if (!existingMetadata) {
      throw new Error("Booking handoff not found");
    }

    if (existingTransaction.status === "success") {
      throw new Error("Paid booking handoffs cannot be regenerated");
    }

    await resetCheckoutArtifacts(existingTransaction);
  }

  const result = await sequelize.transaction(async (transaction) => {
    const currentTransaction = transactionId
      ? await Transaction.findByPk(transactionId, {
          include: [{ model: User, as: "user" }],
          transaction,
          lock: { level: transaction.LOCK.UPDATE, of: Transaction },
        })
      : null;

    const customerMode = input?.customerMode === "new" ? "new" : "existing";
    let customerUser = currentTransaction?.user || null;

    if (customerMode === "new") {
      customerUser = await upsertNewCustomerForHandoff(input?.customer, {
        existingUser: currentTransaction?.user || null,
        transaction,
      });
    } else {
      customerUser = await User.findOne({
        where: {
          id: Number(input?.customerId || currentTransaction?.userId || 0),
          role: USER_ROLES.CUSTOMER,
        },
        transaction,
        lock: currentTransaction ? transaction.LOCK.UPDATE : undefined,
      });
    }

    if (!customerUser) {
      throw new Error("Customer not found");
    }

    const preparedPreview = await previewAdminBookingPreparation({
      actorUser: actor,
      input:
        customerMode === "existing"
          ? {
              customerMode: "existing",
              customerId: customerUser.id,
              properties: input?.properties || [],
            }
          : {
              customerMode: "new",
              customer: buildCustomerSnapshotFromUser(customerUser),
              properties: input?.properties || [],
            },
      excludeBookingIds: currentTransaction
        ? getAdminBookingHandoffBookingIds(currentTransaction)
        : [],
      transaction,
    });

    const handoffMetadata = {
      version: nextVersion,
      customerMode,
      requiresRegistration: customerMode === "new",
      registrationVerifiedAt:
        customerMode === "new"
          ? null
          : currentTransaction
            ? getAdminBookingHandoffMetadata(currentTransaction)
                ?.registrationVerifiedAt || now
            : now,
      createdByUserId: actor.id,
      generatedAt: now,
      expiresAt,
    };

    const transactionRecord =
      currentTransaction ||
      (await Transaction.create(
        {
          userId: customerUser.id,
          amount: preparedPreview.totalAmount,
          status: "pending",
          couponId: null,
          couponDeduction: 0,
          bulkDeduction: 0,
          walletDeduction: 0,
          metadata: mergeAdminBookingHandoffMetadata(
            {
              bookingIds: [],
            },
            handoffMetadata,
          ),
        },
        { transaction },
      ));

    const bookingIds = await syncReservationBookings({
      transactionRecord,
      preparedProperties: preparedPreview.properties,
      customerSnapshot: buildCustomerSnapshotFromUser(customerUser),
      transaction,
    });

    await transactionRecord.update(
      {
        userId: customerUser.id,
        amount: preparedPreview.totalAmount,
        status: "pending",
        stripePaymentIntentId: null,
        metadata: mergeAdminBookingHandoffMetadata(
          {
            ...(transactionRecord.metadata || {}),
            bookingIds,
          },
          handoffMetadata,
        ),
      },
      { transaction },
    );

    const token = await issueHandoffToken({
      transactionId: transactionRecord.id,
      version: nextVersion,
    });
    const response = await buildHandoffResponse(transactionRecord, {
      transaction,
    });

    return {
      ...response,
      token,
      url: buildHandoffUrl(token),
    };
  });

  if (!sendWhatsApp) {
    return result;
  }

  const notification = await sendAdminBookingHandoffWhatsApp({
    customer: result.customer,
    propertyPreviews: result.propertyPreviews,
    url: result.url,
    expiresAt: result.expiresAt,
    requiresRegistration: result.requiresRegistration,
  });

  return {
    ...result,
    notification,
  };
}

export async function sendAdminBookingHandoffLink({
  actorUser,
  transactionId,
} = {}) {
  assertAuthorizedActor(actorUser);
  const transactionRecord = await Transaction.findByPk(transactionId, {
    include: [{ model: User, as: "user" }],
  });
  const handoffMetadata = getAdminBookingHandoffMetadata(transactionRecord);

  if (!transactionRecord || !handoffMetadata) {
    throw new Error("Booking handoff not found");
  }

  if (isAdminBookingHandoffExpired(transactionRecord)) {
    throw new Error("This booking handoff link has expired");
  }

  const response = await buildHandoffResponse(transactionRecord);
  const token = await issueHandoffToken({
    transactionId: transactionRecord.id,
    version: handoffMetadata.version,
  });
  const notification = await sendAdminBookingHandoffWhatsApp({
    customer: response.customer,
    propertyPreviews: response.propertyPreviews,
    url: buildHandoffUrl(token),
    expiresAt: response.expiresAt,
    requiresRegistration: response.requiresRegistration,
  });

  return { notification };
}

export async function getAdminBookingHandoffByToken({ token } = {}) {
  const { transactionRecord } = await resolveTransactionFromToken(token);

  return buildHandoffResponse(transactionRecord);
}

export async function previewAdminBookingHandoffPromotionPricing({
  token,
  eligibleSubtotal,
  enteredCode = "",
  requestSource,
  now = new Date(),
} = {}) {
  await applyHandoffPromotionPreviewRateLimits({
    token,
    requestSource,
    now,
  });

  const { transactionRecord, handoffMetadata } =
    await resolveTransactionFromToken(token);
  assertHandoffPricingAccess(transactionRecord, handoffMetadata);

  return evaluateCheckoutPromotionPricing({
    userId: transactionRecord.userId,
    eligibleSubtotal,
    enteredCode,
    now,
    excludeTransactionId: transactionRecord.id,
  });
}

export async function sendAdminBookingHandoffOtp({
  token,
  customer,
  requestSource,
} = {}) {
  const result = await sequelize.transaction(async (transaction) => {
    const { transactionRecord, handoffMetadata } =
      await resolveTransactionFromToken(token, { transaction });

    if (!handoffMetadata?.requiresRegistration) {
      throw new Error("OTP verification is not required for this handoff");
    }

    if (transactionRecord.status === "success") {
      throw new Error("This booking handoff has already been completed");
    }

    if (isAdminBookingHandoffExpired(transactionRecord)) {
      throw new Error("This booking handoff link has expired");
    }

    const customerUser = await upsertNewCustomerForHandoff(customer, {
      existingUser: transactionRecord.user,
      transaction,
    });
    await transactionRecord.update(
      { userId: customerUser.id },
      { transaction },
    );

    return {
      phone: customerUser.phone,
      customer: buildCustomerSnapshotFromUser(customerUser),
    };
  });

  const otpResult = await sendCustomerOtp({
    phone: result.phone,
    requestSource,
  });

  return {
    ...otpResult,
    customer: result.customer,
  };
}

export async function verifyAdminBookingHandoffOtp({
  token,
  verificationId,
  otp,
  requestSource,
} = {}) {
  const userData = await verifyCustomerOtp({
    verificationId,
    otp,
    requestSource,
  });

  await sequelize.transaction(async (transaction) => {
    const { transactionRecord, handoffMetadata } =
      await resolveTransactionFromToken(token, { transaction });

    if (!handoffMetadata?.requiresRegistration) {
      throw new Error("OTP verification is not required for this handoff");
    }

    if (Number(transactionRecord.userId) !== Number(userData.id)) {
      throw new Error("Invalid OTP");
    }

    await transactionRecord.update(
      {
        metadata: mergeAdminBookingHandoffMetadata(
          transactionRecord.metadata || {},
          {
            ...handoffMetadata,
            registrationVerifiedAt: new Date(),
          },
        ),
      },
      { transaction },
    );
  });

  return userData;
}

export async function createAdminBookingHandoffCheckout({
  token,
  properties,
  enteredCode = "",
} = {}) {
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }

  const { transactionRecord } = await resolveTransactionFromToken(token);
  assertHandoffPricingAccess(
    transactionRecord,
    getAdminBookingHandoffMetadata(transactionRecord),
  );
  await expireCheckoutSession(transactionRecord.stripePaymentIntentId);

  let createdStripeSessionId = null;

  try {
    return await sequelize.transaction(async (transaction) => {
      const { transactionRecord: lockedTransaction, handoffMetadata } =
        await resolveTransactionFromToken(token, { transaction });
      assertHandoffPricingAccess(lockedTransaction, handoffMetadata);
      await resetCheckoutArtifactsInTransaction(lockedTransaction, transaction);

      const currentBookingIds =
        getAdminBookingHandoffBookingIds(lockedTransaction);
      const preview = await previewAdminBookingPreparation({
        actorUser: {
          id: handoffMetadata?.createdByUserId || 1,
          role: USER_ROLES.SUPERADMIN,
        },
        input:
          handoffMetadata?.customerMode === "new"
            ? {
                customerMode: "new",
                customer: buildCustomerSnapshotFromUser(lockedTransaction.user),
                properties,
              }
            : {
                customerMode: "existing",
                customerId: lockedTransaction.userId,
                properties,
              },
        excludeBookingIds: currentBookingIds,
        transaction,
      });

      const bookingIds = await syncReservationBookings({
        transactionRecord: lockedTransaction,
        preparedProperties: preview.properties,
        customerSnapshot: buildCustomerSnapshotFromUser(lockedTransaction.user),
        transaction,
      });

      const normalizedCode = String(enteredCode || "")
        .trim()
        .toUpperCase();
      const promotionPricing = await evaluateCheckoutPromotionPricing({
        userId: lockedTransaction.userId,
        eligibleSubtotal: preview.totalAmount,
        enteredCode: normalizedCode,
        transaction,
        excludeTransactionId: lockedTransaction.id,
      });

      if (
        normalizedCode &&
        !isPromotionCodeValidationSuccessful(promotionPricing.codeValidation)
      ) {
        throw new Error(
          promotionPricing.codeValidation?.message || "Invalid promo code",
        );
      }

      const discountsRes = await getDiscounts();
      const discounts = discountsRes.success ? discountsRes.data : [];
      const walletPreview = calculateWalletCreditPreview(
        discounts,
        preview.totalAmount,
      );
      const promotionDeduction = Number(
        promotionPricing.selectedPromotion?.benefitAmount || 0,
      );
      const finalAmount = Math.max(0, preview.totalAmount - promotionDeduction);

      if (walletPreview.amount > 0) {
        await WalletTransaction.create(
          {
            userId: lockedTransaction.userId,
            amount: walletPreview.amount,
            creditExpiresAt: walletPreview.creditExpiresAt,
            status: "pending",
            transactionId: lockedTransaction.id,
          },
          { transaction },
        );
      }

      await lockedTransaction.update(
        {
          amount: finalAmount,
          status: "pending",
          stripePaymentIntentId: null,
          metadata: {
            ...mergeAdminBookingHandoffMetadata(
              {
                ...(lockedTransaction.metadata || {}),
                appliedDiscounts: walletPreview.appliedDiscounts,
                creditExpiresAt: walletPreview.creditExpiresAt,
                bookingIds,
              },
              handoffMetadata,
            ),
          },
        },
        { transaction },
      );

      if (promotionPricing.selectedPromotion) {
        await reservePromotionForCheckoutTransaction({
          transactionId: lockedTransaction.id,
          userId: lockedTransaction.userId,
          bookingIds,
          eligibleSubtotal: preview.totalAmount,
          enteredCode: normalizedCode,
          selectedPromotion: promotionPricing.selectedPromotion,
          reservationExpiresAt: new Date(handoffMetadata.expiresAt),
          transaction,
        });
      }

      const stripeSession = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        customer_email: lockedTransaction.user?.email || undefined,
        line_items: [
          {
            price_data: {
              currency: "aed",
              product_data: {
                name: "Property Shoot Booking",
                description: `Booking for ${bookingIds.length} propert${bookingIds.length === 1 ? "y" : "ies"}`,
              },
              unit_amount: Math.round(finalAmount * 100),
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/booking/cancel?session_id={CHECKOUT_SESSION_ID}`,
        metadata: {
          transactionId: String(lockedTransaction.id),
          userId: String(lockedTransaction.userId),
        },
        expires_at: Math.floor(
          new Date(handoffMetadata.expiresAt).getTime() / 1000,
        ),
      });
      createdStripeSessionId = stripeSession.id;

      await lockedTransaction.update(
        {
          stripePaymentIntentId: stripeSession.id,
        },
        { transaction },
      );

      return {
        url: stripeSession.url,
      };
    });
  } catch (error) {
    await expireCheckoutSession(createdStripeSessionId);
    throw error;
  }
}

export function isAdminBookingHandoffValidationError(error) {
  return error instanceof z.ZodError;
}

export function isAdminBookingHandoffRateLimitError(error) {
  return error instanceof RateLimitExceededError;
}
