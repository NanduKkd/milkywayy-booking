import { PUBLIC_CONTACT } from "@/lib/config/publicContact";

function buildWhatsAppInboundAutoReplyBody() {
  return `Thanks for your message. Messages sent to this WhatsApp number are not monitored by our team. If you have any questions, please call ${PUBLIC_CONTACT.phoneDisplay} or use the contact section on our website.`;
}

function escapeXmlText(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function buildWhatsAppInboundAutoReplyTwiml(
  body = buildWhatsAppInboundAutoReplyBody(),
) {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXmlText(body)}</Message></Response>`;
}

export {
  buildWhatsAppInboundAutoReplyBody,
  buildWhatsAppInboundAutoReplyTwiml,
};
