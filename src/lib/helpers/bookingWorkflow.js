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
  { status: BOOKING_WORKFLOW_STATUS.FILES_UPLOADED, label: "Files Uploaded" },
  {
    status: BOOKING_WORKFLOW_STATUS.PROJECT_COMPLETED,
    label: "Project Completed",
  },
];

export const MAX_BOOKING_REVISIONS = 2;

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

export const isCustomerFileVisible = (booking) => {
  const status = getWorkflowStatus(booking);
  return (
    status === BOOKING_WORKFLOW_STATUS.FILES_UPLOADED ||
    status === BOOKING_WORKFLOW_STATUS.PROJECT_COMPLETED
  );
};
