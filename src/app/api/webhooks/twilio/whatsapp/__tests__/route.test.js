import crypto from "node:crypto";
import { POST } from "../route";

class MockResponse {
  constructor(body, init = {}) {
    this.body = body;
    this.headers = new Headers(init.headers || {});
    this.status = init.status || 200;
  }

  async text() {
    return this.body;
  }
}

function signTwilioRequest({ authToken, params, url }) {
  const payload = `${url}${Object.keys(params)
    .sort()
    .map((key) => `${key}${params[key]}`)
    .join("")}`;

  return crypto
    .createHmac("sha1", authToken)
    .update(payload, "utf8")
    .digest("base64");
}

function createRequest({
  body = "",
  contentType = "application/x-www-form-urlencoded",
  signature,
  url = "https://example.com/api/webhooks/twilio/whatsapp",
}) {
  const headers = new Headers({
    "content-type": contentType,
  });

  if (signature) {
    headers.set("x-twilio-signature", signature);
  }

  return {
    headers,
    text: async () => body,
    url,
  };
}

describe("Twilio WhatsApp inbound webhook route", () => {
  const originalEnv = { ...process.env };
  const originalResponse = global.Response;
  let consoleErrorSpy;
  let consoleWarnSpy;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "test",
      TWILIO_AUTH_TOKEN: "test-auth-token",
    };
    global.Response = MockResponse;
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    global.Response = originalResponse;
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it("rejects a request with a missing signature", async () => {
    const response = await POST(
      createRequest({
        body: "MessageSid=SM123&From=whatsapp%3A%2B15551234567&To=whatsapp%3A%2B971507263306",
      }),
    );

    expect(response.status).toBe(403);
    expect(response.headers.get("content-type")).toBe(
      "text/plain; charset=utf-8",
    );
    await expect(response.text()).resolves.toBe("Signature validation failed.");
  });

  it("fails closed in production when the exact webhook url is not configured", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.TWILIO_WHATSAPP_WEBHOOK_URL;

    const response = await POST(
      createRequest({
        body: "MessageSid=SM123&From=whatsapp%3A%2B15551234567&To=whatsapp%3A%2B971507263306",
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.text()).resolves.toBe(
      "Webhook configuration missing.",
    );
  });

  it("returns empty TwiML for a valid signed callback", async () => {
    const url = "https://example.com/api/webhooks/twilio/whatsapp";
    const params = {
      EventType: "DELIVERED",
      From: "whatsapp:+15551234567",
      To: "whatsapp:+971507263306",
    };
    const body = new URLSearchParams(params).toString();
    const signature = signTwilioRequest({
      authToken: process.env.TWILIO_AUTH_TOKEN,
      params,
      url,
    });

    const response = await POST(
      createRequest({
        body,
        signature,
        url,
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "application/xml; charset=utf-8",
    );
    await expect(response.text()).resolves.toBe(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    );
  });

  it("rejects malformed content types before signature validation", async () => {
    const response = await POST(
      createRequest({
        body: '{"MessageSid":"SM123"}',
        contentType: "application/json",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toBe(
      "Invalid webhook content type.",
    );
  });
});
