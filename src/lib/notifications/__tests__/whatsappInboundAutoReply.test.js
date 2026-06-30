import {
  buildWhatsAppInboundAutoReplyBody,
  buildWhatsAppInboundAutoReplyTwiml,
} from "../whatsappInboundAutoReply";

describe("buildWhatsAppInboundAutoReplyBody", () => {
  it("uses the shared public display number in the approved reply copy", () => {
    expect(buildWhatsAppInboundAutoReplyBody()).toBe(
      "Thanks for your message. Messages sent to this WhatsApp number are not monitored by our team. If you have any questions, please call +971 50 726 3306 or use the contact section on our website.",
    );
  });
});

describe("buildWhatsAppInboundAutoReplyTwiml", () => {
  it("wraps the approved reply copy in a TwiML response", () => {
    expect(buildWhatsAppInboundAutoReplyTwiml()).toBe(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Thanks for your message. Messages sent to this WhatsApp number are not monitored by our team. If you have any questions, please call +971 50 726 3306 or use the contact section on our website.</Message></Response>',
    );
  });

  it("escapes XML-special characters in the message body", () => {
    expect(
      buildWhatsAppInboundAutoReplyTwiml(`5 < 6 & "quotes" 'apostrophes'`),
    ).toBe(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Message>5 &lt; 6 &amp; &quot;quotes&quot; &apos;apostrophes&apos;</Message></Response>',
    );
  });
});
