import { NextResponse } from "next/server";
import { USER_ROLES } from "@/lib/config/app.config";
import { auth } from "@/lib/helpers/auth";
import {
  deleteDeliveryFileState,
  finishBookingDeliveryState,
  publishPrivateDeliveryFilesState,
} from "@/lib/services/fileDelivery";
import {
  deleteBookingObject,
  parseOwnedBookingObjectUrl,
} from "@/lib/storage/s3";

const DELIVERABLE_ACTION_ERRORS = new Set([
  "Booking not found",
  "Cancelled bookings cannot receive files",
  "Only confirmed bookings can receive files",
  "Deliverables can only be uploaded after editing starts",
  "Delivery file not found",
  "Upload at least one deliverable first",
  "Resolve all private or requested files first",
  "No staged files are available",
]);

const getActionableDeliverableError = (error, fallback) => {
  const message = error instanceof Error ? error.message : "";
  return DELIVERABLE_ACTION_ERRORS.has(message) ? message : fallback;
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

const deleteOwnedS3Object = async (fileUrl) => {
  try {
    const ownedObject = parseOwnedBookingObjectUrl(fileUrl);
    if (ownedObject) await deleteBookingObject(ownedObject.key);
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
      {
        error: getActionableDeliverableError(
          error,
          "Unable to finish delivery",
        ),
      },
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
      { error: getActionableDeliverableError(error, "Unable to delete file") },
      { status: 409 },
    );
  }
}
