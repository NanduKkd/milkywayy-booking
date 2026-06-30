import { logSecurityError } from "@/lib/logging/security";
import { buildWhatsAppInboundAutoReplyTwiml } from "@/lib/notifications/whatsappInboundAutoReply";
import {
  getTwilioWebhookValidationUrl,
  isInboundWhatsAppMessage,
  isTwilioWebhookSignatureValid,
  parseTwilioWebhookBody,
  TWILIO_SIGNATURE_HEADER,
} from "@/lib/notifications/whatsappInboundWebhook";

const EMPTY_TWIML_RESPONSE =
  '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
const XML_RESPONSE_HEADERS = Object.freeze({
  "Cache-Control": "no-store",
  "Content-Type": "application/xml; charset=utf-8",
});
const TEXT_RESPONSE_HEADERS = Object.freeze({
  "Cache-Control": "no-store",
  "Content-Type": "text/plain; charset=utf-8",
});

function buildXmlResponse(body, status = 200) {
  return new Response(body, {
    headers: XML_RESPONSE_HEADERS,
    status,
  });
}

function buildTextResponse(message, status) {
  return new Response(message, {
    headers: TEXT_RESPONSE_HEADERS,
    status,
  });
}

function isFormUrlEncodedRequest(request) {
  const contentType = request.headers.get("content-type") || "";
  return contentType
    .toLowerCase()
    .startsWith("application/x-www-form-urlencoded");
}

export async function POST(request) {
  if (!isFormUrlEncodedRequest(request)) {
    return buildTextResponse("Invalid webhook content type.", 400);
  }

  try {
    const authToken = String(process.env.TWILIO_AUTH_TOKEN ?? "").trim();
    const validationUrl = getTwilioWebhookValidationUrl({
      requestUrl: request.url,
    });

    if (!authToken || !validationUrl) {
      console.error(
        "[WHATSAPP_WEBHOOK] Missing Twilio inbound webhook configuration",
      );
      return buildTextResponse("Webhook configuration missing.", 503);
    }

    const signature = String(
      request.headers.get(TWILIO_SIGNATURE_HEADER) ?? "",
    ).trim();
    const body = await request.text();
    const params = parseTwilioWebhookBody(body);

    if (Object.keys(params).length === 0) {
      console.warn("[WHATSAPP_WEBHOOK] Rejected empty webhook payload");
      return buildTextResponse("Webhook payload missing.", 400);
    }

    if (
      !signature ||
      !isTwilioWebhookSignatureValid({
        authToken,
        params,
        signature,
        url: validationUrl,
      })
    ) {
      console.warn("[WHATSAPP_WEBHOOK] Rejected invalid Twilio signature");
      return buildTextResponse("Signature validation failed.", 403);
    }

    if (isInboundWhatsAppMessage(params)) {
      return buildXmlResponse(buildWhatsAppInboundAutoReplyTwiml());
    }

    return buildXmlResponse(EMPTY_TWIML_RESPONSE);
  } catch (error) {
    logSecurityError("Twilio WhatsApp inbound webhook failed.", error, {
      route: "/api/webhooks/twilio/whatsapp",
    });

    return buildTextResponse("Webhook handler failed.", 500);
  }
}
