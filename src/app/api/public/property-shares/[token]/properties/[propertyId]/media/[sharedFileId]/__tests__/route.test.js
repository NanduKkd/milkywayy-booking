/** @jest-environment node */

import { resolvePublicPropertyShareMedia } from "@/lib/services/propertySharing";
import { getBookingObject, parseOwnedBookingObjectUrl } from "@/lib/storage/s3";
import { GET } from "../route";

jest.mock("@/lib/services/propertySharing", () => ({
  resolvePublicPropertyShareMedia: jest.fn(),
}));
jest.mock("@/lib/storage/s3", () => ({
  getBookingObject: jest.fn(),
  parseOwnedBookingObjectUrl: jest.fn(),
}));

const params = Promise.resolve({
  token: "A".repeat(43),
  propertyId: "30",
  sharedFileId: "500",
});

function request(headers = {}) {
  return new Request(
    `https://example.test/api/public/property-shares/${"A".repeat(43)}/properties/30/media/500`,
    { headers },
  );
}

describe("token-scoped inline property media route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resolvePublicPropertyShareMedia.mockResolvedValue({
      storageUrl:
        "https://storage.invalid/deliverables/bookings/20/private.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 4,
    });
    parseOwnedBookingObjectUrl.mockReturnValue({
      bucket: "synthetic",
      key: "deliverables/bookings/20/private.jpg",
    });
    getBookingObject.mockResolvedValue({
      Body: new Uint8Array([1, 2, 3, 4]),
      ContentLength: 4,
      AcceptRanges: "bytes",
    });
  });

  it("streams exact authorized media inline without redirect or attachment headers", async () => {
    const response = await GET(request(), { params });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("content-length")).toBe("4");
    expect(response.headers.get("accept-ranges")).toBe("bytes");
    expect(response.headers.get("content-disposition")).toBeNull();
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(resolvePublicPropertyShareMedia).toHaveBeenCalledWith({
      token: "A".repeat(43),
      propertyId: "30",
      sharedFileId: "500",
    });
    expect(getBookingObject).toHaveBeenCalledWith({
      key: "deliverables/bookings/20/private.jpg",
      range: null,
    });
  });

  it("preserves byte-range streaming for video and large viewers", async () => {
    getBookingObject.mockResolvedValue({
      Body: new Uint8Array([2, 3]),
      ContentLength: 2,
      ContentRange: "bytes 1-2/4",
      AcceptRanges: "bytes",
    });

    const response = await GET(request({ Range: "bytes=1-2" }), { params });

    expect(response.status).toBe(206);
    expect(response.headers.get("content-range")).toBe("bytes 1-2/4");
    expect(getBookingObject).toHaveBeenCalledWith({
      key: "deliverables/bookings/20/private.jpg",
      range: "bytes=1-2",
    });
  });

  it.each([
    ["unknown membership", null, { bucket: "synthetic", key: "unused" }],
    [
      "unowned storage URL",
      { storageUrl: "https://external.invalid/a.jpg" },
      null,
    ],
  ])("returns one generic 404 for %s", async (_label, media, ownedObject) => {
    resolvePublicPropertyShareMedia.mockResolvedValue(media);
    parseOwnedBookingObjectUrl.mockReturnValue(ownedObject);

    const response = await GET(request(), { params });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Not found" });
    expect(getBookingObject).not.toHaveBeenCalled();
  });

  it("rejects malformed ranges after authorization", async () => {
    const response = await GET(request({ Range: "bytes=bad" }), { params });

    expect(response.status).toBe(416);
    expect(getBookingObject).not.toHaveBeenCalled();
  });
});
