import { NextResponse } from "next/server";
import Booking from "@/lib/db/models/booking";
import { auth } from "@/lib/helpers/auth";
import { USER_ROLES } from "@/lib/config/app.config";
import {
  sendFullMediaUploadNotification,
  sendPartialMediaUploadNotification,
  sendPreShootReminder,
  sendSingleServiceMediaReadyNotification,
  sendTeamArrived,
  sendTeamOnTheWay,
} from "@/lib/actions/notifications";

const parseFilesPayload = (filesUrl) => {
  if (!filesUrl || typeof filesUrl !== "string") return null;
  try {
    const parsed = JSON.parse(filesUrl);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
};

const markMediaNotificationSent = async (bookingId, type) => {
  const booking = await Booking.findByPk(bookingId);
  if (!booking) return null;

  const parsed = parseFilesPayload(booking.filesUrl);
  if (!parsed) return booking.filesUrl;

  const notifications = {
    ...(parsed.notifications || {}),
  };

  if (type === "partial_media_upload") {
    notifications.partialMediaUploadSentAt =
      notifications.partialMediaUploadSentAt || new Date().toISOString();
  }

  if (type === "single_service_media_ready") {
    notifications.singleServiceMediaReadySentAt =
      notifications.singleServiceMediaReadySentAt || new Date().toISOString();
  }

  if (type === "full_media_upload") {
    notifications.fullMediaUploadSentAt =
      notifications.fullMediaUploadSentAt || new Date().toISOString();
  }

  const nextPayload = JSON.stringify({
    ...parsed,
    notifications,
  });

  await booking.update({ filesUrl: nextPayload });
  return nextPayload;
};

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== USER_ROLES.SUPERADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { type, bookingId } = await request.json();
    if (!type || !bookingId) {
      return NextResponse.json(
        { error: "type and bookingId are required" },
        { status: 400 },
      );
    }

    if (type === "shoot_reminder") {
      const result = await sendPreShootReminder(bookingId);
      return NextResponse.json(result);
    }
    if (type === "team_on_the_way") {
      const result = await sendTeamOnTheWay(bookingId);
      return NextResponse.json(result);
    }
    if (type === "team_arrived") {
      const result = await sendTeamArrived(bookingId);
      return NextResponse.json(result);
    }
    if (type === "partial_media_upload") {
      const result = await sendPartialMediaUploadNotification(bookingId);
      if (result?.success) {
        const filesUrl = await markMediaNotificationSent(bookingId, type);
        return NextResponse.json({ ...result, filesUrl });
      }
      return NextResponse.json(result);
    }
    if (type === "single_service_media_ready") {
      const result = await sendSingleServiceMediaReadyNotification(bookingId);
      if (result?.success) {
        const filesUrl = await markMediaNotificationSent(bookingId, type);
        return NextResponse.json({ ...result, filesUrl });
      }
      return NextResponse.json(result);
    }
    if (type === "full_media_upload") {
      const result = await sendFullMediaUploadNotification(bookingId);
      if (result?.success) {
        const filesUrl = await markMediaNotificationSent(bookingId, type);
        return NextResponse.json({ ...result, filesUrl });
      }
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "Unknown template type" },
      { status: 400 },
    );
  } catch (error) {
    console.error("WhatsApp notification error:", error);
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 },
    );
  }
}
