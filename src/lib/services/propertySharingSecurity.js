import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import jwt from "jsonwebtoken";

export const PROPERTY_SHARE_TOKEN_BYTES = 32;
export const PROPERTY_SHARE_RECEIPT_MAX_AGE_SECONDS = 24 * 60 * 60;
export const PROPERTY_SHARE_CONTACT_RETENTION_DAYS = 90;
export const PROPERTY_SHARE_CONTACT_FIELDS = Object.freeze(["name", "phone"]);

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/u;
const PHONE_PATTERN = /^\+?[0-9]{7,15}$/u;
const RECEIPT_AUDIENCE = "property-share-file-access";
const RECEIPT_ISSUER = "milkywayy-booking";
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 8;
const RATE_LIMIT_MAX_KEYS = 5_000;
const throttleSecret = randomBytes(32);
const throttleBuckets = new Map();

export class PropertyShareInputError extends Error {
  constructor(message) {
    super(message);
    this.name = "PropertyShareInputError";
    this.code = "PROPERTY_SHARE_INVALID_INPUT";
  }
}

export class PropertyShareRateLimitError extends Error {
  constructor() {
    super("Too many contact attempts. Try again later.");
    this.name = "PropertyShareRateLimitError";
    this.code = "PROPERTY_SHARE_RATE_LIMITED";
  }
}

export function createPropertyShareToken() {
  return randomBytes(PROPERTY_SHARE_TOKEN_BYTES).toString("base64url");
}

export function isPropertyShareToken(value) {
  return typeof value === "string" && TOKEN_PATTERN.test(value);
}

export function digestPropertyShareToken(value) {
  if (!isPropertyShareToken(value)) return null;
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function tokenDigestMatches(left, right) {
  if (!/^[0-9a-f]{64}$/u.test(String(left || ""))) return false;
  if (!/^[0-9a-f]{64}$/u.test(String(right || ""))) return false;
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

function normalizeName(value) {
  const withoutControlCharacters = [...String(value ?? "")]
    .map((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127 ? " " : character;
    })
    .join("");
  const normalized = withoutControlCharacters.replace(/\s+/gu, " ").trim();
  if (normalized.length < 2 || normalized.length > 100) {
    throw new PropertyShareInputError(
      "Name must be between 2 and 100 characters.",
    );
  }
  return normalized;
}

function normalizePhone(value) {
  const raw = String(value ?? "").trim();
  if (raw.length > 40) {
    throw new PropertyShareInputError("Enter a valid phone number.");
  }
  const normalized = raw.replace(/[\s().-]/gu, "").replace(/^00/u, "+");
  if (!PHONE_PATTERN.test(normalized)) {
    throw new PropertyShareInputError("Enter a valid phone number.");
  }
  return normalized;
}

export function normalizePropertyShareContact(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new PropertyShareInputError("Name and phone are required.");
  }
  const keys = Object.keys(input).sort();
  const allowed = [...PROPERTY_SHARE_CONTACT_FIELDS].sort();
  if (
    keys.length !== allowed.length ||
    keys.some((key, index) => key !== allowed[index])
  ) {
    throw new PropertyShareInputError("Only name and phone may be submitted.");
  }
  return {
    name: normalizeName(input.name),
    phone: normalizePhone(input.phone),
  };
}

function receiptSecret() {
  const configured = String(
    process.env.PROPERTY_SHARE_RECEIPT_SECRET || "",
  ).trim();
  if (configured.length >= 32) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "PROPERTY_SHARE_RECEIPT_SECRET must contain at least 32 characters in production.",
    );
  }
  return "local-property-share-receipt-secret-not-for-production";
}

export function getPropertyShareReceiptCookieName(shareId, propertyId) {
  const normalizedShareId = Number(shareId);
  const normalizedPropertyId = Number(propertyId);
  if (
    !Number.isSafeInteger(normalizedShareId) ||
    normalizedShareId <= 0 ||
    !Number.isSafeInteger(normalizedPropertyId) ||
    normalizedPropertyId <= 0
  ) {
    throw new PropertyShareInputError("Invalid property receipt scope.");
  }
  return `property-share-receipt-${normalizedShareId}-${normalizedPropertyId}`;
}

export async function createPropertyShareReceipt({
  shareId,
  propertyId,
  credentialVersion,
  now = new Date(),
}) {
  const issuedAt = Math.floor(now.getTime() / 1000);
  const expiresAt = issuedAt + PROPERTY_SHARE_RECEIPT_MAX_AGE_SECONDS;
  const token = jwt.sign(
    {
      sid: Number(shareId),
      pid: Number(propertyId),
      cv: Number(credentialVersion),
      iat: issuedAt,
      exp: expiresAt,
    },
    receiptSecret(),
    {
      algorithm: "HS256",
      issuer: RECEIPT_ISSUER,
      audience: RECEIPT_AUDIENCE,
    },
  );

  return {
    cookieName: getPropertyShareReceiptCookieName(shareId, propertyId),
    token,
    maxAge: PROPERTY_SHARE_RECEIPT_MAX_AGE_SECONDS,
    expiresAt: new Date(expiresAt * 1000),
  };
}

export async function verifyPropertyShareReceipt(
  token,
  { shareId, propertyId, credentialVersion, now = new Date() },
) {
  if (!token || typeof token !== "string") return false;
  try {
    const payload = jwt.verify(token, receiptSecret(), {
      algorithms: ["HS256"],
      issuer: RECEIPT_ISSUER,
      audience: RECEIPT_AUDIENCE,
      clockTimestamp: Math.floor(now.getTime() / 1000),
    });
    return (
      Number(payload.sid) === Number(shareId) &&
      Number(payload.pid) === Number(propertyId) &&
      Number(payload.cv) === Number(credentialVersion)
    );
  } catch {
    return false;
  }
}

function pruneThrottleBuckets(nowMs) {
  for (const [key, bucket] of throttleBuckets) {
    if (bucket.expiresAt <= nowMs) throttleBuckets.delete(key);
  }
  while (throttleBuckets.size >= RATE_LIMIT_MAX_KEYS) {
    const oldestKey = throttleBuckets.keys().next().value;
    if (!oldestKey) break;
    throttleBuckets.delete(oldestKey);
  }
}

function throttleKey({ shareId, propertyId, networkAddress }) {
  const signal = String(networkAddress || "unknown").slice(0, 256);
  const digest = createHmac("sha256", throttleSecret)
    .update(signal, "utf8")
    .digest("base64url");
  return `${Number(shareId)}:${Number(propertyId)}:${digest}`;
}

export function enforcePropertyShareContactThrottle({
  shareId,
  propertyId,
  networkAddress,
  now = new Date(),
}) {
  const nowMs = now.getTime();
  pruneThrottleBuckets(nowMs);
  const key = throttleKey({ shareId, propertyId, networkAddress });
  const current = throttleBuckets.get(key);
  if (!current || current.expiresAt <= nowMs) {
    throttleBuckets.set(key, {
      count: 1,
      expiresAt: nowMs + RATE_LIMIT_WINDOW_MS,
    });
    return;
  }
  if (current.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    throw new PropertyShareRateLimitError();
  }
  current.count += 1;
}

export function isSameOriginPropertyShareRequest(request) {
  try {
    const requestUrl = new URL(request.url);
    const origin = request.headers.get("origin");
    return Boolean(origin) && new URL(origin).origin === requestUrl.origin;
  } catch {
    return false;
  }
}

export function getPropertyShareNetworkAddress(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

export function resetPropertyShareThrottleForTests() {
  if (process.env.NODE_ENV === "test") throttleBuckets.clear();
}
