import { sendWhatsAppTemplate } from "@/lib/notifications/whatsapp";

const DUBAI_TIMEZONE = "Asia/Dubai";

export const ADMIN_BOOKING_HANDOFF_WHATSAPP_TEMPLATES = {
  existing: "admin_booking_handoff_checkout",
  new: "admin_booking_handoff_registration",
};

function resolveCustomerName(customer) {
  if (!customer) return "there";

  if (customer.accountType === "COMPANY") {
    return (
      customer.companyName ||
      customer.fullName ||
      customer.displayName ||
      customer.email ||
      "there"
    );
  }

  return (
    customer.fullName ||
    customer.displayName ||
    customer.email ||
    customer.phone ||
    "there"
  );
}

function buildPropertySummary(propertyPreviews = []) {
  if (!Array.isArray(propertyPreviews) || propertyPreviews.length === 0) {
    return "your prepared booking";
  }

  const [firstProperty] = propertyPreviews;
  const firstLabel = [firstProperty?.label, firstProperty?.locationLabel]
    .filter(Boolean)
    .join(" at ");

  if (propertyPreviews.length === 1) {
    return firstLabel || "your prepared booking";
  }

  return firstLabel
    ? `${propertyPreviews.length} properties including ${firstLabel}`
    : `${propertyPreviews.length} properties prepared`;
}

function formatExpiry(expiresAt) {
  if (!expiresAt) return "";

  const date = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: DUBAI_TIMEZONE,
  }).format(date);
}

function buildAdminBookingHandoffWhatsAppVariables({
  customer,
  propertyPreviews,
  url,
  expiresAt,
}) {
  return {
    Client_Name: resolveCustomerName(customer),
    Property_Summary: buildPropertySummary(propertyPreviews),
    Handoff_Link: String(url || "").trim(),
    Expires_At: formatExpiry(expiresAt),
  };
}

export function getAdminBookingHandoffWhatsAppTemplateName({
  requiresRegistration,
} = {}) {
  return requiresRegistration
    ? ADMIN_BOOKING_HANDOFF_WHATSAPP_TEMPLATES.new
    : ADMIN_BOOKING_HANDOFF_WHATSAPP_TEMPLATES.existing;
}

export async function sendAdminBookingHandoffWhatsApp({
  customer,
  propertyPreviews,
  url,
  expiresAt,
  requiresRegistration,
} = {}) {
  const templateName = getAdminBookingHandoffWhatsAppTemplateName({
    requiresRegistration,
  });
  const variables = buildAdminBookingHandoffWhatsAppVariables({
    customer,
    propertyPreviews,
    url,
    expiresAt,
  });

  try {
    const result = await sendWhatsAppTemplate({
      to: customer?.phone,
      templateName,
      variables,
    });

    return {
      attempted: true,
      channel: "whatsapp",
      sent: Boolean(result?.success),
      templateName,
      error: result?.success
        ? null
        : result?.error || "Failed to send WhatsApp handoff",
    };
  } catch (error) {
    console.error("Error sending booking handoff WhatsApp:", error);

    return {
      attempted: true,
      channel: "whatsapp",
      sent: false,
      templateName,
      error: error?.message || "Failed to send WhatsApp handoff",
    };
  }
}
