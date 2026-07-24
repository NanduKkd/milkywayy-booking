import Booking from "@/lib/db/models/booking";
import BookingDeliveryFile from "@/lib/db/models/bookingdeliveryfile";
import WalletTransaction from "@/lib/db/models/wallettransaction";
import {
  BOOKING_WORKFLOW_STATUS,
  DELIVERY_FILE_STATUS,
} from "@/lib/helpers/bookingWorkflow";
import {
  autoCompleteEligibleBookings,
  completeDeliveredBookingState,
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
jest.mock("@/lib/db/models/bookingdeliveryfile", () => ({
  findByPk: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  count: jest.fn(),
}));
jest.mock("@/lib/db/models/wallettransaction", () => ({
  update: jest.fn(),
}));

describe("booking workflow service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("advances the pre-delivery admin workflow", async () => {
    const booking = {
      id: 1,
      status: "CONFIRMED",
      workflowStatus: BOOKING_WORKFLOW_STATUS.SHOOT_DONE,
      update: jest.fn(async (values) => Object.assign(booking, values)),
    };
    Booking.findByPk.mockResolvedValue(booking);

    const result = await updateBookingWorkflowState(
      booking.id,
      BOOKING_WORKFLOW_STATUS.EDITING,
    );

    expect(booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowStatus: BOOKING_WORKFLOW_STATUS.EDITING,
        editingStartedAt: expect.any(Date),
      }),
      { transaction: mockTransaction },
    );
    expect(result.workflowStatus).toBe(BOOKING_WORKFLOW_STATUS.EDITING);
  });

  it("does not allow manually releasing all files", async () => {
    Booking.findByPk.mockResolvedValue({
      id: 1,
      status: "CONFIRMED",
      workflowStatus: BOOKING_WORKFLOW_STATUS.EDITING,
    });

    await expect(
      updateBookingWorkflowState(1, BOOKING_WORKFLOW_STATUS.FILES_UPLOADED),
    ).rejects.toThrow("Invalid workflow transition");
  });

  it("completes all reviewable files after admin finishes delivery", async () => {
    const booking = {
      id: 1,
      userId: 7,
      status: "CONFIRMED",
      workflowStatus: BOOKING_WORKFLOW_STATUS.FILES_UPLOADED,
      deliveryFinishedAt: new Date(),
      update: jest.fn(async (values) => Object.assign(booking, values)),
    };
    Booking.findOne.mockResolvedValue(booking);
    BookingDeliveryFile.findAll.mockResolvedValue([
      { id: 10, status: DELIVERY_FILE_STATUS.UNDER_REVIEW },
      { id: 11, status: DELIVERY_FILE_STATUS.ACCEPTED },
    ]);

    await completeDeliveredBookingState(1, 7);

    expect(BookingDeliveryFile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: DELIVERY_FILE_STATUS.ACCEPTED,
        reviewDeadlineAt: null,
      }),
      expect.objectContaining({
        where: { id: expect.anything() },
      }),
    );
    expect(booking.status).toBe("COMPLETED");
  });

  it("blocks completion while a file awaits replacement", async () => {
    Booking.findOne.mockResolvedValue({
      id: 1,
      userId: 7,
      status: "CONFIRMED",
      workflowStatus: BOOKING_WORKFLOW_STATUS.FILES_UPLOADED,
      deliveryFinishedAt: new Date(),
    });
    BookingDeliveryFile.findAll.mockResolvedValue([
      { status: DELIVERY_FILE_STATUS.CHANGES_REQUESTED },
    ]);

    await expect(completeDeliveredBookingState(1, 7)).rejects.toThrow(
      "Resolve all requested file changes first",
    );
  });

  it("accepts expired files and completes eligible bookings once", async () => {
    const file = {
      id: 5,
      bookingId: 1,
      type: "Photography",
      status: DELIVERY_FILE_STATUS.UNDER_REVIEW,
      reviewDeadlineAt: new Date("2026-06-01T00:00:00.000Z"),
      update: jest.fn(async (values) => Object.assign(file, values)),
    };
    const booking = {
      id: 1,
      transactionId: 10,
      workflowStatus: BOOKING_WORKFLOW_STATUS.FILES_UPLOADED,
      deliveryFinishedAt: new Date("2026-05-31T00:00:00.000Z"),
      completedAt: null,
      update: jest.fn(async (values) => Object.assign(booking, values)),
    };
    const secondFile = {
      id: 6,
      bookingId: 1,
      type: "Photography",
      status: DELIVERY_FILE_STATUS.UNDER_REVIEW,
      reviewDeadlineAt: new Date("2026-06-01T00:00:00.000Z"),
    };
    BookingDeliveryFile.findAll
      .mockResolvedValueOnce([{ bookingId: 1, type: "Photography" }])
      .mockResolvedValueOnce([file, secondFile])
      .mockResolvedValueOnce([file, secondFile]);
    Booking.findAll.mockResolvedValue([{ id: 1 }]);
    Booking.findByPk.mockResolvedValue(booking);
    Booking.count.mockResolvedValue(0);

    const result = await autoCompleteEligibleBookings(
      new Date("2026-06-02T00:00:00.000Z"),
    );

    expect(result).toEqual({ acceptedFileCount: 2, completedCount: 1 });
    expect(file.status).toBe(DELIVERY_FILE_STATUS.ACCEPTED);
    expect(secondFile.status).toBe(DELIVERY_FILE_STATUS.ACCEPTED);
    expect(WalletTransaction.update).toHaveBeenCalledTimes(1);
  });
});
