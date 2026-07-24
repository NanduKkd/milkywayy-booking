import Booking from "@/lib/db/models/booking";
import BookingDeliveryFile from "@/lib/db/models/bookingdeliveryfile";
import { assertUploadTarget, validateInitiatePayload } from "../bookingUpload";

jest.mock("@/lib/db/models/booking", () => ({
  findByPk: jest.fn(),
}));
jest.mock("@/lib/db/models/bookingdeliveryfile", () => ({
  findOne: jest.fn(),
}));

describe("booking upload validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each(["Short Form Video", "Long Form Video"])(
    "accepts canonical %s uploads at the exact 2 GiB boundary",
    (deliverableType) => {
      expect(
        validateInitiatePayload({
          bookingId: 42,
          deliverableType,
          fileName: "final.mp4",
          mimeType: "video/mp4",
          sizeBytes: 2_147_483_648,
        }).sizeBytes,
      ).toBe(2_147_483_648);
    },
  );

  it("accepts legacy Videography only for a replacement", () => {
    expect(
      validateInitiatePayload({
        bookingId: 42,
        replacementFileId: 10,
        deliverableType: "Videography",
        fileName: "final.mp4",
        mimeType: "video/mp4",
        sizeBytes: 10,
      }).deliverableType,
    ).toBe("Videography");

    expect(() =>
      validateInitiatePayload({
        bookingId: 42,
        deliverableType: "Videography",
        fileName: "final.mp4",
        mimeType: "video/mp4",
        sizeBytes: 10,
      }),
    ).toThrow("Invalid deliverableType");
  });

  it.each([0, 2_147_483_649])("rejects invalid size %s", (sizeBytes) => {
    expect(() =>
      validateInitiatePayload({
        bookingId: 42,
        deliverableType: "Short Form Video",
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

  it("allows a legacy replacement only when its type matches the target", async () => {
    Booking.findByPk.mockResolvedValue({
      id: 42,
      status: "CONFIRMED",
      workflowStatus: "FILES_UPLOADED",
    });
    BookingDeliveryFile.findOne.mockResolvedValue({
      id: 10,
      status: "CHANGES_REQUESTED",
      type: "Videography",
    });

    await expect(
      assertUploadTarget({
        bookingId: 42,
        replacementFileId: 10,
        deliverableType: "Videography",
      }),
    ).resolves.toMatchObject({ id: 42 });
    await expect(
      assertUploadTarget({
        bookingId: 42,
        replacementFileId: 10,
        deliverableType: "Long Form Video",
      }),
    ).rejects.toThrow("deliverableType does not match replacement file");
  });
});
