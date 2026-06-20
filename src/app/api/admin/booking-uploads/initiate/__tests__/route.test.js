import BookingDeliveryUpload from "@/lib/db/models/bookingdeliveryupload";
import { auth } from "@/lib/helpers/auth";
import { assertUploadTarget } from "@/lib/services/bookingUpload";
import { getS3Client } from "@/lib/storage/s3";
import { POST } from "../route";

jest.mock("@aws-sdk/client-s3", () => ({
  AbortMultipartUploadCommand: jest.fn((input) => input),
  CreateMultipartUploadCommand: jest.fn((input) => input),
}));
jest.mock("@/lib/db/models/bookingdeliveryupload", () => ({
  create: jest.fn(),
}));
jest.mock("@/lib/helpers/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/services/bookingUpload", () => {
  const actual = jest.requireActual("@/lib/services/bookingUpload");
  return {
    ...actual,
    assertUploadTarget: jest.fn(),
  };
});
jest.mock("@/lib/storage/s3", () => ({
  createBookingObjectKey: jest.fn(
    () => "deliverables/bookings/42/uuid/final.mp4",
  ),
  getBookingUploadConfig: jest.fn(() => ({
    maxBytes: 2_147_483_648,
    partBytes: 64,
  })),
  getS3Client: jest.fn(),
  getS3Config: jest.fn(() => ({ bucket: "bucket" })),
  sanitizeFilename: jest.fn((value) => value),
}));
jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      status: init?.status || 200,
      json: async () => data,
    })),
  },
}));

const request = (body) => ({ json: async () => body });
const validBody = {
  bookingId: 42,
  deliverableType: "Videography",
  fileName: "final.mp4",
  mimeType: "video/mp4",
  sizeBytes: 128,
};

describe("initiate booking upload", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auth.mockResolvedValue({ id: 1, role: "SUPERADMIN" });
    assertUploadTarget.mockResolvedValue({ id: 42 });
    getS3Client.mockReturnValue({
      send: jest.fn().mockResolvedValue({ UploadId: "s3-upload" }),
    });
    BookingDeliveryUpload.create.mockResolvedValue({ id: "session-1" });
  });

  it("creates a multipart session without receiving file bytes", async () => {
    const response = await POST(request(validBody));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      sessionId: "session-1",
      partSize: 64,
      partCount: 2,
    });
    expect(BookingDeliveryUpload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingId: 42,
        sizeBytes: 128,
        s3UploadId: "s3-upload",
      }),
    );
  });

  it("rejects non-admin users before creating an S3 upload", async () => {
    auth.mockResolvedValue({ id: 2, role: "CUSTOMER" });

    const response = await POST(request(validBody));

    expect(response.status).toBe(403);
    expect(getS3Client).not.toHaveBeenCalled();
  });
});
