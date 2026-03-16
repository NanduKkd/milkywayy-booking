import { NextResponse } from "next/server";
import { auth } from "@/lib/helpers/auth";

const getSafeFilename = (value) => {
  const fallback = "deliverable";
  const raw = String(value || "").trim();
  if (!raw) return fallback;
  const cleaned = raw
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || fallback;
};

const isAllowedDownloadHost = (urlObj) => {
  const host = String(urlObj.hostname || "").toLowerCase();
  const bucketName = String(process.env.AWS_BUCKET_NAME || "").toLowerCase();
  const cloudfrontHost = String(
    process.env.AWS_CLOUDFRONT_DOMAIN || "",
  ).toLowerCase();

  if (bucketName && host === `${bucketName}.s3.amazonaws.com`) return true;
  if (cloudfrontHost && host === cloudfrontHost) return true;
  return false;
};

export async function GET(request) {
  const session = await auth();
  if (!session?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sourceUrl = searchParams.get("url");
  const name = searchParams.get("name");

  if (!sourceUrl) {
    return NextResponse.json(
      { error: "Missing url query parameter" },
      { status: 400 },
    );
  }

  let parsed;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  if (parsed.protocol !== "https:") {
    return NextResponse.json({ error: "Only https urls are allowed" }, { status: 400 });
  }

  if (!isAllowedDownloadHost(parsed)) {
    return NextResponse.json({ error: "Download host is not allowed" }, { status: 403 });
  }

  const upstream = await fetch(sourceUrl, { cache: "no-store" });
  if (!upstream.ok) {
    return NextResponse.json({ error: "Unable to fetch file" }, { status: 502 });
  }

  const fileNameFromUrl =
    decodeURIComponent(parsed.pathname.split("/").filter(Boolean).pop() || "") ||
    "deliverable";
  const filename = getSafeFilename(name || fileNameFromUrl);

  const contentType =
    upstream.headers.get("content-type") || "application/octet-stream";
  const contentLength = upstream.headers.get("content-length");
  const buffer = await upstream.arrayBuffer();

  const headers = new Headers();
  headers.set("Content-Type", contentType);
  headers.set(
    "Content-Disposition",
    `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
  );
  if (contentLength) {
    headers.set("Content-Length", contentLength);
  }

  return new Response(buffer, {
    status: 200,
    headers,
  });
}
