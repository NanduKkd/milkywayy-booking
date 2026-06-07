import { sendPartialMediaUploadNotification } from "@/lib/actions/notifications";
import Booking from "@/lib/db/models/booking";
import { sendWhatsAppTemplate } from "@/lib/notifications/whatsapp";

jest.mock("@/lib/db/relations", () => ({}));
jest.mock("@/lib/db/models/booking", () => ({
  findByPk: jest.fn(),
}));
jest.mock("@/lib/db/models/bookingdeliveryfile", () => ({}));
jest.mock("@/lib/db/models/bookingdeliveryfileversion", () => ({}));
jest.mock("@/lib/db/models/user", () => ({
  findByPk: jest.fn(),
}));
jest.mock("@/lib/notifications/whatsapp", () => ({
  sendWhatsAppTemplate: jest.fn(),
}));

describe("delivery notifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not treat migrated private files as customer-visible uploads", async () => {
    Booking.findByPk.mockResolvedValue({
      id: 42,
      userId: 7,
      filesUrl: JSON.stringify({
        deliverables: [{ url: "https://bucket/private.jpg" }],
      }),
      deliveryFiles: [
        {
          status: "PRIVATE",
          currentVersion: { url: "https://bucket/private.jpg" },
        },
      ],
    });

    await expect(sendPartialMediaUploadNotification(42)).rejects.toThrow(
      "No deliverables uploaded for this booking",
    );
    expect(sendWhatsAppTemplate).not.toHaveBeenCalled();
  });
});
