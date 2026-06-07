import { randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { USER_ROLES } from "@/lib/config/app.config";
import Booking from "@/lib/db/models/booking";
import { auth } from "@/lib/helpers/auth";
import {
  BOOKING_WORKFLOW_STATUS,
  getWorkflowStatus,
} from "@/lib/helpers/bookingWorkflow";
import { addUploadedDeliveryFiles } from "@/lib/services/fileDelivery";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const MAX_IMAGE_DIMENSION = 2400;
const IMAGE_QUALITY = 82;

function slugifySegment(value, fallback = "general") {
  return (
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || fallback
  );
}

function sanitizeFileName(fileName, fallbackExtension = "") {
  const cleaned = String(fileName || "file")
    .replace(/\.[^/.]+$/, "")
    .trim()
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return `${cleaned || "file"}${fallbackExtension}`;
}

function detectUploadCategory({ deliverableType, folder, contentType }) {
  const normalizedType = String(deliverableType || "").toLowerCase();
  const normalizedFolder = String(folder || "").toLowerCase();
  const normalizedContentType = String(contentType || "").toLowerCase();

  if (
    normalizedType.includes("360") ||
    normalizedType.includes("tour") ||
    normalizedType.includes("virtual")
  ) {
    return "360";
  }

  if (
    normalizedType.includes("video") ||
    normalizedContentType.startsWith("video/")
  ) {
    return "videography";
  }

  if (normalizedFolder.includes("360")) {
    return "360";
  }

  return "photography";
}

async function optimizeUploadFile(file) {
  const originalBuffer = Buffer.from(await file.arrayBuffer());
  const originalType = String(file.type || "").toLowerCase();

  if (
    !originalType.startsWith("image/") ||
    originalType.includes("gif") ||
    originalType.includes("svg")
  ) {
    return {
      body: originalBuffer,
      contentType: file.type || "application/octet-stream",
      fileName: sanitizeFileName(file.name),
      optimized: false,
    };
  }

  const optimizedBuffer = await sharp(originalBuffer)
    .rotate()
    .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: IMAGE_QUALITY })
    .toBuffer();

  return {
    body: optimizedBuffer,
    contentType: "image/webp",
    fileName: sanitizeFileName(file.name, ".webp"),
    optimized: true,
  };
}

async function uploadFileToS3({ file, folder, deliverableType, bucketName }) {
  const uploadCategory = detectUploadCategory({
    deliverableType,
    folder,
    contentType: file.type,
  });
  const processedFile = await optimizeUploadFile(file);
  const key = `${uploadCategory}/${folder}/${Date.now()}_${randomUUID()}_${processedFile.fileName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: processedFile.body,
    ContentType: processedFile.contentType,
  });

  await s3Client.send(command);

  return {
    url: `https://${bucketName}.s3.amazonaws.com/${key}`,
    optimized: processedFile.optimized,
    originalFilename: processedFile.fileName,
    mimeType: processedFile.contentType,
    sizeBytes: processedFile.body.length,
  };
}

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== USER_ROLES.SUPERADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const files = formData
      .getAll("file")
      .filter(
        (entry) => entry && typeof entry === "object" && "arrayBuffer" in entry,
      );
    const bookingId = formData.get("bookingId");
    const replacementFileIdRaw = String(
      formData.get("replacementFileId") || "",
    ).trim();
    const replacementFileId = replacementFileIdRaw
      ? Number(replacementFileIdRaw)
      : null;
    const deliverableTypeRaw = String(
      formData.get("deliverableType") || "Photography",
    );
    const deliverableType = deliverableTypeRaw.trim() || "Photography";
    const externalUrlRaw = String(formData.get("externalUrl") || "").trim();
    const folderRaw =
      formData.get("folder") ||
      (bookingId ? `bookings/${bookingId}` : "general");
    const folder = String(folderRaw)
      .split("/")
      .map((segment) => slugifySegment(segment))
      .filter(Boolean)
      .join("/");

    if (!bookingId && !folder) {
      return NextResponse.json(
        { error: "bookingId or folder is required" },
        { status: 400 },
      );
    }

    if (files.length === 0 && !externalUrlRaw) {
      return NextResponse.json(
        { error: "Provide either file or externalUrl" },
        { status: 400 },
      );
    }
    if (
      replacementFileIdRaw &&
      (!Number.isInteger(replacementFileId) || replacementFileId <= 0)
    ) {
      return NextResponse.json(
        { error: "replacementFileId must be a positive integer" },
        { status: 400 },
      );
    }
    if (externalUrlRaw) {
      try {
        const parsedExternalUrl = new URL(externalUrlRaw);
        if (parsedExternalUrl.protocol !== "https:") throw new Error();
      } catch {
        return NextResponse.json(
          { error: "externalUrl must be a valid https URL" },
          { status: 400 },
        );
      }
    }

    if (replacementFileId && files.length + (externalUrlRaw ? 1 : 0) !== 1) {
      return NextResponse.json(
        { error: "Provide exactly one replacement file or link" },
        { status: 400 },
      );
    }

    if (bookingId) {
      const booking = await Booking.findByPk(bookingId);
      if (!booking) {
        return NextResponse.json(
          { error: "Booking not found" },
          { status: 404 },
        );
      }
      if (booking.cancelledAt || booking.status === "CANCELLED") {
        return NextResponse.json(
          { error: "Cancelled bookings cannot receive files" },
          { status: 409 },
        );
      }
      if (booking.status !== "CONFIRMED") {
        return NextResponse.json(
          { error: "Only confirmed bookings can receive files" },
          { status: 409 },
        );
      }
      if (
        ![
          BOOKING_WORKFLOW_STATUS.EDITING,
          BOOKING_WORKFLOW_STATUS.FILES_UPLOADED,
        ].includes(getWorkflowStatus(booking))
      ) {
        return NextResponse.json(
          { error: "Deliverables can only be uploaded after editing starts" },
          { status: 409 },
        );
      }
    }

    const bucketName = process.env.AWS_BUCKET_NAME || "milkywayy-bookings";
    let uploadedFiles = externalUrlRaw
      ? [
          {
            url: externalUrlRaw,
            optimized: false,
            originalFilename: `${deliverableType} link`,
            mimeType: "text/uri-list",
            sizeBytes: null,
          },
        ]
      : [];
    let optimized = false;

    if (files.length > 0) {
      const s3Uploads = await Promise.all(
        files.map((file) =>
          uploadFileToS3({
            file,
            folder,
            deliverableType,
            bucketName,
          }),
        ),
      );
      uploadedFiles = [...uploadedFiles, ...s3Uploads];
      optimized = s3Uploads.some((item) => item.optimized);
    }
    const fileUrls = uploadedFiles.map((item) => item.url);
    const fileUrl = fileUrls[0] || "";

    if (!bookingId) {
      return NextResponse.json({ url: fileUrl, urls: fileUrls, optimized });
    }

    const typeKey = deliverableType.toLowerCase();
    const is360 =
      typeKey.includes("360") ||
      typeKey.includes("tour") ||
      typeKey.includes("virtual");

    const result = await addUploadedDeliveryFiles({
      bookingId,
      uploads: uploadedFiles,
      type: deliverableType,
      label: deliverableType,
      deliveryMode: is360 ? "copy_link" : "download",
      replacementFileId,
    });

    return NextResponse.json({
      url: fileUrl,
      urls: fileUrls,
      filesUrl: result.booking.filesUrl,
      booking: result.booking,
      deliveryFiles: result.deliveryFiles,
      optimized,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    const message = error?.message || "Upload failed";
    const status =
      message === "Booking not found"
        ? 404
        : [
              "Cancelled bookings cannot receive files",
              "Only confirmed bookings can receive files",
              "Deliverables can only be uploaded after editing starts",
              "Upload exactly one replacement file",
              "Delivery file not found",
              "This file is not awaiting a replacement",
            ].includes(message)
          ? 409
          : 500;
    return NextResponse.json(
      { error: status === 500 ? "Upload failed" : message },
      { status },
    );
  }
}
