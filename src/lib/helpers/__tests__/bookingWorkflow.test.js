import {
  BOOKING_WORKFLOW_STATUS,
  getDubaiReviewDeadline,
  hasUploadedDeliverables,
  isCustomerFileVisible,
} from "@/lib/helpers/bookingWorkflow";

describe("booking workflow helpers", () => {
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
  });
});
