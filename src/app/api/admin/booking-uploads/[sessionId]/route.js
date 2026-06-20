import { AbortMultipartUploadCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { USER_ROLES } from "@/lib/config/app.config";
import { auth } from "@/lib/helpers/auth";
import { findOwnedUploadSession } from "@/lib/services/bookingUpload";
import {
  deleteBookingObject,
  getS3Client,
  getS3Config,
} from "@/lib/storage/s3";

export async function DELETE(_request, { params }) {
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
  if (upload.status === "COMPLETED") {
    return NextResponse.json(
      { error: "Completed uploads cannot be aborted" },
      { status: 409 },
    );
  }
  if (upload.status === "ABORTED")
    return NextResponse.json({ status: "ABORTED" });

  const { bucket } = getS3Config();
  try {
    await getS3Client().send(
      new AbortMultipartUploadCommand({
        Bucket: bucket,
        Key: upload.objectKey,
        UploadId: upload.s3UploadId,
      }),
    );
  } catch (error) {
    if (error?.name !== "NoSuchUpload") throw error;
    await deleteBookingObject(upload.objectKey).catch(() => {});
  }
  await upload.update({ status: "ABORTED" });
  return NextResponse.json({ status: "ABORTED" });
}
