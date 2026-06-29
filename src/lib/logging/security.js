const MAX_DEPTH = 4;
const MAX_KEYS = 25;
const MAX_ITEMS = 25;
const MAX_STRING_LENGTH = 512;

const SENSITIVE_LOG_KEYS = new Set([
  "access_token",
  "authorization",
  "authorization_header",
  "client_secret",
  "cookie",
  "id_token",
  "otp",
  "password",
  "refresh_token",
  "secret",
  "session",
  "token",
]);

const EMBEDDED_SECRET_PATTERNS = [
  {
    pattern: /(Authorization:\s*(?:Bearer|Basic)\s+)([^\s,;]+)/giu,
    replacement: "$1[REDACTED]",
  },
  {
    pattern:
      /(\b(?:access_token|refresh_token|client_secret|authorization_header|cookie|otp|password|secret|session|token|code)\b(?:["']?\s*[:=]\s*["']?|=))([^&\s"',}\]]+)/giu,
    replacement: "$1[REDACTED]",
  },
];

function normalizeSensitiveKey(key) {
  return String(key ?? "")
    .trim()
    .replace(/([a-z0-9])([A-Z])/gu, "$1_$2")
    .toLowerCase()
    .replace(/[\s-]+/gu, "_");
}

function isSensitiveKey(key) {
  return SENSITIVE_LOG_KEYS.has(normalizeSensitiveKey(key));
}

function truncateString(value) {
  return value.length > MAX_STRING_LENGTH
    ? `${value.slice(0, MAX_STRING_LENGTH)}...`
    : value;
}

export function redactSensitiveString(value) {
  let sanitized = String(value ?? "");

  for (const { pattern, replacement } of EMBEDDED_SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern, replacement);
  }

  return truncateString(sanitized);
}

function sanitizeObjectEntries(value, depth) {
  const sanitized = {};

  for (const [rawKey, rawValue] of Object.entries(value).slice(0, MAX_KEYS)) {
    const key = String(rawKey ?? "")
      .trim()
      .slice(0, 64);

    if (!key) {
      continue;
    }

    sanitized[key] = isSensitiveKey(key)
      ? "[REDACTED]"
      : sanitizeLogValue(rawValue, depth + 1);
  }

  return sanitized;
}

function sanitizeError(error, depth) {
  const sanitized = sanitizeObjectEntries(error, depth);

  if (typeof error.name === "string" && error.name.trim()) {
    sanitized.name = error.name;
  }

  if (typeof error.message === "string" && error.message.trim()) {
    sanitized.message = redactSensitiveString(error.message);
  }

  return sanitized;
}

export function sanitizeLogValue(value, depth = 0) {
  if (value === null || value === undefined) {
    return null;
  }

  if (depth >= MAX_DEPTH) {
    return "[TRUNCATED]";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Error) {
    return sanitizeError(value, depth);
  }

  if (typeof value === "string") {
    return redactSensitiveString(value);
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ITEMS)
      .map((item) => sanitizeLogValue(item, depth + 1));
  }

  if (typeof value === "object") {
    return sanitizeObjectEntries(value, depth);
  }

  return truncateString(String(value));
}

export function sanitizeLogPayload(payload) {
  return sanitizeLogValue(payload, 0);
}

export function logSecurityError(label, error, context = {}) {
  console.error(label, {
    ...sanitizeLogPayload(context),
    error: sanitizeLogPayload(error),
  });
}
