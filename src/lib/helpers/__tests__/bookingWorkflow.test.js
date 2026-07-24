import {
  BOOKING_WORKFLOW_STATUS,
  DELIVERY_FILE_STATUS,
  DELIVERY_FILE_TYPE,
  getDubaiReviewDeadline,
  hasTeamArrivedNotificationBeenSent,
  hasUploadedDeliverables,
  isBookingDispatched,
  isCustomerDeliveryFileVisible,
  isCustomerFileVisible,
  isDeliveryFileType,
  isNewDeliveryFileType,
  isVideoDeliveryFileType,
  NEW_DELIVERY_FILE_TYPES,
  VIDEO_DELIVERY_FILE_TYPES,
} from "@/lib/helpers/bookingWorkflow";

describe("booking workflow helpers", () => {
  it("defines the exact new-delivery choices and legacy video compatibility", () => {
    expect(NEW_DELIVERY_FILE_TYPES).toEqual([
      "Photography",
      "Short Form Video",
      "Long Form Video",
      "360 Virtual Tour",
    ]);
    expect(VIDEO_DELIVERY_FILE_TYPES).toEqual([
      "Short Form Video",
      "Long Form Video",
      "Videography",
    ]);

    expect(isNewDeliveryFileType(DELIVERY_FILE_TYPE.VIDEOGRAPHY)).toBe(false);
    expect(isDeliveryFileType(DELIVERY_FILE_TYPE.VIDEOGRAPHY)).toBe(true);
    expect(isDeliveryFileType("Unsupported Video")).toBe(false);
    expect(isVideoDeliveryFileType("Short Form Video")).toBe(true);
    expect(isVideoDeliveryFileType("Long Form Video")).toBe(true);
    expect(isVideoDeliveryFileType("Videography")).toBe(true);
    expect(isVideoDeliveryFileType("Photography")).toBe(false);
  });

  it("sets the deadline after two full Dubai calendar days", () => {
    const uploadedAt = new Date("2026-06-06T18:30:00.000Z");

    expect(getDubaiReviewDeadline(uploadedAt).toISOString()).toBe(
      "2026-06-08T20:00:00.000Z",
    );
  });

  it("detects uploaded deliverables", () => {
    expect(
      hasUploadedDeliverables(
        JSON.stringify({
          deliverables: [{ type: "Photography", urls: ["https://file"] }],
        }),
      ),
    ).toBe(true);
    expect(hasUploadedDeliverables(JSON.stringify({ deliverables: [] }))).toBe(
      false,
    );
  });

  it("detects when the team-on-the-way notification was sent", () => {
    expect(
      isBookingDispatched({
        deliveryNotificationMetadata: {
          teamOnTheWaySentAt: "2026-06-08T10:00:00.000Z",
        },
      }),
    ).toBe(true);
    expect(isBookingDispatched({ deliveryNotificationMetadata: {} })).toBe(
      false,
    );
  });

  it("detects when the team-arrived notification was sent", () => {
    expect(
      hasTeamArrivedNotificationBeenSent({
        deliveryNotificationMetadata: {
          teamArrivedSentAt: "2026-06-08T11:00:00.000Z",
        },
      }),
    ).toBe(true);
    expect(
      hasTeamArrivedNotificationBeenSent({
        deliveryNotificationMetadata: {},
      }),
    ).toBe(false);
  });

  it("shows files only during review or after completion", () => {
    expect(
      isCustomerFileVisible({
        workflowStatus: BOOKING_WORKFLOW_STATUS.EDITING,
      }),
    ).toBe(false);
    expect(
      isCustomerFileVisible({
        workflowStatus: BOOKING_WORKFLOW_STATUS.FILES_UPLOADED,
      }),
    ).toBe(true);
    expect(
      isCustomerFileVisible({
        workflowStatus: BOOKING_WORKFLOW_STATUS.PROJECT_COMPLETED,
      }),
    ).toBe(true);
    expect(
      isCustomerFileVisible({
        workflowStatus: BOOKING_WORKFLOW_STATUS.EDITING,
        deliveryFiles: [
          { status: DELIVERY_FILE_STATUS.UNDER_REVIEW, deletedAt: null },
        ],
      }),
    ).toBe(true);
    expect(
      isCustomerFileVisible({
        workflowStatus: BOOKING_WORKFLOW_STATUS.FILES_UPLOADED,
        deliveryFiles: [
          { status: DELIVERY_FILE_STATUS.PRIVATE, deletedAt: null },
        ],
      }),
    ).toBe(false);
    expect(
      isCustomerFileVisible({
        workflowStatus: BOOKING_WORKFLOW_STATUS.FILES_UPLOADED,
        deliveryFiles: [
          {
            status: DELIVERY_FILE_STATUS.CHANGES_REQUESTED,
            deletedAt: null,
          },
        ],
      }),
    ).toBe(false);
    expect(
      isCustomerDeliveryFileVisible({
        status: DELIVERY_FILE_STATUS.ACCEPTED,
        deletedAt: null,
      }),
    ).toBe(true);
  });
});
