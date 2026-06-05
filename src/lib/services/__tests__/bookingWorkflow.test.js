import Booking from "@/lib/db/models/booking";
import BookingRevision from "@/lib/db/models/bookingrevision";
import WalletTransaction from "@/lib/db/models/wallettransaction";
import { BOOKING_WORKFLOW_STATUS } from "@/lib/helpers/bookingWorkflow";
import {
  autoCompleteEligibleBookings,
  requestBookingRevisionState,
  updateBookingWorkflowState,
} from "@/lib/services/bookingWorkflow";

const mockTransaction = { LOCK: { UPDATE: "UPDATE" } };

jest.mock("@/lib/db/db", () => ({
  sequelize: {
    transaction: jest.fn((callback) => callback(mockTransaction)),
  },
}));
jest.mock("@/lib/db/models/booking", () => ({
  findByPk: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
  count: jest.fn(),
}));
jest.mock("@/lib/db/models/bookingrevision", () => ({
  create: jest.fn(),
  update: jest.fn(),
}));
jest.mock("@/lib/db/models/wallettransaction", () => ({
  update: jest.fn(),
}));

describe("booking workflow service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("releases uploaded files for customer review", async () => {
    const booking = {
      id: 1,
      status: "CONFIRMED",
      workflowStatus: BOOKING_WORKFLOW_STATUS.EDITING,
      filesUrl: JSON.stringify({
        deliverables: [{ type: "Photography", url: "https://file" }],
      }),
      update: jest.fn(async (values) => Object.assign(booking, values)),
    };
    Booking.findByPk.mockResolvedValue(booking);

    const result = await updateBookingWorkflowState(
      booking.id,
      BOOKING_WORKFLOW_STATUS.FILES_UPLOADED,
    );

    expect(booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowStatus: BOOKING_WORKFLOW_STATUS.FILES_UPLOADED,
        filesUploadedAt: expect.any(Date),
        reviewDeadlineAt: expect.any(Date),
      }),
      { transaction: mockTransaction },
    );
    expect(BookingRevision.update).toHaveBeenCalledWith(
      { resolvedAt: expect.any(Date) },
      expect.objectContaining({
        where: { bookingId: 1, resolvedAt: null },
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 1,
        workflowStatus: BOOKING_WORKFLOW_STATUS.FILES_UPLOADED,
      }),
    );
    expect(result.update).toBeUndefined();
  });

  it("requires an upload before files can be released", async () => {
    Booking.findByPk.mockResolvedValue({
      id: 1,
      status: "CONFIRMED",
      workflowStatus: BOOKING_WORKFLOW_STATUS.EDITING,
      filesUrl: JSON.stringify({ deliverables: [] }),
    });

    await expect(
      updateBookingWorkflowState(1, BOOKING_WORKFLOW_STATUS.FILES_UPLOADED),
    ).rejects.toThrow("Upload at least one deliverable first");
  });

  it("records a revision and hides the released files", async () => {
    const booking = {
      id: 1,
      userId: 7,
      workflowStatus: BOOKING_WORKFLOW_STATUS.FILES_UPLOADED,
      revisionCount: 0,
      reviewDeadlineAt: new Date(Date.now() + 60_000),
      filesUrl: JSON.stringify({
        deliverables: [{ type: "Photography", url: "https://file" }],
      }),
      update: jest.fn(async (values) => Object.assign(booking, values)),
    };
    Booking.findOne.mockResolvedValue(booking);

    await requestBookingRevisionState(1, 7, "Brighten the kitchen");

    expect(BookingRevision.create).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingId: 1,
        revisionNumber: 1,
        note: "Brighten the kitchen",
      }),
      { transaction: mockTransaction },
    );
    expect(booking.workflowStatus).toBe(BOOKING_WORKFLOW_STATUS.EDITING);
    expect(JSON.parse(booking.filesUrl).deliverables).toEqual([]);
  });

  it("auto-completes once and activates wallet credits", async () => {
    const booking = {
      id: 1,
      transactionId: 10,
      workflowStatus: BOOKING_WORKFLOW_STATUS.FILES_UPLOADED,
      reviewDeadlineAt: new Date("2026-06-01T00:00:00.000Z"),
      completedAt: null,
      update: jest.fn(async (values) => Object.assign(booking, values)),
    };
    Booking.findAll.mockResolvedValue([{ id: 1 }]);
    Booking.findByPk.mockResolvedValue(booking);
    Booking.count.mockResolvedValue(0);

    const first = await autoCompleteEligibleBookings(
      new Date("2026-06-02T00:00:00.000Z"),
    );
    const second = await autoCompleteEligibleBookings(
      new Date("2026-06-02T00:00:00.000Z"),
    );

    expect(first.completedCount).toBe(1);
    expect(second.completedCount).toBe(0);
    expect(WalletTransaction.update).toHaveBeenCalledTimes(1);
    expect(booking.status).toBe("COMPLETED");
  });
});
