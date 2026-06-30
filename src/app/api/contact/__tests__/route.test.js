jest.mock("@/lib/notifications/whatsapp", () => ({
  sendWhatsAppMessage: jest.fn(),
}));
jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      status: init?.status || 200,
      json: async () => data,
    })),
  },
}));

async function loadContactRoute() {
  jest.resetModules();

  const whatsappModule = await import("@/lib/notifications/whatsapp");
  const routeModule = await import("../route");

  return {
    POST: routeModule.POST,
    sendWhatsAppMessage: whatsappModule.sendWhatsAppMessage,
  };
}

function createRequest(payload) {
  return {
    json: async () => payload,
  };
}

describe("contact route", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("falls back to the shared public contact number", async () => {
    delete process.env.CONTACT_WHATSAPP_TO;

    const { POST, sendWhatsAppMessage } = await loadContactRoute();
    sendWhatsAppMessage.mockResolvedValue({ success: true });

    const response = await POST(
      createRequest({
        name: "Amina",
        company: "Milkywayy",
        phone: "+971500000001",
        email: "amina@example.com",
        message: "Need a new shoot.",
      }),
    );

    await expect(response.json()).resolves.toEqual({ success: true });
    expect(response.status).toBe(200);
    expect(sendWhatsAppMessage).toHaveBeenCalledWith({
      to: "+971507263306",
      body: [
        "New website contact enquiry",
        "Name: Amina",
        "Company: Milkywayy",
        "Phone: +971500000001",
        "Email: amina@example.com",
        "Message:",
        "Need a new shoot.",
      ].join("\n"),
    });
  });

  it("preserves the CONTACT_WHATSAPP_TO override when configured", async () => {
    process.env.CONTACT_WHATSAPP_TO = "whatsapp:+19998887777";

    const { POST, sendWhatsAppMessage } = await loadContactRoute();
    sendWhatsAppMessage.mockResolvedValue({ success: true });

    const response = await POST(
      createRequest({
        name: "Amina",
        phone: "+971500000001",
        email: "amina@example.com",
      }),
    );

    await expect(response.json()).resolves.toEqual({ success: true });
    expect(response.status).toBe(200);
    expect(sendWhatsAppMessage).toHaveBeenCalledWith({
      to: "whatsapp:+19998887777",
      body: [
        "New website contact enquiry",
        "Name: Amina",
        "Phone: +971500000001",
        "Email: amina@example.com",
        "Message:",
        "(No message provided)",
      ].join("\n"),
    });
  });
});
