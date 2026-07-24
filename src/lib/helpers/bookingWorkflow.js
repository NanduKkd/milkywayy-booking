export const BOOKING_WORKFLOW_STATUS = {
  SHOOT_BOOKED: "SHOOT_BOOKED",
  SHOOT_DONE: "SHOOT_DONE",
  EDITING: "EDITING",
  FILES_UPLOADED: "FILES_UPLOADED",
  PROJECT_COMPLETED: "PROJECT_COMPLETED",
};

export const BOOKING_WORKFLOW_STEPS = [
  { status: BOOKING_WORKFLOW_STATUS.SHOOT_BOOKED, label: "Shoot Booked" },
  { status: BOOKING_WORKFLOW_STATUS.SHOOT_DONE, label: "Shoot Done" },
  { status: BOOKING_WORKFLOW_STATUS.EDITING, label: "Editing" },
  { status: BOOKING_WORKFLOW_STATUS.FILES_UPLOADED, label: "Files In Review" },
  {
    status: BOOKING_WORKFLOW_STATUS.PROJECT_COMPLETED,
    label: "Project Completed",
  },
];

export const MAX_FILE_REVISIONS = 2;
export const MAX_BOOKING_REVISIONS = MAX_FILE_REVISIONS;

export const DELIVERY_FILE_STATUS = {
  PRIVATE: "PRIVATE",
  UNDER_REVIEW: "UNDER_REVIEW",
  CHANGES_REQUESTED: "CHANGES_REQUESTED",
  ACCEPTED: "ACCEPTED",
};

export const DELIVERY_FILE_TYPE = {
  PHOTOGRAPHY: "Photography",
  SHORT_FORM_VIDEO: "Short Form Video",
  LONG_FORM_VIDEO: "Long Form Video",
  VIDEOGRAPHY: "Videography",
  TOUR_360: "360 Virtual Tour",
};

export const NEW_DELIVERY_FILE_TYPES = [
  DELIVERY_FILE_TYPE.PHOTOGRAPHY,
  DELIVERY_FILE_TYPE.SHORT_FORM_VIDEO,
  DELIVERY_FILE_TYPE.LONG_FORM_VIDEO,
  DELIVERY_FILE_TYPE.TOUR_360,
];

export const VIDEO_DELIVERY_FILE_TYPES = [
  DELIVERY_FILE_TYPE.SHORT_FORM_VIDEO,
  DELIVERY_FILE_TYPE.LONG_FORM_VIDEO,
  DELIVERY_FILE_TYPE.VIDEOGRAPHY,
];

const DELIVERY_FILE_TYPES = new Set(Object.values(DELIVERY_FILE_TYPE));
const NEW_DELIVERY_FILE_TYPE_SET = new Set(NEW_DELIVERY_FILE_TYPES);
const VIDEO_DELIVERY_FILE_TYPE_SET = new Set(VIDEO_DELIVERY_FILE_TYPES);

export const isDeliveryFileType = (type) => DELIVERY_FILE_TYPES.has(type);

export const isNewDeliveryFileType = (type) =>
  NEW_DELIVERY_FILE_TYPE_SET.has(type);

export const isVideoDeliveryFileType = (type) =>
  VIDEO_DELIVERY_FILE_TYPE_SET.has(type);

export const isBookingDispatched = (booking) =>
  Boolean(booking?.deliveryNotificationMetadata?.teamOnTheWaySentAt);

export const hasTeamArrivedNotificationBeenSent = (booking) =>
  Boolean(booking?.deliveryNotificationMetadata?.teamArrivedSentAt);

export const getWorkflowStatus = (booking) => {
  if (booking?.workflowStatus) return booking.workflowStatus;
  if (booking?.completedAt || booking?.status === "COMPLETED") {
    return BOOKING_WORKFLOW_STATUS.PROJECT_COMPLETED;
  }
  return BOOKING_WORKFLOW_STATUS.SHOOT_BOOKED;
};

export const parseFilesPayload = (filesUrl) => {
  if (!filesUrl || typeof filesUrl !== "string") return null;
  try {
    const parsed = JSON.parse(filesUrl);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : null;
  } catch {
    return null;
  }
};

export const hasUploadedDeliverables = (filesUrl) => {
  if (!filesUrl || typeof filesUrl !== "string") return false;
  const parsed = parseFilesPayload(filesUrl);
  if (!parsed) return Boolean(filesUrl.trim());
  return Array.isArray(parsed.deliverables)
    ? parsed.deliverables.some(
        (item) =>
          item?.url || (Array.isArray(item?.urls) && item.urls.length > 0),
      )
    : false;
};

export const getDubaiReviewDeadline = (uploadedAt = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dubai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(uploadedAt);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return new Date(
    Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day) + 3,
      -4,
      0,
      0,
      0,
    ),
  );
};

export const isCustomerDeliveryFileVisible = (file) =>
  Boolean(file) &&
  !file.deletedAt &&
  [DELIVERY_FILE_STATUS.UNDER_REVIEW, DELIVERY_FILE_STATUS.ACCEPTED].includes(
    file.status,
  );

export const isCustomerFileVisible = (booking) => {
  if (Array.isArray(booking?.deliveryFiles)) {
    return booking.deliveryFiles.some(isCustomerDeliveryFileVisible);
  }
  const status = getWorkflowStatus(booking);
  return (
    status === BOOKING_WORKFLOW_STATUS.FILES_UPLOADED ||
    status === BOOKING_WORKFLOW_STATUS.PROJECT_COMPLETED
  );
};
