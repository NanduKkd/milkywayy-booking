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

const getLocation = (booking) => {
  return (
    booking?.propertyDetails?.community ||
    booking?.propertyDetails?.building ||
    "Location"
  );
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

const buildVariables = async (booking, user, overrides = {}) => {
  const propertyName = getPropertyName(booking);
  const location = getLocation(booking);
  const arrivalWindow = await getArrivalWindow(booking);
  const clientName = getClientName(booking, user);
  return {
    Property_Name: propertyName,
    Location: location,
    Client_Name: clientName,
    Shoot_Date: formatDate(booking?.date),
    Arrival_Window: arrivalWindow,
    ...overrides,
  };
};

const sendTemplate = async (templateName, booking, user, overrides) => {
  const to = getRecipientPhone(booking, user);
  const variables = await buildVariables(booking, user, overrides);
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
    New_Shoot_Date: formatDate(booking?.date),
    New_Arrival_Window: arrivalWindow,
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
