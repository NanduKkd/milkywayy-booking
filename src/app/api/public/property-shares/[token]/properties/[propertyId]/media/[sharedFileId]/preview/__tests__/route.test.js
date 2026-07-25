/** @jest-environment node */

import {
  createPropertySharePreview,
  isBoundedPreviewSize,
  readBoundedPreviewSource,
} from "@/lib/services/propertySharePreview";
import { resolvePublicPropertySharePreview } from "@/lib/services/propertySharing";
import {
  getBookingObject,
  headBookingObject,
  isBookingDeliverableKeyForBooking,
  parseOwnedBookingObjectUrl,
} from "@/lib/storage/s3";
import { GET } from "../route";

jest.mock("@/lib/services/propertySharePreview", () => ({
  PROPERTY_SHARE_PREVIEW_MAX_SOURCE_BYTES: 32 * 1024 * 1024,
  PropertySharePreviewUnavailableError: class PropertySharePreviewUnavailableError extends Error {},
  createPropertySharePreview: jest.fn(),
  isBoundedPreviewSize: jest.fn(),
  readBoundedPreviewSource: jest.fn(),
  withPreviewDeadline: jest.fn((operation, { controller }) =>
    operation(controller.signal),
  ),
}));
jest.mock("@/lib/services/propertySharing", () => ({
  resolvePublicPropertySharePreview: jest.fn(),
}));
jest.mock("@/lib/storage/s3", () => ({
  getBookingObject: jest.fn(),
  headBookingObject: jest.fn(),
  isBookingDeliverableKeyForBooking: jest.fn(),
  parseOwnedBookingObjectUrl: jest.fn(),
}));

const params = Promise.resolve({
  token: "A".repeat(43),
  propertyId: "30",
  sharedFileId: "500",
});

function media(overrides = {}) {
  return {
    storageUrl: "https://storage.invalid/deliverables/bookings/20/private.jpg",
    bookingId: 20,
    sizeBytes: 2048,
    ...overrides,
  };
}

describe("token-scoped property preview route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resolvePublicPropertySharePreview.mockResolvedValue(media());
    isBoundedPreviewSize.mockReturnValue(true);
    parseOwnedBookingObjectUrl.mockReturnValue({
      bucket: "synthetic",
      key: "deliverables/bookings/20/private.jpg",
    });
    isBookingDeliverableKeyForBooking.mockReturnValue(true);
    headBookingObject.mockResolvedValue({ ContentLength: 2048 });
    getBookingObject.mockResolvedValue({ Body: new Uint8Array([1, 2, 3]) });
    readBoundedPreviewSource.mockResolvedValue(Buffer.from("source"));
    createPropertySharePreview.mockResolvedValue(Buffer.from([255, 216, 255]));
  });

  it("returns a bounded JPEG with private no-store safety headers", async () => {
    const response = await GET(new Request("https://example.test/preview"), {
      params,
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("content-length")).toBe("3");
    expect(response.headers.get("cache-control")).toContain(
      "private, no-store",
    );
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
    expect(response.headers.get("content-disposition")).toBeNull();
    expect(resolvePublicPropertySharePreview).toHaveBeenCalledWith({
      token: "A".repeat(43),
      propertyId: "30",
      sharedFileId: "500",
    });
    expect(headBookingObject).toHaveBeenCalledWith(
      "deliverables/bookings/20/private.jpg",
      expect.objectContaining({ abortSignal: expect.any(AbortSignal) }),
    );
    expect(getBookingObject).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "deliverables/bookings/20/private.jpg",
        abortSignal: expect.any(AbortSignal),
      }),
    );
    expect(createPropertySharePreview).toHaveBeenCalledWith(
      Buffer.from("source"),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("allows an unknown persisted size only after the bounded S3 preflight", async () => {
    resolvePublicPropertySharePreview.mockResolvedValue(
      media({ sizeBytes: null }),
    );

    const response = await GET(new Request("https://example.test/preview"), {
      params,
    });

    expect(response.status).toBe(200);
    expect(headBookingObject).toHaveBeenCalled();
    expect(getBookingObject).toHaveBeenCalled();
  });

  it.each([
    ["unauthorized or non-image snapshot", null, true, true],
    ["cross-booking owned key", media(), false, true],
    ["oversized declared source", media(), true, false],
  ])(
    "returns the same generic 404 for %s",
    async (_label, resolvedMedia, keyMatchesBooking, declaredSizeIsBounded) => {
      resolvePublicPropertySharePreview.mockResolvedValue(resolvedMedia);
      isBookingDeliverableKeyForBooking.mockReturnValue(keyMatchesBooking);
      isBoundedPreviewSize.mockImplementationOnce(() => declaredSizeIsBounded);

      const response = await GET(new Request("https://example.test/preview"), {
        params,
      });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "Not found" });
      expect(getBookingObject).not.toHaveBeenCalled();
    },
  );

  it("fails closed for an oversized S3 declaration or bounded-reader failure", async () => {
    isBoundedPreviewSize.mockReturnValueOnce(true).mockReturnValueOnce(false);
    let response = await GET(new Request("https://example.test/preview"), {
      params,
    });
    expect(response.status).toBe(404);
    expect(getBookingObject).not.toHaveBeenCalled();

    jest.clearAllMocks();
    resolvePublicPropertySharePreview.mockResolvedValue(media());
    isBoundedPreviewSize.mockReturnValue(true);
    parseOwnedBookingObjectUrl.mockReturnValue({
      key: "deliverables/bookings/20/private.jpg",
    });
    isBookingDeliverableKeyForBooking.mockReturnValue(true);
    headBookingObject.mockResolvedValue({ ContentLength: 2048 });
    getBookingObject.mockResolvedValue({ Body: new Uint8Array([1]) });
    readBoundedPreviewSource.mockRejectedValue(
      new Error("source exceeded cap"),
    );

    response = await GET(new Request("https://example.test/preview"), {
      params,
    });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Not found" });
  });

  it("aborts pending S3 work when the client disconnects", async () => {
    const client = new AbortController();
    let upstreamSignal;
    let signalHeadStarted;
    const headStarted = new Promise((resolve) => {
      signalHeadStarted = resolve;
    });
    headBookingObject.mockImplementation((_key, { abortSignal }) => {
      upstreamSignal = abortSignal;
      signalHeadStarted();
      return new Promise((_resolve, reject) => {
        abortSignal.addEventListener(
          "abort",
          () => reject(new Error("aborted")),
          {
            once: true,
          },
        );
      });
    });

    const responsePromise = GET(
      new Request("https://example.test/preview", { signal: client.signal }),
      { params },
    );
    await headStarted;
    client.abort();
    const response = await responsePromise;

    expect(upstreamSignal?.aborted).toBe(true);
    expect(response.status).toBe(404);
    expect(getBookingObject).not.toHaveBeenCalled();
  });
});
