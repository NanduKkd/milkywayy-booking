import { randomUUID } from "node:crypto";
import models from "@/lib/db/models";

const OAUTH_AUDIT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_METADATA_DEPTH = 4;
const MAX_METADATA_KEYS = 25;
const MAX_ARRAY_ITEMS = 25;
const MAX_STRING_LENGTH = 256;

const SENSITIVE_METADATA_KEYS = new Set([
  "access_token",
  "authorization",
  "authorization_code",
  "authorization_header",
  "client_secret",
  "code",
  "cookie",
  "id_token",
  "otp",
  "password",
  "refresh_token",
  "secret",
  "session",
  "token",
]);

export const OAUTH_AUDIT_EVENTS = Object.freeze({
  authorizationApproved: "oauth.authorization.approved",
  authorizationDenied: "oauth.authorization.denied",
  authorizationInvalidClient: "oauth.authorization.invalid_client",
  authorizationInvalidRedirect: "oauth.authorization.invalid_redirect",
  authorizationCodeConsumed: "oauth.authorization_code.consumed",
  authorizationCodeInvalidGrant: "oauth.authorization_code.invalid_grant",
  authorizationCodeIssued: "oauth.authorization_code.issued",
  authorizationCodeReplayRejected: "oauth.authorization_code.replay_rejected",
  consentRevoked: "oauth.consent.revoked",
  invalidClient: "oauth.client.invalid",
  refreshInvalidGrant: "oauth.refresh_token.invalid_grant",
  refreshReplayDetected: "oauth.refresh_token.replay_detected",
  tokenIssued: "oauth.token.issued",
});

export const OAUTH_AUDIT_OUTCOMES = Object.freeze({
  failure: "failure",
  success: "success",
});

export const OAUTH_AUDIT_PERSISTENCE = Object.freeze({
  failClosed: "fail_closed",
  failOpen: "fail_open",
});

export const OAUTH_AUDIT_METRIC_CLASSIFICATIONS = Object.freeze({
  failure: "failure",
  securityFailure: "security_failure",
  success: "success",
  userDenial: "user_denial",
});

function normalizeDate(value) {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new TypeError("A valid date is required.");
  }

  return date;
}

function buildAuditExpiry(createdAt) {
  return new Date(createdAt.getTime() + OAUTH_AUDIT_RETENTION_MS);
}

function normalizeMetadataKey(key) {
  return String(key ?? "")
    .trim()
    .slice(0, 64);
}

function isSensitiveMetadataKey(key) {
  return SENSITIVE_METADATA_KEYS.has(
    normalizeMetadataKey(key)
      .replace(/([a-z0-9])([A-Z])/gu, "$1_$2")
      .toLowerCase()
      .replace(/[\s-]+/gu, "_"),
  );
}

function sanitizeMetadataValue(value, depth = 0) {
  if (value === null || value === undefined) {
    return null;
  }

  if (depth >= MAX_METADATA_DEPTH) {
    return "[TRUNCATED]";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    return value.length > MAX_STRING_LENGTH
      ? `${value.slice(0, MAX_STRING_LENGTH)}...`
      : value;
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
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => sanitizeMetadataValue(item, depth + 1));
  }

  if (typeof value === "object") {
    const sanitizedObject = {};

    for (const [rawKey, rawValue] of Object.entries(value).slice(
      0,
      MAX_METADATA_KEYS,
    )) {
      const key = normalizeMetadataKey(rawKey);

      if (!key) {
        continue;
      }

      sanitizedObject[key] = isSensitiveMetadataKey(key)
        ? "[REDACTED]"
        : sanitizeMetadataValue(rawValue, depth + 1);
    }

    return sanitizedObject;
  }

  return String(value).slice(0, MAX_STRING_LENGTH);
}

export function sanitizeOAuthAuditMetadata(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  return sanitizeMetadataValue(metadata, 0);
}

function buildDefaultMetric({ eventType, outcome, reasonCode }) {
  if (eventType === OAUTH_AUDIT_EVENTS.authorizationDenied) {
    return {
      classification: OAUTH_AUDIT_METRIC_CLASSIFICATIONS.userDenial,
      name: "oauth.authorization.denied",
    };
  }

  if (
    eventType === OAUTH_AUDIT_EVENTS.invalidClient ||
    eventType === OAUTH_AUDIT_EVENTS.authorizationInvalidClient ||
    eventType === OAUTH_AUDIT_EVENTS.authorizationInvalidRedirect ||
    eventType === OAUTH_AUDIT_EVENTS.authorizationCodeReplayRejected ||
    eventType === OAUTH_AUDIT_EVENTS.refreshReplayDetected
  ) {
    return {
      classification: OAUTH_AUDIT_METRIC_CLASSIFICATIONS.securityFailure,
      name: eventType,
    };
  }

  if (
    eventType === OAUTH_AUDIT_EVENTS.tokenIssued &&
    reasonCode === "token_issued_refresh_token"
  ) {
    return {
      classification: OAUTH_AUDIT_METRIC_CLASSIFICATIONS.success,
      name: "oauth.token.refresh",
    };
  }

  if (eventType === OAUTH_AUDIT_EVENTS.tokenIssued) {
    return {
      classification: OAUTH_AUDIT_METRIC_CLASSIFICATIONS.success,
      name: "oauth.token.issue",
    };
  }

  if (eventType === OAUTH_AUDIT_EVENTS.authorizationApproved) {
    return {
      classification: OAUTH_AUDIT_METRIC_CLASSIFICATIONS.success,
      name: "oauth.authorization.approved",
    };
  }

  if (eventType === OAUTH_AUDIT_EVENTS.consentRevoked) {
    return {
      classification: OAUTH_AUDIT_METRIC_CLASSIFICATIONS.success,
      name: "oauth.connection.revoked",
    };
  }

  return {
    classification:
      outcome === OAUTH_AUDIT_OUTCOMES.failure
        ? OAUTH_AUDIT_METRIC_CLASSIFICATIONS.failure
        : OAUTH_AUDIT_METRIC_CLASSIFICATIONS.success,
    name: eventType,
  };
}

function emitStructuredLog(label, payload, level = "info") {
  const logger =
    level === "error"
      ? console.error
      : level === "warn"
        ? console.warn
        : console.info;

  logger(label, payload);
}

function emitAuditLogs(payload, level, transaction) {
  const emit = () => {
    emitStructuredLog("[OAUTH_AUDIT]", payload, level);
    emitStructuredLog(
      "[OAUTH_METRIC]",
      {
        clientId: payload.clientId,
        correlationId: payload.correlationId,
        eventType: payload.eventType,
        metric: payload.metric,
        outcome: payload.outcome,
        reasonCode: payload.reasonCode,
        userId: payload.userId,
      },
      "info",
    );
  };

  if (typeof transaction?.afterCommit === "function") {
    transaction.afterCommit(emit);
    return;
  }

  emit();
}

export async function recordOAuthAuditEvent({
  clientId = null,
  correlationId = randomUUID(),
  eventType,
  logLevel,
  metadata = {},
  metric,
  now = new Date(),
  outcome = OAUTH_AUDIT_OUTCOMES.success,
  persistence = OAUTH_AUDIT_PERSISTENCE.failClosed,
  reasonCode = null,
  transaction,
  userId = null,
}) {
  if (typeof eventType !== "string" || eventType.trim().length === 0) {
    throw new TypeError("OAuth audit eventType is required.");
  }

  const createdAt = normalizeDate(now);
  const sanitizedMetadata = sanitizeOAuthAuditMetadata(metadata);
  const resolvedMetric = {
    ...buildDefaultMetric({ eventType, outcome, reasonCode }),
    ...(metric && typeof metric === "object"
      ? sanitizeMetadataValue(metric)
      : {}),
  };
  const resolvedLogLevel =
    logLevel ||
    (resolvedMetric.classification ===
    OAUTH_AUDIT_METRIC_CLASSIFICATIONS.securityFailure
      ? "warn"
      : outcome === OAUTH_AUDIT_OUTCOMES.failure
        ? "warn"
        : "info");
  const record = {
    clientId,
    correlationId,
    createdAt,
    eventType,
    expiresAt: buildAuditExpiry(createdAt),
    metadata: sanitizedMetadata,
    outcome,
    reasonCode,
    userId,
  };
  const auditLogPayload = {
    ...record,
    metric: resolvedMetric,
  };

  try {
    const auditEvent = await models.OAuthAuditEvent.create(record, {
      transaction,
    });

    emitAuditLogs(auditLogPayload, resolvedLogLevel, transaction);

    return {
      auditEvent,
      correlationId,
      metric: resolvedMetric,
    };
  } catch (error) {
    emitStructuredLog(
      "[OAUTH_AUDIT_PERSIST_FAILURE]",
      {
        clientId,
        correlationId,
        eventType,
        outcome,
        persistence,
        reasonCode,
        userId,
      },
      "error",
    );

    if (persistence === OAUTH_AUDIT_PERSISTENCE.failOpen) {
      return {
        auditEvent: null,
        correlationId,
        metric: resolvedMetric,
      };
    }

    throw error;
  }
}
