import BookingDeliveryFile from "@/lib/db/models/bookingdeliveryfile";
import { auth } from "@/lib/helpers/auth";
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

  it("redirects an authorized delivery file directly to regional S3", async () => {
    auth.mockResolvedValue({ id: 7 });
    BookingDeliveryFile.findOne.mockResolvedValue({
      deliveryMode: "direct_download",
      status: "UNDER_REVIEW",
      currentVersion: {
        url: "https://milkywayy.s3.ap-south-1.amazonaws.com/bookings/42/final-video.mp4",
      },
    });
    global.fetch = jest.fn();

    const response = await GET({
      url: "http://localhost/api/files/download?fileId=10",
    });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://milkywayy.s3.ap-south-1.amazonaws.com/bookings/42/final-video.mp4",
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
