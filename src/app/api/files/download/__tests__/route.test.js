import BookingDeliveryFile from "@/lib/db/models/bookingdeliveryfile";
import { auth } from "@/lib/helpers/auth";
import {
  createDownloadUrl,
  parseOwnedBookingObjectUrl,
} from "@/lib/storage/s3";
import { GET } from "../route";

jest.mock("@/lib/db/relations", () => ({}));
jest.mock("@/lib/db/models/booking", () => ({}));
jest.mock("@/lib/db/models/bookingdeliveryfileversion", () => ({}));
jest.mock("@/lib/db/models/bookingdeliveryfile", () => ({
  findOne: jest.fn(),
}));
jest.mock("@/lib/helpers/auth", () => ({
  auth: jest.fn(),
}));
jest.mock("@/lib/storage/s3", () => ({
  createDownloadUrl: jest.fn(),
  parseOwnedBookingObjectUrl: jest.fn(),
}));
jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200,
    })),
    redirect: jest.fn((url, init) => ({
      status: init?.status || 307,
      headers: {
        get: (name) =>
          name.toLowerCase() === "location" ? url.toString() : null,
      },
    })),
  },
}));

describe("delivery file download route", () => {
  const originalBucketName = process.env.AWS_BUCKET_NAME;
  const originalRegion = process.env.AWS_REGION;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AWS_BUCKET_NAME = "milkywayy";
    process.env.AWS_REGION = "ap-south-1";
    parseOwnedBookingObjectUrl.mockReturnValue({
      bucket: "milkywayy",
      key: "bookings/42/final-video.mp4",
    });
    createDownloadUrl.mockResolvedValue(
      "https://milkywayy.s3.ap-south-1.amazonaws.com/bookings/42/final-video.mp4?signed=1",
    );
  });

  afterAll(() => {
    if (originalBucketName === undefined) {
      delete process.env.AWS_BUCKET_NAME;
    } else {
      process.env.AWS_BUCKET_NAME = originalBucketName;
    }
    if (originalRegion === undefined) {
      delete process.env.AWS_REGION;
    } else {
      process.env.AWS_REGION = originalRegion;
    }
  });

  it("requires authentication", async () => {
    auth.mockResolvedValue(null);

    const response = await GET({
      url: "http://localhost/api/files/download?fileId=10",
    });

    expect(response.status).toBe(401);
    expect(BookingDeliveryFile.findOne).not.toHaveBeenCalled();
  });

  it("does not expose a file outside the current customer's bookings", async () => {
    auth.mockResolvedValue({ id: 7 });
    BookingDeliveryFile.findOne.mockResolvedValue(null);

    const response = await GET({
      url: "http://localhost/api/files/download?fileId=10",
    });

    expect(response.status).toBe(404);
    expect(BookingDeliveryFile.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.arrayContaining([
          expect.objectContaining({
            as: "booking",
            where: { userId: 7 },
          }),
        ]),
      }),
    );
  });

  it("redirects an authorized delivery file to a signed S3 URL", async () => {
    auth.mockResolvedValue({ id: 7 });
    BookingDeliveryFile.findOne.mockResolvedValue({
      deliveryMode: "direct_download",
      status: "UNDER_REVIEW",
      currentVersion: {
        url: "https://milkywayy.s3.ap-south-1.amazonaws.com/bookings/42/final-video.mp4",
        originalFilename: "final-video.mp4",
      },
    });
    global.fetch = jest.fn();

    const response = await GET({
      url: "http://localhost/api/files/download?fileId=10",
    });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://milkywayy.s3.ap-south-1.amazonaws.com/bookings/42/final-video.mp4?signed=1",
    );
    expect(createDownloadUrl).toHaveBeenCalledWith({
      key: "bookings/42/final-video.mp4",
      fileName: "final-video.mp4",
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("normalizes form-encoded spaces in legacy S3 filenames", async () => {
    auth.mockResolvedValue({ id: 7 });
    BookingDeliveryFile.findOne.mockResolvedValue({
      deliveryMode: "direct_download",
      status: "ACCEPTED",
      currentVersion: {
        url: "https://milkywayy.s3.ap-south-1.amazonaws.com/photography/bookings/881/M10%2C+Address.zip",
        originalFilename: "M10,+Address.zip",
      },
    });
    parseOwnedBookingObjectUrl.mockReturnValue({
      bucket: "milkywayy",
      key: "photography/bookings/881/M10, Address.zip",
    });

    await GET({ url: "http://localhost/api/files/download?fileId=10" });

    expect(createDownloadUrl).toHaveBeenCalledWith({
      key: "photography/bookings/881/M10, Address.zip",
      fileName: "M10, Address.zip",
    });
  });

  it("rejects raw url downloads without a file id", async () => {
    auth.mockResolvedValue({ id: 7 });

    const response = await GET({
      url: "http://localhost/api/files/download?url=https://example.com/file.mp4",
    });

    expect(response.status).toBe(400);
    expect(BookingDeliveryFile.findOne).not.toHaveBeenCalled();
  });
});
