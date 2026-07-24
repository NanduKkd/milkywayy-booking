import { Readable } from "node:stream";
import BookingDeliveryFile from "@/lib/db/models/bookingdeliveryfile";
import { auth } from "@/lib/helpers/auth";
import {
  createDeliveryZipStream,
  prepareDeliveryZipMembers,
  tryAcquireDeliveryZipPipeline,
  verifyDeliveryZipObjects,
} from "@/lib/services/deliveryZip";
import {
  getBookingObject,
  headBookingObject,
  isBookingDeliverableKeyForBooking,
  parseOwnedBookingObjectUrl,
} from "@/lib/storage/s3";
import { GET } from "../route";

class TestResponse {
  constructor(body, init = {}) {
    this.body = body;
    this.status = init.status || 200;
    const values = new Map(
      Object.entries(init.headers || {}).map(([key, value]) => [
        key.toLowerCase(),
        value,
      ]),
    );
    this.headers = { get: (key) => values.get(key.toLowerCase()) || null };
  }

  static json(body, init) {
    const response = new TestResponse(null, init);
    response.json = async () => body;
    return response;
  }
}

global.Response = TestResponse;
const request = (url, signal = new AbortController().signal) => ({
  url,
  signal,
});

jest.mock("@/lib/db/relations", () => ({}));
jest.mock("@/lib/db/models/booking", () => ({}));
jest.mock("@/lib/db/models/bookingdeliveryfileversion", () => ({}));
jest.mock("@/lib/db/models/bookingdeliveryfile", () => ({
  findAll: jest.fn(),
}));
jest.mock("@/lib/helpers/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/services/deliveryZip", () => ({
  createDeliveryZipStream: jest.fn(),
  prepareDeliveryZipMembers: jest.fn(),
  safeDeliveryZipName: jest.fn(() => "Photography-deliverables.zip"),
  tryAcquireDeliveryZipPipeline: jest.fn(),
  verifyDeliveryZipObjects: jest.fn(),
}));
jest.mock("@/lib/storage/s3", () => ({
  getBookingObject: jest.fn(),
  headBookingObject: jest.fn(),
  isBookingDeliverableKeyForBooking: jest.fn(),
  parseOwnedBookingObjectUrl: jest.fn(),
  sanitizeFilename: jest.fn((value) => value),
}));

const file = (id, overrides = {}) => ({
  id,
  bookingId: 1,
  type: "Photography",
  label: "Photography",
  deliveryMode: "direct_download",
  status: "UNDER_REVIEW",
  currentVersionId: id * 10,
  currentVersion: {
    id: id * 10,
    deliveryFileId: id,
    originalFilename: `image-${id}.jpg`,
    sizeBytes: 3,
    supersededAt: null,
    url: `https://bucket.example/deliverables/bookings/1/${id}.jpg`,
  },
  ...overrides,
});

describe("delivery ZIP route", () => {
  let release;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "info").mockImplementation(() => {});
    release = jest.fn();
    auth.mockResolvedValue({ id: 7 });
    BookingDeliveryFile.findAll.mockResolvedValue([file(1), file(2)]);
    parseOwnedBookingObjectUrl.mockImplementation((url) => ({
      key: new URL(url).pathname.slice(1),
    }));
    isBookingDeliverableKeyForBooking.mockImplementation((key, bookingId) =>
      key.includes(`/bookings/${bookingId}/`),
    );
    prepareDeliveryZipMembers.mockReturnValue({
      members: [{ key: "deliverables/bookings/1/1.jpg", sizeBytes: 3 }],
      declaredBytes: 3,
      sourceMemberCount: 2,
    });
    verifyDeliveryZipObjects.mockResolvedValue(true);
    tryAcquireDeliveryZipPipeline.mockReturnValue(release);
    createDeliveryZipStream.mockReturnValue(
      Readable.from([Buffer.from("zip")]),
    );
  });

  afterEach(() => {
    console.info.mockRestore();
  });

  it("requires authentication before resolving a group", async () => {
    auth.mockResolvedValue(null);

    const response = await GET(
      request(
        "http://localhost/api/files/download-zip?bookingId=1&type=Photography",
      ),
    );

    expect(response.status).toBe(401);
    expect(BookingDeliveryFile.findAll).not.toHaveBeenCalled();
  });

  it("uses a whole owner-scoped group snapshot and safe streaming headers", async () => {
    const response = await GET(
      request(
        "http://localhost/api/files/download-zip?bookingId=1&type=Photography",
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-accel-buffering")).toBe("no");
    expect(response.headers.get("content-disposition")).toContain("attachment");
    expect(BookingDeliveryFile.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { bookingId: 1, type: "Photography", deletedAt: null },
        include: expect.arrayContaining([
          expect.objectContaining({ as: "booking", where: { userId: 7 } }),
          expect.objectContaining({
            as: "currentVersion",
            required: false,
          }),
        ]),
      }),
    );
    expect(prepareDeliveryZipMembers).toHaveBeenCalledWith(expect.any(Array), {
      bookingId: 1,
    });
    expect(verifyDeliveryZipObjects).toHaveBeenCalledWith(
      expect.objectContaining({
        headObject: headBookingObject,
        signal: expect.any(AbortSignal),
      }),
    );
    expect(createDeliveryZipStream).toHaveBeenCalledWith(
      expect.objectContaining({ getObject: getBookingObject }),
    );

    createDeliveryZipStream.mock.calls[0][0].onComplete({
      outcome: "completed",
    });
    expect(release).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["changes requested", { status: "CHANGES_REQUESTED" }],
    ["private", { status: "PRIVATE" }],
    ["missing current version", { currentVersion: null }],
    ["wrong current pointer", { currentVersionId: 999 }],
    [
      "version from another file",
      {
        currentVersion: {
          ...file(1).currentVersion,
          deliveryFileId: 999,
        },
      },
    ],
    [
      "superseded current version",
      {
        currentVersion: {
          ...file(1).currentVersion,
          supersededAt: "2026-01-01T00:00:00.000Z",
        },
      },
    ],
  ])(
    "rejects the entire group when one member is %s",
    async (_name, invalid) => {
      BookingDeliveryFile.findAll.mockResolvedValue([
        file(1, invalid),
        file(2),
        file(3),
      ]);

      const response = await GET(
        request(
          "http://localhost/api/files/download-zip?bookingId=1&type=Photography",
        ),
      );

      expect(response.status).toBe(404);
      expect(prepareDeliveryZipMembers).not.toHaveBeenCalled();
      expect(tryAcquireDeliveryZipPipeline).not.toHaveBeenCalled();
    },
  );

  it("rejects another booking's object even inside an allowed bucket prefix", async () => {
    parseOwnedBookingObjectUrl.mockReturnValue({
      key: "deliverables/bookings/2/foreign.jpg",
    });
    isBookingDeliverableKeyForBooking.mockReturnValue(false);

    const response = await GET(
      request(
        "http://localhost/api/files/download-zip?bookingId=1&type=Photography",
      ),
    );

    expect(response.status).toBe(404);
    expect(prepareDeliveryZipMembers).not.toHaveBeenCalled();
  });

  it("returns one uniform response for malformed, cross-owner, and one-file groups", async () => {
    BookingDeliveryFile.findAll.mockResolvedValue([]);
    const crossOwner = await GET(
      request(
        "http://localhost/api/files/download-zip?bookingId=1&type=Photography",
      ),
    );
    const malformed = await GET(
      request(
        "http://localhost/api/files/download-zip?bookingId=1&type=%3Cbad%3E",
      ),
    );
    BookingDeliveryFile.findAll.mockResolvedValue([file(1)]);
    const oneFile = await GET(
      request(
        "http://localhost/api/files/download-zip?bookingId=1&type=Photography",
      ),
    );

    expect([crossOwner.status, malformed.status, oneFile.status]).toEqual([
      404, 404, 404,
    ]);
    expect(createDeliveryZipStream).not.toHaveBeenCalled();
  });

  it("rejects a sixth request before HEAD or body streams are opened", async () => {
    tryAcquireDeliveryZipPipeline.mockReturnValue(null);

    const response = await GET(
      request(
        "http://localhost/api/files/download-zip?bookingId=1&type=Photography",
      ),
    );

    expect(response.status).toBe(429);
    expect(verifyDeliveryZipObjects).not.toHaveBeenCalled();
    expect(headBookingObject).not.toHaveBeenCalled();
    expect(createDeliveryZipStream).not.toHaveBeenCalled();
  });

  it("releases admission when object preflight fails", async () => {
    verifyDeliveryZipObjects.mockResolvedValue(false);

    const response = await GET(
      request(
        "http://localhost/api/files/download-zip?bookingId=1&type=Photography",
      ),
    );

    expect(response.status).toBe(404);
    expect(release).toHaveBeenCalledTimes(1);
    expect(createDeliveryZipStream).not.toHaveBeenCalled();
  });
});
