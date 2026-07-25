import { NextResponse } from "next/server";
import {
  createPropertySharePreview,
  isBoundedPreviewSize,
  PROPERTY_SHARE_PREVIEW_MAX_SOURCE_BYTES,
  PropertySharePreviewUnavailableError,
  readBoundedPreviewSource,
  withPreviewDeadline,
} from "@/lib/services/propertySharePreview";
import { resolvePublicPropertySharePreview } from "@/lib/services/propertySharing";
import {
  getBookingObject,
  headBookingObject,
  isBookingDeliverableKeyForBooking,
  parseOwnedBookingObjectUrl,
} from "@/lib/storage/s3";

const SAFE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

function notFound() {
  return NextResponse.json(
    { error: "Not found" },
    { status: 404, headers: SAFE_HEADERS },
  );
}

export async function GET(request, { params }) {
  const { token, propertyId, sharedFileId } = await params;
  const media = await resolvePublicPropertySharePreview({
    token,
    propertyId,
    sharedFileId,
  });
  if (
    !media ||
    (media.sizeBytes !== null &&
      media.sizeBytes !== undefined &&
      !isBoundedPreviewSize(media.sizeBytes))
  ) {
    return notFound();
  }

  const ownedObject = parseOwnedBookingObjectUrl(media.storageUrl);
  if (
    !ownedObject ||
    !isBookingDeliverableKeyForBooking(ownedObject.key, media.bookingId)
  ) {
    return notFound();
  }

  const controller = new AbortController();
  const abortOnDisconnect = () => controller.abort();
  request.signal?.addEventListener("abort", abortOnDisconnect, { once: true });
  try {
    const preview = await withPreviewDeadline(
      async (abortSignal) => {
        const head = await headBookingObject(ownedObject.key, { abortSignal });
        if (!isBoundedPreviewSize(head?.ContentLength))
          throw new PropertySharePreviewUnavailableError();
        const object = await getBookingObject({
          key: ownedObject.key,
          abortSignal,
        });
        const source = await readBoundedPreviewSource(object?.Body, {
          maxBytes: PROPERTY_SHARE_PREVIEW_MAX_SOURCE_BYTES,
          signal: abortSignal,
        });
        return createPropertySharePreview(source, { signal: abortSignal });
      },
      { controller },
    );
    return new Response(preview, {
      headers: {
        ...SAFE_HEADERS,
        "Content-Length": String(preview.length),
        "Content-Type": "image/jpeg",
      },
    });
  } catch {
    return notFound();
  } finally {
    request.signal?.removeEventListener("abort", abortOnDisconnect);
  }
}
