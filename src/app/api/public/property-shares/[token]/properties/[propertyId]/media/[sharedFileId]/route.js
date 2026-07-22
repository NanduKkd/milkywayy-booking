import { NextResponse } from "next/server";
import { resolvePublicPropertyShareMedia } from "@/lib/services/propertySharing";
import { getBookingObject, parseOwnedBookingObjectUrl } from "@/lib/storage/s3";

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

function validRangeHeader(value) {
  if (!value) return null;
  if (value.length > 100) return false;
  const match = value.match(/^bytes=(\d*)-(\d*)$/u);
  if (!match || (!match[1] && !match[2])) return false;
  return value;
}

export async function GET(request, { params }) {
  const { token, propertyId, sharedFileId } = await params;
  const media = await resolvePublicPropertyShareMedia({
    token,
    propertyId,
    sharedFileId,
  });
  if (!media) return notFound();

  const ownedObject = parseOwnedBookingObjectUrl(media.storageUrl);
  if (!ownedObject) return notFound();
  const range = validRangeHeader(request.headers.get("range"));
  if (range === false) {
    return new Response(null, { status: 416, headers: SAFE_HEADERS });
  }

  try {
    const object = await getBookingObject({ key: ownedObject.key, range });
    const body = object.Body?.transformToWebStream
      ? object.Body.transformToWebStream()
      : object.Body;
    const headers = new Headers({
      ...SAFE_HEADERS,
      "Accept-Ranges": object.AcceptRanges || "bytes",
      "Content-Type": media.mimeType,
    });
    if (object.ContentLength !== undefined) {
      headers.set("Content-Length", String(object.ContentLength));
    }
    if (object.ContentRange) {
      headers.set("Content-Range", object.ContentRange);
    }
    return new Response(body || null, {
      status: object.ContentRange ? 206 : 200,
      headers,
    });
  } catch (error) {
    console.error("Property share inline media failed", {
      code: error?.code || "INLINE_MEDIA_FAILED",
    });
    return notFound();
  }
}
