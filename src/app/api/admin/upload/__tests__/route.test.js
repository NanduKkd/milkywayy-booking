import { PutObjectCommand } from "@aws-sdk/client-s3";
import { POST } from "../route";
import Booking from "@/lib/db/models/booking";

jest.mock("@aws-sdk/client-s3", () => {
  return {
    S3Client: jest.fn(() => ({
      send: jest.fn().mockResolvedValue({}),
    })),
    PutObjectCommand: jest.fn(),
  };
});

jest.mock("sharp", () => {
  const toBuffer = jest.fn().mockResolvedValue(Buffer.from("optimized-image"));
  const webp = jest.fn(() => ({ toBuffer }));
  const resize = jest.fn(() => ({ webp }));
  const rotate = jest.fn(() => ({ resize }));

  return jest.fn(() => ({
    rotate,
  }));
});

jest.mock("@/lib/db/models/booking", () => ({
  findByPk: jest.fn(),
}));

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200,
    })),
  },
}));

describe("Admin Upload API Route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("uploads portfolio images into the photography folder and returns the optimized url", async () => {
    const mockFile = new Blob(["test content"], { type: "image/jpeg" });
    mockFile.name = "Test Image.jpg";
    mockFile.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(8));

    const formData = {
      getAll: jest.fn((key) => {
        if (key === "file") return [mockFile];
        return [];
      }),
      get: jest.fn((key) => {
        if (key === "folder") return "portfolio";
        if (key === "deliverableType") return "Photography";
        return null;
      }),
    };

    const request = {
      formData: async () => formData,
    };

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.url).toContain("/photography/portfolio/");
    expect(data.url).toContain(".webp");
    expect(data.urls).toHaveLength(1);
    expect(data.optimized).toBe(true);
    expect(PutObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Key: expect.stringMatching(
          /^photography\/portfolio\/\d+_test-image\.webp$/,
        ),
        ContentType: "image/webp",
      }),
    );
    expect(Booking.findByPk).not.toHaveBeenCalled();
  });

  it("updates booking deliverables and stores multiple files under one deliverable", async () => {
    const mockFileOne = new Blob(["image one"], { type: "image/jpeg" });
    mockFileOne.name = "Living Room.jpg";
    mockFileOne.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(8));

    const mockFileTwo = new Blob(["image two"], { type: "image/png" });
    mockFileTwo.name = "Kitchen.png";
    mockFileTwo.arrayBuffer = jest
      .fn()
      .mockResolvedValue(Uint8Array.from([1, 2, 3, 4]).buffer);

    const update = jest.fn().mockResolvedValue({});
    Booking.findByPk.mockResolvedValue({
      filesUrl: null,
      update,
    });

    const formData = {
      getAll: jest.fn((key) => {
        if (key === "file") return [mockFileOne, mockFileTwo];
        return [];
      }),
      get: jest.fn((key) => {
        if (key === "bookingId") return "booking-123";
        if (key === "deliverableType") return "Photography";
        return null;
      }),
    };

    const request = {
      formData: async () => formData,
    };

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.url).toContain("/photography/bookings/booking-123/");
    expect(data.urls).toHaveLength(2);
    expect(data.optimized).toBe(true);
    expect(PutObjectCommand).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        Key: expect.stringMatching(
          /^photography\/bookings\/booking-123\/\d+_living-room\.webp$/,
        ),
        ContentType: "image/webp",
      }),
    );
    expect(PutObjectCommand).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        Key: expect.stringMatching(
          /^photography\/bookings\/booking-123\/\d+_kitchen\.webp$/,
        ),
        ContentType: "image/webp",
      }),
    );
    expect(update).toHaveBeenCalledWith({
      filesUrl: expect.stringContaining('"type":"Photography"'),
    });
    expect(update).toHaveBeenCalledWith({
      filesUrl: expect.stringContaining('"urls":["https://milkywayy.s3.amazonaws.com/photography/bookings/booking-123/'),
    });
    expect(update).toHaveBeenCalledWith({
      filesUrl: expect.stringContaining('"count":2'),
    });
  });

  it("returns 400 if neither file nor external url is provided", async () => {
    const formData = {
      getAll: jest.fn(() => []),
      get: jest.fn((key) => {
        if (key === "bookingId") return "booking-123";
        return null;
      }),
    };

    const request = {
      formData: async () => formData,
    };

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
