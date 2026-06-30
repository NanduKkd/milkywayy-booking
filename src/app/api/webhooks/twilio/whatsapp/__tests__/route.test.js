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

  it("rejects a request when the provided signature does not match the payload", async () => {
    const url = "https://example.com/api/webhooks/twilio/whatsapp";
    const signedParams = {
      Body: "Original body",
      From: "whatsapp:+15551234567",
      MessageSid: "SM123",
      To: "whatsapp:+971507263306",
    };
    const actualParams = {
      ...signedParams,
      Body: "Tampered body",
    };
    const signature = signTwilioRequest({
      authToken: process.env.TWILIO_AUTH_TOKEN,
      params: signedParams,
      url,
    });

    const response = await POST(
      createRequest({
        body: new URLSearchParams(actualParams).toString(),
        signature,
        url,
      }),
    );

    expect(response.status).toBe(403);
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

  it("fails closed in production when the configured webhook url is invalid", async () => {
    process.env.NODE_ENV = "production";
    process.env.TWILIO_WHATSAPP_WEBHOOK_URL =
      "http://example.com/api/webhooks/twilio/whatsapp#fragment";

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

  it("fails closed when the Twilio auth token is missing", async () => {
    delete process.env.TWILIO_AUTH_TOKEN;

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

  it("returns the approved TwiML reply for a valid inbound WhatsApp message", async () => {
    const url = "https://example.com/api/webhooks/twilio/whatsapp";
    const params = {
      Body: "Hello there",
      From: "whatsapp:+15551234567",
      MessageSid: "SM123",
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
      '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Thanks for your message. Messages sent to this WhatsApp number are not monitored by our team. If you have any questions, please call +971 50 726 3306 or use the contact section on our website.</Message></Response>',
    );
  });

  it("rejects an empty form payload before signature validation", async () => {
    const response = await POST(
      createRequest({
        body: "",
        signature: "invalid-signature",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toBe("Webhook payload missing.");
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
