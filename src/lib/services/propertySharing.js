import "@/lib/db/relations";
import { literal, Op } from "sequelize";
import { sequelize } from "@/lib/db/db";
import Booking from "@/lib/db/models/booking";
import BookingDeliveryFile from "@/lib/db/models/bookingdeliveryfile";
import BookingDeliveryFileVersion from "@/lib/db/models/bookingdeliveryfileversion";
import PropertyShareLink from "@/lib/db/models/propertysharelink";
import PropertyShareListing from "@/lib/db/models/propertysharelisting";
import PropertyShareProperty from "@/lib/db/models/propertyshareproperty";
import User from "@/lib/db/models/user";
import {
  BOOKING_WORKFLOW_STATUS,
  DELIVERY_FILE_STATUS,
} from "@/lib/helpers/bookingWorkflow";
import {
  createPropertyShareId,
  isPropertyShareId,
  normalizePropertyShareListing,
  propertyShareContactLinks,
} from "@/lib/services/propertySharingSecurity";

export const PROPERTY_SHARE_KIND = Object.freeze({
  SINGLE_PROPERTY: "SINGLE_PROPERTY",
  MASTER: "MASTER",
});

const SAFE_INLINE_MIME_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);
const SAFE_EXTENSION_MIME_TYPES = new Map([
  [".avif", "image/avif"],
  [".gif", "image/gif"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".mov", "video/quicktime"],
  [".mp4", "video/mp4"],
  [".png", "image/png"],
  [".webm", "video/webm"],
  [".webp", "image/webp"],
]);
const LISTING_TYPE_LABELS = Object.freeze({
  FOR_SALE: "For Sale",
  FOR_RENT_YEARLY: "For Rent (yearly)",
  HOLIDAY_HOME: "Holiday Home",
});
const FURNISHING_LABELS = Object.freeze({
  FURNISHED: "Furnished",
  UNFURNISHED: "Unfurnished",
});

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
        ? "Select at least two configured properties"
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
      details.location,
    ]).join(", ") || "Completed property"
  );
}

function bookingLocation(bookingLike) {
  const booking = toPlain(bookingLike) || {};
  const details = booking.propertyDetails || {};
  return (
    uniqueDisplayParts([
      details.building,
      details.community,
      details.location,
    ]).join(", ") || buildSharedPropertyTitle(booking)
  );
}

function bookingBedrooms(bookingLike) {
  const booking = toPlain(bookingLike) || {};
  const details = booking.propertyDetails || {};
  const direct = details.bedrooms ?? details.bedroomCount ?? details.beds;
  if (Number.isFinite(Number(direct)) && Number(direct) >= 0) {
    return Number(direct);
  }
  const candidate = String(
    details.propertySize || details.size || details.propertyType || "",
  );
  const match = candidate.match(/(\d+)\s*(?:bed|bhk)/iu);
  return match ? Number(match[1]) : null;
}

function sharedPropertyServices(bookingLike) {
  const booking = toPlain(bookingLike) || {};
  const services = Array.isArray(booking.shootDetails?.services)
    ? booking.shootDetails.services
    : [];
  return uniqueDisplayParts(services).slice(0, 12);
}

function filenameMimeType(filename) {
  const normalized = String(filename || "").toLowerCase();
  for (const [extension, mimeType] of SAFE_EXTENSION_MIME_TYPES) {
    if (normalized.endsWith(extension)) return mimeType;
  }
  return null;
}

export function getInlinePropertyMediaDetails(fileLike, versionLike) {
  const file = toPlain(fileLike) || {};
  const version = toPlain(versionLike) || {};
  const declaredMimeType = String(version.mimeType || "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
  const inferredMimeType = filenameMimeType(version.originalFilename);
  const mimeType = SAFE_INLINE_MIME_TYPES.has(declaredMimeType)
    ? declaredMimeType
    : !declaredMimeType || declaredMimeType === "application/octet-stream"
      ? inferredMimeType
      : null;
  if (!mimeType || !SAFE_INLINE_MIME_TYPES.has(mimeType)) return null;
  const typeLabel = `${file.type || ""} ${file.label || ""}`.toLowerCase();
  return {
    mimeType,
    kind: /360|virtual\s*tour|panorama/u.test(typeLabel)
      ? "TOUR"
      : mimeType.startsWith("video/")
        ? "VIDEO"
        : "IMAGE",
  };
}

function eligibleDeliveryFiles(bookingLike) {
  const booking = toPlain(bookingLike) || {};
  const kindOrder = { IMAGE: 0, TOUR: 1, VIDEO: 2 };
  return (booking.deliveryFiles || [])
    .filter((fileLike) => {
      const file = toPlain(fileLike) || {};
      const version = toPlain(file.currentVersion) || {};
      return (
        !file.deletedAt &&
        file.status === DELIVERY_FILE_STATUS.ACCEPTED &&
        Number.isSafeInteger(Number(file.currentVersionId)) &&
        Number(file.currentVersionId) === Number(version.id) &&
        !version.supersededAt &&
        Boolean(getInlinePropertyMediaDetails(file, version))
      );
    })
    .sort((leftLike, rightLike) => {
      const left = toPlain(leftLike) || {};
      const right = toPlain(rightLike) || {};
      const leftKind = getInlinePropertyMediaDetails(
        left,
        toPlain(left.currentVersion),
      )?.kind;
      const rightKind = getInlinePropertyMediaDetails(
        right,
        toPlain(right.currentVersion),
      )?.kind;
      return (
        (kindOrder[leftKind] ?? 3) - (kindOrder[rightKind] ?? 3) ||
        Number(left.id) - Number(right.id)
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
  {
    model: PropertyShareListing,
    as: "propertyShareListing",
    required: false,
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
    // The listing association is an optional outer join. PostgreSQL rejects an
    // unscoped FOR UPDATE because the nullable side cannot be row-locked.
    ...(lock && transaction
      ? { lock: { level: transaction.LOCK.UPDATE, of: Booking } }
      : {}),
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

function serializeListing(listingLike) {
  const listing = toPlain(listingLike);
  if (!listing) return null;
  return {
    listingTitle: listing.listingTitle,
    priceAed: String(listing.priceAed),
    listingType: listing.listingType,
    listingTypeLabel: LISTING_TYPE_LABELS[listing.listingType],
    bathrooms:
      listing.bathrooms === null || listing.bathrooms === undefined
        ? null
        : Number(listing.bathrooms),
    sizeSqft:
      listing.sizeSqft === null || listing.sizeSqft === undefined
        ? null
        : Number(listing.sizeSqft),
    furnishing: listing.furnishing,
    furnishingLabel: FURNISHING_LABELS[listing.furnishing],
    description: listing.description || "",
    highlights: Array.isArray(listing.highlights) ? listing.highlights : [],
    contactName: listing.contactName,
    contactPhone: listing.contactPhone,
  };
}

function serializeBookingFacts(bookingLike) {
  const booking = toPlain(bookingLike) || {};
  return {
    bookingTitle: buildSharedPropertyTitle(booking),
    location: bookingLocation(booking),
    bedrooms: bookingBedrooms(booking),
    completedAt: dateIso(booking.completedAt),
  };
}

function summarizeMedia(bookingLike) {
  const media = eligibleDeliveryFiles(bookingLike);
  return {
    mediaCount: media.length,
    imageCount: media.filter(
      (file) =>
        getInlinePropertyMediaDetails(file, file.currentVersion)?.kind ===
        "IMAGE",
    ).length,
    hasVideo: media.some(
      (file) =>
        getInlinePropertyMediaDetails(file, file.currentVersion)?.kind ===
        "VIDEO",
    ),
    hasTour: media.some(
      (file) =>
        getInlinePropertyMediaDetails(file, file.currentVersion)?.kind ===
        "TOUR",
    ),
  };
}

function serializeEligibleProperty(bookingLike) {
  const booking = toPlain(bookingLike);
  return {
    id: Number(booking.id),
    ...serializeBookingFacts(booking),
    ...summarizeMedia(booking),
    listing: serializeListing(booking.propertyShareListing),
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

function publicShareUrl(publicId) {
  const base = String(process.env.NEXT_PUBLIC_BASE_URL || "")
    .trim()
    .replace(/\/+$/u, "");
  return `${base}/share/${publicId}`;
}

export async function savePropertyShareListing(ownerUserId, bookingId, input) {
  const ownerId = requirePositiveInteger(ownerUserId);
  const normalizedBookingId = requirePositiveInteger(bookingId);
  const listing = normalizePropertyShareListing(input);
  return sequelize.transaction(async (transaction) => {
    await lockOwner(ownerId, transaction);
    const [booking] = await findEligibleBookings(
      ownerId,
      [normalizedBookingId],
      {
        transaction,
        lock: true,
      },
    );
    let record = await PropertyShareListing.findOne({
      where: { ownerUserId: ownerId, bookingId: booking.id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (record) {
      await record.update(listing, { transaction });
    } else {
      record = await PropertyShareListing.create(
        { ownerUserId: ownerId, bookingId: booking.id, ...listing },
        { transaction },
      );
    }
    return {
      bookingId: Number(booking.id),
      listing: serializeListing(record),
    };
  });
}

async function requireConfiguredListings(
  ownerUserId,
  bookingIds,
  transaction,
  lock = false,
) {
  const listings = await PropertyShareListing.findAll({
    where: {
      ownerUserId,
      bookingId: { [Op.in]: bookingIds },
    },
    transaction,
    ...(lock && transaction ? { lock: transaction.LOCK.UPDATE } : {}),
  });
  if (listings.length !== bookingIds.length) {
    throw new PropertyShareConflictError(
      "Complete listing details for every selected property",
    );
  }
  return listings;
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
        { shareLinkId: share.id, bookingId: booking.id, position },
        { transaction },
      );
    } else if (Number(property.position) !== position) {
      await property.update({ position }, { transaction });
    }
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
      await requireConfiguredListings(ownerUserId, ids, transaction, true);
      const duplicateWhere =
        kind === PROPERTY_SHARE_KIND.MASTER
          ? { ownerUserId, kind }
          : {
              ownerUserId,
              kind,
              singleBookingId: ids[0],
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

      const publicId = createPropertyShareId();
      const share = await PropertyShareLink.create(
        {
          ownerUserId,
          kind,
          singleBookingId:
            kind === PROPERTY_SHARE_KIND.SINGLE_PROPERTY ? ids[0] : null,
          publicId,
          enabled: true,
        },
        { transaction },
      );
      await replaceShareProperties(share, bookings, transaction);
      return {
        shareId: Number(share.id),
        publicUrl: publicShareUrl(publicId),
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
    if (share.kind !== PROPERTY_SHARE_KIND.MASTER) {
      throw new PropertyShareNotFoundError();
    }
    const bookings = await findEligibleBookings(ownerUserId, ids, {
      transaction,
      lock: true,
    });
    await requireConfiguredListings(ownerUserId, ids, transaction, true);
    await replaceShareProperties(share, bookings, transaction);
    return { shareId: Number(share.id) };
  });
}

export async function setPropertyShareEnabled(ownerUserId, shareId, enabled) {
  return sequelize.transaction(async (transaction) => {
    const share = await findOwnerShare(ownerUserId, shareId, transaction, true);
    await share.update({ enabled: Boolean(enabled) }, { transaction });
    return { shareId: Number(share.id), enabled: Boolean(share.enabled) };
  });
}

function serializeOwnerShare(shareLike) {
  const share = toPlain(shareLike);
  return {
    id: Number(share.id),
    kind: share.kind,
    status: share.enabled ? "ENABLED" : "DISABLED",
    enabled: Boolean(share.enabled),
    publicUrl: publicShareUrl(share.publicId),
    linkViews: Number(share.totalViews || 0),
    createdAt: dateIso(share.createdAt),
    properties: (share.properties || []).map((propertyLike) => {
      const property = toPlain(propertyLike);
      const booking = toPlain(property.booking) || {};
      return {
        id: Number(property.id),
        bookingId: Number(property.bookingId),
        ...serializeBookingFacts(booking),
        listing: serializeListing(booking.propertyShareListing),
        mediaCount: eligibleDeliveryFiles(booking).length,
      };
    }),
  };
}

export async function getPropertySharingDashboard(ownerUserId) {
  const ownerId = requirePositiveInteger(ownerUserId);
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
              attributes: ["id", "propertyDetails", "completedAt"],
              include: [
                {
                  model: PropertyShareListing,
                  as: "propertyShareListing",
                  required: true,
                },
                {
                  model: BookingDeliveryFile,
                  as: "deliveryFiles",
                  required: false,
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
              ],
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
    shares: shares.map(serializeOwnerShare),
  };
}

async function loadValidPublicShare(
  publicId,
  { transaction, lockShare = false } = {},
) {
  if (!isPropertyShareId(publicId)) return null;
  const share = await PropertyShareLink.findOne({
    where: { publicId },
    transaction,
    ...(lockShare && transaction ? { lock: transaction.LOCK.UPDATE } : {}),
  });
  if (!share || !share.enabled) {
    return null;
  }

  const properties = await PropertyShareProperty.findAll({
    where: { shareLinkId: share.id },
    include: [
      {
        model: Booking,
        as: "booking",
        required: true,
        include: [
          {
            model: PropertyShareListing,
            as: "propertyShareListing",
            required: true,
          },
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
              },
            ],
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

  const publicProperties = [];
  for (const propertyLike of properties) {
    const property = toPlain(propertyLike);
    const booking = property.booking;
    const listing = booking?.propertyShareListing;
    if (
      Number(booking?.userId) !== Number(share.ownerUserId) ||
      Number(listing?.ownerUserId) !== Number(share.ownerUserId) ||
      Number(listing?.bookingId) !== Number(property.bookingId) ||
      !isEligibleBooking(booking, share.ownerUserId)
    ) {
      return null;
    }
    const media = eligibleDeliveryFiles(booking);
    if (media.length === 0) {
      return null;
    }
    property.files = media.map((fileLike) => {
      const file = toPlain(fileLike);
      return {
        id: Number(file.id),
        deliveryFile: file,
        deliveryFileVersion: file.currentVersion,
      };
    });
    publicProperties.push(property);
  }
  if (share.setDataValue) share.setDataValue("properties", publicProperties);
  else share.properties = publicProperties;
  return share;
}

function formatPriceAed(value, listingType) {
  const numeric = Number(value);
  const formatted = new Intl.NumberFormat("en-AE", {
    maximumFractionDigits: 2,
  }).format(numeric);
  return `AED ${formatted}${listingType === "FOR_RENT_YEARLY" ? " / yr" : ""}`;
}

function serializePublicMedia(membershipLike, index) {
  const membership = toPlain(membershipLike);
  const file = toPlain(membership.deliveryFile) || {};
  const version = toPlain(membership.deliveryFileVersion) || {};
  const details = getInlinePropertyMediaDetails(file, version);
  return {
    id: Number(membership.id),
    kind: details.kind,
    mimeType: details.mimeType,
    label: String(
      file.label || file.type || `Property media ${index + 1}`,
    ).slice(0, 120),
  };
}

function serializePublicProperty(propertyLike) {
  const property = toPlain(propertyLike);
  const booking = toPlain(property.booking) || {};
  const listing = serializeListing(booking.propertyShareListing);
  const contactLinks = propertyShareContactLinks(listing.contactPhone);
  return {
    id: Number(property.id),
    title: listing.listingTitle,
    displayPrice: formatPriceAed(listing.priceAed, listing.listingType),
    listingType: listing.listingType,
    listingTypeLabel: listing.listingTypeLabel,
    bathrooms: listing.bathrooms,
    sizeSqft: listing.sizeSqft,
    furnishing: listing.furnishingLabel,
    description: listing.description,
    highlights: listing.highlights,
    contact: {
      name: listing.contactName,
      phone: listing.contactPhone,
      telephoneUrl: contactLinks.telephone,
      whatsappUrl: contactLinks.whatsapp,
    },
    location: bookingLocation(booking),
    bedrooms: bookingBedrooms(booking),
    services: sharedPropertyServices(booking),
    media: (property.files || []).map(serializePublicMedia),
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

function findPublicProperty(share, propertyId) {
  const id = Number(propertyId);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  const plainShare = toPlain(share) || {};
  return (plainShare.properties || []).find(
    (property) => Number(property.id) === id,
  );
}

export async function resolvePublicPropertyShareLanding(
  token,
  _now = new Date(),
  requestedPropertyId = null,
) {
  return sequelize.transaction(async (transaction) => {
    const share = await loadValidPublicShare(token, {
      transaction,
      lockShare: true,
    });
    if (!share) return null;
    if (
      requestedPropertyId !== null &&
      !findPublicProperty(share, requestedPropertyId)
    ) {
      return null;
    }
    await share.update(
      {
        totalViews: literal('"total_views" + 1'),
      },
      { transaction },
    );
    return serializePublicLanding(share);
  });
}

export async function resolvePublicPropertyShareMedia({
  token,
  propertyId,
  sharedFileId,
}) {
  const share = await loadValidPublicShare(token);
  if (!share) return null;
  const property = findPublicProperty(share, propertyId);
  if (!property) return null;
  const fileId = Number(sharedFileId);
  if (!Number.isSafeInteger(fileId) || fileId <= 0) return null;
  const membership = property.files.find((file) => Number(file.id) === fileId);
  if (!membership) return null;
  const pinnedVersion = membership.deliveryFileVersion;
  const details = getInlinePropertyMediaDetails(
    membership.deliveryFile,
    pinnedVersion,
  );
  if (!details) return null;
  return {
    storageUrl: pinnedVersion.url,
    mimeType: details.mimeType,
    sizeBytes:
      pinnedVersion.sizeBytes === null || pinnedVersion.sizeBytes === undefined
        ? null
        : Number(pinnedVersion.sizeBytes),
  };
}
