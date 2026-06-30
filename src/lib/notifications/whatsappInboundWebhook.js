import crypto from "node:crypto";

const PRODUCTION_NODE_ENV = "production";

const TWILIO_SIGNATURE_HEADER = "x-twilio-signature";

function normalizeTwilioSignatureParamValue(value) {
  if (Array.isArray(value)) {
    return [...value]
      .map((item) => String(item ?? ""))
      .sort()
      .join("");
  }

  return String(value ?? "");
}

function buildTwilioSignaturePayload(url, params) {
  return `${url}${Object.keys(params)
    .sort()
    .map((key) => `${key}${normalizeTwilioSignatureParamValue(params[key])}`)
    .join("")}`;
}

function buildExpectedTwilioSignature({ authToken, params, url }) {
  return crypto
    .createHmac("sha1", authToken)
    .update(buildTwilioSignaturePayload(url, params), "utf8")
    .digest("base64");
}

function timingSafeSignatureEqual(left, right) {
  const leftBuffer = Buffer.from(String(left ?? ""), "utf8");
  const rightBuffer = Buffer.from(String(right ?? ""), "utf8");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function isTwilioWebhookSignatureValid({ authToken, params, signature, url }) {
  if (!authToken || !signature || !url) {
    return false;
  }

  const expectedSignature = buildExpectedTwilioSignature({
    authToken,
    params,
    url,
  });

  return timingSafeSignatureEqual(expectedSignature, signature);
}

function parseTwilioWebhookBody(body) {
  const params = new URLSearchParams(body);
  const normalized = {};

  for (const [key, value] of params.entries()) {
    if (!Object.hasOwn(normalized, key)) {
      normalized[key] = value;
      continue;
    }

    normalized[key] = Array.isArray(normalized[key])
      ? [...normalized[key], value]
      : [normalized[key], value];
  }

  return normalized;
}

function getFirstParamValue(value) {
  if (Array.isArray(value)) {
    return String(value[0] ?? "");
  }

  return String(value ?? "");
}

function isWhatsAppAddress(value) {
  return getFirstParamValue(value).trim().toLowerCase().startsWith("whatsapp:");
}

function isInboundWhatsAppMessage(params) {
  const messageSid = getFirstParamValue(
    params.MessageSid || params.SmsMessageSid || params.SmsSid,
  );
  const from = params.From;
  const to = params.To;

  return Boolean(
    messageSid && isWhatsAppAddress(from) && isWhatsAppAddress(to),
  );
}

function getTwilioWebhookValidationUrl({
  configuredUrl = process.env.TWILIO_WHATSAPP_WEBHOOK_URL,
  nodeEnv = process.env.NODE_ENV,
  requestUrl,
}) {
  const normalizedConfiguredUrl = String(configuredUrl ?? "").trim();
  if (normalizedConfiguredUrl) {
    try {
      return new URL(normalizedConfiguredUrl).toString();
    } catch {
      return null;
    }
  }

  if (nodeEnv === PRODUCTION_NODE_ENV) {
    return null;
  }

  try {
    return new URL(String(requestUrl ?? "")).toString();
  } catch {
    return null;
  }
}

export {
  TWILIO_SIGNATURE_HEADER,
  getTwilioWebhookValidationUrl,
  isInboundWhatsAppMessage,
  isTwilioWebhookSignatureValid,
  parseTwilioWebhookBody,
};
