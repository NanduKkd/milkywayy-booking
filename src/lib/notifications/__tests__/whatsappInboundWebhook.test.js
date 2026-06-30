import crypto from "node:crypto";
import {
  getTwilioWebhookValidationUrl,
  isInboundWhatsAppMessage,
  isTwilioWebhookSignatureValid,
  parseTwilioWebhookBody,
} from "../whatsappInboundWebhook";

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

describe("whatsappInboundWebhook", () => {
  it("accepts a correctly signed webhook payload", () => {
    const authToken = "test-token";
    const url = "https://example.com/api/webhooks/twilio/whatsapp";
    const params = {
      Body: "Hello there",
      From: "whatsapp:+15551234567",
      MessageSid: "SM123",
      To: "whatsapp:+971507263306",
    };

    const signature = signTwilioRequest({
      authToken,
      params,
      url,
    });

    expect(
      isTwilioWebhookSignatureValid({
        authToken,
        params,
        signature,
        url,
      }),
    ).toBe(true);
  });

  it("rejects a payload when the signed form values change", () => {
    const authToken = "test-token";
    const url = "https://example.com/api/webhooks/twilio/whatsapp";
    const originalParams = {
      Body: "Hello there",
      From: "whatsapp:+15551234567",
      MessageSid: "SM123",
      To: "whatsapp:+971507263306",
    };
    const signature = signTwilioRequest({
      authToken,
      params: originalParams,
      url,
    });

    expect(
      isTwilioWebhookSignatureValid({
        authToken,
        params: {
          ...originalParams,
          Body: "Tampered body",
        },
        signature,
        url,
      }),
    ).toBe(false);
  });

  it("rejects a signature generated for a different callback url", () => {
    const authToken = "test-token";
    const params = {
      Body: "Hello there",
      From: "whatsapp:+15551234567",
      MessageSid: "SM123",
      To: "whatsapp:+971507263306",
    };
    const signedUrl = "https://example.com/api/webhooks/twilio/whatsapp";
    const signature = signTwilioRequest({
      authToken,
      params,
      url: signedUrl,
    });

    expect(
      isTwilioWebhookSignatureValid({
        authToken,
        params,
        signature,
        url: "https://wrong.example.com/api/webhooks/twilio/whatsapp",
      }),
    ).toBe(false);
  });

  it("fails closed when the auth token is missing", () => {
    expect(
      isTwilioWebhookSignatureValid({
        authToken: "",
        params: { MessageSid: "SM123" },
        signature: "anything",
        url: "https://example.com/api/webhooks/twilio/whatsapp",
      }),
    ).toBe(false);
  });

  it("requires an explicit webhook url in production", () => {
    expect(
      getTwilioWebhookValidationUrl({
        configuredUrl: "",
        nodeEnv: "production",
        requestUrl: "http://localhost:3000/api/webhooks/twilio/whatsapp",
      }),
    ).toBeNull();
  });

  it("falls back to the request url outside production", () => {
    expect(
      getTwilioWebhookValidationUrl({
        configuredUrl: "",
        nodeEnv: "test",
        requestUrl: "http://localhost:3000/api/webhooks/twilio/whatsapp",
      }),
    ).toBe("http://localhost:3000/api/webhooks/twilio/whatsapp");
  });

  it("rejects a production webhook url that does not use https", () => {
    expect(
      getTwilioWebhookValidationUrl({
        configuredUrl: "http://example.com/api/webhooks/twilio/whatsapp",
        nodeEnv: "production",
      }),
    ).toBeNull();
  });

  it("rejects a configured webhook url with credentials or fragments", () => {
    expect(
      getTwilioWebhookValidationUrl({
        configuredUrl:
          "https://user:pass@example.com/api/webhooks/twilio/whatsapp",
        nodeEnv: "production",
      }),
    ).toBeNull();

    expect(
      getTwilioWebhookValidationUrl({
        configuredUrl:
          "https://example.com/api/webhooks/twilio/whatsapp#fragment",
        nodeEnv: "test",
      }),
    ).toBeNull();
  });

  it("uses a valid configured webhook url outside production", () => {
    expect(
      getTwilioWebhookValidationUrl({
        configuredUrl: "http://localhost:3000/api/webhooks/twilio/whatsapp",
        nodeEnv: "development",
        requestUrl: "http://ignored.example.com",
      }),
    ).toBe("http://localhost:3000/api/webhooks/twilio/whatsapp");
  });

  it("parses Twilio form payloads as decoded values", () => {
    expect(
      parseTwilioWebhookBody(
        "Body=hello+world&From=whatsapp%3A%2B15551234567&MessageSid=SM123",
      ),
    ).toEqual({
      Body: "hello world",
      From: "whatsapp:+15551234567",
      MessageSid: "SM123",
    });
  });

  it("classifies only inbound WhatsApp messages as reply candidates", () => {
    expect(
      isInboundWhatsAppMessage({
        From: "whatsapp:+15551234567",
        MessageSid: "SM123",
        To: "whatsapp:+971507263306",
      }),
    ).toBe(true);

    expect(
      isInboundWhatsAppMessage({
        MessageStatus: "delivered",
        To: "whatsapp:+971507263306",
      }),
    ).toBe(false);
  });
});
