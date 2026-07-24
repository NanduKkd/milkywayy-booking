import { CompleteMultipartUploadCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { USER_ROLES } from "@/lib/config/app.config";
import { sequelize } from "@/lib/db/db";
import { auth } from "@/lib/helpers/auth";
import {
  assertUploadTarget,
  findOwnedUploadSession,
  uploadErrorStatus,
} from "@/lib/services/bookingUpload";
import { addUploadedDeliveryFiles } from "@/lib/services/fileDelivery";
import {
  buildCanonicalObjectUrl,
  deleteBookingObject,
  getBookingUploadConfig,
  getS3Client,
  getS3Config,
  headBookingObject,
} from "@/lib/storage/s3";

const validateParts = (parts, expectedCount) => {
  if (!Array.isArray(parts) || parts.length !== expectedCount) {
    throw new Error("Invalid part list");
  }
  const normalized = parts
    .map((part) => ({
      PartNumber: Number(part?.partNumber),
      ETag: String(part?.etag || "").trim(),
    }))
    .sort((a, b) => a.PartNumber - b.PartNumber);
  if (
    normalized.some(
      (part, index) =>
        part.PartNumber !== index + 1 || !part.ETag || part.ETag.length > 1024,
    )
  ) {
    throw new Error("Invalid part list");
  }
  return normalized;
};

const shouldRemoveCompletedObject = (error) =>
  [
    "Booking not found",
    "Cancelled bookings cannot receive files",
    "Only confirmed bookings can receive files",
    "Deliverables can only be uploaded after editing starts",
    "Delivery file not found",
    "This file is not awaiting a replacement",
    "deliverableType does not match replacement file",
    "Invalid deliverableType",
  ].includes(error?.message);

export async function POST(request, { params }) {
  const session = await auth();
  if (!session?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== USER_ROLES.SUPERADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { sessionId } = await params;
  const upload = await findOwnedUploadSession(sessionId, Number(session.id));
  if (!upload)
    return NextResponse.json(
      { error: "Upload session not found" },
      { status: 404 },
    );
  if (upload.status === "COMPLETED" && upload.resultJson) {
    return NextResponse.json(upload.resultJson);
  }
  if (upload.status !== "INITIATED") {
    return NextResponse.json(
      { error: `Upload is already ${upload.status.toLowerCase()}` },
      { status: 409 },
    );
  }

  let objectCompleted = false;
  try {
    await assertUploadTarget({
      bookingId: upload.bookingId,
      replacementFileId: upload.replacementFileId,
      deliverableType: upload.deliverableType,
    });
    const { partBytes } = getBookingUploadConfig();
    const expectedCount = Math.ceil(Number(upload.sizeBytes) / partBytes);
    const parts = validateParts((await request.json()).parts, expectedCount);
    const { bucket } = getS3Config();

    try {
      await getS3Client().send(
        new CompleteMultipartUploadCommand({
          Bucket: bucket,
          Key: upload.objectKey,
          UploadId: upload.s3UploadId,
          MultipartUpload: { Parts: parts },
        }),
      );
    } catch (error) {
      if (error?.name !== "NoSuchUpload") throw error;
    }
    objectCompleted = true;

    const metadata = await headBookingObject(upload.objectKey);
    if (BigInt(metadata.ContentLength ?? -1) !== BigInt(upload.sizeBytes)) {
      await deleteBookingObject(upload.objectKey).catch(() => {});
      await upload.update({
        status: "FAILED",
        failureReason: "Completed object size does not match the expected size",
      });
      throw new Error("Completed object size does not match the expected size");
    }

    const result = await sequelize.transaction(async (transaction) => {
      const lockedUpload = await findOwnedUploadSession(
        sessionId,
        Number(session.id),
        { transaction, lock: transaction.LOCK.UPDATE },
      );
      if (!lockedUpload) throw new Error("Upload session not found");
      if (lockedUpload.status === "COMPLETED" && lockedUpload.resultJson) {
        return lockedUpload.resultJson;
      }
      if (lockedUpload.status !== "INITIATED") {
        throw new Error(
          `Upload is already ${lockedUpload.status.toLowerCase()}`,
        );
      }

      const url = buildCanonicalObjectUrl(lockedUpload.objectKey);
      const registered = await addUploadedDeliveryFiles({
        bookingId: lockedUpload.bookingId,
        uploads: [
          {
            url,
            originalFilename: lockedUpload.originalFilename,
            mimeType: lockedUpload.mimeType,
            sizeBytes: Number(lockedUpload.sizeBytes),
          },
        ],
        type: lockedUpload.deliverableType,
        label: lockedUpload.deliverableType,
        deliveryMode: "direct_download",
        replacementFileId: lockedUpload.replacementFileId,
        transaction,
      });
      const response = {
        url,
        urls: [url],
        filesUrl: registered.booking.filesUrl,
        booking: registered.booking,
        deliveryFiles: registered.deliveryFiles,
        optimized: false,
      };
      await lockedUpload.update(
        { status: "COMPLETED", completedAt: new Date(), resultJson: response },
        { transaction },
      );
      return response;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error(`Failed to complete booking upload ${sessionId}:`, error);
    if (objectCompleted && shouldRemoveCompletedObject(error)) {
      await deleteBookingObject(upload.objectKey).catch(() => {});
      await upload
        .update({ status: "FAILED", failureReason: error.message })
        .catch(() => {});
    }
    const status = uploadErrorStatus(error);
    return NextResponse.json(
      { error: status === 500 ? "Unable to complete upload" : error.message },
      { status },
    );
  }
}
