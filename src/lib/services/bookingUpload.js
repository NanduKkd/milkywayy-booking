import Booking from "@/lib/db/models/booking";
import BookingDeliveryFile from "@/lib/db/models/bookingdeliveryfile";
import BookingDeliveryUpload from "@/lib/db/models/bookingdeliveryupload";
import {
  BOOKING_WORKFLOW_STATUS,
  DELIVERY_FILE_STATUS,
  DELIVERY_FILE_TYPE,
  getWorkflowStatus,
} from "@/lib/helpers/bookingWorkflow";
import { getBookingUploadConfig, sanitizeFilename } from "@/lib/storage/s3";

const DELIVERY_TYPES = new Set(Object.values(DELIVERY_FILE_TYPE));

export const validateInitiatePayload = (payload) => {
  const bookingId = Number(payload?.bookingId);
  const replacementFileId = payload?.replacementFileId
    ? Number(payload.replacementFileId)
    : null;
  const sizeBytes = Number(payload?.sizeBytes);
  const fileName = sanitizeFilename(payload?.fileName, "");
  const mimeType = String(
    payload?.mimeType || "application/octet-stream",
  ).trim();
  const deliverableType = String(payload?.deliverableType || "").trim();
  const { maxBytes } = getBookingUploadConfig();

  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    throw new Error("bookingId must be a positive integer");
  }
  if (
    replacementFileId !== null &&
    (!Number.isInteger(replacementFileId) || replacementFileId <= 0)
  ) {
    throw new Error("replacementFileId must be a positive integer");
  }
  if (!fileName) throw new Error("fileName is required");
  if (
    !Number.isSafeInteger(sizeBytes) ||
    sizeBytes <= 0 ||
    sizeBytes > maxBytes
  ) {
    throw new Error(`File size must be between 1 byte and ${maxBytes} bytes`);
  }
  if (mimeType.length > 255 || !/^[^\s/]+\/[^\s/]+$/.test(mimeType)) {
    throw new Error("mimeType is invalid");
  }
  if (!DELIVERY_TYPES.has(deliverableType)) {
    throw new Error("Invalid deliverableType");
  }

  return {
    bookingId,
    replacementFileId,
    sizeBytes,
    fileName,
    mimeType,
    deliverableType,
  };
};

export const assertUploadTarget = async ({ bookingId, replacementFileId }) => {
  const booking = await Booking.findByPk(bookingId);
  if (!booking) throw new Error("Booking not found");
  if (booking.cancelledAt || booking.status === "CANCELLED") {
    throw new Error("Cancelled bookings cannot receive files");
  }
  if (booking.status !== "CONFIRMED") {
    throw new Error("Only confirmed bookings can receive files");
  }
  if (
    ![
      BOOKING_WORKFLOW_STATUS.EDITING,
      BOOKING_WORKFLOW_STATUS.FILES_UPLOADED,
    ].includes(getWorkflowStatus(booking))
  ) {
    throw new Error("Deliverables can only be uploaded after editing starts");
  }

  if (replacementFileId) {
    const deliveryFile = await BookingDeliveryFile.findOne({
      where: { id: replacementFileId, bookingId },
    });
    if (!deliveryFile) throw new Error("Delivery file not found");
    if (deliveryFile.status !== DELIVERY_FILE_STATUS.CHANGES_REQUESTED) {
      throw new Error("This file is not awaiting a replacement");
    }
  }
  return booking;
};

export const findOwnedUploadSession = (id, createdBy, options = {}) =>
  BookingDeliveryUpload.findOne({
    where: { id, createdBy },
    ...options,
  });

export const uploadErrorStatus = (error) => {
  const message = error?.message || "Upload failed";
  if (
    message === "Booking not found" ||
    message === "Upload session not found"
  ) {
    return 404;
  }
  if (
    message.includes("must be") ||
    message.includes("is required") ||
    message === "mimeType is invalid" ||
    message === "Invalid deliverableType" ||
    message.startsWith("File size") ||
    message.startsWith("Invalid part")
  ) {
    return 400;
  }
  if (
    message.includes("cannot receive") ||
    message.includes("Only confirmed") ||
    message.includes("only be uploaded") ||
    message.includes("not awaiting") ||
    message.includes("already") ||
    message.includes("does not match")
  ) {
    return 409;
  }
  return 500;
};
