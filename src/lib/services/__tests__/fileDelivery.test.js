import Booking from "@/lib/db/models/booking";
import BookingDeliveryFile from "@/lib/db/models/bookingdeliveryfile";
import BookingDeliveryFileVersion from "@/lib/db/models/bookingdeliveryfileversion";
import BookingFileRevision from "@/lib/db/models/bookingfilerevision";
import {
  DELIVERY_FILE_STATUS,
  MAX_FILE_REVISIONS,
} from "@/lib/helpers/bookingWorkflow";
import {
  addUploadedDeliveryFiles,
  deleteDeliveryFileState,
  finishBookingDeliveryState,
  publishPrivateDeliveryFilesState,
  requestFileRevisionState,
} from "@/lib/services/fileDelivery";

const mockTransaction = { LOCK: { UPDATE: "UPDATE" } };

jest.mock("@/lib/db/db", () => ({
  sequelize: {
    transaction: jest.fn((callback) => callback(mockTransaction)),
  },
}));
jest.mock("@/lib/db/models/booking", () => ({
  findByPk: jest.fn(),
  findOne: jest.fn(),
}));
jest.mock("@/lib/db/models/bookingdeliveryfile", () => ({
  create: jest.fn(),
  findByPk: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
}));
jest.mock("@/lib/db/models/bookingdeliveryfileversion", () => ({
  create: jest.fn(),
  count: jest.fn(),
  update: jest.fn(),
}));
jest.mock("@/lib/db/models/bookingfilerevision", () => ({
  create: jest.fn(),
  update: jest.fn(),
}));

const createBooking = (overrides = {}) => {
  const booking = {
    id: 1,
    status: "CONFIRMED",
    workflowStatus: "EDITING",
    filesUploadedAt: null,
    deliveryFinishedAt: null,
    deliveryNotificationMetadata: {},
    update: jest.fn(async (values) => Object.assign(booking, values)),
    ...overrides,
  };
  return booking;
};

const createDeliveryFile = (overrides = {}) => {
  const file = {
    id: 10,
    bookingId: 1,
    type: "Photography",
    label: "Photography",
    deliveryMode: "download",
    status: DELIVERY_FILE_STATUS.UNDER_REVIEW,
    revisionCount: 0,
    currentVersionId: 100,
    currentVersion: { id: 100, url: "https://bucket/old.jpg" },
    versions: [{ id: 100, url: "https://bucket/old.jpg" }],
    destroy: jest.fn(),
    update: jest.fn(async (values) => Object.assign(file, values)),
    setDataValue: jest.fn((key, value) => {
      file[key] = value;
    }),
    toJSON: jest.fn(() => ({ ...file })),
    ...overrides,
  };
  return file;
};

describe("per-file delivery service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates one review record for each physical upload", async () => {
    const booking = createBooking();
    const createdFiles = [];
    let nextFileId = 10;
    let nextVersionId = 100;
    Booking.findByPk.mockResolvedValue(booking);
    BookingDeliveryFile.create.mockImplementation(async (values) => {
      const file = createDeliveryFile({ ...values, id: nextFileId++ });
      createdFiles.push(file);
      return file;
    });
    BookingDeliveryFileVersion.create.mockImplementation(async (values) => ({
      ...values,
      id: nextVersionId++,
    }));
    BookingDeliveryFile.findAll.mockImplementation(async () => createdFiles);

    const result = await addUploadedDeliveryFiles({
      bookingId: 1,
      uploads: [
        { url: "https://bucket/one.jpg", originalFilename: "one.jpg" },
        { url: "https://bucket/two.jpg", originalFilename: "two.jpg" },
      ],
      type: "Photography",
      label: "Photography",
      deliveryMode: "download",
    });

    expect(BookingDeliveryFile.create).toHaveBeenCalledTimes(2);
    expect(BookingDeliveryFileVersion.create).toHaveBeenCalledTimes(2);
    expect(result.deliveryFiles).toHaveLength(2);
    expect(booking.workflowStatus).toBe("FILES_UPLOADED");
    expect(booking.deliveryFinishedAt).toBeNull();
  });

  it("requests changes only for the selected file", async () => {
    const booking = createBooking({
      workflowStatus: "FILES_UPLOADED",
      userId: 7,
    });
    const file = createDeliveryFile();
    BookingDeliveryFile.findByPk.mockResolvedValue(file);
    Booking.findOne.mockResolvedValue(booking);
    Booking.findByPk.mockResolvedValue(booking);
    BookingDeliveryFile.findAll.mockResolvedValue([]);

    await requestFileRevisionState(file.id, 7, "Brighten the kitchen");

    expect(BookingFileRevision.create).toHaveBeenCalledWith(
      expect.objectContaining({
        deliveryFileId: file.id,
        versionId: 100,
        requestNumber: 1,
        note: "Brighten the kitchen",
      }),
      { transaction: mockTransaction },
    );
    expect(file.status).toBe(DELIVERY_FILE_STATUS.CHANGES_REQUESTED);
    expect(file.revisionCount).toBe(1);
  });

  it("enforces two requests per file", async () => {
    const booking = createBooking({
      workflowStatus: "FILES_UPLOADED",
      userId: 7,
    });
    const file = createDeliveryFile({ revisionCount: MAX_FILE_REVISIONS });
    BookingDeliveryFile.findByPk.mockResolvedValue(file);
    Booking.findOne.mockResolvedValue(booking);

    await expect(
      requestFileRevisionState(file.id, 7, "Another change"),
    ).rejects.toThrow("Maximum revision requests reached for this file");
  });

  it("replaces the same logical file without resetting its count", async () => {
    const booking = createBooking({
      workflowStatus: "FILES_UPLOADED",
      deliveryFinishedAt: new Date("2026-06-01T00:00:00.000Z"),
    });
    const file = createDeliveryFile({
      deliveryMode: "direct_download",
      status: DELIVERY_FILE_STATUS.CHANGES_REQUESTED,
      revisionCount: 1,
    });
    Booking.findByPk.mockResolvedValue(booking);
    BookingDeliveryFile.findOne.mockResolvedValue(file);
    BookingDeliveryFileVersion.count.mockResolvedValue(1);
    BookingDeliveryFileVersion.create.mockResolvedValue({
      id: 101,
      versionNumber: 2,
      url: "https://bucket/replacement.jpg",
    });
    BookingDeliveryFile.findAll.mockResolvedValue([file]);

    await addUploadedDeliveryFiles({
      bookingId: 1,
      uploads: [{ url: "https://bucket/replacement.jpg" }],
      type: "Photography",
      label: "Photography",
      deliveryMode: "download",
      replacementFileId: file.id,
    });

    expect(file.status).toBe(DELIVERY_FILE_STATUS.UNDER_REVIEW);
    expect(file.deliveryMode).toBe("download");
    expect(file.revisionCount).toBe(1);
    expect(booking.deliveryFinishedAt).toEqual(
      new Date("2026-06-01T00:00:00.000Z"),
    );
    expect(BookingFileRevision.update).toHaveBeenCalledWith(
      expect.objectContaining({ replacementVersionId: 101 }),
      expect.any(Object),
    );
  });

  it("blocks finalization while a replacement is pending", async () => {
    const booking = createBooking({ workflowStatus: "FILES_UPLOADED" });
    Booking.findByPk.mockResolvedValue(booking);
    BookingDeliveryFile.findAll.mockResolvedValue([
      createDeliveryFile({
        status: DELIVERY_FILE_STATUS.CHANGES_REQUESTED,
      }),
    ]);

    await expect(finishBookingDeliveryState(1)).rejects.toThrow(
      "Resolve all private or requested files first",
    );
  });

  it("publishes migrated private files with fresh deadlines", async () => {
    const booking = createBooking();
    const privateFile = createDeliveryFile({
      status: DELIVERY_FILE_STATUS.PRIVATE,
    });
    Booking.findByPk.mockResolvedValue(booking);
    BookingDeliveryFile.findAll
      .mockResolvedValueOnce([privateFile])
      .mockResolvedValueOnce([]);

    const result = await publishPrivateDeliveryFilesState(1);

    expect(BookingDeliveryFile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: DELIVERY_FILE_STATUS.UNDER_REVIEW,
        reviewDeadlineAt: expect.any(Date),
      }),
      expect.any(Object),
    );
    expect(result.publishedFileIds).toEqual([privateFile.id]);
    expect(booking.workflowStatus).toBe("FILES_UPLOADED");
  });

  it("returns every stored version when deleting a logical file", async () => {
    const booking = createBooking({ workflowStatus: "FILES_UPLOADED" });
    const file = createDeliveryFile({
      versions: [
        { id: 100, url: "https://bucket/old.jpg" },
        { id: 101, url: "https://bucket/replacement.jpg" },
      ],
      currentVersion: { id: 101, url: "https://bucket/replacement.jpg" },
    });
    BookingDeliveryFile.findOne.mockResolvedValue(file);
    Booking.findByPk.mockResolvedValue(booking);
    BookingDeliveryFile.findAll.mockResolvedValue([]);

    const result = await deleteDeliveryFileState(file.id, booking.id);

    expect(result.urls).toEqual([
      "https://bucket/old.jpg",
      "https://bucket/replacement.jpg",
    ]);
    expect(file.destroy).toHaveBeenCalledWith({
      transaction: mockTransaction,
    });
  });
});
