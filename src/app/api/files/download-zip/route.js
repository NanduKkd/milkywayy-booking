import { Readable } from "node:stream";
import "@/lib/db/relations";
import Booking from "@/lib/db/models/booking";
import BookingDeliveryFile from "@/lib/db/models/bookingdeliveryfile";
import BookingDeliveryFileVersion from "@/lib/db/models/bookingdeliveryfileversion";
import { auth } from "@/lib/helpers/auth";
import {
  isCustomerDeliveryFileVisible,
  isDeliveryFileType,
} from "@/lib/helpers/bookingWorkflow";
import {
  createDeliveryZipStream,
  prepareDeliveryZipMembers,
  safeDeliveryZipName,
  tryAcquireDeliveryZipPipeline,
  verifyDeliveryZipObjects,
} from "@/lib/services/deliveryZip";
import {
  getBookingObject,
  headBookingObject,
  isBookingDeliverableKeyForBooking,
  parseOwnedBookingObjectUrl,
  sanitizeFilename,
} from "@/lib/storage/s3";

export const runtime = "nodejs";

const unavailable = () =>
  Response.json({ error: "Delivery group not found" }, { status: 404 });

const attachmentDisposition = (name) => {
  const safe = sanitizeFilename(name, "deliverables.zip").replace(
    /["\\]/g,
    "-",
  );
  return `attachment; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(safe)}`;
};

export async function GET(request) {
  const session = await auth();
  if (!session?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const bookingId = Number(searchParams.get("bookingId"));
  const type = searchParams.get("type");
  if (
    !Number.isSafeInteger(bookingId) ||
    bookingId <= 0 ||
    !isDeliveryFileType(type)
  ) {
    return unavailable();
  }

  const files = await BookingDeliveryFile.findAll({
    where: {
      bookingId,
      type,
      deletedAt: null,
    },
    include: [
      {
        model: Booking,
        as: "booking",
        required: true,
        where: { userId: session.id },
        attributes: [],
      },
      {
        model: BookingDeliveryFileVersion,
        as: "currentVersion",
        required: false,
      },
    ],
    order: [["id", "ASC"]],
  });

  if (files.length < 2) return unavailable();
  const preparedFiles = files.map((file) => {
    const plain = typeof file.toJSON === "function" ? file.toJSON() : file;
    const currentVersion = plain.currentVersion;
    if (
      !isCustomerDeliveryFileVisible(plain) ||
      !currentVersion ||
      Number(plain.currentVersionId) !== Number(currentVersion.id) ||
      Number(currentVersion.deliveryFileId) !== Number(plain.id) ||
      currentVersion.supersededAt
    ) {
      return null;
    }
    if (plain.deliveryMode === "copy_link") return plain;
    const object = parseOwnedBookingObjectUrl(plain.currentVersion?.url);
    return object && isBookingDeliverableKeyForBooking(object.key, bookingId)
      ? { ...plain, objectKey: object.key }
      : null;
  });
  if (preparedFiles.some((file) => !file)) return unavailable();
  const prepared = prepareDeliveryZipMembers(preparedFiles, { bookingId });
  if (!prepared) return unavailable();
  if (request.signal?.aborted) return unavailable();

  // Admission occurs after the owner-scoped snapshot, but before any S3 body opens.
  const release = tryAcquireDeliveryZipPipeline();
  if (!release) {
    return Response.json(
      { error: "Too many delivery downloads in progress" },
      { status: 429, headers: { "Retry-After": "30" } },
    );
  }

  try {
    const objectsAreCurrent = await verifyDeliveryZipObjects({
      members: prepared.members,
      headObject: headBookingObject,
      signal: request.signal,
    });
    if (!objectsAreCurrent) {
      release();
      return unavailable();
    }
  } catch (error) {
    release();
    const status = ["NotFound", "NoSuchKey"].includes(error?.name) ? 404 : 502;
    return Response.json(
      {
        error:
          status === 404
            ? "Delivery group not found"
            : "Unable to prepare delivery archive",
      },
      { status },
    );
  }

  let stream;
  try {
    stream = createDeliveryZipStream({
      ...prepared,
      getObject: getBookingObject,
      signal: request.signal,
      onComplete: (metrics) => {
        release();
        console.info("delivery_zip_stream", metrics);
      },
    });
  } catch {
    release();
    return Response.json(
      { error: "Unable to prepare delivery archive" },
      { status: 502 },
    );
  }
  return new Response(Readable.toWeb(stream), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": attachmentDisposition(safeDeliveryZipName(type)),
      "Cache-Control": "private, no-store",
      "X-Accel-Buffering": "no",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
