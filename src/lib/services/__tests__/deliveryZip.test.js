import { PassThrough, Readable } from "node:stream";
import {
  createDeliveryZipStream,
  getActiveDeliveryZipPipelines,
  prepareDeliveryZipMembers,
  resetDeliveryZipPipelinesForTests,
  safeDeliveryZipName,
  safeZipMemberName,
  tryAcquireDeliveryZipPipeline,
  verifyDeliveryZipObjects,
} from "../deliveryZip";

// Archiver uses Node's setImmediate; Jest's jsdom environment does not expose it.
global.setImmediate ??= (callback, ...args) => setTimeout(callback, 0, ...args);

const readAll = async (stream) => {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
};

const directFile = (id, overrides = {}) => ({
  id,
  bookingId: 1,
  type: "Photography",
  label: "Photography",
  deliveryMode: "direct_download",
  objectKey: `deliverables/bookings/1/${id}/photo.jpg`,
  currentVersion: {
    id: id * 10,
    originalFilename: "photo.jpg",
    sizeBytes: 3,
  },
  ...overrides,
});

describe("delivery ZIP streaming", () => {
  beforeEach(() => {
    resetDeliveryZipPipelinesForTests();
  });

  it("sanitizes path, reserved, dot, Unicode-byte, and collision-prone names", () => {
    const used = new Set();
    expect(safeZipMemberName("../room\nphoto.jpg", used)).toBe("roomphoto.jpg");
    expect(safeZipMemberName("ROOMPHOTO.jpg", used)).toBe("ROOMPHOTO (2).jpg");
    expect(safeZipMemberName("..", used)).toBe("deliverable");
    expect(safeZipMemberName("CON.txt", used)).toBe("_CON.txt");
    expect(
      Buffer.byteLength(safeZipMemberName("🪐".repeat(100), used)),
    ).toBeLessThanOrEqual(180);
    expect(safeDeliveryZipName("Photography\r\nX: y")).toBe(
      "PhotographyX- y-deliverables.zip",
    );
  });

  it("prepares booking-owned objects and a bounded HTTPS link manifest", () => {
    const prepared = prepareDeliveryZipMembers(
      [
        directFile(1, {
          currentVersion: {
            id: 10,
            originalFilename: "../a.jpg",
            sizeBytes: "3",
          },
        }),
        {
          deliveryMode: "copy_link",
          label: "Photography",
          currentVersion: {
            originalFilename: "tour.url",
            url: "https://example.test/tour",
          },
        },
      ],
      { bookingId: 1 },
    );

    expect(prepared).toEqual(
      expect.objectContaining({
        declaredBytes: expect.any(Number),
        sourceMemberCount: 2,
        members: [
          expect.objectContaining({
            key: "deliverables/bookings/1/1/photo.jpg",
            name: "a.jpg",
            sizeBytes: 3,
          }),
          expect.objectContaining({
            name: "EXTERNAL_LINKS.txt",
            text: expect.stringContaining("https://example.test/tour"),
          }),
        ],
      }),
    );
  });

  it("rejects foreign booking keys, unsupported modes, unsafe links, and limits", () => {
    expect(
      prepareDeliveryZipMembers(
        [
          directFile(1, {
            objectKey: "deliverables/bookings/2/1/photo.jpg",
          }),
          directFile(2),
        ],
        { bookingId: 1 },
      ),
    ).toBeNull();
    expect(
      prepareDeliveryZipMembers(
        [directFile(1, { deliveryMode: "other" }), directFile(2)],
        { bookingId: 1 },
      ),
    ).toBeNull();
    expect(
      prepareDeliveryZipMembers(
        [
          directFile(1),
          {
            deliveryMode: "copy_link",
            currentVersion: { url: "javascript:alert(1)" },
          },
        ],
        { bookingId: 1 },
      ),
    ).toBeNull();
    expect(
      prepareDeliveryZipMembers(
        Array.from({ length: 101 }, (_, id) => directFile(id + 1)),
        { bookingId: 1 },
      ),
    ).toBeNull();
  });

  it("preflights every S3 object size before response streaming", async () => {
    const headObject = jest
      .fn()
      .mockResolvedValueOnce({ ContentLength: 3 })
      .mockResolvedValueOnce({ ContentLength: 4 });
    const signal = new AbortController().signal;

    await expect(
      verifyDeliveryZipObjects({
        members: [
          { key: "a", sizeBytes: 3 },
          { key: "b", sizeBytes: 3 },
        ],
        headObject,
        signal,
      }),
    ).resolves.toBe(false);
    expect(headObject).toHaveBeenNthCalledWith(1, "a", {
      abortSignal: signal,
    });
  });

  it("stores ZIP64 entries and opens only one S3 body at a time", async () => {
    const prepared = prepareDeliveryZipMembers([directFile(1), directFile(2)], {
      bookingId: 1,
    });
    let activeBodies = 0;
    let maximumActiveBodies = 0;
    const getObject = jest.fn(async () => {
      activeBodies += 1;
      maximumActiveBodies = Math.max(maximumActiveBodies, activeBodies);
      const body = Readable.from([Buffer.from("abc")]);
      body.once("end", () => {
        activeBodies -= 1;
      });
      return { Body: body, ContentLength: 3 };
    });
    const zip = await readAll(
      createDeliveryZipStream({
        ...prepared,
        getObject,
        onComplete: jest.fn(),
      }),
    );

    expect(zip.subarray(0, 4).toString()).toBe("PK\u0003\u0004");
    expect(zip.readUInt16LE(8)).toBe(0);
    expect(zip.includes(Buffer.from("PK\u0006\u0006", "binary"))).toBe(true);
    expect(maximumActiveBodies).toBe(1);
    expect(getObject).toHaveBeenCalledTimes(2);
  });

  it("fails a body that ends before its declared byte count", async () => {
    const completed = jest.fn();
    const stream = createDeliveryZipStream({
      members: [{ key: "a", name: "a.jpg", sizeBytes: 4 }],
      declaredBytes: 4,
      sourceMemberCount: 2,
      getObject: async () => ({
        Body: Readable.from([Buffer.from("abc")]),
        ContentLength: 4,
      }),
      onComplete: completed,
    });

    await expect(readAll(stream)).rejects.toThrow(
      "ended before its declared size",
    );
    expect(completed).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "failed" }),
    );
  });

  it("propagates client cancellation and destroys the active body", async () => {
    const request = new AbortController();
    const body = new PassThrough();
    const completed = jest.fn();
    let upstreamSignal;
    const stream = createDeliveryZipStream({
      members: [{ key: "a", name: "a.jpg", sizeBytes: 3 }],
      declaredBytes: 3,
      sourceMemberCount: 2,
      signal: request.signal,
      getObject: async ({ abortSignal }) => {
        upstreamSignal = abortSignal;
        return { Body: body, ContentLength: 3 };
      },
      onComplete: completed,
    });
    stream.on("error", () => {});
    stream.resume();
    await new Promise((resolve) => setTimeout(resolve, 0));

    request.abort();
    await new Promise((resolve) => stream.once("close", resolve));

    expect(upstreamSignal.aborted).toBe(true);
    expect(body.destroyed).toBe(true);
    expect(completed).toHaveBeenCalledTimes(1);
    expect(completed).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "aborted" }),
    );
  });

  it("admits exactly five archive pipelines and releases slots idempotently", () => {
    const releases = Array.from({ length: 5 }, () =>
      tryAcquireDeliveryZipPipeline(),
    );
    expect(releases.every(Boolean)).toBe(true);
    expect(tryAcquireDeliveryZipPipeline()).toBeNull();
    releases[0]();
    releases[0]();
    expect(getActiveDeliveryZipPipelines()).toBe(4);
    const replacement = tryAcquireDeliveryZipPipeline();
    expect(replacement).toEqual(expect.any(Function));
    [...releases.slice(1), replacement].forEach((release) => {
      release();
    });
    expect(getActiveDeliveryZipPipelines()).toBe(0);
  });
});
