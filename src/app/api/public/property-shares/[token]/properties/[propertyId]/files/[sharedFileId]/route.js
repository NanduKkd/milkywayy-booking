import { NextResponse } from "next/server";
import {
  getPublicPropertyReceiptScope,
  resolvePublicPropertyShareFile,
} from "@/lib/services/propertySharing";
import { getPropertyShareReceiptCookieName } from "@/lib/services/propertySharingSecurity";
import {
  createDownloadUrl,
  parseOwnedBookingObjectUrl,
} from "@/lib/storage/s3";

const SAFE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};
const PUBLIC_DOWNLOAD_TTL_SECONDS = 5 * 60;

function notFound() {
  return NextResponse.json(
    { error: "Not found" },
    { status: 404, headers: SAFE_HEADERS },
  );
}

export async function GET(request, { params }) {
  const { token, propertyId, sharedFileId } = await params;
  const scope = await getPublicPropertyReceiptScope(token, propertyId);
  if (!scope) return notFound();
  const receiptToken = request.cookies.get(
    getPropertyShareReceiptCookieName(scope.shareId, scope.propertyId),
  )?.value;
  const file = await resolvePublicPropertyShareFile({
    token,
    propertyId,
    sharedFileId,
    receiptToken,
  });
  if (!file) return notFound();

  const ownedObject = parseOwnedBookingObjectUrl(file.url);
  if (!ownedObject) return notFound();
  try {
    const signedUrl = await createDownloadUrl({
      key: ownedObject.key,
      fileName: file.filename,
      expiresInSeconds: PUBLIC_DOWNLOAD_TTL_SECONDS,
    });
    return NextResponse.redirect(signedUrl, {
      status: 302,
      headers: SAFE_HEADERS,
    });
  } catch (error) {
    console.error("Property share file delivery failed", {
      code: error?.code || "SIGNING_FAILED",
    });
    return NextResponse.json(
      { error: "Unable to prepare file" },
      { status: 502, headers: SAFE_HEADERS },
    );
  }
}
