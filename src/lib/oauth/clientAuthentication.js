import models from "@/lib/db/models/index.js";
import { consumeRateLimit } from "@/lib/services/oauthRateLimits";
import { verifyOAuthClientSecret } from "./clientProvisioning";

export const OAUTH_CLIENT_AUTHENTICATION_ERROR_CODES = Object.freeze({
  invalidClient: "invalid_client",
});

export const OAUTH_CLIENT_AUTH_RATE_LIMIT = Object.freeze({
  bucketType: "oauth-client-auth-client",
  limit: 30,
  windowMs: 60 * 1000,
});

export class OAuthClientAuthenticationError extends Error {
  constructor({
    code = OAUTH_CLIENT_AUTHENTICATION_ERROR_CODES.invalidClient,
    description = "OAuth client authentication failed.",
    reasonCode,
    statusCode = 401,
  } = {}) {
    super(description);
    this.name = "OAuthClientAuthenticationError";
    this.code = code;
    this.reasonCode = reasonCode || code;
    this.statusCode = statusCode;
    this.headers = {
      "WWW-Authenticate": 'Basic realm="oauth"',
    };
  }
}

function assertNonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new OAuthClientAuthenticationError({
      reasonCode: `${label}_invalid`,
    });
  }
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
    return new URLSearchParams();
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

function readHeader(headers, key) {
  if (!headers) {
    return "";
  }

  if (headers instanceof Headers) {
    return headers.get(key) || "";
  }

  const lookupKey = Object.keys(headers).find(
    (candidate) => candidate.toLowerCase() === key.toLowerCase(),
  );

  return lookupKey ? String(headers[lookupKey] || "") : "";
}

function getSingleOptionalParameter(searchParams, parameterName) {
  const values = searchParams.getAll(parameterName);

  if (values.length > 1) {
    throw new OAuthClientAuthenticationError({
      reasonCode: `${parameterName}_duplicated`,
    });
  }

  if (values.length === 0) {
    return null;
  }

  return values[0];
}

function decodeFormComponent(value, label) {
  try {
    return decodeURIComponent(String(value).replace(/\+/g, " "));
  } catch {
    throw new OAuthClientAuthenticationError({
      reasonCode: `${label}_malformed`,
    });
  }
}

function decodeBasicCredentials(encodedCredentials) {
  if (
    typeof encodedCredentials !== "string" ||
    encodedCredentials.length === 0 ||
    encodedCredentials.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]+=*$/.test(encodedCredentials)
  ) {
    throw new OAuthClientAuthenticationError({
      reasonCode: "authorization_header_malformed",
    });
  }

  const decoded = Buffer.from(encodedCredentials, "base64").toString("utf8");
  const normalizedEncoded = Buffer.from(decoded, "utf8").toString("base64");

  if (
    normalizedEncoded.replace(/=+$/u, "") !==
    encodedCredentials.replace(/=+$/u, "")
  ) {
    throw new OAuthClientAuthenticationError({
      reasonCode: "authorization_header_malformed",
    });
  }

  return decoded;
}

function parseBasicAuthorizationHeader(rawAuthorizationHeader) {
  if (!rawAuthorizationHeader) {
    return null;
  }

  const matches = String(rawAuthorizationHeader).match(/^Basic\s+(.+)$/iu);

  if (!matches) {
    throw new OAuthClientAuthenticationError({
      reasonCode: "authorization_header_malformed",
    });
  }

  const decodedCredentials = decodeBasicCredentials(matches[1]);
  const separatorIndex = decodedCredentials.indexOf(":");

  if (separatorIndex <= 0 || separatorIndex === decodedCredentials.length - 1) {
    throw new OAuthClientAuthenticationError({
      reasonCode: "authorization_header_malformed",
    });
  }

  const clientId = decodeFormComponent(
    decodedCredentials.slice(0, separatorIndex),
    "client_id",
  ).trim();
  const clientSecret = decodeFormComponent(
    decodedCredentials.slice(separatorIndex + 1),
    "client_secret",
  );

  assertNonEmptyString(clientId, "client_id");
  assertNonEmptyString(clientSecret, "client_secret");

  return {
    authMethod: "client_secret_basic",
    clientId,
    clientSecret,
  };
}

function getClientIdFromBasicAuthorizationHeader(rawAuthorizationHeader) {
  try {
    return (
      parseBasicAuthorizationHeader(rawAuthorizationHeader)?.clientId ?? null
    );
  } catch {
    return null;
  }
}

export function extractOAuthClientCredentials({ body, headers } = {}) {
  const searchParams = toSearchParams(body);
  const rawAuthorizationHeader = readHeader(headers, "authorization").trim();
  const bodyClientId = getSingleOptionalParameter(searchParams, "client_id");
  const bodyClientSecret = getSingleOptionalParameter(
    searchParams,
    "client_secret",
  );
  const basicCredentials = parseBasicAuthorizationHeader(
    rawAuthorizationHeader,
  );
  const hasBodyCredentials = bodyClientId !== null || bodyClientSecret !== null;

  if (basicCredentials && hasBodyCredentials) {
    throw new OAuthClientAuthenticationError({
      reasonCode: "credentials_conflicting",
    });
  }

  if (basicCredentials) {
    return basicCredentials;
  }

  if (bodyClientId === null && bodyClientSecret === null) {
    throw new OAuthClientAuthenticationError({
      reasonCode: "credentials_missing",
    });
  }

  assertNonEmptyString(bodyClientId, "client_id");
  assertNonEmptyString(bodyClientSecret, "client_secret");

  return {
    authMethod: "client_secret_post",
    clientId: bodyClientId.trim(),
    clientSecret: bodyClientSecret,
  };
}

export async function findOAuthClientByClientId(clientId) {
  return models.OAuthClient.findOne({
    where: {
      clientId,
    },
  });
}

function getRateLimitKey({ headers, body }) {
  const rawAuthorizationHeader = readHeader(headers, "authorization").trim();
  const authorizationClientId = getClientIdFromBasicAuthorizationHeader(
    rawAuthorizationHeader,
  );

  if (authorizationClientId) {
    return `client:${authorizationClientId}`;
  }

  const searchParams = toSearchParams(body);
  const bodyClientId = searchParams.get("client_id");

  if (bodyClientId?.trim()) {
    return `client:${bodyClientId.trim()}`;
  }

  if (rawAuthorizationHeader) {
    return `header:${rawAuthorizationHeader}`;
  }

  return "missing";
}

export async function authenticateOAuthClient(
  requestLike,
  {
    loadClient = findOAuthClientByClientId,
    verifyClientSecret = verifyOAuthClientSecret,
    consumeClientRateLimit = consumeRateLimit,
    rateLimit = OAUTH_CLIENT_AUTH_RATE_LIMIT,
  } = {},
) {
  await consumeClientRateLimit({
    bucketType: rateLimit.bucketType,
    key: getRateLimitKey(requestLike || {}),
    limit: rateLimit.limit,
    windowMs: rateLimit.windowMs,
  });

  const credentials = extractOAuthClientCredentials(requestLike);

  const client = await loadClient(credentials.clientId);

  if (!client || client.isEnabled !== true) {
    throw new OAuthClientAuthenticationError({
      reasonCode: "client_unavailable",
    });
  }

  const allowedAuthMethods = Array.isArray(client.tokenEndpointAuthMethods)
    ? client.tokenEndpointAuthMethods
    : [];

  if (!allowedAuthMethods.includes(credentials.authMethod)) {
    throw new OAuthClientAuthenticationError({
      reasonCode: "auth_method_not_allowed",
    });
  }

  const isSecretValid = await verifyClientSecret(
    credentials.clientSecret,
    client.clientSecretHash,
  );

  if (!isSecretValid) {
    throw new OAuthClientAuthenticationError({
      reasonCode: "client_secret_invalid",
    });
  }

  return {
    authMethod: credentials.authMethod,
    client,
    clientId: client.clientId,
  };
}
