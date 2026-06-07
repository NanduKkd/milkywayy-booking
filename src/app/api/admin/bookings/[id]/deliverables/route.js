import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { USER_ROLES } from "@/lib/config/app.config";
import { auth } from "@/lib/helpers/auth";
import {
  deleteDeliveryFileState,
  finishBookingDeliveryState,
  publishPrivateDeliveryFilesState,
} from "@/lib/services/fileDelivery";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const authorizeAdmin = async () => {
  const session = await auth();
  if (!session?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== USER_ROLES.SUPERADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
};

const deleteOwnedS3Object = async (fileUrl) => {
  const bucketName = process.env.AWS_BUCKET_NAME || "milkywayy-bookings";

  try {
    const parsedUrl = new URL(fileUrl);
    const ownedHosts = [
      `${bucketName}.s3.amazonaws.com`,
      `${bucketName}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com`,
    ];
    if (!ownedHosts.includes(parsedUrl.hostname)) return;

    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: decodeURIComponent(parsedUrl.pathname.replace(/^\/+/, "")),
      }),
    );
  } catch (error) {
    console.error("Failed to remove deliverable from S3:", error);
  }
};

export async function POST(request, { params }) {
  const authError = await authorizeAdmin();
  if (authError) return authError;

  const { id } = await params;
  const { action } = await request.json();
  if (!["finish_delivery", "publish_private"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  try {
    const booking =
      action === "publish_private"
        ? await publishPrivateDeliveryFilesState(id)
        : await finishBookingDeliveryState(id);
    return NextResponse.json({ booking });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to finish delivery" },
      { status: 409 },
    );
  }
}

export async function DELETE(request, { params }) {
  const authError = await authorizeAdmin();
  if (authError) return authError;

  const { id } = await params;
  const { fileId } = await request.json();
  if (!fileId) {
    return NextResponse.json({ error: "fileId is required" }, { status: 400 });
  }

  try {
    const result = await deleteDeliveryFileState(fileId, id);
    await Promise.all((result.urls || []).map(deleteOwnedS3Object));
    return NextResponse.json({
      fileId: Number(fileId),
      filesUrl: result.filesUrl,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to delete file" },
      { status: 409 },
    );
  }
}
