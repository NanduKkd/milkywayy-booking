import { sendWhatsAppTemplate } from "../whatsapp";

describe("sendWhatsAppTemplate", () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      TWILIO_ACCOUNT_SID: "AC123",
      TWILIO_AUTH_TOKEN: "token123",
      TWILIO_WHATSAPP_FROM: "+1234567890",
      TWILIO_CONTENT_SID_ADMIN_BOOKING_HANDOFF_REGISTRATION: "HX_handoff_reg",
      TWILIO_CONTENT_SID_TEAM_ON_THE_WAY: "HX_team",
      TWILIO_CONTENT_SID_SHOOT_CONFIRMATION: "HX_confirm",
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ sid: "SM123", status: "queued" }),
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("maps sparse Twilio variables for team_on_the_way", async () => {
    await sendWhatsAppTemplate({
      to: "+971500000000",
      templateName: "team_on_the_way",
      variables: {
        Property_Name: "Palm Jumeirah",
        Arrival_Window: "10:00 AM - 12:00 PM",
      },
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [, request] = global.fetch.mock.calls[0];
    const body = new URLSearchParams(request.body);
    const contentVariables = JSON.parse(body.get("ContentVariables"));

    expect(contentVariables).toEqual({
      1: "Palm Jumeirah",
      4: "10:00 AM - 12:00 PM",
    });
  });

  it("keeps sequential Twilio variables for booking confirmation", async () => {
    await sendWhatsAppTemplate({
      to: "+971500000000",
      templateName: "shoot_confirmation",
      variables: {
        Property_Name: "1002, Test 3",
        Client_Name: "Amal",
        Shoot_Date: "Apr 14, 2026",
        Arrival_Window: "13:00 - 13:30",
      },
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [, request] = global.fetch.mock.calls[0];
    const body = new URLSearchParams(request.body);
    const contentVariables = JSON.parse(body.get("ContentVariables"));

    expect(contentVariables).toEqual({
      1: "1002, Test 3",
      2: "Amal",
      3: "Apr 14, 2026",
      4: "13:00 - 13:30",
    });
  });

  it("maps admin booking handoff variables for registration links", async () => {
    await sendWhatsAppTemplate({
      to: "+971500000000",
      templateName: "admin_booking_handoff_registration",
      variables: {
        Client_Name: "Ava Agent",
        Property_Summary: "2 Bed Apartment at Marina Gate",
        Handoff_Link: "https://example.com/booking/handoff/token-1",
        Expires_At: "02 Jul 2026, 18:00",
      },
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [, request] = global.fetch.mock.calls[0];
    const body = new URLSearchParams(request.body);
    const contentVariables = JSON.parse(body.get("ContentVariables"));

    expect(contentVariables).toEqual({
      1: "Ava Agent",
      2: "2 Bed Apartment at Marina Gate",
      3: "https://example.com/booking/handoff/token-1",
      4: "02 Jul 2026, 18:00",
    });
  });

  it("does not report a handoff as sent without an approved content template", async () => {
    delete process.env.TWILIO_CONTENT_SID_ADMIN_BOOKING_HANDOFF_REGISTRATION;

    const result = await sendWhatsAppTemplate({
      to: "+971500000000",
      templateName: "admin_booking_handoff_registration",
      variables: { Handoff_Link: "https://example.com/handoff" },
    });

    expect(result).toEqual({
      success: false,
      error:
        "Approved Twilio WhatsApp template is not configured for admin_booking_handoff_registration",
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
