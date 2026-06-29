import { createHash, randomUUID } from "node:crypto";
import { oauthConfig } from "@/lib/config/oauth";
import { sequelize } from "@/lib/db/db";
import models from "@/lib/db/models";
import { consumeAuthorizationCodeInTransaction } from "@/lib/oauth/authorizationCodes";
import {
  generateAccessToken,
  generateRefreshToken,
  hashOAuthSecret,
} from "@/lib/oauth/secrets";

const OAUTH_AUDIT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export const OAUTH_TOKEN_EXCHANGE_ERROR_CODES = Object.freeze({
  invalidGrant: "invalid_grant",
  invalidRequest: "invalid_request",
  unsupportedGrantType: "unsupported_grant_type",
});

export const OAUTH_TOKEN_EXCHANGE_AUDIT_EVENTS = Object.freeze({
  issued: "oauth.token.issued",
});

export class OAuthTokenExchangeError extends Error {
  constructor({
    code = OAUTH_TOKEN_EXCHANGE_ERROR_CODES.invalidRequest,
    description,
    reasonCode,
    statusCode = 400,
  } = {}) {
    super(description || "Invalid OAuth token request.");
    this.name = "OAuthTokenExchangeError";
    this.code = code;
    this.reasonCode = reasonCode || code;
    this.statusCode = statusCode;
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

function buildAuditExpiry(createdAt) {
  return new Date(createdAt.getTime() + OAUTH_AUDIT_RETENTION_MS);
}

function appendSearchParam(searchParams, key, value) {
  if (Array.isArray(value)) {
    for (const item of value) {
      appendSearchParam(searchParams, key, item);
    }
    return;
  }

  searchParams.append(key, String(value));
}

function toSearchParams(input) {
  if (input instanceof URLSearchParams) {
    return new URLSearchParams(input);
  }

  if (typeof input === "string") {
    return new URLSearchParams(input);
  }

  if (!input || typeof input !== "object") {
    throw new TypeError("OAuth token request parameters are required.");
  }

  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) {
      continue;
    }

    appendSearchParam(searchParams, key, value);
  }

  return searchParams;
}

function getSingleRequiredParameter(searchParams, parameterName) {
  const values = searchParams.getAll(parameterName);

  if (values.length !== 1 || !values[0]?.trim()) {
    throw new OAuthTokenExchangeError({
      code: OAUTH_TOKEN_EXCHANGE_ERROR_CODES.invalidRequest,
      description: `${parameterName} must be provided exactly once.`,
      reasonCode: `${parameterName}_invalid`,
    });
  }

  return values[0].trim();
}

function getSingleOptionalParameter(searchParams, parameterName) {
  const values = searchParams.getAll(parameterName);

  if (values.length > 1) {
    throw new OAuthTokenExchangeError({
      code: OAUTH_TOKEN_EXCHANGE_ERROR_CODES.invalidRequest,
      description: `${parameterName} must not be duplicated.`,
      reasonCode: `${parameterName}_duplicated`,
    });
  }

  if (values.length === 0) {
    return null;
  }

  if (!values[0]?.trim()) {
    throw new OAuthTokenExchangeError({
      code: OAUTH_TOKEN_EXCHANGE_ERROR_CODES.invalidRequest,
      description: `${parameterName} must not be empty.`,
      reasonCode: `${parameterName}_invalid`,
    });
  }

  return values[0].trim();
}

function validateRedirectUri(redirectUri) {
  let parsedUri;

  try {
    parsedUri = new URL(redirectUri);
  } catch {
    throw new OAuthTokenExchangeError({
      code: OAUTH_TOKEN_EXCHANGE_ERROR_CODES.invalidRequest,
      description: "redirect_uri must be a valid absolute URL.",
      reasonCode: "redirect_uri_invalid",
    });
  }

  if (parsedUri.username || parsedUri.password || parsedUri.hash) {
    throw new OAuthTokenExchangeError({
      code: OAUTH_TOKEN_EXCHANGE_ERROR_CODES.invalidRequest,
      description: "redirect_uri must not include credentials or fragments.",
      reasonCode: "redirect_uri_invalid",
    });
  }

  return parsedUri.toString();
}

function normalizeScopes(scopes) {
  const normalizedScopes = [
    ...new Set((Array.isArray(scopes) ? scopes : []).map(String)),
  ]
    .map((scope) => scope.trim())
    .filter(Boolean);

  if (normalizedScopes.length === 0) {
    throw new OAuthTokenExchangeError({
      code: OAUTH_TOKEN_EXCHANGE_ERROR_CODES.invalidGrant,
      description: "Authorization code scopes are invalid.",
      reasonCode: "code_scope_invalid",
    });
  }

  return normalizedScopes;
}

function verifyPkceBinding({ authorizationCodeRecord, codeVerifier }) {
  const codeChallenge = authorizationCodeRecord.codeChallenge;
  const codeChallengeMethod = authorizationCodeRecord.codeChallengeMethod;

  if (!codeChallenge && !codeChallengeMethod) {
    return;
  }

  if (!codeVerifier) {
    throw new OAuthTokenExchangeError({
      code: OAUTH_TOKEN_EXCHANGE_ERROR_CODES.invalidGrant,
      description: "code_verifier is required for this authorization code.",
      reasonCode: "code_verifier_required",
    });
  }

  if (codeChallengeMethod === "plain") {
    if (codeVerifier !== codeChallenge) {
      throw new OAuthTokenExchangeError({
        code: OAUTH_TOKEN_EXCHANGE_ERROR_CODES.invalidGrant,
        description: "code_verifier does not match the authorization code.",
        reasonCode: "code_verifier_invalid",
      });
    }

    return;
  }

  if (codeChallengeMethod === "S256") {
    const calculatedChallenge = createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");

    if (calculatedChallenge !== codeChallenge) {
      throw new OAuthTokenExchangeError({
        code: OAUTH_TOKEN_EXCHANGE_ERROR_CODES.invalidGrant,
        description: "code_verifier does not match the authorization code.",
        reasonCode: "code_verifier_invalid",
      });
    }

    return;
  }

  throw new OAuthTokenExchangeError({
    code: OAUTH_TOKEN_EXCHANGE_ERROR_CODES.invalidGrant,
    description: "Authorization code PKCE binding is unsupported.",
    reasonCode: "code_challenge_method_unsupported",
  });
}

async function createTokenAuditEvent({
  clientId,
  correlationId,
  metadata,
  now,
  transaction,
  userId,
}) {
  const createdAt = normalizeDate(now);

  await models.OAuthAuditEvent.create(
    {
      clientId,
      correlationId,
      createdAt,
      eventType: OAUTH_TOKEN_EXCHANGE_AUDIT_EVENTS.issued,
      expiresAt: buildAuditExpiry(createdAt),
      metadata,
      outcome: "success",
      reasonCode: "token_issued_authorization_code",
      userId,
    },
    { transaction },
  );
}

export function parseAuthorizationCodeTokenRequest(parameters) {
  const searchParams = toSearchParams(parameters);
  const grantType = getSingleRequiredParameter(searchParams, "grant_type");

  if (grantType !== "authorization_code") {
    throw new OAuthTokenExchangeError({
      code: OAUTH_TOKEN_EXCHANGE_ERROR_CODES.unsupportedGrantType,
      description: "grant_type must be authorization_code.",
      reasonCode: "grant_type_unsupported",
    });
  }

  return {
    code: getSingleRequiredParameter(searchParams, "code"),
    codeVerifier: getSingleOptionalParameter(searchParams, "code_verifier"),
    grantType,
    redirectUri: validateRedirectUri(
      getSingleRequiredParameter(searchParams, "redirect_uri"),
    ),
  };
}

export async function exchangeAuthorizationCode({
  client,
  correlationId = randomUUID(),
  now = new Date(),
  parameters,
}) {
  if (!client?.id) {
    throw new TypeError("A persisted OAuth client is required.");
  }

  const issuedAt = normalizeDate(now);
  const parsedRequest = parseAuthorizationCodeTokenRequest(parameters);

  return sequelize.transaction(async (transaction) => {
    const { authorizationCodeRecord } =
      await consumeAuthorizationCodeInTransaction({
        authorizationCode: parsedRequest.code,
        clientId: client.id,
        correlationId,
        now: issuedAt,
        redirectUri: parsedRequest.redirectUri,
        transaction,
      });
    const normalizedScopes = normalizeScopes(authorizationCodeRecord.scopes);

    verifyPkceBinding({
      authorizationCodeRecord,
      codeVerifier: parsedRequest.codeVerifier,
    });

    const rawAccessToken = generateAccessToken();
    const rawRefreshToken = generateRefreshToken();
    const familyId = randomUUID();
    const accessTokenExpiresAt = new Date(
      issuedAt.getTime() + oauthConfig.accessTokenTtlSeconds * 1000,
    );
    const refreshTokenExpiresAt = new Date(
      issuedAt.getTime() + oauthConfig.refreshTokenTtlSeconds * 1000,
    );
    const accessTokenRecord = await models.OAuthAccessToken.create(
      {
        clientId: authorizationCodeRecord.clientId,
        expiresAt: accessTokenExpiresAt,
        refreshFamilyId: familyId,
        revokedAt: null,
        scopes: normalizedScopes,
        tokenHash: hashOAuthSecret(rawAccessToken),
        userId: authorizationCodeRecord.userId,
      },
      { transaction },
    );
    const refreshTokenRecord = await models.OAuthRefreshToken.create(
      {
        clientId: authorizationCodeRecord.clientId,
        consumedAt: null,
        expiresAt: refreshTokenExpiresAt,
        familyId,
        parentTokenId: null,
        revokedAt: null,
        scopes: normalizedScopes,
        tokenHash: hashOAuthSecret(rawRefreshToken),
        userId: authorizationCodeRecord.userId,
      },
      { transaction },
    );

    await createTokenAuditEvent({
      clientId: authorizationCodeRecord.clientId,
      correlationId,
      metadata: {
        accessTokenId: accessTokenRecord.id ?? null,
        authMethod: "authorization_code",
        refreshTokenId: refreshTokenRecord.id ?? null,
        scopeCount: normalizedScopes.length,
      },
      now: issuedAt,
      transaction,
      userId: authorizationCodeRecord.userId,
    });

    return {
      access_token: rawAccessToken,
      expires_in: oauthConfig.accessTokenTtlSeconds,
      refresh_token: rawRefreshToken,
      scope: normalizedScopes.join(" "),
      token_type: "bearer",
    };
  });
}
