import {
  OAUTH_ACCESS_TOKEN_ERROR_CODES,
  OAuthAccessTokenError,
  resolveOAuthAccessToken,
} from "@/lib/oauth/accessTokens";

const GPT_API_BEARER_REALM = "gpt-action-api";

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

export async function authenticateGptApiRequest(
  requestLike,
  { now, requiredScopes, resolveAccessToken = resolveOAuthAccessToken } = {},
) {
  const accessToken = extractBearerTokenFromRequest(requestLike);

  try {
    const principal = await resolveAccessToken(accessToken, { now });
    return assertRequiredScopes(principal, requiredScopes);
  } catch (error) {
    if (error instanceof GptApiAuthorizationError) {
      throw error;
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
