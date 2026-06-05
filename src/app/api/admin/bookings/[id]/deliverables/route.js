import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { USER_ROLES } from "@/lib/config/app.config";
import Booking from "@/lib/db/models/booking";
import { auth } from "@/lib/helpers/auth";
import {
  BOOKING_WORKFLOW_STATUS,
  getWorkflowStatus,
  parseFilesPayload,
} from "@/lib/helpers/bookingWorkflow";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const getDeliverableUrls = (deliverable) => {
  if (Array.isArray(deliverable?.urls) && deliverable.urls.length > 0) {
    return deliverable.urls.filter(Boolean);
  }
  return deliverable?.url ? [deliverable.url] : [];
};

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

const getEditableBooking = async (id) => {
  const booking = await Booking.findByPk(id);
  if (!booking) {
    return {
      error: NextResponse.json({ error: "Booking not found" }, { status: 404 }),
    };
  }
  if (getWorkflowStatus(booking) !== BOOKING_WORKFLOW_STATUS.EDITING) {
    return {
      error: NextResponse.json(
        { error: "Deliverables can only be changed while editing" },
        { status: 409 },
      ),
    };
  }
  return { booking };
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
  if (action !== "restore_archived") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const { booking, error } = await getEditableBooking(id);
  if (error) return error;

  const payload = parseFilesPayload(booking.filesUrl);
  const archivedDeliverables = payload?.archivedDeliverables;
  if (
    !Array.isArray(archivedDeliverables) ||
    archivedDeliverables.length === 0
  ) {
    return NextResponse.json(
      { error: "No previous deliverables are available" },
      { status: 409 },
    );
  }

  const filesUrl = JSON.stringify({
    ...payload,
    deliverables: archivedDeliverables,
    archivedDeliverables: [],
    updatedAt: new Date().toISOString(),
  });
  await booking.update({ filesUrl });

  return NextResponse.json({ filesUrl });
}

export async function DELETE(request, { params }) {
  const authError = await authorizeAdmin();
  if (authError) return authError;

  const { id } = await params;
  const { source = "current", deliverableId, url } = await request.json();
  if (!deliverableId || !url || !["current", "archived"].includes(source)) {
    return NextResponse.json(
      { error: "source, deliverableId, and url are required" },
      { status: 400 },
    );
  }

  const { booking, error } = await getEditableBooking(id);
  if (error) return error;

  const payload = parseFilesPayload(booking.filesUrl);
  if (!payload) {
    return NextResponse.json(
      { error: "No deliverables are available" },
      { status: 409 },
    );
  }

  const payloadKey =
    source === "archived" ? "archivedDeliverables" : "deliverables";
  const deliverables = Array.isArray(payload[payloadKey])
    ? payload[payloadKey]
    : [];
  let removed = false;

  const nextDeliverables = deliverables.flatMap((deliverable, index) => {
    const itemId = String(
      deliverable?.id ||
        deliverable?.type ||
        deliverable?.label ||
        `deliverable-${index}`,
    );
    if (itemId !== String(deliverableId)) return [deliverable];

    const nextUrls = getDeliverableUrls(deliverable).filter((itemUrl) => {
      if (!removed && itemUrl === url) {
        removed = true;
        return false;
      }
      return true;
    });

    if (nextUrls.length === 0) return [];
    return [
      {
        ...deliverable,
        url: nextUrls[0],
        urls: nextUrls,
        count: nextUrls.length,
      },
    ];
  });

  if (!removed) {
    return NextResponse.json(
      { error: "Deliverable file not found" },
      { status: 404 },
    );
  }

  const filesUrl = JSON.stringify({
    ...payload,
    [payloadKey]: nextDeliverables,
    updatedAt: new Date().toISOString(),
  });
  await booking.update({ filesUrl });
  await deleteOwnedS3Object(url);

  return NextResponse.json({ filesUrl });
}
