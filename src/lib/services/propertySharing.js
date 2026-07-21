import "@/lib/db/relations";
import { literal, Op, QueryTypes } from "sequelize";
import { sequelize } from "@/lib/db/db";
import Booking from "@/lib/db/models/booking";
import BookingDeliveryFile from "@/lib/db/models/bookingdeliveryfile";
import BookingDeliveryFileVersion from "@/lib/db/models/bookingdeliveryfileversion";
import PropertyShareContact from "@/lib/db/models/propertysharecontact";
import PropertyShareDailyView from "@/lib/db/models/propertysharedailyview";
import PropertyShareFile from "@/lib/db/models/propertysharefile";
import PropertyShareLink from "@/lib/db/models/propertysharelink";
import PropertyShareProperty from "@/lib/db/models/propertyshareproperty";
import User from "@/lib/db/models/user";
import {
  BOOKING_WORKFLOW_STATUS,
  DELIVERY_FILE_STATUS,
} from "@/lib/helpers/bookingWorkflow";
import {
  createPropertyShareReceipt,
  createPropertyShareToken,
  digestPropertyShareToken,
  enforcePropertyShareContactThrottle,
  normalizePropertyShareContact,
  PROPERTY_SHARE_CONTACT_RETENTION_DAYS,
  tokenDigestMatches,
  verifyPropertyShareReceipt,
} from "@/lib/services/propertySharingSecurity";

export const PROPERTY_SHARE_KIND = Object.freeze({
  SINGLE_PROPERTY: "SINGLE_PROPERTY",
  MASTER: "MASTER",
});

const OWNER_CONTACT_LIMIT = 100;
const EXPIRED_CONTACT_CLEANUP_LIMIT = 200;

export class PropertyShareNotFoundError extends Error {
  constructor() {
    super("Property share not found");
    this.name = "PropertyShareNotFoundError";
    this.code = "PROPERTY_SHARE_NOT_FOUND";
  }
}

export class PropertyShareConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = "PropertyShareConflictError";
    this.code = "PROPERTY_SHARE_CONFLICT";
  }
}

function toPlain(value) {
  return value?.toJSON ? value.toJSON() : value;
}

function requirePositiveInteger(value, message = "Invalid identifier") {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new PropertyShareConflictError(message);
  }
  return parsed;
}

function normalizeBookingIds(values, minimum) {
  const normalized = [
    ...new Set(
      (Array.isArray(values) ? values : []).map((value) =>
        requirePositiveInteger(value, "Select valid properties"),
      ),
    ),
  ];
  if (normalized.length < minimum) {
    throw new PropertyShareConflictError(
      minimum === 2
        ? "Select at least two eligible properties"
        : "Select an eligible property",
    );
  }
  return normalized;
}

function dateIso(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function uniqueDisplayParts(values) {
  const seen = new Set();
  return values.filter((value) => {
    const normalized = String(value || "").trim();
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildSharedPropertyTitle(bookingLike) {
  const booking = toPlain(bookingLike) || {};
  const details = booking.propertyDetails || {};
  return (
    uniqueDisplayParts([
      details.unitNumber || details.unit || details.name,
      details.building,
      details.community,
    ]).join(", ") || "Completed property"
  );
}

function sharedPropertyServices(bookingLike) {
  const booking = toPlain(bookingLike) || {};
  const services = Array.isArray(booking.shootDetails?.services)
    ? booking.shootDetails.services
    : [];
  return uniqueDisplayParts(services).slice(0, 12);
}

function getDubaiDateString(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dubai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function trailingDubaiDates(now = new Date(), days = 30) {
  const [year, month, day] = getDubaiDateString(now).split("-").map(Number);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1, day - (days - 1 - index)));
    return date.toISOString().slice(0, 10);
  });
}

function eligibleDeliveryFiles(bookingLike) {
  const booking = toPlain(bookingLike) || {};
  return (booking.deliveryFiles || []).filter((fileLike) => {
    const file = toPlain(fileLike) || {};
    const version = toPlain(file.currentVersion) || {};
    return (
      !file.deletedAt &&
      file.status === DELIVERY_FILE_STATUS.ACCEPTED &&
      Number.isSafeInteger(Number(file.currentVersionId)) &&
      Number(file.currentVersionId) === Number(version.id) &&
      !version.supersededAt
    );
  });
}

function isEligibleBooking(bookingLike, ownerUserId) {
  const booking = toPlain(bookingLike) || {};
  return (
    Number(booking.userId) === Number(ownerUserId) &&
    booking.workflowStatus === BOOKING_WORKFLOW_STATUS.PROJECT_COMPLETED &&
    Boolean(booking.completedAt) &&
    !booking.cancelledAt &&
    booking.status !== "CANCELLED" &&
    eligibleDeliveryFiles(booking).length > 0
  );
}

const ELIGIBLE_BOOKING_INCLUDE = [
  {
    model: BookingDeliveryFile,
    as: "deliveryFiles",
    required: true,
    where: {
      status: DELIVERY_FILE_STATUS.ACCEPTED,
      deletedAt: null,
    },
    include: [
      {
        model: BookingDeliveryFileVersion,
        as: "currentVersion",
        required: true,
        attributes: { exclude: ["url"] },
      },
    ],
  },
];

async function findEligibleBookings(
  ownerUserId,
  bookingIds,
  { transaction, lock = false } = {},
) {
  const ids = bookingIds ? normalizeBookingIds(bookingIds, 1) : null;
  const bookings = await Booking.findAll({
    where: {
      userId: ownerUserId,
      workflowStatus: BOOKING_WORKFLOW_STATUS.PROJECT_COMPLETED,
      completedAt: { [Op.ne]: null },
      cancelledAt: null,
      status: { [Op.ne]: "CANCELLED" },
      ...(ids ? { id: { [Op.in]: ids } } : {}),
    },
    include: ELIGIBLE_BOOKING_INCLUDE,
    order: [["completedAt", "DESC"]],
    transaction,
    ...(lock && transaction ? { lock: transaction.LOCK.UPDATE } : {}),
  });
  const eligible = bookings.filter((booking) =>
    isEligibleBooking(booking, ownerUserId),
  );
  if (ids && eligible.length !== ids.length) {
    throw new PropertyShareNotFoundError();
  }
  if (!ids) return eligible;
  const byId = new Map(
    eligible.map((booking) => [Number(booking.id), booking]),
  );
  return ids.map((id) => byId.get(id));
}

function serializeEligibleProperty(bookingLike) {
  const booking = toPlain(bookingLike);
  const files = eligibleDeliveryFiles(booking);
  return {
    id: Number(booking.id),
    title: buildSharedPropertyTitle(booking),
    completedAt: dateIso(booking.completedAt),
    fileCount: files.length,
  };
}

async function lockOwner(ownerUserId, transaction) {
  const owner = await User.findByPk(ownerUserId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!owner) throw new PropertyShareNotFoundError();
  return owner;
}

function tokenAndDigest() {
  const token = createPropertyShareToken();
  return { token, tokenDigest: digestPropertyShareToken(token) };
}

function publicShareUrl(token) {
  const base = String(process.env.NEXT_PUBLIC_BASE_URL || "")
    .trim()
    .replace(/\/+$/u, "");
  return `${base}/share/${token}`;
}

async function replaceSnapshotFiles(shareProperty, booking, transaction) {
  await PropertyShareFile.destroy({
    where: { sharePropertyId: shareProperty.id },
    transaction,
  });
  const files = eligibleDeliveryFiles(booking);
  await PropertyShareFile.bulkCreate(
    files.map((fileLike) => {
      const file = toPlain(fileLike);
      return {
        sharePropertyId: shareProperty.id,
        deliveryFileId: file.id,
        deliveryFileVersionId: file.currentVersionId,
      };
    }),
    { transaction },
  );
}

async function replaceShareProperties(share, bookings, transaction) {
  const existing = await PropertyShareProperty.findAll({
    where: { shareLinkId: share.id },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  const byBookingId = new Map(
    existing.map((property) => [Number(property.bookingId), property]),
  );
  const selectedIds = new Set(bookings.map((booking) => Number(booking.id)));

  for (const property of existing) {
    if (!selectedIds.has(Number(property.bookingId))) {
      await property.destroy({ transaction });
    }
  }

  for (const [position, booking] of bookings.entries()) {
    let property = byBookingId.get(Number(booking.id));
    if (!property) {
      property = await PropertyShareProperty.create(
        {
          shareLinkId: share.id,
          bookingId: booking.id,
          position,
        },
        { transaction },
      );
    } else if (Number(property.position) !== position) {
      await property.update({ position }, { transaction });
    }
    await replaceSnapshotFiles(property, booking, transaction);
  }
}

async function createShare({ ownerUserId, kind, bookingIds }) {
  const minimum = kind === PROPERTY_SHARE_KIND.MASTER ? 2 : 1;
  const ids = normalizeBookingIds(bookingIds, minimum);
  if (kind === PROPERTY_SHARE_KIND.SINGLE_PROPERTY && ids.length !== 1) {
    throw new PropertyShareConflictError(
      "A single-property link requires exactly one property",
    );
  }

  try {
    return await sequelize.transaction(async (transaction) => {
      await lockOwner(ownerUserId, transaction);
      const bookings = await findEligibleBookings(ownerUserId, ids, {
        transaction,
        lock: true,
      });
      const duplicateWhere =
        kind === PROPERTY_SHARE_KIND.MASTER
          ? { ownerUserId, kind, revokedAt: null }
          : {
              ownerUserId,
              kind,
              singleBookingId: ids[0],
              revokedAt: null,
            };
      const existing = await PropertyShareLink.findOne({
        where: duplicateWhere,
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (existing) {
        throw new PropertyShareConflictError(
          kind === PROPERTY_SHARE_KIND.MASTER
            ? "A master link already exists"
            : "A link already exists for this property",
        );
      }

      const { token, tokenDigest } = tokenAndDigest();
      const share = await PropertyShareLink.create(
        {
          ownerUserId,
          kind,
          singleBookingId:
            kind === PROPERTY_SHARE_KIND.SINGLE_PROPERTY ? ids[0] : null,
          tokenDigest,
          credentialVersion: 1,
          enabled: true,
        },
        { transaction },
      );
      await replaceShareProperties(share, bookings, transaction);
      return {
        shareId: Number(share.id),
        publicUrl: publicShareUrl(token),
      };
    });
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      throw new PropertyShareConflictError(
        kind === PROPERTY_SHARE_KIND.MASTER
          ? "A master link already exists"
          : "A link already exists for this property",
      );
    }
    throw error;
  }
}

export const createSinglePropertyShare = (ownerUserId, bookingId) =>
  createShare({
    ownerUserId: requirePositiveInteger(ownerUserId),
    kind: PROPERTY_SHARE_KIND.SINGLE_PROPERTY,
    bookingIds: [bookingId],
  });

export const createMasterPropertyShare = (ownerUserId, bookingIds) =>
  createShare({
    ownerUserId: requirePositiveInteger(ownerUserId),
    kind: PROPERTY_SHARE_KIND.MASTER,
    bookingIds,
  });

async function findOwnerShare(ownerUserId, shareId, transaction, lock = false) {
  const share = await PropertyShareLink.findOne({
    where: {
      id: requirePositiveInteger(shareId),
      ownerUserId: requirePositiveInteger(ownerUserId),
    },
    transaction,
    ...(lock && transaction ? { lock: transaction.LOCK.UPDATE } : {}),
  });
  if (!share) throw new PropertyShareNotFoundError();
  return share;
}

export async function updateMasterPropertyShare(
  ownerUserId,
  shareId,
  bookingIds,
) {
  const ids = normalizeBookingIds(bookingIds, 2);
  return sequelize.transaction(async (transaction) => {
    await lockOwner(ownerUserId, transaction);
    const share = await findOwnerShare(ownerUserId, shareId, transaction, true);
    if (share.kind !== PROPERTY_SHARE_KIND.MASTER || share.revokedAt) {
      throw new PropertyShareNotFoundError();
    }
    const bookings = await findEligibleBookings(ownerUserId, ids, {
      transaction,
      lock: true,
    });
    await replaceShareProperties(share, bookings, transaction);
    return { shareId: Number(share.id) };
  });
}

export async function refreshPropertyShareSnapshot(ownerUserId, shareId) {
  return sequelize.transaction(async (transaction) => {
    const share = await findOwnerShare(ownerUserId, shareId, transaction, true);
    if (share.revokedAt) throw new PropertyShareNotFoundError();
    const properties = await PropertyShareProperty.findAll({
      where: { shareLinkId: share.id },
      order: [["position", "ASC"]],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const ids = properties.map((property) => property.bookingId);
    const minimum = share.kind === PROPERTY_SHARE_KIND.MASTER ? 2 : 1;
    if (ids.length < minimum) throw new PropertyShareNotFoundError();
    const bookings = await findEligibleBookings(ownerUserId, ids, {
      transaction,
      lock: true,
    });
    await replaceShareProperties(share, bookings, transaction);
    return { shareId: Number(share.id) };
  });
}

export async function setPropertyShareEnabled(ownerUserId, shareId, enabled) {
  return sequelize.transaction(async (transaction) => {
    const share = await findOwnerShare(ownerUserId, shareId, transaction, true);
    if (share.revokedAt) throw new PropertyShareNotFoundError();
    await share.update({ enabled: Boolean(enabled) }, { transaction });
    return { shareId: Number(share.id), enabled: Boolean(share.enabled) };
  });
}

export async function rotatePropertyShareToken(ownerUserId, shareId) {
  return sequelize.transaction(async (transaction) => {
    const share = await findOwnerShare(ownerUserId, shareId, transaction, true);
    if (share.revokedAt) throw new PropertyShareNotFoundError();
    const { token, tokenDigest } = tokenAndDigest();
    await share.update(
      {
        tokenDigest,
        credentialVersion: Number(share.credentialVersion || 1) + 1,
      },
      { transaction },
    );
    return {
      shareId: Number(share.id),
      publicUrl: publicShareUrl(token),
    };
  });
}

export async function revokePropertyShare(ownerUserId, shareId) {
  return sequelize.transaction(async (transaction) => {
    const share = await findOwnerShare(ownerUserId, shareId, transaction, true);
    if (!share.revokedAt) {
      await share.update(
        {
          enabled: false,
          revokedAt: new Date(),
          credentialVersion: Number(share.credentialVersion || 1) + 1,
        },
        { transaction },
      );
    }
    return { shareId: Number(share.id), revoked: true };
  });
}

async function cleanupExpiredContacts(now = new Date()) {
  const expired = await PropertyShareContact.findAll({
    attributes: ["id"],
    where: { expiresAt: { [Op.lte]: now } },
    order: [["id", "ASC"]],
    limit: EXPIRED_CONTACT_CLEANUP_LIMIT,
  });
  if (expired.length === 0) return 0;
  return PropertyShareContact.destroy({
    where: { id: { [Op.in]: expired.map((contact) => contact.id) } },
  });
}

async function ownerShareDetails(shareLike, now) {
  const share = toPlain(shareLike);
  const startDate = trailingDubaiDates(now, 30)[0];
  const [dailyViews, contacts] = await Promise.all([
    PropertyShareDailyView.findAll({
      where: {
        shareLinkId: share.id,
        viewDate: { [Op.gte]: startDate },
      },
      order: [["viewDate", "ASC"]],
    }),
    PropertyShareContact.findAll({
      where: {
        shareLinkId: share.id,
        expiresAt: { [Op.gt]: now },
      },
      include: [
        {
          model: PropertyShareProperty,
          as: "property",
          required: true,
          where: { shareLinkId: share.id },
          include: [
            {
              model: Booking,
              as: "booking",
              required: true,
              attributes: ["id", "propertyDetails"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: OWNER_CONTACT_LIMIT,
    }),
  ]);
  const viewMap = new Map(
    dailyViews.map((entryLike) => {
      const entry = toPlain(entryLike);
      return [String(entry.viewDate), Number(entry.requestViews || 0)];
    }),
  );
  const dates = trailingDubaiDates(now, 30);
  return {
    ...serializeOwnerShare(share),
    analytics: {
      totalRequestViews: Number(share.totalViews || 0),
      lastViewedAt: dateIso(share.lastViewedAt),
      trailing30Days: dates.map((date) => ({
        date,
        requestViews: viewMap.get(date) || 0,
      })),
    },
    contacts: contacts.map((contactLike) => {
      const contact = toPlain(contactLike);
      return {
        id: Number(contact.id),
        propertyTitle: buildSharedPropertyTitle(contact.property?.booking),
        name: contact.name,
        phone: contact.phone,
        createdAt: dateIso(contact.createdAt),
        expiresAt: dateIso(contact.expiresAt),
      };
    }),
  };
}

function serializeOwnerShare(shareLike) {
  const share = toPlain(shareLike);
  return {
    id: Number(share.id),
    kind: share.kind,
    status: share.revokedAt
      ? "REVOKED"
      : share.enabled
        ? "ENABLED"
        : "DISABLED",
    enabled: Boolean(share.enabled) && !share.revokedAt,
    revokedAt: dateIso(share.revokedAt),
    createdAt: dateIso(share.createdAt),
    properties: (share.properties || []).map((propertyLike) => {
      const property = toPlain(propertyLike);
      return {
        id: Number(property.id),
        bookingId: Number(property.bookingId),
        title: buildSharedPropertyTitle(property.booking),
        fileCount: Array.isArray(property.files) ? property.files.length : 0,
      };
    }),
  };
}

export async function getPropertySharingDashboard(
  ownerUserId,
  now = new Date(),
) {
  const ownerId = requirePositiveInteger(ownerUserId);
  await cleanupExpiredContacts(now);
  const [eligibleBookings, shares] = await Promise.all([
    findEligibleBookings(ownerId),
    PropertyShareLink.findAll({
      where: { ownerUserId: ownerId },
      include: [
        {
          model: PropertyShareProperty,
          as: "properties",
          required: false,
          include: [
            {
              model: Booking,
              as: "booking",
              required: true,
              attributes: ["id", "propertyDetails"],
            },
            {
              model: PropertyShareFile,
              as: "files",
              required: false,
              attributes: ["id"],
            },
          ],
        },
      ],
      order: [
        ["createdAt", "DESC"],
        [{ model: PropertyShareProperty, as: "properties" }, "position", "ASC"],
      ],
    }),
  ]);
  return {
    eligibleProperties: eligibleBookings.map(serializeEligibleProperty),
    shares: await Promise.all(
      shares.map((share) => ownerShareDetails(share, now)),
    ),
  };
}

async function loadValidPublicShare(
  token,
  { transaction, lockShare = false } = {},
) {
  const tokenDigest = digestPropertyShareToken(token);
  if (!tokenDigest) return null;
  const share = await PropertyShareLink.findOne({
    where: { tokenDigest },
    transaction,
    ...(lockShare && transaction ? { lock: transaction.LOCK.UPDATE } : {}),
  });
  if (
    !share ||
    !share.enabled ||
    share.revokedAt ||
    !tokenDigestMatches(tokenDigest, share.tokenDigest)
  ) {
    return null;
  }

  const properties = await PropertyShareProperty.findAll({
    where: { shareLinkId: share.id },
    include: [
      {
        model: Booking,
        as: "booking",
        required: true,
      },
      {
        model: PropertyShareFile,
        as: "files",
        required: true,
        include: [
          {
            model: BookingDeliveryFile,
            as: "deliveryFile",
            required: true,
            paranoid: false,
            include: [
              {
                model: BookingDeliveryFileVersion,
                as: "currentVersion",
                required: true,
              },
            ],
          },
          {
            model: BookingDeliveryFileVersion,
            as: "deliveryFileVersion",
            required: true,
          },
        ],
      },
    ],
    order: [["position", "ASC"]],
    transaction,
  });
  if (
    (share.kind === PROPERTY_SHARE_KIND.SINGLE_PROPERTY &&
      (properties.length !== 1 ||
        Number(properties[0].bookingId) !== Number(share.singleBookingId))) ||
    (share.kind === PROPERTY_SHARE_KIND.MASTER && properties.length < 2)
  ) {
    return null;
  }

  for (const propertyLike of properties) {
    const property = toPlain(propertyLike);
    const booking = property.booking;
    if (
      Number(booking?.userId) !== Number(share.ownerUserId) ||
      booking?.workflowStatus !== BOOKING_WORKFLOW_STATUS.PROJECT_COMPLETED ||
      !booking?.completedAt ||
      booking?.cancelledAt ||
      booking?.status === "CANCELLED"
    ) {
      return null;
    }
    if (!Array.isArray(property.files) || property.files.length === 0)
      return null;
    for (const membershipLike of property.files) {
      const membership = toPlain(membershipLike);
      const file = membership.deliveryFile;
      const currentVersion = file?.currentVersion;
      const pinnedVersion = membership.deliveryFileVersion;
      if (
        !file ||
        !pinnedVersion ||
        Number(file.bookingId) !== Number(property.bookingId) ||
        file.deletedAt ||
        file.status !== DELIVERY_FILE_STATUS.ACCEPTED ||
        Number(file.currentVersionId) !==
          Number(membership.deliveryFileVersionId) ||
        Number(currentVersion?.id) !==
          Number(membership.deliveryFileVersionId) ||
        currentVersion?.supersededAt ||
        Number(pinnedVersion.deliveryFileId) !== Number(file.id) ||
        pinnedVersion.supersededAt
      ) {
        return null;
      }
    }
  }
  if (share.setDataValue) share.setDataValue("properties", properties);
  else share.properties = properties;
  return share;
}

function serializePublicProperty(propertyLike) {
  const property = toPlain(propertyLike);
  return {
    id: Number(property.id),
    title: buildSharedPropertyTitle(property.booking),
    services: sharedPropertyServices(property.booking),
    completedAt: dateIso(property.booking?.completedAt),
  };
}

function serializePublicLanding(shareLike) {
  const share = toPlain(shareLike);
  return {
    id: Number(share.id),
    kind: share.kind,
    properties: (share.properties || []).map(serializePublicProperty),
  };
}

export async function resolvePublicPropertyShareLanding(
  token,
  now = new Date(),
  requestedPropertyId = null,
) {
  return sequelize.transaction(async (transaction) => {
    const share = await loadValidPublicShare(token, {
      transaction,
      lockShare: true,
    });
    if (!share) return null;
    if (
      share.kind === PROPERTY_SHARE_KIND.MASTER &&
      requestedPropertyId !== null &&
      !findPublicProperty(share, requestedPropertyId)
    ) {
      return null;
    }
    const viewDate = getDubaiDateString(now);
    await share.update(
      {
        totalViews: literal('"total_views" + 1'),
        lastViewedAt: now,
      },
      { transaction },
    );
    await sequelize.query(
      `
        INSERT INTO property_share_daily_views
          (share_link_id, view_date, request_views, created_at, updated_at)
        VALUES (:shareLinkId, :viewDate, 1, :now, :now)
        ON CONFLICT (share_link_id, view_date)
        DO UPDATE SET
          request_views = property_share_daily_views.request_views + 1,
          updated_at = EXCLUDED.updated_at
      `,
      {
        replacements: { shareLinkId: share.id, viewDate, now },
        type: QueryTypes.INSERT,
        transaction,
      },
    );
    return serializePublicLanding(share);
  });
}

function findPublicProperty(share, propertyId) {
  const id = Number(propertyId);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  const plainShare = toPlain(share) || {};
  return (plainShare.properties || []).find(
    (property) => Number(property.id) === id,
  );
}

export async function getPublicPropertyManifest(
  token,
  propertyId,
  receiptToken,
) {
  const share = await loadValidPublicShare(token);
  if (!share) return null;
  const property = findPublicProperty(share, propertyId);
  if (!property) return null;
  const receiptValid = await verifyPropertyShareReceipt(receiptToken, {
    shareId: share.id,
    propertyId: property.id,
    credentialVersion: share.credentialVersion,
  });
  if (!receiptValid) return null;
  return {
    property: serializePublicProperty(property),
    files: property.files.map((membershipLike) => {
      const membership = toPlain(membershipLike);
      const file = membership.deliveryFile;
      const version = membership.deliveryFileVersion;
      return {
        id: Number(membership.id),
        type: file.type,
        label: file.label,
        filename: version.originalFilename || file.label || "Deliverable",
      };
    }),
  };
}

export async function getPublicPropertyReceiptScope(token, propertyId) {
  const share = await loadValidPublicShare(token);
  if (!share) return null;
  const property = findPublicProperty(share, propertyId);
  if (!property) return null;
  return {
    shareId: Number(share.id),
    propertyId: Number(property.id),
  };
}

export async function submitPublicPropertyShareContact({
  token,
  propertyId,
  input,
  networkAddress,
  now = new Date(),
}) {
  return sequelize.transaction(async (transaction) => {
    const share = await loadValidPublicShare(token, {
      transaction,
      lockShare: true,
    });
    if (!share) return null;
    const property = findPublicProperty(share, propertyId);
    if (!property) return null;
    const contact = normalizePropertyShareContact(input);
    enforcePropertyShareContactThrottle({
      shareId: share.id,
      propertyId: property.id,
      networkAddress,
      now,
    });
    const receipt = await createPropertyShareReceipt({
      shareId: share.id,
      propertyId: property.id,
      credentialVersion: share.credentialVersion,
      now,
    });
    const expiresAt = new Date(
      now.getTime() +
        PROPERTY_SHARE_CONTACT_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );
    await PropertyShareContact.create(
      {
        shareLinkId: share.id,
        sharePropertyId: property.id,
        name: contact.name,
        phone: contact.phone,
        expiresAt,
      },
      { transaction },
    );
    return { receipt };
  });
}

export async function resolvePublicPropertyShareFile({
  token,
  propertyId,
  sharedFileId,
  receiptToken,
}) {
  const share = await loadValidPublicShare(token);
  if (!share) return null;
  const property = findPublicProperty(share, propertyId);
  if (!property) return null;
  const receiptValid = await verifyPropertyShareReceipt(receiptToken, {
    shareId: share.id,
    propertyId: property.id,
    credentialVersion: share.credentialVersion,
  });
  if (!receiptValid) return null;
  const fileId = Number(sharedFileId);
  if (!Number.isSafeInteger(fileId) || fileId <= 0) return null;
  const membership = property.files.find((file) => Number(file.id) === fileId);
  if (!membership) return null;
  const pinnedVersion = membership.deliveryFileVersion;
  return {
    url: pinnedVersion.url,
    filename:
      pinnedVersion.originalFilename ||
      membership.deliveryFile.label ||
      "Deliverable",
  };
}

export async function getOwnerPropertyShareAnalytics(ownerUserId, shareId) {
  const share = await findOwnerShare(ownerUserId, shareId);
  return ownerShareDetails(share, new Date());
}

export async function getOwnerPropertyShareContacts(ownerUserId, shareId) {
  const details = await getOwnerPropertyShareAnalytics(ownerUserId, shareId);
  return details.contacts;
}
