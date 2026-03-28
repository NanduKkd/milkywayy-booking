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
});
