import "@/lib/db/relations";
import { literal, Op } from "sequelize";
import { sequelize } from "@/lib/db/db";
import Booking from "@/lib/db/models/booking";
import BookingDeliveryFile from "@/lib/db/models/bookingdeliveryfile";
import BookingDeliveryFileVersion from "@/lib/db/models/bookingdeliveryfileversion";
import PropertyMediaPreference from "@/lib/db/models/propertymediapreference";
import PropertySavedContact from "@/lib/db/models/propertysavedcontact";
import PropertyShareLink from "@/lib/db/models/propertysharelink";
import PropertyShareListing from "@/lib/db/models/propertysharelisting";
import PropertyShareMedia from "@/lib/db/models/propertysharemedia";
import PropertyShareProperty from "@/lib/db/models/propertyshareproperty";
import User from "@/lib/db/models/user";
import { DELIVERY_FILE_STATUS } from "@/lib/helpers/bookingWorkflow";
import {
  createPropertyShareId,
  isPropertyShareId,
  normalizePropertyShareListing,
  normalizeSavedPropertyContact,
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
const PROPERTY_TYPE_LABELS = Object.freeze({
  APARTMENT: "Apartment",
  PENTHOUSE: "Penthouse",
  VILLA: "Villa",
  TOWNHOUSE: "Townhouse",
  COMMERCIAL: "Commercial",
});
const SHAREABLE_BOOKING_STATUSES = ["CONFIRMED", "COMPLETED"];
const SHAREABLE_MEDIA_STATUSES = [
  DELIVERY_FILE_STATUS.UNDER_REVIEW,
  DELIVERY_FILE_STATUS.ACCEPTED,
];

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

function normalizeTourEmbedUrl(value) {
  const rawUrl = String(value || "").trim();
  if (!rawUrl || rawUrl.length > 2048) return null;
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    const host = url.hostname.toLowerCase().replace(/^www\./u, "");
    let youtubeId = null;
    if (host === "youtu.be") {
      youtubeId = url.pathname.split("/").filter(Boolean)[0] || null;
    } else if (host === "youtube.com" || host.endsWith(".youtube.com")) {
      const parts = url.pathname.split("/").filter(Boolean);
      youtubeId =
        url.searchParams.get("v") ||
        (["embed", "shorts", "live"].includes(parts[0]) ? parts[1] : null);
    }
    return youtubeId
      ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}?rel=0&modestbranding=1`
      : url.toString();
  } catch {
    return null;
  }
}

export function getInlinePropertyMediaDetails(fileLike, versionLike) {
  const file = toPlain(fileLike) || {};
  const version = toPlain(versionLike) || {};
  const declaredMimeType = String(version.mimeType || "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
  const typeLabel = `${file.type || ""} ${file.label || ""}`.toLowerCase();
  const isTour = /360|virtual\s*tour|panorama/u.test(typeLabel);
  if (isTour) {
    const embedUrl =
      file.deliveryMode === "copy_link" && declaredMimeType === "text/uri-list"
        ? normalizeTourEmbedUrl(version.url)
        : null;
    return embedUrl
      ? { kind: "TOUR", mimeType: "text/uri-list", embedUrl }
      : null;
  }
  const inferredMimeType = filenameMimeType(version.originalFilename);
  const mimeType = SAFE_INLINE_MIME_TYPES.has(declaredMimeType)
    ? declaredMimeType
    : !declaredMimeType || declaredMimeType === "application/octet-stream"
      ? inferredMimeType
      : null;
  if (!mimeType || !SAFE_INLINE_MIME_TYPES.has(mimeType)) return null;
  return {
    mimeType,
    kind: mimeType.startsWith("video/") ? "VIDEO" : "IMAGE",
  };
}

function eligibleDeliveryFiles(bookingLike) {
  const booking = toPlain(bookingLike) || {};
  const kindOrder = { IMAGE: 0, VIDEO: 1, TOUR: 2 };
  return (booking.deliveryFiles || [])
    .filter((fileLike) => {
      const file = toPlain(fileLike) || {};
      const version = toPlain(file.currentVersion) || {};
      return (
        !file.deletedAt &&
        SHAREABLE_MEDIA_STATUSES.includes(file.status) &&
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

function hasShareableBookingState(bookingLike, ownerUserId) {
  const booking = toPlain(bookingLike) || {};
  return (
    Number(booking.userId) === Number(ownerUserId) &&
    SHAREABLE_BOOKING_STATUSES.includes(booking.status) &&
    !booking.cancelledAt &&
    booking.status !== "CANCELLED"
  );
}

function isEligibleBooking(bookingLike, ownerUserId) {
  return (
    hasShareableBookingState(bookingLike, ownerUserId) &&
    eligibleDeliveryFiles(bookingLike).length > 0
  );
}

const ELIGIBLE_BOOKING_INCLUDE = [
  {
    model: BookingDeliveryFile,
    as: "deliveryFiles",
    required: true,
    where: {
      status: { [Op.in]: SHAREABLE_MEDIA_STATUSES },
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
  {
    model: PropertyShareListing,
    as: "propertyShareListing",
    required: false,
  },
  {
    model: PropertyMediaPreference,
    as: "propertyMediaPreferences",
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
      status: { [Op.in]: SHAREABLE_BOOKING_STATUSES },
      cancelledAt: null,
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
  const applicableArea =
    Number(listing.plotAreaSqft) ||
    Number(listing.builtUpAreaSqft) ||
    Number(listing.sizeSqft) ||
    null;
  const numericPrice = Number(listing.priceAed);
  return {
    listingTitle: listing.listingTitle,
    priceAed: String(listing.priceAed),
    listingType: listing.listingType,
    listingTypeLabel: LISTING_TYPE_LABELS[listing.listingType],
    propertyType: listing.propertyType || "APARTMENT",
    propertyTypeLabel:
      PROPERTY_TYPE_LABELS[listing.propertyType || "APARTMENT"] || "Apartment",
    bathrooms:
      listing.bathrooms === null || listing.bathrooms === undefined
        ? null
        : Number(listing.bathrooms),
    maidRoom: Boolean(listing.maidRoom),
    sizeSqft:
      listing.sizeSqft === null || listing.sizeSqft === undefined
        ? null
        : Number(listing.sizeSqft),
    builtUpAreaSqft:
      listing.builtUpAreaSqft === null || listing.builtUpAreaSqft === undefined
        ? null
        : Number(listing.builtUpAreaSqft),
    plotAreaSqft:
      listing.plotAreaSqft === null || listing.plotAreaSqft === undefined
        ? null
        : Number(listing.plotAreaSqft),
    applicableAreaSqft: applicableArea,
    pricePerSqft:
      applicableArea && Number.isFinite(numericPrice)
        ? Math.round((numericPrice / applicableArea) * 100) / 100
        : null,
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
  const kinds = media.map(
    (file) => getInlinePropertyMediaDetails(file, file.currentVersion)?.kind,
  );
  return {
    mediaCount: media.length,
    imageCount: kinds.filter((kind) => kind === "IMAGE").length,
    videoCount: kinds.filter((kind) => kind === "VIDEO").length,
    hasVideo: kinds.includes("VIDEO"),
    hasTour: kinds.includes("TOUR"),
  };
}

function serializeEligibleProperty(bookingLike) {
  const booking = toPlain(bookingLike);
  const preferences = new Map(
    (booking.propertyMediaPreferences || []).map((preference) => [
      Number(preference.deliveryFileId),
      toPlain(preference),
    ]),
  );
  const media = eligibleDeliveryFiles(booking)
    .map((file, index) => {
      const plainFile = toPlain(file);
      const details = getInlinePropertyMediaDetails(
        plainFile,
        toPlain(plainFile.currentVersion),
      );
      const preference = preferences.get(Number(plainFile.id));
      return {
        deliveryFileId: Number(plainFile.id),
        kind: details.kind,
        label: String(plainFile.label || plainFile.type || "Property media"),
        position: preference ? Number(preference.position) : index,
        visible: preference ? Boolean(preference.visible) : true,
        isCover: preference ? Boolean(preference.isCover) : false,
      };
    })
    .sort(
      (left, right) =>
        left.position - right.position ||
        left.deliveryFileId - right.deliveryFileId,
    );
  if (
    media.some((item) => item.kind === "IMAGE") &&
    !media.some((item) => item.kind === "IMAGE" && item.isCover)
  ) {
    const firstImage = media.find((item) => item.kind === "IMAGE");
    firstImage.isCover = true;
  }
  const cover = media.find(
    (item) => item.kind === "IMAGE" && item.visible && item.isCover,
  );
  return {
    id: Number(booking.id),
    ...serializeBookingFacts(booking),
    ...summarizeMedia(booking),
    coverUrl: cover
      ? `/api/files/download?fileId=${encodeURIComponent(cover.deliveryFileId)}`
      : null,
    listing: serializeListing(booking.propertyShareListing),
    media,
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

  const selected = [];
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
    selected.push({ property, booking });
  }
  return selected;
}

async function ensurePropertyMediaPreferences(
  ownerUserId,
  bookingLike,
  transaction,
) {
  const booking = toPlain(bookingLike) || {};
  const files = eligibleDeliveryFiles(booking);
  const existing = await PropertyMediaPreference.findAll({
    where: {
      ownerUserId,
      bookingId: booking.id,
    },
    transaction,
    ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}),
    order: [
      ["position", "ASC"],
      ["id", "ASC"],
    ],
  });
  const byFileId = new Map(
    existing.map((preference) => [
      Number(preference.deliveryFileId),
      preference,
    ]),
  );
  let nextPosition =
    Math.max(-1, ...existing.map((item) => Number(item.position))) + 1;
  for (const file of files) {
    if (byFileId.has(Number(file.id))) continue;
    const preference = await PropertyMediaPreference.create(
      {
        ownerUserId,
        bookingId: booking.id,
        deliveryFileId: file.id,
        position: nextPosition,
        visible: true,
        isCover: false,
      },
      { transaction },
    );
    nextPosition += 1;
    byFileId.set(Number(file.id), preference);
  }

  const eligible = files
    .map((file) => ({
      file,
      preference: byFileId.get(Number(file.id)),
      kind: getInlinePropertyMediaDetails(file, file.currentVersion)?.kind,
    }))
    .filter(({ preference }) => Boolean(preference));
  const visible = eligible.filter(({ preference }) =>
    Boolean(preference.visible),
  );
  const visibleImages = visible.filter(({ kind }) => kind === "IMAGE");
  const persistedCover = visibleImages.find(({ preference }) =>
    Boolean(preference.isCover),
  );
  const cover = persistedCover || visibleImages[0] || null;

  return visible
    .sort(
      (left, right) =>
        Number(right === cover) - Number(left === cover) ||
        Number(left.preference.position) - Number(right.preference.position) ||
        Number(left.file.id) - Number(right.file.id),
    )
    .map(({ file }) => file);
}

async function replacePropertyMediaSnapshot(property, booking, transaction) {
  const media = await ensurePropertyMediaPreferences(
    Number(booking.userId),
    booking,
    transaction,
  );
  await PropertyShareMedia.destroy({
    where: { sharePropertyId: property.id },
    transaction,
  });
  if (media.length === 0) return;
  await PropertyShareMedia.bulkCreate(
    media.map((file, position) => ({
      sharePropertyId: property.id,
      deliveryFileId: file.id,
      deliveryFileVersionId: file.currentVersionId,
      position,
    })),
    { transaction },
  );
}

export async function synchronizePropertyShareMediaForBooking(
  bookingId,
  transaction,
) {
  const normalizedBookingId = requirePositiveInteger(bookingId);
  const synchronize = async (activeTransaction) => {
    const booking = await Booking.findByPk(normalizedBookingId, {
      include: [
        {
          model: BookingDeliveryFile,
          as: "deliveryFiles",
          required: false,
          include: [
            {
              model: BookingDeliveryFileVersion,
              as: "currentVersion",
              required: false,
            },
          ],
        },
      ],
      transaction: activeTransaction,
      // Delivery files and their current versions are optional outer joins.
      // PostgreSQL rejects an unscoped FOR UPDATE against nullable join sides.
      lock: { level: activeTransaction.LOCK.UPDATE, of: Booking },
    });
    if (!booking) return { synchronizedShareCount: 0 };
    const properties = await PropertyShareProperty.findAll({
      where: { bookingId: normalizedBookingId },
      transaction: activeTransaction,
      lock: activeTransaction.LOCK.UPDATE,
    });
    for (const property of properties) {
      await replacePropertyMediaSnapshot(property, booking, activeTransaction);
    }
    return { synchronizedShareCount: properties.length };
  };
  return transaction
    ? synchronize(transaction)
    : sequelize.transaction(synchronize);
}

export async function savePropertyMediaPreferences(
  ownerUserId,
  bookingId,
  input,
) {
  const ownerId = requirePositiveInteger(ownerUserId);
  const normalizedBookingId = requirePositiveInteger(bookingId);
  if (!Array.isArray(input) || input.length === 0 || input.length > 200) {
    throw new PropertyShareConflictError("Media preferences are invalid");
  }
  const normalized = input.map((item, position) => {
    const deliveryFileId = requirePositiveInteger(
      item?.deliveryFileId,
      "Media preferences are invalid",
    );
    return {
      deliveryFileId,
      position,
      visible: item?.visible !== false,
      isCover: item?.isCover === true,
    };
  });
  if (
    new Set(normalized.map((item) => item.deliveryFileId)).size !==
    normalized.length
  ) {
    throw new PropertyShareConflictError("Media preferences are invalid");
  }

  return sequelize.transaction(async (transaction) => {
    await lockOwner(ownerId, transaction);
    const [booking] = await findEligibleBookings(
      ownerId,
      [normalizedBookingId],
      { transaction, lock: true },
    );
    const eligible = eligibleDeliveryFiles(booking);
    const eligibleById = new Map(
      eligible.map((file) => [Number(file.id), file]),
    );
    if (
      normalized.length !== eligible.length ||
      normalized.some((item) => !eligibleById.has(item.deliveryFileId))
    ) {
      throw new PropertyShareConflictError(
        "Media changed. Reload the listing and try again",
      );
    }
    if (!normalized.some((item) => item.visible)) {
      throw new PropertyShareConflictError(
        "At least one media item must remain visible",
      );
    }
    const images = normalized.filter(
      (item) =>
        getInlinePropertyMediaDetails(
          eligibleById.get(item.deliveryFileId),
          eligibleById.get(item.deliveryFileId)?.currentVersion,
        )?.kind === "IMAGE",
    );
    const visibleImages = images.filter((item) => item.visible);
    const covers = normalized.filter((item) => item.isCover);
    if (
      (images.length > 0 && visibleImages.length === 0) ||
      covers.length > 1 ||
      (covers.length === 1 &&
        (!covers[0].visible ||
          !images.some(
            (image) => image.deliveryFileId === covers[0].deliveryFileId,
          )))
    ) {
      throw new PropertyShareConflictError(
        "Choose one visible photo as the cover",
      );
    }
    if (visibleImages.length > 0 && covers.length === 0) {
      visibleImages[0].isCover = true;
    }

    await ensurePropertyMediaPreferences(ownerId, booking, transaction);
    const records = await PropertyMediaPreference.findAll({
      where: {
        ownerUserId: ownerId,
        bookingId: normalizedBookingId,
        deliveryFileId: {
          [Op.in]: normalized.map((item) => item.deliveryFileId),
        },
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const byFileId = new Map(
      records.map((record) => [Number(record.deliveryFileId), record]),
    );
    await PropertyMediaPreference.update(
      { isCover: false, position: literal('"position" + 1000000') },
      {
        where: {
          ownerUserId: ownerId,
          bookingId: normalizedBookingId,
        },
        transaction,
      },
    );
    for (const preference of normalized) {
      const record = byFileId.get(preference.deliveryFileId);
      await record.update(preference, { transaction });
    }
    await synchronizePropertyShareMediaForBooking(
      normalizedBookingId,
      transaction,
    );
    return { bookingId: normalizedBookingId };
  });
}

export async function savePropertyContact(
  ownerUserId,
  input,
  contactId = null,
) {
  const ownerId = requirePositiveInteger(ownerUserId);
  const normalized = normalizeSavedPropertyContact(input);
  return sequelize.transaction(async (transaction) => {
    await lockOwner(ownerId, transaction);
    const id =
      contactId === null || contactId === undefined
        ? null
        : requirePositiveInteger(contactId);
    let contact = id
      ? await PropertySavedContact.findOne({
          where: { id, ownerUserId: ownerId },
          transaction,
          lock: transaction.LOCK.UPDATE,
        })
      : await PropertySavedContact.findOne({
          where: {
            ownerUserId: ownerId,
            normalizedPhone: normalized.normalizedPhone,
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
    if (id && !contact) throw new PropertyShareNotFoundError();
    const duplicate = await PropertySavedContact.findOne({
      where: {
        ownerUserId: ownerId,
        normalizedPhone: normalized.normalizedPhone,
        ...(contact ? { id: { [Op.ne]: contact.id } } : {}),
      },
      transaction,
    });
    if (duplicate) {
      throw new PropertyShareConflictError(
        "A saved contact already uses this phone number",
      );
    }
    if (contact) await contact.update(normalized, { transaction });
    else {
      contact = await PropertySavedContact.create(
        { ownerUserId: ownerId, ...normalized },
        { transaction },
      );
    }
    return {
      id: Number(contact.id),
      name: contact.name,
      phone: contact.normalizedPhone,
    };
  });
}

export async function deletePropertyContact(ownerUserId, contactId) {
  const deleted = await PropertySavedContact.destroy({
    where: {
      id: requirePositiveInteger(contactId),
      ownerUserId: requirePositiveInteger(ownerUserId),
    },
  });
  if (deleted !== 1) throw new PropertyShareNotFoundError();
  return { contactId: Number(contactId) };
}

async function replaceShareMediaSnapshots(selectedProperties, transaction) {
  for (const { property, booking } of selectedProperties) {
    await replacePropertyMediaSnapshot(property, booking, transaction);
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
      const selectedProperties = await replaceShareProperties(
        share,
        bookings,
        transaction,
      );
      await replaceShareMediaSnapshots(selectedProperties, transaction);
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
    const selectedProperties = await replaceShareProperties(
      share,
      bookings,
      transaction,
    );
    await replaceShareMediaSnapshots(selectedProperties, transaction);
    return { shareId: Number(share.id) };
  });
}

export async function setPropertyShareEnabled(ownerUserId, shareId, enabled) {
  return sequelize.transaction(async (transaction) => {
    const share = await findOwnerShare(ownerUserId, shareId, transaction, true);
    if (enabled) {
      const properties = await PropertyShareProperty.findAll({
        where: { shareLinkId: share.id },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      for (const property of properties) {
        await synchronizePropertyShareMediaForBooking(
          property.bookingId,
          transaction,
        );
      }
    }
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
      const media = [...(property.files || [])]
        .sort(
          (leftLike, rightLike) =>
            Number(toPlain(leftLike).position || 0) -
              Number(toPlain(rightLike).position || 0) ||
            Number(toPlain(leftLike).id) - Number(toPlain(rightLike).id),
        )
        .map(serializePublicMedia);
      const cover = media.find((item) => item.kind === "IMAGE");
      return {
        id: Number(property.id),
        bookingId: Number(property.bookingId),
        ...serializeBookingFacts(booking),
        listing: serializeListing(booking.propertyShareListing),
        mediaCount: media.length,
        imageCount: media.filter((item) => item.kind === "IMAGE").length,
        videoCount: media.filter((item) => item.kind === "VIDEO").length,
        hasVideo: media.some((item) => item.kind === "VIDEO"),
        hasTour: media.some((item) => item.kind === "TOUR"),
        coverUrl: cover
          ? `/api/public/property-shares/${encodeURIComponent(share.publicId)}/properties/${encodeURIComponent(property.id)}/media/${encodeURIComponent(cover.id)}`
          : null,
      };
    }),
  };
}

export async function getPropertySharingDashboard(ownerUserId) {
  const ownerId = requirePositiveInteger(ownerUserId);
  const [eligibleBookings, shares, savedContacts] = await Promise.all([
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
              model: PropertyShareMedia,
              as: "files",
              required: false,
              attributes: [
                "id",
                "position",
                "deliveryFileId",
                "deliveryFileVersionId",
              ],
              include: [
                {
                  model: BookingDeliveryFile,
                  as: "deliveryFile",
                  required: true,
                  attributes: ["id", "type", "label", "deliveryMode"],
                },
                {
                  model: BookingDeliveryFileVersion,
                  as: "deliveryFileVersion",
                  required: true,
                  attributes: ["id", "mimeType", "originalFilename", "url"],
                },
              ],
            },
            {
              model: Booking,
              as: "booking",
              required: true,
              attributes: [
                "id",
                "userId",
                "status",
                "workflowStatus",
                "propertyDetails",
                "shootDetails",
                "completedAt",
                "cancelledAt",
              ],
              include: [
                {
                  model: PropertyShareListing,
                  as: "propertyShareListing",
                  required: true,
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
    PropertySavedContact.findAll({
      where: { ownerUserId: ownerId },
      order: [
        ["name", "ASC"],
        ["id", "ASC"],
      ],
    }),
  ]);
  return {
    eligibleProperties: eligibleBookings.map(serializeEligibleProperty),
    shares: shares.map(serializeOwnerShare),
    savedContacts: savedContacts.map((contactLike) => {
      const contact = toPlain(contactLike);
      return {
        id: Number(contact.id),
        name: contact.name,
        phone: contact.normalizedPhone,
      };
    }),
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
        ],
      },
      {
        model: PropertyShareMedia,
        as: "files",
        required: true,
        include: [
          {
            model: BookingDeliveryFile,
            as: "deliveryFile",
            required: true,
          },
          {
            model: BookingDeliveryFileVersion,
            as: "deliveryFileVersion",
            required: true,
          },
        ],
      },
    ],
    order: [
      ["position", "ASC"],
      [{ model: PropertyShareMedia, as: "files" }, "position", "ASC"],
    ],
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
      !hasShareableBookingState(booking, share.ownerUserId)
    ) {
      return null;
    }
    const media = (property.files || []).filter((membershipLike) => {
      const membership = toPlain(membershipLike);
      const file = toPlain(membership.deliveryFile) || {};
      const version = toPlain(membership.deliveryFileVersion) || {};
      return (
        Number(file.bookingId) === Number(property.bookingId) &&
        Number(version.deliveryFileId) === Number(file.id) &&
        Number(membership.deliveryFileId) === Number(file.id) &&
        Number(membership.deliveryFileVersionId) === Number(version.id) &&
        Number(file.currentVersionId) === Number(version.id) &&
        !file.deletedAt &&
        SHAREABLE_MEDIA_STATUSES.includes(file.status) &&
        !version.supersededAt &&
        Boolean(getInlinePropertyMediaDetails(file, version))
      );
    });
    if (media.length === 0) {
      return null;
    }
    property.files = media;
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
    ...(details.kind === "TOUR" ? { embedUrl: details.embedUrl } : {}),
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
  const commercial = listing.propertyType === "COMMERCIAL";
  return {
    id: Number(property.id),
    title: listing.listingTitle,
    displayPrice: formatPriceAed(listing.priceAed, listing.listingType),
    listingType: listing.listingType,
    listingTypeLabel: listing.listingTypeLabel,
    propertyType: listing.propertyType,
    propertyTypeLabel: listing.propertyTypeLabel,
    bathrooms: commercial ? null : listing.bathrooms,
    maidRoom: commercial ? false : listing.maidRoom,
    sizeSqft: listing.sizeSqft,
    builtUpAreaSqft: listing.builtUpAreaSqft,
    plotAreaSqft: listing.plotAreaSqft,
    applicableAreaSqft: listing.applicableAreaSqft,
    pricePerSqft: listing.pricePerSqft,
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
    bedrooms: commercial ? null : bookingBedrooms(booking),
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

export async function resolvePublicPropertyShareMetadata(
  token,
  requestedPropertyId = null,
) {
  const share = await loadValidPublicShare(token);
  if (
    !share ||
    (requestedPropertyId !== null &&
      !findPublicProperty(share, requestedPropertyId))
  ) {
    return null;
  }
  return serializePublicLanding(share);
}

async function resolvePublicPropertyShareMediaInternal(
  { token, propertyId, sharedFileId },
  { imageOnly = false } = {},
) {
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
  if (
    !details ||
    details.kind === "TOUR" ||
    (imageOnly && details.kind !== "IMAGE")
  ) {
    return null;
  }
  return {
    storageUrl: pinnedVersion.url,
    mimeType: details.mimeType,
    sizeBytes:
      pinnedVersion.sizeBytes === null || pinnedVersion.sizeBytes === undefined
        ? null
        : Number(pinnedVersion.sizeBytes),
    ...(imageOnly ? { bookingId: Number(property.bookingId) } : {}),
  };
}

export async function resolvePublicPropertyShareMedia(args) {
  return resolvePublicPropertyShareMediaInternal(args);
}

export async function resolvePublicPropertySharePreview(args) {
  return resolvePublicPropertyShareMediaInternal(args, { imageOnly: true });
}
