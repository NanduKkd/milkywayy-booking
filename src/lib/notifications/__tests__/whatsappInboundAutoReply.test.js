import { buildWhatsAppInboundAutoReplyBody } from "../whatsappInboundAutoReply";

describe("buildWhatsAppInboundAutoReplyBody", () => {
  it("uses the shared public display number in the approved reply copy", () => {
    expect(buildWhatsAppInboundAutoReplyBody()).toBe(
      "Thanks for your message. Messages sent to this WhatsApp number are not monitored by our team. If you have any questions, please call +971 50 726 3306 or use the contact section on our website.",
    );
  });
});
