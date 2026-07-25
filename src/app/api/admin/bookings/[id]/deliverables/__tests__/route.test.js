import { auth } from "@/lib/helpers/auth";
import {
  deleteDeliveryFileState,
  finishBookingDeliveryState,
  publishPrivateDeliveryFilesState,
} from "@/lib/services/fileDelivery";
import {
  deleteBookingObject,
  parseOwnedBookingObjectUrl,
} from "@/lib/storage/s3";
import { DELETE, POST } from "../route";

jest.mock("@/lib/storage/s3", () => ({
  deleteBookingObject: jest.fn(),
  parseOwnedBookingObjectUrl: jest.fn(),
}));
jest.mock("@/lib/helpers/auth", () => ({
  auth: jest.fn(),
}));
jest.mock("@/lib/services/fileDelivery", () => ({
  deleteDeliveryFileState: jest.fn(),
  finishBookingDeliveryState: jest.fn(),
  publishPrivateDeliveryFilesState: jest.fn(),
}));
jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200,
    })),
  },
}));

const createRequest = (body) => ({ json: async () => body });
const context = { params: Promise.resolve({ id: "42" }) };
const originalBucketName = process.env.AWS_BUCKET_NAME;

describe("Admin booking deliverables API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AWS_BUCKET_NAME = "milkywayy-bookings";
    auth.mockResolvedValue({ id: 1, role: "SUPERADMIN" });
    parseOwnedBookingObjectUrl.mockImplementation((url) => ({
      key: new URL(url).pathname.replace(/^\//, ""),
    }));
    deleteBookingObject.mockResolvedValue(true);
  });

  afterAll(() => {
    if (originalBucketName === undefined) {
      delete process.env.AWS_BUCKET_NAME;
    } else {
      process.env.AWS_BUCKET_NAME = originalBucketName;
    }
  });

  it("marks the booking delivery as finished", async () => {
    finishBookingDeliveryState.mockResolvedValue({
      id: 42,
      deliveryFinishedAt: "2026-06-08T00:00:00.000Z",
    });

    const response = await POST(
      createRequest({ action: "finish_delivery" }),
      context,
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(finishBookingDeliveryState).toHaveBeenCalledWith("42");
    expect(data.booking.deliveryFinishedAt).toBeTruthy();
  });

  it("deletes one normalized delivery file", async () => {
    deleteDeliveryFileState.mockResolvedValue({
      urls: [
        "https://milkywayy-bookings.s3.amazonaws.com/bookings/42/old.jpg",
        "https://milkywayy-bookings.s3.amazonaws.com/bookings/42/replacement.jpg",
      ],
      filesUrl: "{}",
    });

    const response = await DELETE(createRequest({ fileId: 10 }), context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(deleteDeliveryFileState).toHaveBeenCalledWith(10, "42");
    expect(deleteBookingObject).toHaveBeenCalledTimes(2);
    expect(data.fileId).toBe(10);
  });

  it("returns a safe deletion error instead of a database error", async () => {
    deleteDeliveryFileState.mockRejectedValue(
      new Error(
        "FOR UPDATE cannot be applied to the nullable side of an outer join",
      ),
    );

    const response = await DELETE(createRequest({ fileId: 10 }), context);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe("Unable to delete file");
  });

  it("publishes staged legacy files", async () => {
    publishPrivateDeliveryFilesState.mockResolvedValue({
      id: 42,
      publishedFileIds: [10],
    });

    const response = await POST(
      createRequest({ action: "publish_private" }),
      context,
    );

    expect(response.status).toBe(200);
    expect(publishPrivateDeliveryFilesState).toHaveBeenCalledWith("42");
  });

  it("rejects non-admin users", async () => {
    auth.mockResolvedValue({ id: 2, role: "CUSTOMER" });

    const response = await POST(
      createRequest({ action: "finish_delivery" }),
      context,
    );

    expect(response.status).toBe(403);
    expect(finishBookingDeliveryState).not.toHaveBeenCalled();
  });
});
