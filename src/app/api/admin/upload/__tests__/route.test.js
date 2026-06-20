import { PutObjectCommand } from "@aws-sdk/client-s3";
import Booking from "@/lib/db/models/booking";
import { auth } from "@/lib/helpers/auth";
import { addUploadedDeliveryFiles } from "@/lib/services/fileDelivery";
import {
  headBookingObject,
  parseOwnedBookingObjectUrl,
} from "@/lib/storage/s3";
import { POST } from "../route";

jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn(() => ({ send: jest.fn().mockResolvedValue({}) })),
  PutObjectCommand: jest.fn(),
}));
jest.mock("sharp", () => {
  const toBuffer = jest.fn().mockResolvedValue(Buffer.from("optimized-image"));
  const webp = jest.fn(() => ({ toBuffer }));
  const resize = jest.fn(() => ({ webp }));
  const rotate = jest.fn(() => ({ resize }));
  return jest.fn(() => ({ rotate }));
});
jest.mock("@/lib/db/models/booking", () => ({
  findByPk: jest.fn(),
}));
jest.mock("@/lib/helpers/auth", () => ({
  auth: jest.fn(),
}));
jest.mock("@/lib/services/fileDelivery", () => ({
  addUploadedDeliveryFiles: jest.fn(),
}));
jest.mock("@/lib/storage/s3", () => ({
  buildCanonicalObjectUrl: jest.fn(
    (key) => `https://milkywayy.s3.ap-south-1.amazonaws.com/${key}`,
  ),
  getBookingUploadConfig: jest.fn(() => ({ maxBytes: 2_147_483_648 })),
  headBookingObject: jest.fn(),
  parseOwnedBookingObjectUrl: jest.fn(),
}));
jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200,
      ok: (init?.status || 200) < 400,
    })),
  },
}));

const createImage = (name) => {
  const file = new Blob(["image"], { type: "image/jpeg" });
  file.name = name;
  file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(8));
  return file;
};

const createRequest = (values) => ({
  formData: async () => ({
    getAll: (key) => (key === "file" ? values.files || [] : []),
    get: (key) => values[key] ?? null,
  }),
});

describe("Admin Upload API Route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auth.mockResolvedValue({ id: 1, role: "SUPERADMIN" });
    parseOwnedBookingObjectUrl.mockReturnValue({
      bucket: "milkywayy",
      key: "bookings/42/final-video.mp4",
    });
    headBookingObject.mockResolvedValue({
      ContentLength: 1024,
      ContentType: "video/mp4",
    });
  });

  it("uploads a portfolio image for an admin", async () => {
    const response = await POST(
      createRequest({
        files: [createImage("Test Image.jpg")],
        folder: "portfolio",
        deliverableType: "Photography",
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.url).toContain("/photography/portfolio/");
    expect(PutObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Key: expect.stringMatching(
          /^photography\/portfolio\/\d+_[0-9a-f-]+_test-image\.webp$/,
        ),
      }),
    );
  });

  it("rejects booking file bodies in favor of multipart upload", async () => {
    Booking.findByPk.mockResolvedValue({
      status: "CONFIRMED",
      workflowStatus: "EDITING",
    });
    addUploadedDeliveryFiles.mockResolvedValue({
      booking: { id: 42, workflowStatus: "FILES_UPLOADED", filesUrl: "{}" },
      deliveryFiles: [{ id: 10 }, { id: 11 }],
    });

    const response = await POST(
      createRequest({
        files: [createImage("one.jpg"), createImage("two.jpg")],
        bookingId: "42",
        deliverableType: "Photography",
      }),
    );
    expect(response.status).toBe(400);
    expect(addUploadedDeliveryFiles).not.toHaveBeenCalled();
    expect(PutObjectCommand).not.toHaveBeenCalled();
  });

  it("rejects mixed booking file bodies and external links", async () => {
    Booking.findByPk.mockResolvedValue({
      status: "CONFIRMED",
      workflowStatus: "EDITING",
    });
    addUploadedDeliveryFiles.mockResolvedValue({
      booking: { id: 42, workflowStatus: "FILES_UPLOADED", filesUrl: "{}" },
      deliveryFiles: [{ id: 10 }, { id: 11 }],
    });

    await POST(
      createRequest({
        files: [createImage("one.jpg")],
        bookingId: "42",
        deliverableType: "Photography",
        externalUrl: "https://example.com/gallery",
      }),
    );

    expect(addUploadedDeliveryFiles).not.toHaveBeenCalled();
  });

  it("registers an external videography file as a normal download", async () => {
    Booking.findByPk.mockResolvedValue({
      status: "CONFIRMED",
      workflowStatus: "EDITING",
    });
    addUploadedDeliveryFiles.mockResolvedValue({
      booking: { id: 42, workflowStatus: "FILES_UPLOADED", filesUrl: "{}" },
      deliveryFiles: [{ id: 10 }],
    });

    await POST(
      createRequest({
        bookingId: "42",
        deliverableType: "Videography",
        externalUrl:
          "https://milkywayy.s3.ap-south-1.amazonaws.com/bookings/42/final-video.mp4",
      }),
    );

    expect(addUploadedDeliveryFiles).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingId: "42",
        type: "Videography",
        label: "Videography",
        deliveryMode: "direct_download",
        uploads: [
          expect.objectContaining({
            originalFilename: "final-video.mp4",
            mimeType: "video/mp4",
          }),
        ],
      }),
    );
    expect(PutObjectCommand).not.toHaveBeenCalled();
  });

  it("rejects unknown booking deliverable types", async () => {
    const response = await POST(
      createRequest({
        bookingId: "42",
        deliverableType: "Videography Virtual Link",
        externalUrl:
          "https://milkywayy.s3.ap-south-1.amazonaws.com/bookings/42/final-video.mp4",
      }),
    );

    expect(response.status).toBe(400);
    expect(Booking.findByPk).not.toHaveBeenCalled();
    expect(addUploadedDeliveryFiles).not.toHaveBeenCalled();
  });

  it("keeps the fixed 360 deliverable type as a copy link", async () => {
    Booking.findByPk.mockResolvedValue({
      status: "CONFIRMED",
      workflowStatus: "EDITING",
    });
    addUploadedDeliveryFiles.mockResolvedValue({
      booking: { id: 42, workflowStatus: "FILES_UPLOADED", filesUrl: "{}" },
      deliveryFiles: [{ id: 10 }],
    });

    await POST(
      createRequest({
        bookingId: "42",
        deliverableType: "360 Virtual Tour",
        externalUrl: "https://example.com/tour",
      }),
    );

    expect(addUploadedDeliveryFiles).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "360 Virtual Tour",
        deliveryMode: "copy_link",
      }),
    );
  });

  it("targets a single logical file for replacement", async () => {
    Booking.findByPk.mockResolvedValue({
      status: "CONFIRMED",
      workflowStatus: "FILES_UPLOADED",
    });
    addUploadedDeliveryFiles.mockResolvedValue({
      booking: { id: 42, filesUrl: "{}" },
      deliveryFiles: [{ id: 10, revisionCount: 1 }],
    });

    await POST(
      createRequest({
        bookingId: "42",
        deliverableType: "Photography",
        replacementFileId: "10",
        externalUrl:
          "https://milkywayy.s3.ap-south-1.amazonaws.com/bookings/42/replacement.jpg",
      }),
    );

    expect(addUploadedDeliveryFiles).toHaveBeenCalledWith(
      expect.objectContaining({ replacementFileId: 10 }),
    );
  });

  it("rejects an invalid replacement file id before uploading", async () => {
    const response = await POST(
      createRequest({
        files: [createImage("replacement.jpg")],
        bookingId: "42",
        replacementFileId: "not-a-number",
      }),
    );

    expect(response.status).toBe(400);
    expect(PutObjectCommand).not.toHaveBeenCalled();
  });

  it("does not register URLs for cancelled bookings", async () => {
    Booking.findByPk.mockResolvedValue({
      status: "CANCELLED",
      cancelledAt: new Date(),
      workflowStatus: "EDITING",
    });

    const response = await POST(
      createRequest({
        bookingId: "42",
        externalUrl:
          "https://milkywayy.s3.ap-south-1.amazonaws.com/bookings/42/one.jpg",
      }),
    );

    expect(response.status).toBe(409);
    expect(PutObjectCommand).not.toHaveBeenCalled();
  });

  it("rejects non-admin users before uploading", async () => {
    auth.mockResolvedValue({ id: 2, role: "CUSTOMER" });

    const response = await POST(
      createRequest({
        files: [createImage("one.jpg")],
        folder: "portfolio",
      }),
    );

    expect(response.status).toBe(403);
    expect(PutObjectCommand).not.toHaveBeenCalled();
  });
});
