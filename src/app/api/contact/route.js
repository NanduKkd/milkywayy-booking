import { NextResponse } from "next/server";
import { PUBLIC_CONTACT } from "@/lib/config/publicContact";
import { sendWhatsAppMessage } from "@/lib/notifications/whatsapp";

const CONTACT_WHATSAPP_TO =
  process.env.CONTACT_WHATSAPP_TO || PUBLIC_CONTACT.phoneE164;

const normalizeRequiredString = (value) => {
  const normalized = String(value ?? "").trim();
  return normalized || null;
};

const normalizeOptionalString = (value) => {
  const normalized = String(value ?? "").trim();
  return normalized || null;
};

const buildContactMessage = ({ name, company, phone, email, message }) =>
  [
    "New website contact enquiry",
    "",
    `Name: ${name}`,
    company ? `Company: ${company}` : null,
    `Phone: ${phone}`,
    `Email: ${email}`,
    "",
    "Message:",
    message || "(No message provided)",
  ]
    .filter(Boolean)
    .join("\n");

export async function POST(request) {
  try {
    const payload = await request.json();
    const name = normalizeRequiredString(payload?.name);
    const company = normalizeOptionalString(payload?.company);
    const phone = normalizeRequiredString(payload?.phone);
    const email = normalizeRequiredString(payload?.email);
    const message = normalizeOptionalString(payload?.message);

    if (!name || !phone || !email) {
      return NextResponse.json(
        { error: "Name, phone, and email are required." },
        { status: 400 },
      );
    }

    const result = await sendWhatsAppMessage({
      to: CONTACT_WHATSAPP_TO,
      body: buildContactMessage({
        name,
        company,
        phone,
        email,
        message,
      }),
    });

    if (!result.success) {
      return NextResponse.json(
        { error: "Failed to send your message. Please try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact form submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit contact form." },
      { status: 500 },
    );
  }
}
