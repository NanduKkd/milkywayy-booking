import { uploadBookingFile } from "../multipart";

const response = (data, ok = true) => ({
  ok,
  json: async () => data,
});

class SuccessfulUploadRequest {
  static requests = [];

  constructor() {
    this.upload = {};
    SuccessfulUploadRequest.requests.push(this);
  }

  open(method, url) {
    this.method = method;
    this.url = url;
  }

  send(blob) {
    this.blob = blob;
    this.status = 200;
    this.upload.onprogress?.({ lengthComputable: true, loaded: blob.size });
    queueMicrotask(() => this.onload());
  }

  getResponseHeader(name) {
    return name === "ETag" ? `"etag-${this.blob.size}"` : null;
  }

  abort() {
    this.onabort?.();
  }
}

describe("multipart booking upload client", () => {
  beforeEach(() => {
    SuccessfulUploadRequest.requests = [];
    global.XMLHttpRequest = SuccessfulUploadRequest;
    global.fetch = jest.fn((url, init) => {
      if (url === "/api/admin/booking-uploads/initiate") {
        return Promise.resolve(
          response({ sessionId: "session-1", partSize: 4, partCount: 2 }),
        );
      }
      if (url === "/api/admin/booking-uploads/session-1/parts") {
        const partNumbers = JSON.parse(init.body).partNumbers;
        return Promise.resolve(
          response({
            parts: partNumbers.map((partNumber) => ({
              partNumber,
              url: `https://s3.example/part-${partNumber}`,
            })),
          }),
        );
      }
      if (url === "/api/admin/booking-uploads/session-1/complete") {
        return Promise.resolve(
          response({ url: "https://bucket.example/file.mp4" }),
        );
      }
      throw new Error(`Unexpected fetch ${url}`);
    });
  });

  it("slices the file and sends bytes only to signed S3 URLs", async () => {
    const file = new File(["123456"], "final.mp4", { type: "video/mp4" });
    const slice = jest.spyOn(file, "slice");
    const states = [];

    const result = await uploadBookingFile({
      bookingId: 42,
      deliverableType: "Videography",
      file,
      signal: new AbortController().signal,
      onState: (state) => states.push(state),
    });

    expect(result.url).toBe("https://bucket.example/file.mp4");
    expect(slice).toHaveBeenNthCalledWith(1, 0, 4);
    expect(slice).toHaveBeenNthCalledWith(2, 4, 6);
    expect(SuccessfulUploadRequest.requests).toHaveLength(2);
    expect(SuccessfulUploadRequest.requests[0].url).toBe(
      "https://s3.example/part-1",
    );
    const completionCall = global.fetch.mock.calls.find(([url]) =>
      url.endsWith("/complete"),
    );
    expect(JSON.parse(completionCall[1].body).parts).toEqual([
      { partNumber: 1, etag: '"etag-4"' },
      { partNumber: 2, etag: '"etag-2"' },
    ]);
    expect(states.at(-1)).toEqual({ status: "Complete", progress: 100 });
  });

  it("rejects files over 2 GiB before creating a session", async () => {
    await expect(
      uploadBookingFile({
        bookingId: 42,
        deliverableType: "Videography",
        file: { name: "huge.mp4", size: 2_147_483_649 },
        onState: jest.fn(),
      }),
    ).rejects.toThrow("Files must be between");
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
