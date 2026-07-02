import { sendWhatsAppTemplate } from "@/lib/notifications/whatsapp";
import {
  getAdminBookingHandoffWhatsAppTemplateName,
  sendAdminBookingHandoffWhatsApp,
} from "../adminBookingHandoffNotifications";

jest.mock("@/lib/notifications/whatsapp", () => ({
  sendWhatsAppTemplate: jest.fn(),
}));

describe("admin booking handoff WhatsApp notifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("uses the registration template for new-customer handoffs", async () => {
    sendWhatsAppTemplate.mockResolvedValue({ success: true });

    const result = await sendAdminBookingHandoffWhatsApp({
      customer: {
        accountType: "INDIVIDUAL",
        fullName: "Ava Agent",
        phone: "+971500000000",
      },
      propertyPreviews: [
        {
          label: "2 Bed Apartment",
          locationLabel: "1504, Marina Gate, Dubai Marina",
        },
      ],
      url: "https://example.com/booking/handoff/token-1",
      expiresAt: "2026-07-02T14:00:00.000Z",
      requiresRegistration: true,
    });

    expect(
      getAdminBookingHandoffWhatsAppTemplateName({
        requiresRegistration: true,
      }),
    ).toBe("admin_booking_handoff_registration");
    expect(sendWhatsAppTemplate).toHaveBeenCalledWith({
      to: "+971500000000",
      templateName: "admin_booking_handoff_registration",
      variables: expect.objectContaining({
        Client_Name: "Ava Agent",
        Property_Summary: "2 Bed Apartment at 1504, Marina Gate, Dubai Marina",
        Handoff_Link: "https://example.com/booking/handoff/token-1",
        Expires_At: expect.any(String),
      }),
    });
    expect(result).toEqual({
      attempted: true,
      channel: "whatsapp",
      sent: true,
      templateName: "admin_booking_handoff_registration",
      error: null,
    });
  });

  it("uses the registered-customer template and preserves delivery failures", async () => {
    sendWhatsAppTemplate.mockResolvedValue({
      success: false,
      error: "Twilio send failed",
    });

    const result = await sendAdminBookingHandoffWhatsApp({
      customer: {
        accountType: "COMPANY",
        companyName: "Harbor Estates",
        phone: "+971511111111",
      },
      propertyPreviews: [
        {
          label: "Villa/Townhouse 4BR",
          locationLabel: "Dubai Hills",
        },
        {
          label: "Apartment 1BR",
          locationLabel: "Business Bay",
        },
      ],
      url: "https://example.com/booking/handoff/token-2",
      expiresAt: "2026-07-02T15:00:00.000Z",
      requiresRegistration: false,
    });

    expect(
      getAdminBookingHandoffWhatsAppTemplateName({
        requiresRegistration: false,
      }),
    ).toBe("admin_booking_handoff_checkout");
    expect(sendWhatsAppTemplate).toHaveBeenCalledWith({
      to: "+971511111111",
      templateName: "admin_booking_handoff_checkout",
      variables: expect.objectContaining({
        Client_Name: "Harbor Estates",
        Property_Summary:
          "2 properties including Villa/Townhouse 4BR at Dubai Hills",
        Handoff_Link: "https://example.com/booking/handoff/token-2",
        Expires_At: expect.any(String),
      }),
    });
    expect(result).toEqual({
      attempted: true,
      channel: "whatsapp",
      sent: false,
      templateName: "admin_booking_handoff_checkout",
      error: "Twilio send failed",
    });
  });
});
