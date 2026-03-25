import Booking from "@/lib/db/models/booking";
import DynamicConfig from "@/lib/db/models/dynamicconfig";
import User from "@/lib/db/models/user";
import { sendWhatsAppTemplate } from "@/lib/notifications/whatsapp";

const START_TIME_TO_PERIOD = {
  "09:00": "morning",
  "10:00": "morning",
  "13:00": "afternoon",
  "16:00": "evening",
  "17:00": "evening",
};

const _toDateKey = (dateObj) => {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const formatDate = (dateStr) => {
  try {
    const d = new Date(`${dateStr}T00:00:00`);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(d);
  } catch {
    return dateStr;
  }
};

const addMinutesToTime = (timeStr, minutesToAdd = 30) => {
  if (!timeStr || !timeStr.includes(":")) return "--:--";
  const [h, m] = timeStr.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return "--:--";
  const total = h * 60 + m + minutesToAdd;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
};

const getArrivalWindow = async (booking) => {
  const startTime = booking.startTime || "";
  const startPeriod = START_TIME_TO_PERIOD[startTime] || "";
  try {
    const configEntry = await DynamicConfig.findOne({
      where: { key: "timeSlots" },
      attributes: ["value"],
    });
    const blockDef =
      configEntry?.value?.systemSettings?.blockDefinitions?.[startPeriod];
    if (blockDef?.startTime && blockDef?.endTime) {
      return `${blockDef.startTime} - ${blockDef.endTime}`;
    }
  } catch {
    // fall back below
  }
  if (startTime) return `${startTime} - ${addMinutesToTime(startTime, 30)}`;
  return "--:--";
};

const getPropertyName = (booking) => {
  const unit =
    booking?.propertyDetails?.unit || booking?.propertyDetails?.unitNumber;
  const building = booking?.propertyDetails?.building;
  return [unit, building].filter(Boolean).join(", ") || "Property";
};

const trimTrailingSlash = (value) => String(value || "").replace(/\/+$/, "");

const getSiteBaseUrl = () => {
  return trimTrailingSlash(
    process.env.NEXT_PUBLIC_BASE_URL || "https://milkywayy.com",
  );
};

const getManageBookingUrl = () => {
  const configured = trimTrailingSlash(
    process.env.WHATSAPP_MANAGE_BOOKING_URL || "",
  );
  if (configured) return configured;
  return `${getSiteBaseUrl()}/dashboard/bookings`;
};

const getBookingPageUrl = () => {
  const configured = trimTrailingSlash(
    process.env.WHATSAPP_BOOKING_PAGE_URL || "",
  );
  if (configured) return configured;
  return `${getSiteBaseUrl()}/booking`;
};

const getDashboardFilesUrl = () => {
  const configured = trimTrailingSlash(
    process.env.WHATSAPP_DASHBOARD_FILES_URL || "",
  );
  if (configured) return configured;
  return `${getSiteBaseUrl()}/dashboard/files`;
};

const getRecipientPhone = (booking, user) => {
  return (
    booking?.contactDetails?.phone ||
    booking?.contactDetails?.mobile ||
    user?.phone ||
    ""
  );
};

const getClientName = (booking, user) => {
  return (
    booking?.contactDetails?.name ||
    booking?.contactDetails?.fullName ||
    user?.fullName ||
    "Client"
  );
};

const parseDeliverables = (filesUrl) => {
  if (!filesUrl || typeof filesUrl !== "string") return [];
  try {
    const parsed = JSON.parse(filesUrl);
    if (Array.isArray(parsed?.deliverables)) return parsed.deliverables;
    if (Array.isArray(parsed)) return parsed;
  } catch {
    return filesUrl ? [{ label: "Files", type: "Files", url: filesUrl }] : [];
  }
  return [];
};

const normalizeDeliverableLabel = (value) => {
  const normalized = String(value || "").trim();
  if (!normalized) return "Files";
  if (
    normalized === "360Â° Tour" ||
    normalized === "360Ã‚Â° Tour" ||
    normalized === "360 Virtual Tour"
  ) {
    return "360 Virtual Tour";
  }
  return normalized;
};

const normalizeServiceLabel = (value) => {
  const normalized = normalizeDeliverableLabel(value);
  if (normalized === "Videography") return "video";
  if (normalized === "Photography") return "photos";
  return normalized;
};

const getUploadedDeliverableLabels = (booking) => [
  ...new Set(
    parseDeliverables(booking?.filesUrl)
      .filter(
        (item) =>
          item?.url || (Array.isArray(item?.urls) && item.urls.length > 0),
      )
      .map((item) => normalizeDeliverableLabel(item?.label || item?.type)),
  ),
];

const getRequestedDeliverableLabels = (booking) => [
  ...new Set(
    (Array.isArray(booking?.shootDetails?.services)
      ? booking.shootDetails.services
      : []
    ).map((item) => normalizeDeliverableLabel(item)),
  ),
];

const getPendingDeliverableSummary = (booking) => {
  const uploaded = getUploadedDeliverableLabels(booking).map((item) =>
    item.toLowerCase(),
  );
  const requested = getRequestedDeliverableLabels(booking);
  const pending = requested.filter(
    (item) => !uploaded.includes(item.toLowerCase()),
  );

  if (pending.length === 0) return "remaining deliverables";
  return pending.map((item) => normalizeServiceLabel(item)).join(", ");
};

const buildVariables = async (_templateName, booking, user, overrides = {}) => {
  const propertyName = getPropertyName(booking);
  const arrivalWindow = await getArrivalWindow(booking);
  const clientName = getClientName(booking, user);
  return {
    Property_Name: propertyName,
    Client_Name: clientName,
    Shoot_Date: formatDate(booking?.date),
    Arrival_Window: arrivalWindow,
    Dashboard_Manage_Booking: getManageBookingUrl(),
    Booking_Page: getBookingPageUrl(),
    Dashboard_Files_Link: getDashboardFilesUrl(),
    Pending_Deliverable: getPendingDeliverableSummary(booking),
    ...overrides,
  };
};

const sendTemplate = async (templateName, booking, user, overrides) => {
  const to = getRecipientPhone(booking, user);
  const variables = await buildVariables(
    templateName,
    booking,
    user,
    overrides,
  );
  const result = await sendWhatsAppTemplate({
    to,
    templateName,
    variables,
  });
  return result;
};

export async function sendBookingConfirmation(booking, user, overrides = {}) {
  return sendTemplate("shoot_confirmation", booking, user, overrides);
}

export async function sendRescheduleConfirmation(booking, user) {
  const arrivalWindow = await getArrivalWindow(booking);
  return sendTemplate("shoot_rescheduled", booking, user, {
    Shoot_Date: formatDate(booking?.date),
    Arrival_Window: arrivalWindow,
  });
}

export async function sendCancellationConfirmation(booking, user) {
  return sendTemplate("shoot_cancelled", booking, user);
}

export async function sendPreShootReminder(bookingId) {
  const booking = await Booking.findByPk(bookingId);
  if (!booking) throw new Error("Booking not found");
  const user = booking.userId ? await User.findByPk(booking.userId) : null;
  return sendTemplate("shoot_reminder", booking, user);
}

export async function sendTeamOnTheWay(bookingId) {
  const booking = await Booking.findByPk(bookingId);
  if (!booking) throw new Error("Booking not found");
  const user = booking.userId ? await User.findByPk(booking.userId) : null;
  return sendTemplate("team_on_the_way", booking, user);
}

export async function sendTeamArrived(bookingId) {
  const booking = await Booking.findByPk(bookingId);
  if (!booking) throw new Error("Booking not found");
  const user = booking.userId ? await User.findByPk(booking.userId) : null;
  return sendTemplate("team_arrived", booking, user);
}

export async function sendPartialMediaUploadNotification(bookingId) {
  const booking = await Booking.findByPk(bookingId);
  if (!booking) throw new Error("Booking not found");
  if (!booking.filesUrl) {
    throw new Error("No deliverables uploaded for this booking");
  }
  const user = booking.userId ? await User.findByPk(booking.userId) : null;
  return sendTemplate("partial_media_upload", booking, user);
}

export async function sendSingleServiceMediaReadyNotification(bookingId) {
  const booking = await Booking.findByPk(bookingId);
  if (!booking) throw new Error("Booking not found");
  if (!booking.filesUrl) {
    throw new Error("No deliverables uploaded for this booking");
  }
  const user = booking.userId ? await User.findByPk(booking.userId) : null;
  return sendTemplate("single_service_media_ready", booking, user);
}

export async function sendFullMediaUploadNotification(bookingId) {
  const booking = await Booking.findByPk(bookingId);
  if (!booking) throw new Error("Booking not found");
  if (!booking.filesUrl) {
    throw new Error("No deliverables uploaded for this booking");
  }
  const user = booking.userId ? await User.findByPk(booking.userId) : null;
  return sendTemplate("full_media_upload", booking, user);
}
