import { randomUUID } from "node:crypto";
import { oauthConfig } from "@/lib/config/oauth";
import { sequelize } from "@/lib/db/db";
import models from "@/lib/db/models";
import {
  OAUTH_AUDIT_EVENTS,
  OAUTH_AUDIT_OUTCOMES,
  recordOAuthAuditEvent,
} from "@/lib/oauth/audit";
import {
  generateAuthorizationCode,
  hashOAuthSecret,
} from "@/lib/oauth/secrets";

export const OAUTH_AUTHORIZATION_CODE_ERROR_CODES = Object.freeze({
  invalidGrant: "invalid_grant",
});

export const OAUTH_AUTHORIZATION_CODE_AUDIT_EVENTS = Object.freeze({
  issued: OAUTH_AUDIT_EVENTS.authorizationCodeIssued,
  consumed: OAUTH_AUDIT_EVENTS.authorizationCodeConsumed,
  invalidGrant: OAUTH_AUDIT_EVENTS.authorizationCodeInvalidGrant,
  replayRejected: OAUTH_AUDIT_EVENTS.authorizationCodeReplayRejected,
});

export class OAuthAuthorizationCodeError extends Error {
  constructor({
    code = OAUTH_AUTHORIZATION_CODE_ERROR_CODES.invalidGrant,
    description = "Authorization code is invalid.",
    reasonCode = "invalid_grant",
  } = {}) {
    super(description);
    this.name = "OAuthAuthorizationCodeError";
    this.code = code;
    this.reasonCode = reasonCode;
  }
}

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

function normalizeScopes(scopes) {
  const normalizedScopes = [
    ...new Set((Array.isArray(scopes) ? scopes : []).map(String)),
  ]
    .map((scope) => scope.trim())
    .filter(Boolean);

  if (normalizedScopes.length === 0) {
    throw new TypeError("Authorization code scopes are required.");
  }

  return normalizedScopes;
}

async function createAuthorizationCodeAuditEvent({
  clientId = null,
  correlationId,
  eventType,
  metadata = {},
  now,
  outcome,
  reasonCode = null,
  transaction,
  userId = null,
}) {
  await recordOAuthAuditEvent({
    clientId,
    correlationId,
    eventType,
    metadata,
    now,
    outcome,
    reasonCode,
    transaction,
    userId,
  });
}

async function rejectAuthorizationCode({
  authorizationCodeRecord = null,
  clientId = null,
  correlationId,
  eventType = OAUTH_AUTHORIZATION_CODE_AUDIT_EVENTS.invalidGrant,
  now,
  reasonCode,
  transaction,
}) {
  await createAuthorizationCodeAuditEvent({
    clientId: authorizationCodeRecord?.clientId ?? clientId,
    correlationId,
    eventType,
    metadata: {},
    now,
    outcome: OAUTH_AUDIT_OUTCOMES.failure,
    reasonCode,
    transaction,
    userId: authorizationCodeRecord?.userId ?? null,
  });

  throw new OAuthAuthorizationCodeError({
    reasonCode,
  });
}

export async function issueAuthorizationCode({
  clientId,
  correlationId = randomUUID(),
  now = new Date(),
  redirectUri,
  scopes,
  userId,
}) {
  const issuedAt = normalizeDate(now);
  const normalizedScopes = normalizeScopes(scopes);
  const rawCode = generateAuthorizationCode();
  const expiresAt = new Date(
    issuedAt.getTime() + oauthConfig.codeTtlSeconds * 1000,
  );

  const authorizationCodeRecord = await sequelize.transaction(
    async (transaction) => {
      const createdRecord = await models.OAuthAuthorizationCode.create(
        {
          clientId,
          codeHash: hashOAuthSecret(rawCode),
          consumedAt: null,
          expiresAt,
          redirectUri: String(redirectUri),
          scopes: normalizedScopes,
          userId,
        },
        { transaction },
      );

      await createAuthorizationCodeAuditEvent({
        clientId,
        correlationId,
        eventType: OAUTH_AUTHORIZATION_CODE_AUDIT_EVENTS.issued,
        metadata: {
          scopeCount: normalizedScopes.length,
        },
        now: issuedAt,
        outcome: OAUTH_AUDIT_OUTCOMES.success,
        reasonCode: "authorization_code_issued",
        transaction,
        userId,
      });

      return createdRecord;
    },
  );

  return {
    authorizationCode: rawCode,
    authorizationCodeRecord,
    correlationId,
    expiresAt,
  };
}

export async function consumeAuthorizationCode({
  authorizationCode,
  clientId,
  correlationId = randomUUID(),
  now = new Date(),
  redirectUri,
}) {
  return sequelize.transaction(async (transaction) =>
    consumeAuthorizationCodeInTransaction({
      authorizationCode,
      clientId,
      correlationId,
      now,
      redirectUri,
      transaction,
    }),
  );
}

export async function consumeAuthorizationCodeInTransaction({
  authorizationCode,
  clientId,
  correlationId = randomUUID(),
  now = new Date(),
  redirectUri,
  transaction,
}) {
  if (!transaction) {
    throw new TypeError("A Sequelize transaction is required.");
  }

  const consumedAt = normalizeDate(now);
  const codeHash = hashOAuthSecret(String(authorizationCode ?? ""));
  const authorizationCodeRecord = await models.OAuthAuthorizationCode.findOne({
    where: {
      codeHash,
    },
    lock: transaction.LOCK.UPDATE,
    transaction,
  });

  if (!authorizationCodeRecord) {
    return rejectAuthorizationCode({
      clientId,
      correlationId,
      now: consumedAt,
      reasonCode: "code_not_found",
      transaction,
    });
  }

  if (authorizationCodeRecord.clientId !== clientId) {
    return rejectAuthorizationCode({
      authorizationCodeRecord,
      correlationId,
      now: consumedAt,
      reasonCode: "client_mismatch",
      transaction,
    });
  }

  if (authorizationCodeRecord.redirectUri !== String(redirectUri)) {
    return rejectAuthorizationCode({
      authorizationCodeRecord,
      correlationId,
      now: consumedAt,
      reasonCode: "redirect_uri_mismatch",
      transaction,
    });
  }

  if (authorizationCodeRecord.expiresAt.getTime() <= consumedAt.getTime()) {
    return rejectAuthorizationCode({
      authorizationCodeRecord,
      correlationId,
      now: consumedAt,
      reasonCode: "code_expired",
      transaction,
    });
  }

  if (authorizationCodeRecord.consumedAt) {
    return rejectAuthorizationCode({
      authorizationCodeRecord,
      correlationId,
      eventType: OAUTH_AUTHORIZATION_CODE_AUDIT_EVENTS.replayRejected,
      now: consumedAt,
      reasonCode: "code_replayed",
      transaction,
    });
  }

  await authorizationCodeRecord.update(
    {
      consumedAt,
    },
    { transaction },
  );

  await createAuthorizationCodeAuditEvent({
    clientId: authorizationCodeRecord.clientId,
    correlationId,
    eventType: OAUTH_AUTHORIZATION_CODE_AUDIT_EVENTS.consumed,
    metadata: {
      scopeCount: Array.isArray(authorizationCodeRecord.scopes)
        ? authorizationCodeRecord.scopes.length
        : 0,
    },
    now: consumedAt,
    outcome: OAUTH_AUDIT_OUTCOMES.success,
    reasonCode: "authorization_code_consumed",
    transaction,
    userId: authorizationCodeRecord.userId,
  });

  return {
    authorizationCodeRecord,
    correlationId,
  };
}
