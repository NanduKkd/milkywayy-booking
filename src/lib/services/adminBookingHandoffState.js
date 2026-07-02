export const ADMIN_BOOKING_HANDOFF_TTL_MS = 4 * 60 * 60 * 1000;
export const ADMIN_BOOKING_HANDOFF_METADATA_KEY = "adminBookingHandoff";

function toIsoString(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function getAdminBookingHandoffMetadata(transaction) {
  const metadata =
    transaction?.metadata?.[ADMIN_BOOKING_HANDOFF_METADATA_KEY] || null;

  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  return metadata;
}

export function buildAdminBookingHandoffMetadata(overrides = {}) {
  const version = String(overrides.version || "").trim();
  const expiresAt = toIsoString(overrides.expiresAt);

  if (!version) {
    throw new Error("Admin booking handoff version is required");
  }

  if (!expiresAt) {
    throw new Error("Admin booking handoff expiresAt is required");
  }

  return {
    version,
    customerMode: overrides.customerMode === "new" ? "new" : "existing",
    requiresRegistration: Boolean(overrides.requiresRegistration),
    registrationVerifiedAt: toIsoString(overrides.registrationVerifiedAt),
    createdByUserId: Number(overrides.createdByUserId || 0) || null,
    generatedAt: toIsoString(overrides.generatedAt) || new Date().toISOString(),
    expiresAt,
  };
}

export function mergeAdminBookingHandoffMetadata(
  transactionMetadata,
  overrides = {},
) {
  const existing = getAdminBookingHandoffMetadata({
    metadata: transactionMetadata,
  });

  return {
    ...(transactionMetadata || {}),
    [ADMIN_BOOKING_HANDOFF_METADATA_KEY]: buildAdminBookingHandoffMetadata({
      ...(existing || {}),
      ...overrides,
    }),
  };
}

export function isAdminBookingHandoffTransaction(transaction) {
  return Boolean(getAdminBookingHandoffMetadata(transaction));
}

export function isAdminBookingHandoffExpired(transaction, now = new Date()) {
  const metadata = getAdminBookingHandoffMetadata(transaction);
  if (!metadata?.expiresAt) return false;

  return new Date(metadata.expiresAt).getTime() <= now.getTime();
}

export function isAdminBookingHandoffCheckoutAllowed(
  transaction,
  now = new Date(),
) {
  const metadata = getAdminBookingHandoffMetadata(transaction);
  if (!metadata) return false;
  if (isAdminBookingHandoffExpired(transaction, now)) return false;

  if (metadata.requiresRegistration && !metadata.registrationVerifiedAt) {
    return false;
  }

  return true;
}

export function getAdminBookingHandoffBookingIds(transaction) {
  const bookingIds = transaction?.metadata?.bookingIds;
  if (!Array.isArray(bookingIds)) return [];

  return bookingIds
    .map((bookingId) => Number(bookingId))
    .filter((bookingId) => Number.isInteger(bookingId) && bookingId > 0);
}
