export const BOOKING_NUMBER_PREFIX = "MWB";
export const BOOKING_NUMBER_OFFSET = 1000;

function normalizeDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function buildBookingReferenceFromId(id) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId < 1) return "";
  return `${BOOKING_NUMBER_PREFIX}-${numericId + BOOKING_NUMBER_OFFSET}`;
}

export function buildInvoiceNumber(dateLike, sequence) {
  const date = normalizeDate(dateLike);
  const numericSequence = Number(sequence);
  if (!date || !Number.isInteger(numericSequence) || numericSequence < 1) {
    return "";
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `MW-${year}-${month}${day}-${String(numericSequence).padStart(3, "0")}`;
}

export function formatInvoiceNumber(transaction) {
  if (!transaction) return "";
  if (typeof transaction === "string" && transaction.startsWith("MW-")) {
    return transaction;
  }
  if (typeof transaction === "object" && transaction.invoiceNumber) {
    return transaction.invoiceNumber;
  }

  const transactionId =
    typeof transaction === "object" ? transaction.id : transaction;
  return `INV-${String(transactionId).padStart(6, "0")}`;
}

export function formatBookingReference(booking) {
  if (!booking) return "";
  if (booking.bookingCode) return booking.bookingCode;
  return buildBookingReferenceFromId(booking.id);
}

export function formatBookingReferenceList(bookings) {
  if (!Array.isArray(bookings) || bookings.length === 0) return "";
  return bookings.map(formatBookingReference).filter(Boolean).join(", ");
}

export function formatInvoiceCardProperty(bookings) {
  if (!Array.isArray(bookings) || bookings.length === 0) return "Property booking";

  const firstBooking = bookings[0];
  const property = firstBooking?.propertyDetails || {};
  const size = property.propertySize || "";
  const type = property.propertyType || "";
  const community = property.community || "";

  const primary = [size, type].filter(Boolean).join(" ");
  return [primary, community].filter(Boolean).join(" - ") || "Property booking";
}

export function buildInvoiceDownloadUrl(sourceUrl, invoiceNumber) {
  if (!sourceUrl) return null;
  const safeName = `Milkywayy_${invoiceNumber || "invoice"}.pdf`;
  const encodedName = encodeURIComponent(safeName);
  const encodedUrl = encodeURIComponent(sourceUrl);
  return `/api/files/download?url=${encodedUrl}&name=${encodedName}`;
}
