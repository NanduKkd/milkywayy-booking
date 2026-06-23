import { randomUUID } from "node:crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const DEFAULT_MAX_UPLOAD_BYTES = 2_147_483_648;
export const DEFAULT_PART_SIZE_BYTES = 67_108_864;
export const BOOKING_DELIVERABLE_PREFIX = "deliverables/bookings/";

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const getBookingUploadConfig = () => ({
  maxBytes: parsePositiveInteger(
    process.env.BOOKING_UPLOAD_MAX_BYTES,
    DEFAULT_MAX_UPLOAD_BYTES,
  ),
  partBytes: Math.max(
    5 * 1024 * 1024,
    parsePositiveInteger(
      process.env.BOOKING_UPLOAD_PART_BYTES,
      DEFAULT_PART_SIZE_BYTES,
    ),
  ),
  uploadUrlTtlSeconds: parsePositiveInteger(
    process.env.S3_UPLOAD_URL_TTL_SECONDS,
    3600,
  ),
  downloadUrlTtlSeconds: parsePositiveInteger(
    process.env.S3_DOWNLOAD_URL_TTL_SECONDS,
    600,
  ),
});

export const getS3Config = () => ({
  bucket: process.env.AWS_BUCKET_NAME || "milkywayy-bookings",
  region: process.env.AWS_REGION || "us-east-1",
  cloudfrontHost: String(process.env.AWS_CLOUDFRONT_DOMAIN || "")
    .trim()
    .toLowerCase(),
});

let client;
export const getS3Client = () => {
  if (!client) {
    const credentials =
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          }
        : undefined;
    client = new S3Client({ region: getS3Config().region, credentials });
  }
  return client;
};

export const sanitizeFilename = (value, fallback = "deliverable") => {
  const basename = [...String(value || "")]
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join("")
    .split(/[\\/]/)
    .pop()
    .replace(/[?%*:|"<>]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return (basename || fallback).slice(0, 240);
};

const sanitizeKeyFilename = (value) =>
  sanitizeFilename(value)
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+/, "") || "deliverable";

export const createBookingObjectKey = (bookingId, fileName) =>
  `${BOOKING_DELIVERABLE_PREFIX}${Number(bookingId)}/${randomUUID()}/${sanitizeKeyFilename(fileName)}`;

const encodeKey = (key) =>
  String(key)
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

export const buildCanonicalObjectUrl = (key) => {
  const { bucket, region } = getS3Config();
  return `https://${bucket}.s3.${region}.amazonaws.com/${encodeKey(key)}`;
};

export const isBookingDeliverableKey = (key) =>
  /^(?:deliverables\/bookings|bookings|photography\/bookings|videography\/bookings|360\/bookings)\//.test(
    String(key || ""),
  );

export const isInvoiceKey = (key) => /^invoices\//.test(String(key || ""));

const decodeKey = (pathname) => {
  try {
    const encodedKey = String(pathname || "")
      .replace(/^\/+/, "")
      // Some legacy S3 URLs were saved using form-style space encoding.
      .replaceAll("+", " ");
    return decodeURIComponent(encodedKey);
  } catch {
    return null;
  }
};

const parseOwnedObjectUrl = (value, isAllowedKey) => {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;

  const { bucket, region, cloudfrontHost } = getS3Config();
  const host = parsed.hostname.toLowerCase();
  const bucketHost = bucket.toLowerCase();
  const virtualHosts = new Set([
    `${bucketHost}.s3.amazonaws.com`,
    `${bucketHost}.s3.${region.toLowerCase()}.amazonaws.com`,
    `${bucketHost}.s3-${region.toLowerCase()}.amazonaws.com`,
  ]);
  let key = null;

  if (virtualHosts.has(host) || (cloudfrontHost && host === cloudfrontHost)) {
    key = decodeKey(parsed.pathname);
  } else if (
    host === "s3.amazonaws.com" ||
    host === `s3.${region.toLowerCase()}.amazonaws.com` ||
    host === `s3-${region.toLowerCase()}.amazonaws.com`
  ) {
    const path = decodeKey(parsed.pathname);
    if (path?.startsWith(`${bucket}/`)) key = path.slice(bucket.length + 1);
  }

  if (!key || !isAllowedKey(key)) return null;
  return { bucket, key };
};

export const parseOwnedBookingObjectUrl = (value) =>
  parseOwnedObjectUrl(value, isBookingDeliverableKey);

export const parseOwnedInvoiceObjectUrl = (value) =>
  parseOwnedObjectUrl(value, isInvoiceKey);

export const headBookingObject = async (key) => {
  const { bucket } = getS3Config();
  return getS3Client().send(
    new HeadObjectCommand({ Bucket: bucket, Key: key }),
  );
};

export const deleteBookingObject = async (key) => {
  if (!isBookingDeliverableKey(key)) return false;
  const { bucket } = getS3Config();
  await getS3Client().send(
    new DeleteObjectCommand({ Bucket: bucket, Key: key }),
  );
  return true;
};

export const createUploadPartUrl = async ({ key, uploadId, partNumber }) => {
  const { bucket } = getS3Config();
  const { uploadUrlTtlSeconds } = getBookingUploadConfig();
  return getSignedUrl(
    getS3Client(),
    new UploadPartCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    }),
    { expiresIn: uploadUrlTtlSeconds },
  );
};

const contentDisposition = (fileName) => {
  const safe = sanitizeFilename(fileName).replace(/["\\]/g, "-");
  return `attachment; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(safe)}`;
};

export const createDownloadUrl = async ({ key, fileName }) => {
  if (!isBookingDeliverableKey(key)) {
    throw new Error("Object key is outside the booking deliverables prefix");
  }
  const { bucket } = getS3Config();
  const { downloadUrlTtlSeconds } = getBookingUploadConfig();
  return getSignedUrl(
    getS3Client(),
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentDisposition: contentDisposition(fileName),
      ResponseContentType: "application/octet-stream",
    }),
    { expiresIn: downloadUrlTtlSeconds },
  );
};

export const createInvoiceDownloadUrl = async ({ key, fileName }) => {
  if (!isInvoiceKey(key)) {
    throw new Error("Object key is outside the invoice prefix");
  }
  const { bucket } = getS3Config();
  const { downloadUrlTtlSeconds } = getBookingUploadConfig();
  return getSignedUrl(
    getS3Client(),
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentDisposition: contentDisposition(fileName),
      ResponseContentType: "application/octet-stream",
    }),
    { expiresIn: downloadUrlTtlSeconds },
  );
};
