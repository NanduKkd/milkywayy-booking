import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import sharp from "sharp";
import Booking from "@/lib/db/models/booking";

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
  const key = `${uploadCategory}/${folder}/${Date.now()}_${processedFile.fileName}`;

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
  };
}

function parseFilesPayload(filesUrl) {
  if (!filesUrl || typeof filesUrl !== "string") return null;
  try {
    const parsed = JSON.parse(filesUrl);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const files = formData
      .getAll("file")
      .filter(
        (entry) => entry && typeof entry === "object" && "arrayBuffer" in entry,
      );
    const bookingId = formData.get("bookingId");
    const deliverableTypeRaw = String(
      formData.get("deliverableType") || "Photography",
    );
    const deliverableType = deliverableTypeRaw.trim() || "Photography";
    const externalUrlRaw = String(formData.get("externalUrl") || "").trim();
    const fileCountRaw = String(formData.get("fileCount") || "").trim();
    const fileCount =
      fileCountRaw !== "" && Number.isFinite(Number(fileCountRaw))
        ? Number(fileCountRaw)
        : null;
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

    const bucketName = process.env.AWS_BUCKET_NAME || "milkywayy-bookings";
    let fileUrl = externalUrlRaw;
    let fileUrls = externalUrlRaw ? [externalUrlRaw] : [];
    let optimized = false;

    if (files.length > 0) {
      const uploadedFiles = await Promise.all(
        files.map((file) =>
          uploadFileToS3({
            file,
            folder,
            deliverableType,
            bucketName,
          }),
        ),
      );
      fileUrls = uploadedFiles.map((item) => item.url);
      fileUrl = fileUrls[0] || externalUrlRaw;
      optimized = uploadedFiles.some((item) => item.optimized);
    }

    if (!bookingId) {
      return NextResponse.json({ url: fileUrl, urls: fileUrls, optimized });
    }

    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    let deliverables = [];
    let existingPayload = null;
    const existingFilesUrl = booking.filesUrl;
    if (existingFilesUrl) {
      try {
        const parsed = JSON.parse(existingFilesUrl);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          existingPayload = parsed;
        }
        if (Array.isArray(parsed?.deliverables)) {
          deliverables = parsed.deliverables;
        } else if (Array.isArray(parsed)) {
          deliverables = parsed;
        }
      } catch {
        deliverables = [];
      }
    }

    const typeKey = deliverableType.toLowerCase();
    const is360 =
      typeKey.includes("360") ||
      typeKey.includes("tour") ||
      typeKey.includes("virtual");

    const updatedItem = {
      id: typeKey.replace(/\s+/g, "-"),
      type: deliverableType,
      label: deliverableType,
      url: fileUrl,
      urls: fileUrls,
      count: fileCount ?? (fileUrls.length > 0 ? fileUrls.length : null),
      uploadedAt: new Date().toISOString(),
      deliveryMode: is360 ? "copy_link" : "download",
    };

    const nextDeliverables = [
      ...deliverables.filter(
        (d) => String(d?.type || d?.label || "").toLowerCase() !== typeKey,
      ),
      updatedItem,
    ];

    const payload = JSON.stringify({
      ...(parseFilesPayload(existingFilesUrl) || existingPayload || {}),
      version: 2,
      deliverables: nextDeliverables,
      updatedAt: new Date().toISOString(),
    });

    await booking.update({ filesUrl: payload });

    return NextResponse.json({
      url: fileUrl,
      urls: fileUrls,
      filesUrl: payload,
      deliverable: updatedItem,
      optimized,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
