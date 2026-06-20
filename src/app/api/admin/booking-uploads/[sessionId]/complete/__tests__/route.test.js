import { sequelize } from "@/lib/db/db";
import { auth } from "@/lib/helpers/auth";
import {
  assertUploadTarget,
  findOwnedUploadSession,
} from "@/lib/services/bookingUpload";
import { addUploadedDeliveryFiles } from "@/lib/services/fileDelivery";
import { getS3Client, headBookingObject } from "@/lib/storage/s3";
import { POST } from "../route";

jest.mock("@/lib/db/db", () => ({
  sequelize: { transaction: jest.fn() },
}));
jest.mock("@/lib/helpers/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/services/bookingUpload", () => ({
  assertUploadTarget: jest.fn(),
  findOwnedUploadSession: jest.fn(),
  uploadErrorStatus: jest.fn(() => 500),
}));
jest.mock("@/lib/services/fileDelivery", () => ({
  addUploadedDeliveryFiles: jest.fn(),
}));
jest.mock("@/lib/storage/s3", () => ({
  buildCanonicalObjectUrl: jest.fn(
    () =>
      "https://bucket.s3.ap-south-1.amazonaws.com/deliverables/bookings/42/file.mp4",
  ),
  deleteBookingObject: jest.fn(),
  getBookingUploadConfig: jest.fn(() => ({ partBytes: 10 })),
  getS3Client: jest.fn(),
  getS3Config: jest.fn(() => ({ bucket: "bucket" })),
  headBookingObject: jest.fn(),
}));
jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      status: init?.status || 200,
      json: async () => data,
    })),
  },
}));

const request = {
  json: async () => ({
    parts: [
      { partNumber: 1, etag: '"one"' },
      { partNumber: 2, etag: '"two"' },
    ],
  }),
};

describe("complete booking upload", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auth.mockResolvedValue({ id: 1, role: "SUPERADMIN" });
    assertUploadTarget.mockResolvedValue({ id: 42 });
    getS3Client.mockReturnValue({ send: jest.fn().mockResolvedValue({}) });
    headBookingObject.mockResolvedValue({ ContentLength: 20 });
  });

  it("registers the object and session result in one DB transaction", async () => {
    const upload = {
      id: "session-1",
      bookingId: 42,
      replacementFileId: null,
      objectKey: "deliverables/bookings/42/file.mp4",
      s3UploadId: "s3-upload",
      originalFilename: "file.mp4",
      mimeType: "video/mp4",
      sizeBytes: 20,
      deliverableType: "Videography",
      status: "INITIATED",
      update: jest.fn(),
    };
    findOwnedUploadSession.mockResolvedValue(upload);
    const transaction = { LOCK: { UPDATE: "UPDATE" } };
    sequelize.transaction.mockImplementation((callback) =>
      callback(transaction),
    );
    addUploadedDeliveryFiles.mockResolvedValue({
      booking: { id: 42, filesUrl: "{}" },
      deliveryFiles: [{ id: 9 }],
    });

    const response = await POST(request, {
      params: Promise.resolve({ sessionId: "session-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.deliveryFiles).toEqual([{ id: 9 }]);
    expect(addUploadedDeliveryFiles).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingId: 42,
        deliveryMode: "direct_download",
        transaction,
      }),
    );
    expect(upload.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "COMPLETED" }),
      { transaction },
    );
  });

  it("returns a completed session result without touching S3", async () => {
    findOwnedUploadSession.mockResolvedValue({
      status: "COMPLETED",
      resultJson: { deliveryFiles: [{ id: 9 }] },
    });

    const response = await POST(request, {
      params: Promise.resolve({ sessionId: "session-1" }),
    });

    expect((await response.json()).deliveryFiles).toEqual([{ id: 9 }]);
    expect(getS3Client).not.toHaveBeenCalled();
    expect(addUploadedDeliveryFiles).not.toHaveBeenCalled();
  });
});
