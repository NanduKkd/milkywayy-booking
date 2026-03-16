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
