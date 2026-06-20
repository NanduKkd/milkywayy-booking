import { validateInitiatePayload } from "../bookingUpload";

describe("booking upload validation", () => {
  it("accepts the exact 2 GiB boundary", () => {
    expect(
      validateInitiatePayload({
        bookingId: 42,
        deliverableType: "Videography",
        fileName: "final.mp4",
        mimeType: "video/mp4",
        sizeBytes: 2_147_483_648,
      }).sizeBytes,
    ).toBe(2_147_483_648);
  });

  it.each([0, 2_147_483_649])("rejects invalid size %s", (sizeBytes) => {
    expect(() =>
      validateInitiatePayload({
        bookingId: 42,
        deliverableType: "Videography",
        fileName: "final.mp4",
        mimeType: "video/mp4",
        sizeBytes,
      }),
    ).toThrow("File size must be between");
  });

  it("rejects unknown delivery types", () => {
    expect(() =>
      validateInitiatePayload({
        bookingId: 42,
        deliverableType: "Photography Virtual Link",
        fileName: "final.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 10,
      }),
    ).toThrow("Invalid deliverableType");
  });
});
