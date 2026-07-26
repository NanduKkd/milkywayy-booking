import { Op } from "sequelize";
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
  deleteDeliveryCategoryState,
  deleteDeliveryFileState,
  finishBookingDeliveryState,
  publishPrivateDeliveryFilesState,
  requestDeliveryServiceRevisionState,
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
  findAll: jest.fn(),
  update: jest.fn(),
}));
jest.mock("@/lib/db/models/bookingfilerevision", () => ({
  create: jest.fn(),
  count: jest.fn(),
  update: jest.fn(),
}));
jest.mock("@/lib/services/propertySharing", () => ({
  synchronizePropertyShareMediaForBooking: jest.fn(),
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
    reviewDeadlineAt: new Date("2099-12-28T20:00:00.000Z"),
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

describe("delivery service groups", () => {
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

  it.each(["Short Form Video", "Long Form Video"])(
    "persists canonical %s as the exact type and label",
    async (type) => {
      const booking = createBooking();
      const createdFiles = [];
      Booking.findByPk.mockResolvedValue(booking);
      BookingDeliveryFile.create.mockImplementation(async (values) => {
        const file = createDeliveryFile({ ...values });
        createdFiles.push(file);
        return file;
      });
      BookingDeliveryFileVersion.create.mockResolvedValue({
        id: 100,
        versionNumber: 1,
        url: "https://bucket/final.mp4",
      });
      BookingDeliveryFile.findAll.mockImplementation(async () => createdFiles);

      await addUploadedDeliveryFiles({
        bookingId: 1,
        uploads: [{ url: "https://bucket/final.mp4" }],
        type,
        label: "Client-supplied label is not authoritative",
        deliveryMode: "direct_download",
      });

      expect(BookingDeliveryFile.create).toHaveBeenCalledWith(
        expect.objectContaining({ type, label: type }),
        { transaction: mockTransaction },
      );
    },
  );

  it("rejects compatibility-only or unsupported types for new deliveries", async () => {
    await expect(
      addUploadedDeliveryFiles({
        bookingId: 1,
        uploads: [{ url: "https://bucket/final.mp4" }],
        type: "Videography",
        deliveryMode: "direct_download",
      }),
    ).rejects.toThrow("Invalid deliverableType");
    await expect(
      addUploadedDeliveryFiles({
        bookingId: 1,
        uploads: [{ url: "https://bucket/final.mp4" }],
        type: "Unsupported Video",
        deliveryMode: "direct_download",
      }),
    ).rejects.toThrow("Invalid deliverableType");
    expect(Booking.findByPk).not.toHaveBeenCalled();
  });

  it("requests changes atomically for every current service member", async () => {
    const booking = createBooking({
      workflowStatus: "FILES_UPLOADED",
      userId: 7,
    });
    const file = createDeliveryFile();
    Booking.findOne.mockResolvedValue(booking);
    Booking.findByPk.mockResolvedValue(booking);
    const secondFile = createDeliveryFile({ id: 11, currentVersionId: 101 });
    BookingDeliveryFile.findAll.mockResolvedValue([file, secondFile]);

    await requestDeliveryServiceRevisionState(
      1,
      "Photography",
      7,
      "Brighten the kitchen",
    );

    expect(BookingFileRevision.create).toHaveBeenCalledTimes(2);
    expect(BookingFileRevision.create).toHaveBeenCalledWith(
      expect.objectContaining({
        deliveryFileId: file.id,
        versionId: 100,
        requestNumber: 1,
        note: "Brighten the kitchen",
      }),
      { transaction: mockTransaction },
    );
    expect(BookingDeliveryFile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: DELIVERY_FILE_STATUS.CHANGES_REQUESTED,
        revisionCount: 1,
      }),
      expect.objectContaining({ transaction: mockTransaction }),
    );
    expect(Booking.findOne.mock.invocationCallOrder[0]).toBeLessThan(
      BookingDeliveryFile.findAll.mock.invocationCallOrder[0],
    );
  });

  it("enforces two requests per file", async () => {
    const booking = createBooking({
      workflowStatus: "FILES_UPLOADED",
      userId: 7,
    });
    const file = createDeliveryFile({ revisionCount: MAX_FILE_REVISIONS });
    Booking.findOne.mockResolvedValue(booking);
    BookingDeliveryFile.findAll.mockResolvedValue([file]);

    await expect(
      requestDeliveryServiceRevisionState(
        1,
        "Photography",
        7,
        "Another change",
      ),
    ).rejects.toThrow("Maximum revision requests reached for this service");
  });

  it("replaces a legacy Videography file without changing its type or label", async () => {
    const booking = createBooking({
      workflowStatus: "FILES_UPLOADED",
      deliveryFinishedAt: new Date("2026-06-01T00:00:00.000Z"),
    });
    const file = createDeliveryFile({
      type: "Videography",
      label: "Videography",
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
      uploads: [{ url: "https://bucket/replacement.mp4" }],
      type: "Videography",
      label: "Long Form Video",
      deliveryMode: "direct_download",
      replacementFileId: file.id,
    });

    expect(file.status).toBe(DELIVERY_FILE_STATUS.UNDER_REVIEW);
    expect(file.type).toBe("Videography");
    expect(file.label).toBe("Videography");
    expect(file.deliveryMode).toBe("direct_download");
    expect(file.revisionCount).toBe(1);
    expect(booking.deliveryFinishedAt).toEqual(
      new Date("2026-06-01T00:00:00.000Z"),
    );
    expect(BookingFileRevision.update).toHaveBeenCalledWith(
      expect.objectContaining({ replacementVersionId: 101 }),
      expect.any(Object),
    );
  });

  it("keeps a service pending until the final requested member is replaced", async () => {
    const booking = createBooking({ workflowStatus: "FILES_UPLOADED" });
    const replaced = createDeliveryFile({
      id: 10,
      status: DELIVERY_FILE_STATUS.CHANGES_REQUESTED,
    });
    const stillPending = createDeliveryFile({
      id: 11,
      status: DELIVERY_FILE_STATUS.CHANGES_REQUESTED,
      currentVersionId: 101,
    });
    Booking.findByPk.mockResolvedValue(booking);
    BookingDeliveryFile.findOne.mockResolvedValue(replaced);
    BookingDeliveryFileVersion.count.mockResolvedValue(1);
    BookingDeliveryFileVersion.create.mockResolvedValue({
      id: 102,
      url: "https://bucket/new.jpg",
    });
    BookingDeliveryFile.findAll.mockResolvedValue([replaced, stillPending]);
    BookingFileRevision.count.mockResolvedValue(1);

    await addUploadedDeliveryFiles({
      bookingId: 1,
      uploads: [{ url: "https://bucket/new.jpg" }],
      type: "Photography",
      deliveryMode: "download",
      replacementFileId: 10,
    });

    expect(BookingDeliveryFile.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ status: DELIVERY_FILE_STATUS.UNDER_REVIEW }),
      expect.anything(),
    );
    expect(replaced.status).toBe(DELIVERY_FILE_STATUS.CHANGES_REQUESTED);
  });

  it("reopens every member when a later file joins an accepted service", async () => {
    const booking = createBooking({ workflowStatus: "FILES_UPLOADED" });
    const accepted = createDeliveryFile({
      id: 10,
      status: DELIVERY_FILE_STATUS.ACCEPTED,
      acceptedAt: new Date(),
    });
    const added = createDeliveryFile({
      id: 11,
      status: DELIVERY_FILE_STATUS.UNDER_REVIEW,
    });
    Booking.findByPk.mockResolvedValue(booking);
    BookingDeliveryFile.findAll
      .mockResolvedValueOnce([accepted])
      .mockResolvedValue([]);
    BookingDeliveryFile.create.mockResolvedValue(added);
    BookingDeliveryFileVersion.create.mockResolvedValue({
      id: 101,
      url: "https://bucket/new.jpg",
    });

    await addUploadedDeliveryFiles({
      bookingId: 1,
      uploads: [{ url: "https://bucket/new.jpg" }],
      type: "Photography",
      deliveryMode: "download",
    });

    expect(accepted.status).toBe(DELIVERY_FILE_STATUS.UNDER_REVIEW);
    expect(added.status).toBe(DELIVERY_FILE_STATUS.UNDER_REVIEW);
    expect(accepted.reviewDeadlineAt).toEqual(added.reviewDeadlineAt);
  });

  it("rejects a replacement type that differs from the target file", async () => {
    const booking = createBooking({ workflowStatus: "FILES_UPLOADED" });
    const file = createDeliveryFile({
      type: "Videography",
      label: "Videography",
      status: DELIVERY_FILE_STATUS.CHANGES_REQUESTED,
    });
    Booking.findByPk.mockResolvedValue(booking);
    BookingDeliveryFile.findOne.mockResolvedValue(file);

    await expect(
      addUploadedDeliveryFiles({
        bookingId: 1,
        uploads: [{ url: "https://bucket/replacement.mp4" }],
        type: "Long Form Video",
        deliveryMode: "direct_download",
        replacementFileId: file.id,
      }),
    ).rejects.toThrow("deliverableType does not match replacement file");
    expect(BookingDeliveryFileVersion.create).not.toHaveBeenCalled();
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

  it("locks the booking then delivery row and reads all versions separately when deleting", async () => {
    const booking = createBooking({ workflowStatus: "FILES_UPLOADED" });
    const file = createDeliveryFile({
      versions: undefined,
      currentVersion: undefined,
    });
    Booking.findByPk.mockResolvedValue(booking);
    BookingDeliveryFile.findOne.mockResolvedValue(file);
    BookingDeliveryFileVersion.findAll.mockResolvedValue([
      { id: 100, url: "https://bucket/old.jpg" },
      { id: 101, url: "https://bucket/replacement.jpg" },
    ]);
    BookingDeliveryFile.findAll.mockResolvedValue([]);

    const result = await deleteDeliveryFileState(file.id, booking.id);

    expect(result.urls).toEqual([
      "https://bucket/old.jpg",
      "https://bucket/replacement.jpg",
    ]);
    expect(Booking.findByPk).toHaveBeenCalledWith(booking.id, {
      transaction: mockTransaction,
      lock: mockTransaction.LOCK.UPDATE,
    });
    expect(BookingDeliveryFile.findOne).toHaveBeenCalledWith({
      where: { id: file.id, bookingId: booking.id },
      transaction: mockTransaction,
      lock: mockTransaction.LOCK.UPDATE,
    });
    expect(BookingDeliveryFileVersion.findAll).toHaveBeenCalledWith({
      where: { deliveryFileId: file.id },
      transaction: mockTransaction,
    });
    expect(Booking.findByPk.mock.invocationCallOrder[0]).toBeLessThan(
      BookingDeliveryFile.findOne.mock.invocationCallOrder[0],
    );
    expect(
      BookingDeliveryFile.findOne.mock.invocationCallOrder[0],
    ).toBeLessThan(
      BookingDeliveryFileVersion.findAll.mock.invocationCallOrder[0],
    );
    expect(file.destroy).toHaveBeenCalledWith({
      transaction: mockTransaction,
    });
  });

  it("deletes only one locked exact-type category and returns every historical URL", async () => {
    const booking = createBooking({
      workflowStatus: "FILES_UPLOADED",
      deliveryFinishedAt: new Date("2026-07-01T00:00:00.000Z"),
    });
    const firstPhotographyFile = createDeliveryFile({ id: 10 });
    const secondPhotographyFile = createDeliveryFile({ id: 11 });
    const unrelatedVideoFile = createDeliveryFile({
      id: 12,
      type: "Videography",
    });
    Booking.findByPk.mockResolvedValue(booking);
    BookingDeliveryFile.findAll
      .mockResolvedValueOnce([firstPhotographyFile, secondPhotographyFile])
      .mockResolvedValueOnce([unrelatedVideoFile]);
    BookingDeliveryFileVersion.findAll.mockResolvedValue([
      { id: 100, deliveryFileId: 10, url: "https://bucket/old.jpg" },
      { id: 101, deliveryFileId: 10, url: "https://bucket/current.jpg" },
      { id: 102, deliveryFileId: 11, url: "https://bucket/second.jpg" },
    ]);

    const result = await deleteDeliveryCategoryState(booking.id, "Photography");

    expect(result).toEqual(
      expect.objectContaining({
        deletedFileIds: [10, 11],
        urls: [
          "https://bucket/old.jpg",
          "https://bucket/current.jpg",
          "https://bucket/second.jpg",
        ],
      }),
    );
    expect(BookingDeliveryFile.findAll).toHaveBeenNthCalledWith(1, {
      where: { bookingId: booking.id, type: "Photography", deletedAt: null },
      transaction: mockTransaction,
      lock: mockTransaction.LOCK.UPDATE,
      order: [["id", "ASC"]],
    });
    expect(BookingDeliveryFileVersion.findAll).toHaveBeenCalledWith({
      where: { deliveryFileId: { [Op.in]: [10, 11] } },
      transaction: mockTransaction,
      order: [
        ["deliveryFileId", "ASC"],
        ["versionNumber", "ASC"],
      ],
    });
    expect(Booking.findByPk.mock.invocationCallOrder[0]).toBeLessThan(
      BookingDeliveryFile.findAll.mock.invocationCallOrder[0],
    );
    expect(firstPhotographyFile.destroy).toHaveBeenCalledWith({
      transaction: mockTransaction,
    });
    expect(secondPhotographyFile.destroy).toHaveBeenCalledWith({
      transaction: mockTransaction,
    });
    expect(unrelatedVideoFile.destroy).not.toHaveBeenCalled();
    expect(booking.deliveryFinishedAt).toBeNull();
  });

  it("rejects category deletion for a completed booking before finding members", async () => {
    const booking = createBooking({
      workflowStatus: "FILES_UPLOADED",
      completedAt: new Date("2026-07-02T00:00:00.000Z"),
    });
    Booking.findByPk.mockResolvedValue(booking);

    await expect(
      deleteDeliveryCategoryState(booking.id, "Photography"),
    ).rejects.toThrow("Completed bookings cannot delete delivery categories");
    expect(BookingDeliveryFile.findAll).not.toHaveBeenCalled();
  });
});
