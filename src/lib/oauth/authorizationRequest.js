import { oauthConfig } from "@/lib/config/oauth";
import OAuthClient from "@/lib/db/models/oauthclient";

export const OAUTH_AUTHORIZATION_REQUEST_ERROR_CODES = Object.freeze({
  invalidRequest: "invalid_request",
  invalidScope: "invalid_scope",
  unauthorizedClient: "unauthorized_client",
  unsupportedResponseType: "unsupported_response_type",
});

export class OAuthAuthorizationRequestError extends Error {
  constructor({
    code = OAUTH_AUTHORIZATION_REQUEST_ERROR_CODES.invalidRequest,
    description,
    reasonCode,
  } = {}) {
    super(description || "Invalid OAuth authorization request.");
    this.name = "OAuthAuthorizationRequestError";
    this.code = code;
    this.reasonCode = reasonCode || code;
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

  if (input instanceof URL) {
    return new URLSearchParams(input.searchParams);
  }

  if (!input || typeof input !== "object") {
    throw new TypeError("Authorization request parameters are required.");
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
    throw new OAuthAuthorizationRequestError({
      description: `${parameterName} must be provided exactly once.`,
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
    throw new OAuthAuthorizationRequestError({
      description: "redirect_uri must be a valid absolute URL.",
      reasonCode: "redirect_uri_invalid",
    });
  }

  if (parsedUri.username || parsedUri.password || parsedUri.hash) {
    throw new OAuthAuthorizationRequestError({
      description: "redirect_uri must not include credentials or fragments.",
      reasonCode: "redirect_uri_invalid",
    });
  }
}

function normalizeAllowedScopes(scopes) {
  return [...new Set((Array.isArray(scopes) ? scopes : []).map(String))];
}

export function normalizeAuthorizationRequestScope(rawScope) {
  const scopes = String(rawScope ?? "")
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean);

  if (scopes.length === 0) {
    throw new OAuthAuthorizationRequestError({
      code: OAUTH_AUTHORIZATION_REQUEST_ERROR_CODES.invalidScope,
      description: "scope must contain at least one allowed scope.",
      reasonCode: "scope_invalid",
    });
  }

  const uniqueScopes = [...new Set(scopes)];

  for (const scope of uniqueScopes) {
    if (!oauthConfig.allowedScopes.includes(scope)) {
      throw new OAuthAuthorizationRequestError({
        code: OAUTH_AUTHORIZATION_REQUEST_ERROR_CODES.invalidScope,
        description: `Unsupported OAuth scope: ${scope}.`,
        reasonCode: "scope_unsupported",
      });
    }
  }

  return uniqueScopes;
}

export async function findOAuthClientByClientId(clientId) {
  return OAuthClient.findOne({
    where: {
      clientId,
    },
  });
}

export async function validateAuthorizationRequest(
  parameters,
  { loadClient = findOAuthClientByClientId } = {},
) {
  const searchParams = toSearchParams(parameters);

  const clientId = getSingleRequiredParameter(searchParams, "client_id");
  const redirectUri = getSingleRequiredParameter(searchParams, "redirect_uri");
  const responseType = getSingleRequiredParameter(
    searchParams,
    "response_type",
  );
  const state = getSingleRequiredParameter(searchParams, "state");
  const scopes = normalizeAuthorizationRequestScope(
    getSingleRequiredParameter(searchParams, "scope"),
  );

  validateRedirectUri(redirectUri);

  if (responseType !== "code") {
    throw new OAuthAuthorizationRequestError({
      code: OAUTH_AUTHORIZATION_REQUEST_ERROR_CODES.unsupportedResponseType,
      description: "response_type must be code.",
      reasonCode: "response_type_unsupported",
    });
  }

  const client = await loadClient(clientId);

  if (!client || client.isEnabled !== true) {
    throw new OAuthAuthorizationRequestError({
      code: OAUTH_AUTHORIZATION_REQUEST_ERROR_CODES.unauthorizedClient,
      description: "OAuth client is unknown or disabled.",
      reasonCode: "client_unavailable",
    });
  }

  const registeredRedirectUris = normalizeAllowedScopes(client.redirectUris);

  if (!registeredRedirectUris.includes(redirectUri)) {
    throw new OAuthAuthorizationRequestError({
      description: "redirect_uri must exactly match a registered callback.",
      reasonCode: "redirect_uri_unregistered",
    });
  }

  if (!oauthConfig.callbackUris.includes(redirectUri)) {
    throw new OAuthAuthorizationRequestError({
      description: "redirect_uri is not approved by server configuration.",
      reasonCode: "redirect_uri_not_allowed",
    });
  }

  const allowedScopes = normalizeAllowedScopes(client.allowedScopes);

  for (const scope of scopes) {
    if (!allowedScopes.includes(scope)) {
      throw new OAuthAuthorizationRequestError({
        code: OAUTH_AUTHORIZATION_REQUEST_ERROR_CODES.invalidScope,
        description: `OAuth client is not allowed to request scope ${scope}.`,
        reasonCode: "scope_not_allowed_for_client",
      });
    }
  }

  return {
    client,
    clientId,
    redirectUri,
    responseType,
    scope: scopes.join(" "),
    scopes,
    state,
  };
}
