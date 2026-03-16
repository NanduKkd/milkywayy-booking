export function formatInvoiceNumber(transactionId) {
  return `INV-${String(transactionId).padStart(6, "0")}`;
}

export function formatBookingReference(booking) {
  if (!booking) return "";
  if (booking.bookingCode) return booking.bookingCode;
  return `MWY-${String(booking.id).padStart(6, "0")}`;
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
