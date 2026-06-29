import {
  OAUTH_ACCESS_TOKEN_ERROR_CODES,
  OAuthAccessTokenError,
  resolveOAuthAccessToken,
} from "@/lib/oauth/accessTokens";
import {
  consumeRateLimit,
  RateLimitExceededError,
} from "@/lib/services/oauthRateLimits";

const GPT_API_BEARER_REALM = "gpt-action-api";

export const GPT_API_RATE_LIMITS = Object.freeze({
  client: {
    bucketType: "oauth-gpt-resource-client",
    limit: 120,
    windowMs: 60 * 1000,
  },
  user: {
    bucketType: "oauth-gpt-resource-user",
    limit: 90,
    windowMs: 60 * 1000,
  },
});

export const GPT_API_AUTH_ERROR_CODES = Object.freeze({
  insufficientScope: "insufficient_scope",
  invalidRequest: "invalid_request",
  invalidToken: OAUTH_ACCESS_TOKEN_ERROR_CODES.invalidToken,
});

export class GptApiAuthorizationError extends Error {
  constructor({
    code = GPT_API_AUTH_ERROR_CODES.invalidToken,
    description = "Authentication is required.",
    headers,
    reasonCode = "authorization_invalid",
    statusCode = 401,
  } = {}) {
    super(description);
    this.name = "GptApiAuthorizationError";
    this.code = code;
    this.description = description;
    this.headers = headers || buildBearerAuthenticateHeaders({ code });
    this.reasonCode = reasonCode;
    this.statusCode = statusCode;
  }
}

export class GptApiRateLimitError extends Error {
  constructor({ bucketType, retryAfterSeconds }) {
    super("Too many requests. Please wait before trying again.");
    this.name = "GptApiRateLimitError";
    this.bucketType = bucketType;
    this.retryAfterSeconds = retryAfterSeconds;
    this.statusCode = 429;
  }
}

function normalizeScopeList(scopes) {
  const scopeList = Array.isArray(scopes)
    ? scopes
    : scopes === undefined || scopes === null
      ? []
      : [scopes];

  return [...new Set(scopeList.map(String))]
    .map((scope) => scope.trim())
    .filter(Boolean)
    .sort();
}

function buildBearerAuthenticateValue({ code, description, scope } = {}) {
  const parameters = [`realm="${GPT_API_BEARER_REALM}"`];

  if (code) {
    parameters.push(`error="${code}"`);
  }

  if (description) {
    parameters.push(
      `error_description="${String(description).replaceAll('"', "")}"`,
    );
  }

  if (scope) {
    parameters.push(`scope="${scope}"`);
  }

  return `Bearer ${parameters.join(", ")}`;
}

export function buildBearerAuthenticateHeaders({
  code,
  description,
  scope,
} = {}) {
  return {
    "WWW-Authenticate": buildBearerAuthenticateValue({
      code,
      description,
      scope,
    }),
  };
}

export function extractBearerTokenFromRequest(requestLike) {
  const authorizationHeader = requestLike?.headers?.get
    ? requestLike.headers.get("authorization")
    : requestLike?.headers?.authorization;
  const normalizedHeader = String(authorizationHeader ?? "").trim();

  if (!normalizedHeader) {
    throw new GptApiAuthorizationError({
      code: GPT_API_AUTH_ERROR_CODES.invalidToken,
      description: "Bearer token is required.",
      headers: buildBearerAuthenticateHeaders(),
      reasonCode: "authorization_missing",
      statusCode: 401,
    });
  }

  const match = normalizedHeader.match(/^Bearer\s+(.+)$/iu);

  if (!match) {
    throw new GptApiAuthorizationError({
      code: GPT_API_AUTH_ERROR_CODES.invalidRequest,
      description: "Authorization header must use the Bearer scheme.",
      headers: buildBearerAuthenticateHeaders({
        code: GPT_API_AUTH_ERROR_CODES.invalidRequest,
        description: "Authorization header must use the Bearer scheme.",
      }),
      reasonCode: "authorization_scheme_invalid",
      statusCode: 401,
    });
  }

  const token = match[1].trim();

  if (!token) {
    throw new GptApiAuthorizationError({
      code: GPT_API_AUTH_ERROR_CODES.invalidRequest,
      description: "Bearer token must not be empty.",
      headers: buildBearerAuthenticateHeaders({
        code: GPT_API_AUTH_ERROR_CODES.invalidRequest,
        description: "Bearer token must not be empty.",
      }),
      reasonCode: "authorization_token_missing",
      statusCode: 401,
    });
  }

  return token;
}

function assertRequiredScopes(principal, requiredScopes) {
  const normalizedRequiredScopes = normalizeScopeList(requiredScopes);

  if (normalizedRequiredScopes.length === 0) {
    return principal;
  }

  const grantedScopes = new Set(normalizeScopeList(principal.scopes));
  const missingScope = normalizedRequiredScopes.find(
    (scope) => !grantedScopes.has(scope),
  );

  if (!missingScope) {
    return principal;
  }

  throw new GptApiAuthorizationError({
    code: GPT_API_AUTH_ERROR_CODES.insufficientScope,
    description: "Bearer token does not grant the required scope.",
    headers: buildBearerAuthenticateHeaders({
      code: GPT_API_AUTH_ERROR_CODES.insufficientScope,
      description: "Bearer token does not grant the required scope.",
      scope: normalizedRequiredScopes.join(" "),
    }),
    reasonCode: "scope_missing",
    statusCode: 403,
  });
}

async function consumeGptApiRateLimits(
  principal,
  {
    consumePrincipalRateLimit = consumeRateLimit,
    rateLimits = GPT_API_RATE_LIMITS,
    now,
  } = {},
) {
  const resolvedNow =
    now instanceof Date ? now : now ? new Date(now) : new Date();

  await consumePrincipalRateLimit({
    bucketType: rateLimits.client.bucketType,
    key: `client:${principal.clientId}`,
    limit: rateLimits.client.limit,
    now: resolvedNow,
    windowMs: rateLimits.client.windowMs,
  });

  await consumePrincipalRateLimit({
    bucketType: rateLimits.user.bucketType,
    key: `user:${principal.customerId}`,
    limit: rateLimits.user.limit,
    now: resolvedNow,
    windowMs: rateLimits.user.windowMs,
  });
}

export async function authenticateGptApiRequest(
  requestLike,
  {
    consumePrincipalRateLimit = consumeRateLimit,
    now,
    rateLimits = GPT_API_RATE_LIMITS,
    requiredScopes,
    resolveAccessToken = resolveOAuthAccessToken,
  } = {},
) {
  const accessToken = extractBearerTokenFromRequest(requestLike);
  const resolvedNow =
    now instanceof Date ? now : now ? new Date(now) : undefined;

  try {
    const principal = await resolveAccessToken(accessToken, {
      now: resolvedNow,
    });
    await consumeGptApiRateLimits(principal, {
      consumePrincipalRateLimit,
      now: resolvedNow,
      rateLimits,
    });
    return assertRequiredScopes(principal, requiredScopes);
  } catch (error) {
    if (error instanceof GptApiAuthorizationError) {
      throw error;
    }

    if (error instanceof RateLimitExceededError) {
      throw new GptApiRateLimitError({
        bucketType: error.bucketType,
        retryAfterSeconds: error.retryAfterSeconds,
      });
    }

    if (error instanceof OAuthAccessTokenError) {
      throw new GptApiAuthorizationError({
        code: GPT_API_AUTH_ERROR_CODES.invalidToken,
        description: error.description || "Bearer token is invalid.",
        headers: buildBearerAuthenticateHeaders({
          code: GPT_API_AUTH_ERROR_CODES.invalidToken,
          description: error.description || "Bearer token is invalid.",
        }),
        reasonCode: error.reasonCode,
        statusCode: 401,
      });
    }

    throw error;
  }
}

export function buildGptApiAuthorizationErrorResponse(error) {
  if (!(error instanceof GptApiAuthorizationError)) {
    throw error;
  }

  return new Response(
    JSON.stringify({
      error: error.code,
    }),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        ...error.headers,
      },
      status: error.statusCode,
    },
  );
}
