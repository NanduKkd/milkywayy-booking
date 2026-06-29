import { USER_ROLES } from "@/lib/config/app.config";
import models from "@/lib/db/models";
import { hashOAuthSecret } from "@/lib/oauth/secrets";

export const OAUTH_ACCESS_TOKEN_ERROR_CODES = Object.freeze({
  invalidToken: "invalid_token",
});

export class OAuthAccessTokenError extends Error {
  constructor({
    code = OAUTH_ACCESS_TOKEN_ERROR_CODES.invalidToken,
    description = "OAuth access token is invalid.",
    reasonCode = "access_token_invalid",
    statusCode = 401,
  } = {}) {
    super(description);
    this.name = "OAuthAccessTokenError";
    this.code = code;
    this.reasonCode = reasonCode;
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

function normalizeScopes(scopes) {
  return [...new Set((Array.isArray(scopes) ? scopes : []).map(String))]
    .map((scope) => scope.trim())
    .filter(Boolean)
    .sort();
}

function buildTokenLookupInclude() {
  return [
    {
      as: "user",
      attributes: ["id", "role"],
      model: models.User,
      required: false,
    },
  ];
}

export async function resolveOAuthAccessToken(
  rawAccessToken,
  {
    loadActiveAccessToken = (tokenHash, now) =>
      models.OAuthAccessToken.scope({
        method: ["active", now],
      }).findOne({
        attributes: [
          "clientId",
          "expiresAt",
          "id",
          "revokedAt",
          "scopes",
          "userId",
        ],
        include: buildTokenLookupInclude(),
        where: {
          tokenHash,
        },
      }),
    loadAccessToken = (tokenHash) =>
      models.OAuthAccessToken.findOne({
        attributes: [
          "clientId",
          "expiresAt",
          "id",
          "revokedAt",
          "scopes",
          "userId",
        ],
        include: buildTokenLookupInclude(),
        where: {
          tokenHash,
        },
      }),
    now = new Date(),
  } = {},
) {
  const token = String(rawAccessToken ?? "").trim();

  if (!token) {
    throw new OAuthAccessTokenError({
      description: "OAuth access token is required.",
      reasonCode: "access_token_missing",
    });
  }

  const resolvedAt = normalizeDate(now);
  const tokenHash = hashOAuthSecret(token);
  const accessTokenRecord = await loadActiveAccessToken(tokenHash, resolvedAt);

  if (accessTokenRecord) {
    const normalizedScopes = normalizeScopes(accessTokenRecord.scopes);

    if (normalizedScopes.length === 0) {
      throw new OAuthAccessTokenError({
        description: "OAuth access token scopes are invalid.",
        reasonCode: "access_token_scope_invalid",
      });
    }

    if (accessTokenRecord.user?.role !== USER_ROLES.CUSTOMER) {
      throw new OAuthAccessTokenError({
        description: "OAuth access token principal is unavailable.",
        reasonCode: "access_token_principal_unavailable",
      });
    }

    return {
      accessTokenId: accessTokenRecord.id,
      clientId: accessTokenRecord.clientId,
      customerId: accessTokenRecord.userId,
      scopes: normalizedScopes,
    };
  }

  const inactiveAccessTokenRecord = await loadAccessToken(tokenHash);

  if (!inactiveAccessTokenRecord) {
    throw new OAuthAccessTokenError({
      description: "OAuth access token is unknown.",
      reasonCode: "access_token_unknown",
    });
  }

  if (inactiveAccessTokenRecord.revokedAt) {
    throw new OAuthAccessTokenError({
      description: "OAuth access token has been revoked.",
      reasonCode: "access_token_revoked",
    });
  }

  const expiresAt = normalizeDate(inactiveAccessTokenRecord.expiresAt);

  if (expiresAt.getTime() <= resolvedAt.getTime()) {
    throw new OAuthAccessTokenError({
      description: "OAuth access token has expired.",
      reasonCode: "access_token_expired",
    });
  }

  throw new OAuthAccessTokenError({
    description: "OAuth access token principal is unavailable.",
    reasonCode: "access_token_principal_unavailable",
  });
}
