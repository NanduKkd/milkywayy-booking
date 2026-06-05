import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import Booking from "@/lib/db/models/booking";
import { auth } from "@/lib/helpers/auth";
import { DELETE, POST } from "../route";

jest.mock("@aws-sdk/client-s3", () => ({
  DeleteObjectCommand: jest.fn(),
  S3Client: jest.fn(() => ({
    send: jest.fn().mockResolvedValue({}),
  })),
}));

jest.mock("@/lib/db/models/booking", () => ({
  findByPk: jest.fn(),
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
  },
}));

const createRequest = (body) => ({
  json: async () => body,
});

describe("Admin booking deliverables API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auth.mockResolvedValue({ id: 1, role: "SUPERADMIN" });
  });

  it("restores archived deliverables as the current files", async () => {
    const update = jest.fn().mockResolvedValue({});
    Booking.findByPk.mockResolvedValue({
      workflowStatus: "EDITING",
      filesUrl: JSON.stringify({
        version: 2,
        deliverables: [],
        archivedDeliverables: [
          {
            id: "photography",
            type: "Photography",
            url: "https://example.com/old.jpg",
            urls: ["https://example.com/old.jpg"],
          },
        ],
      }),
      update,
    });

    const response = await POST(createRequest({ action: "restore_archived" }), {
      params: Promise.resolve({ id: "42" }),
    });
    const data = await response.json();
    const payload = JSON.parse(data.filesUrl);

    expect(response.status).toBe(200);
    expect(payload.deliverables).toHaveLength(1);
    expect(payload.archivedDeliverables).toEqual([]);
    expect(update).toHaveBeenCalledWith({ filesUrl: data.filesUrl });
  });

  it("deletes one file without removing the rest of its deliverable", async () => {
    const update = jest.fn().mockResolvedValue({});
    Booking.findByPk.mockResolvedValue({
      workflowStatus: "EDITING",
      filesUrl: JSON.stringify({
        version: 2,
        deliverables: [
          {
            id: "photography",
            type: "Photography",
            url: "https://milkywayy.s3.amazonaws.com/one.jpg",
            urls: [
              "https://milkywayy.s3.amazonaws.com/one.jpg",
              "https://milkywayy.s3.amazonaws.com/two.jpg",
            ],
            count: 2,
          },
        ],
      }),
      update,
    });

    const response = await DELETE(
      createRequest({
        source: "current",
        deliverableId: "photography",
        url: "https://milkywayy.s3.amazonaws.com/one.jpg",
      }),
      { params: Promise.resolve({ id: "42" }) },
    );
    const data = await response.json();
    const payload = JSON.parse(data.filesUrl);

    expect(payload.deliverables[0]).toEqual(
      expect.objectContaining({
        url: "https://milkywayy.s3.amazonaws.com/two.jpg",
        urls: ["https://milkywayy.s3.amazonaws.com/two.jpg"],
        count: 1,
      }),
    );
    expect(DeleteObjectCommand).toHaveBeenCalledWith({
      Bucket: "milkywayy",
      Key: "one.jpg",
    });
  });

  it("rejects non-admin users", async () => {
    auth.mockResolvedValue({ id: 2, role: "CUSTOMER" });

    const response = await POST(createRequest({ action: "restore_archived" }), {
      params: Promise.resolve({ id: "42" }),
    });

    expect(response.status).toBe(403);
    expect(Booking.findByPk).not.toHaveBeenCalled();
  });
});
