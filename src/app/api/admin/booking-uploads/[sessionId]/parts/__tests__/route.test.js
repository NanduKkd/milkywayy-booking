import { auth } from "@/lib/helpers/auth";
import { findOwnedUploadSession } from "@/lib/services/bookingUpload";
import { createUploadPartUrl } from "@/lib/storage/s3";
import { POST } from "../route";

jest.mock("@/lib/helpers/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/services/bookingUpload", () => ({
  findOwnedUploadSession: jest.fn(),
}));
jest.mock("@/lib/storage/s3", () => ({
  createUploadPartUrl: jest.fn(),
  getBookingUploadConfig: jest.fn(() => ({ partBytes: 64 })),
}));
jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      status: init?.status || 200,
      json: async () => data,
    })),
  },
}));

describe("sign booking upload parts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auth.mockResolvedValue({ id: 1, role: "SUPERADMIN" });
    findOwnedUploadSession.mockResolvedValue({
      status: "INITIATED",
      sizeBytes: 128,
      objectKey: "deliverables/bookings/42/file.mp4",
      s3UploadId: "s3-upload",
    });
    createUploadPartUrl.mockImplementation(
      ({ partNumber }) => `https://s3.example/part-${partNumber}`,
    );
  });

  it("rejects part numbers outside the expected range", async () => {
    const response = await POST(
      { json: async () => ({ partNumbers: [3] }) },
      { params: Promise.resolve({ sessionId: "session-1" }) },
    );

    expect(response.status).toBe(400);
    expect(createUploadPartUrl).not.toHaveBeenCalled();
  });

  it("signs only the requested valid parts", async () => {
    const response = await POST(
      { json: async () => ({ partNumbers: [1, 2] }) },
      { params: Promise.resolve({ sessionId: "session-1" }) },
    );

    expect(response.status).toBe(200);
    expect((await response.json()).parts).toHaveLength(2);
    expect(createUploadPartUrl).toHaveBeenCalledTimes(2);
  });
});
