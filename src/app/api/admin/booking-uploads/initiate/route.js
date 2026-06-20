import {
  AbortMultipartUploadCommand,
  CreateMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { USER_ROLES } from "@/lib/config/app.config";
import BookingDeliveryUpload from "@/lib/db/models/bookingdeliveryupload";
import { auth } from "@/lib/helpers/auth";
import {
  assertUploadTarget,
  uploadErrorStatus,
  validateInitiatePayload,
} from "@/lib/services/bookingUpload";
import {
  createBookingObjectKey,
  getBookingUploadConfig,
  getS3Client,
  getS3Config,
} from "@/lib/storage/s3";

export async function POST(request) {
  const session = await auth();
  if (!session?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== USER_ROLES.SUPERADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let multipart;
  let objectKey;
  try {
    const payload = validateInitiatePayload(await request.json());
    await assertUploadTarget(payload);
    objectKey = createBookingObjectKey(payload.bookingId, payload.fileName);
    const { bucket } = getS3Config();
    multipart = await getS3Client().send(
      new CreateMultipartUploadCommand({
        Bucket: bucket,
        Key: objectKey,
        ContentType: payload.mimeType,
        Metadata: { original_filename: encodeURIComponent(payload.fileName) },
      }),
    );
    if (!multipart.UploadId) throw new Error("S3 did not create an upload ID");

    const upload = await BookingDeliveryUpload.create({
      ...payload,
      originalFilename: payload.fileName,
      objectKey,
      s3UploadId: multipart.UploadId,
      deliveryMode: "direct_download",
      status: "INITIATED",
      createdBy: Number(session.id),
    });
    const { partBytes } = getBookingUploadConfig();
    return NextResponse.json({
      sessionId: upload.id,
      partSize: partBytes,
      partCount: Math.ceil(payload.sizeBytes / partBytes),
    });
  } catch (error) {
    if (multipart?.UploadId && objectKey) {
      const { bucket } = getS3Config();
      await getS3Client()
        .send(
          new AbortMultipartUploadCommand({
            Bucket: bucket,
            Key: objectKey,
            UploadId: multipart.UploadId,
          }),
        )
        .catch(() => {});
    }
    console.error("Failed to initiate booking upload:", error);
    const status = uploadErrorStatus(error);
    return NextResponse.json(
      { error: status === 500 ? "Unable to initiate upload" : error.message },
      { status },
    );
  }
}
