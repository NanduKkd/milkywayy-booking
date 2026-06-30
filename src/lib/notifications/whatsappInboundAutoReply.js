import { PUBLIC_CONTACT } from "@/lib/config/publicContact";

function buildWhatsAppInboundAutoReplyBody() {
  return `Thanks for your message. Messages sent to this WhatsApp number are not monitored by our team. If you have any questions, please call ${PUBLIC_CONTACT.phoneDisplay} or use the contact section on our website.`;
}

export { buildWhatsAppInboundAutoReplyBody };
