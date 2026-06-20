import {
  createBookingObjectKey,
  parseOwnedBookingObjectUrl,
  parseOwnedInvoiceObjectUrl,
  sanitizeFilename,
} from "../s3";

describe("booking S3 storage helpers", () => {
  const originalBucket = process.env.AWS_BUCKET_NAME;
  const originalRegion = process.env.AWS_REGION;
  const originalCloudfront = process.env.AWS_CLOUDFRONT_DOMAIN;

  beforeEach(() => {
    process.env.AWS_BUCKET_NAME = "delivery-bucket";
    process.env.AWS_REGION = "ap-south-1";
    process.env.AWS_CLOUDFRONT_DOMAIN = "files.example.com";
  });

  afterAll(() => {
    if (originalBucket === undefined) delete process.env.AWS_BUCKET_NAME;
    else process.env.AWS_BUCKET_NAME = originalBucket;
    if (originalRegion === undefined) delete process.env.AWS_REGION;
    else process.env.AWS_REGION = originalRegion;
    if (originalCloudfront === undefined)
      delete process.env.AWS_CLOUDFRONT_DOMAIN;
    else process.env.AWS_CLOUDFRONT_DOMAIN = originalCloudfront;
  });

  it("generates server-owned safe booking keys", () => {
    const key = createBookingObjectKey(42, "../Final Video (1).mp4");
    expect(key).toMatch(
      /^deliverables\/bookings\/42\/[0-9a-f-]+\/Final-Video-1-.mp4$/,
    );
    expect(key).not.toContain("..");
  });

  it("parses current and legacy owned booking URLs", () => {
    expect(
      parseOwnedBookingObjectUrl(
        "https://delivery-bucket.s3.ap-south-1.amazonaws.com/deliverables/bookings/42/file.mp4",
      ),
    ).toEqual({
      bucket: "delivery-bucket",
      key: "deliverables/bookings/42/file.mp4",
    });
    expect(
      parseOwnedBookingObjectUrl(
        "https://files.example.com/photography/bookings/42/photo.jpg",
      )?.key,
    ).toBe("photography/bookings/42/photo.jpg");
    expect(
      parseOwnedBookingObjectUrl(
        "https://delivery-bucket.s3.ap-south-1.amazonaws.com/photography/bookings/881/M10%2C+Address+Tower%2B2.zip",
      )?.key,
    ).toBe("photography/bookings/881/M10, Address Tower+2.zip");
  });

  it("rejects foreign hosts and non-booking object prefixes", () => {
    expect(
      parseOwnedBookingObjectUrl(
        "https://delivery-bucket.evil.example/bookings/42/file.mp4",
      ),
    ).toBeNull();
    expect(
      parseOwnedBookingObjectUrl(
        "https://delivery-bucket.s3.ap-south-1.amazonaws.com/portfolio/file.jpg",
      ),
    ).toBeNull();
  });

  it("parses only owned invoice object URLs", () => {
    expect(
      parseOwnedInvoiceObjectUrl(
        "https://delivery-bucket.s3.amazonaws.com/invoices/Milkywayy_INV-1.pdf",
      ),
    ).toEqual({
      bucket: "delivery-bucket",
      key: "invoices/Milkywayy_INV-1.pdf",
    });
    expect(
      parseOwnedInvoiceObjectUrl(
        "https://delivery-bucket.s3.amazonaws.com/portfolio/image.jpg",
      ),
    ).toBeNull();
  });

  it("sanitizes path and header metacharacters from filenames", () => {
    expect(sanitizeFilename("../bad\nname?.mp4")).toBe("badname-.mp4");
  });
});
