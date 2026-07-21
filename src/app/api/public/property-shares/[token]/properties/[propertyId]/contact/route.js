import { NextResponse } from "next/server";
import { submitPublicPropertyShareContact } from "@/lib/services/propertySharing";
import {
  getPropertyShareNetworkAddress,
  isSameOriginPropertyShareRequest,
  PropertyShareInputError,
  PropertyShareRateLimitError,
} from "@/lib/services/propertySharingSecurity";

const SAFE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

function json(body, status, headers = {}) {
  return NextResponse.json(body, {
    status,
    headers: { ...SAFE_HEADERS, ...headers },
  });
}

export async function POST(request, { params }) {
  if (!isSameOriginPropertyShareRequest(request)) {
    return json({ error: "Request rejected" }, 403);
  }
  const contentType = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (contentType !== "application/json") {
    return json({ error: "JSON is required" }, 415);
  }
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(contentLength) && contentLength > 4_096) {
    return json({ error: "Request is too large" }, 413);
  }

  const { token, propertyId } = await params;
  let input;
  try {
    input = await request.json();
  } catch {
    return json({ error: "Name and phone are required" }, 400);
  }

  try {
    const result = await submitPublicPropertyShareContact({
      token,
      propertyId,
      input,
      networkAddress: getPropertyShareNetworkAddress(request),
    });
    if (!result) return json({ error: "Not found" }, 404);

    const response = json({ ok: true }, 200);
    response.cookies.set(result.receipt.cookieName, result.receipt.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: result.receipt.maxAge,
      path: "/",
    });
    return response;
  } catch (error) {
    if (error instanceof PropertyShareInputError) {
      return json({ error: error.message }, 400);
    }
    if (error instanceof PropertyShareRateLimitError) {
      return json({ error: error.message }, 429, { "Retry-After": "600" });
    }
    console.error("Property share contact request failed", {
      code: error?.code || "UNEXPECTED",
    });
    return json({ error: "Unable to continue" }, 500);
  }
}
