import { NextResponse } from "next/server";
import { USER_ROLES } from "@/lib/config/app.config";
import { auth } from "@/lib/helpers/auth";
import { findOwnedUploadSession } from "@/lib/services/bookingUpload";
import { createUploadPartUrl, getBookingUploadConfig } from "@/lib/storage/s3";

export async function POST(request, { params }) {
  const session = await auth();
  if (!session?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== USER_ROLES.SUPERADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { sessionId } = await params;
  const upload = await findOwnedUploadSession(sessionId, Number(session.id));
  if (!upload)
    return NextResponse.json(
      { error: "Upload session not found" },
      { status: 404 },
    );
  if (upload.status !== "INITIATED") {
    return NextResponse.json(
      { error: `Upload is already ${upload.status.toLowerCase()}` },
      { status: 409 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const partNumbers = body.partNumbers;
  const { partBytes } = getBookingUploadConfig();
  const partCount = Math.ceil(Number(upload.sizeBytes) / partBytes);
  if (
    !Array.isArray(partNumbers) ||
    partNumbers.length === 0 ||
    partNumbers.length > 20 ||
    new Set(partNumbers).size !== partNumbers.length ||
    partNumbers.some(
      (partNumber) =>
        !Number.isInteger(partNumber) ||
        partNumber < 1 ||
        partNumber > partCount,
    )
  ) {
    return NextResponse.json(
      { error: "Invalid part numbers" },
      { status: 400 },
    );
  }

  const parts = await Promise.all(
    partNumbers.map(async (partNumber) => ({
      partNumber,
      url: await createUploadPartUrl({
        key: upload.objectKey,
        uploadId: upload.s3UploadId,
        partNumber,
      }),
    })),
  );
  return NextResponse.json({ parts });
}
