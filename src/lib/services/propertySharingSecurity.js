import { randomBytes } from "node:crypto";

export const PROPERTY_SHARE_ID_BYTES = 32;
export const PROPERTY_SHARE_LISTING_TYPES = Object.freeze([
  "FOR_SALE",
  "FOR_RENT_YEARLY",
  "HOLIDAY_HOME",
]);
export const PROPERTY_SHARE_FURNISHING = Object.freeze([
  "FURNISHED",
  "UNFURNISHED",
]);
export const PROPERTY_SHARE_LISTING_FIELDS = Object.freeze([
  "listingTitle",
  "priceAed",
  "listingType",
  "bathrooms",
  "sizeSqft",
  "furnishing",
  "description",
  "highlights",
  "contactName",
  "contactPhone",
]);

const PUBLIC_ID_PATTERN = /^[A-Za-z0-9_-]{43}$/u;
const PHONE_PATTERN = /^\+?[0-9]{7,15}$/u;
const PRICE_PATTERN = /^\d{1,10}(?:\.\d{1,2})?$/u;

export class PropertyShareInputError extends Error {
  constructor(message) {
    super(message);
    this.name = "PropertyShareInputError";
    this.code = "PROPERTY_SHARE_INVALID_INPUT";
  }
}

export function createPropertyShareId() {
  return randomBytes(PROPERTY_SHARE_ID_BYTES).toString("base64url");
}

export function isPropertyShareId(value) {
  return typeof value === "string" && PUBLIC_ID_PATTERN.test(value);
}

function cleanText(value, { field, min = 0, max, multiline = false }) {
  const withoutControls = [...String(value ?? "")]
    .map((character) => {
      const code = character.charCodeAt(0);
      if (code === 10 && multiline) return character;
      return code < 32 || code === 127 ? " " : character;
    })
    .join("");
  const normalized = multiline
    ? withoutControls
        .split("\n")
        .map((line) => line.replace(/[ \t]+/gu, " ").trim())
        .join("\n")
        .trim()
    : withoutControls.replace(/\s+/gu, " ").trim();
  if (normalized.length < min || normalized.length > max) {
    throw new PropertyShareInputError(
      `${field} must be between ${min} and ${max} characters.`,
    );
  }
  return normalized;
}

function normalizePhone(value) {
  const raw = String(value ?? "").trim();
  if (raw.length > 40) {
    throw new PropertyShareInputError("Enter a valid contact phone number.");
  }
  const normalized = raw.replace(/[\s().-]/gu, "").replace(/^00/u, "+");
  if (!PHONE_PATTERN.test(normalized)) {
    throw new PropertyShareInputError("Enter a valid contact phone number.");
  }
  return normalized;
}

function normalizeOptionalInteger(value, { field, min, max }) {
  if (value === "" || value === null || value === undefined) return null;
  const normalized = String(value).replaceAll(",", "").trim();
  if (!/^\d+$/u.test(normalized)) {
    throw new PropertyShareInputError(`${field} must be a whole number.`);
  }
  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    throw new PropertyShareInputError(
      `${field} must be between ${min} and ${max}.`,
    );
  }
  return parsed;
}

function normalizePrice(value) {
  const normalized = String(value ?? "")
    .replaceAll(",", "")
    .trim();
  if (!PRICE_PATTERN.test(normalized)) {
    throw new PropertyShareInputError("Enter a valid AED price.");
  }
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric) || numeric <= 0 || numeric > 9_999_999_999.99) {
    throw new PropertyShareInputError("Enter a valid AED price.");
  }
  return numeric.toFixed(2);
}

function normalizeEnum(value, allowed, field) {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();
  if (!allowed.includes(normalized)) {
    throw new PropertyShareInputError(`Select a valid ${field}.`);
  }
  return normalized;
}

function normalizeHighlights(value) {
  if (!Array.isArray(value)) {
    throw new PropertyShareInputError("Highlights must be a list.");
  }
  const seen = new Set();
  const normalized = value.map((highlight) =>
    cleanText(highlight, { field: "Each highlight", min: 2, max: 80 }),
  );
  const unique = normalized.filter((highlight) => {
    const key = highlight.toLocaleLowerCase("en");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (unique.length > 12) {
    throw new PropertyShareInputError("Add no more than 12 highlights.");
  }
  return unique;
}

export function normalizePropertyShareListing(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new PropertyShareInputError("Listing details are required.");
  }
  const unknown = Object.keys(input).filter(
    (key) => !PROPERTY_SHARE_LISTING_FIELDS.includes(key),
  );
  if (unknown.length > 0) {
    throw new PropertyShareInputError(
      "Unknown listing fields are not allowed.",
    );
  }
  return {
    listingTitle: cleanText(input.listingTitle, {
      field: "Listing title",
      min: 3,
      max: 160,
    }),
    priceAed: normalizePrice(input.priceAed),
    listingType: normalizeEnum(
      input.listingType,
      PROPERTY_SHARE_LISTING_TYPES,
      "listing type",
    ),
    bathrooms: normalizeOptionalInteger(input.bathrooms, {
      field: "Bathrooms",
      min: 0,
      max: 20,
    }),
    sizeSqft: normalizeOptionalInteger(input.sizeSqft, {
      field: "Size",
      min: 1,
      max: 1_000_000,
    }),
    furnishing: normalizeEnum(
      input.furnishing,
      PROPERTY_SHARE_FURNISHING,
      "furnishing",
    ),
    description: cleanText(input.description, {
      field: "Description",
      min: 0,
      max: 4000,
      multiline: true,
    }),
    highlights: normalizeHighlights(input.highlights),
    contactName: cleanText(input.contactName, {
      field: "Contact name",
      min: 2,
      max: 100,
    }),
    contactPhone: normalizePhone(input.contactPhone),
  };
}

export function propertyShareContactLinks(phone) {
  const normalized = normalizePhone(phone);
  return {
    telephone: `tel:${normalized}`,
    whatsapp: `https://wa.me/${normalized.replace(/^\+/u, "")}`,
  };
}
