import { NextResponse } from "next/server";
import { Op } from "sequelize";
import "@/lib/db/relations";
import Booking from "@/lib/db/models/booking";
import BookingDeliveryFile from "@/lib/db/models/bookingdeliveryfile";
import BookingDeliveryFileVersion from "@/lib/db/models/bookingdeliveryfileversion";
import { auth } from "@/lib/helpers/auth";
import { DELIVERY_FILE_STATUS } from "@/lib/helpers/bookingWorkflow";
import {
  createDownloadUrl,
  parseOwnedBookingObjectUrl,
} from "@/lib/storage/s3";

export async function GET(request) {
  const session = await auth();
  if (!session?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fileId = Number(searchParams.get("fileId"));
  if (!Number.isInteger(fileId) || fileId <= 0) {
    return NextResponse.json({ error: "fileId is required" }, { status: 400 });
  }

  const deliveryFile = await BookingDeliveryFile.findOne({
    where: {
      id: fileId,
      status: {
        [Op.in]: [
          DELIVERY_FILE_STATUS.UNDER_REVIEW,
          DELIVERY_FILE_STATUS.ACCEPTED,
        ],
      },
    },
    include: [
      {
        model: Booking,
        as: "booking",
        required: true,
        where: { userId: session.id },
      },
      {
        model: BookingDeliveryFileVersion,
        as: "currentVersion",
        required: true,
      },
    ],
  });
  if (!deliveryFile) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const ownedObject = parseOwnedBookingObjectUrl(
    deliveryFile.currentVersion.url,
  );
  if (!ownedObject) {
    return NextResponse.json(
      { error: "Delivery file is not stored in the configured bucket" },
      { status: 409 },
    );
  }

  try {
    const legacyFormEncodedPath = new URL(
      deliveryFile.currentVersion.url,
    ).pathname.includes("+");
    const fileName = legacyFormEncodedPath
      ? deliveryFile.currentVersion.originalFilename?.replaceAll("+", " ")
      : deliveryFile.currentVersion.originalFilename;
    const signedUrl = await createDownloadUrl({
      key: ownedObject.key,
      fileName,
    });
    return NextResponse.redirect(signedUrl, {
      status: 302,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Failed to sign delivery download:", error);
    return NextResponse.json(
      { error: "Unable to prepare download" },
      { status: 502 },
    );
  }
}
