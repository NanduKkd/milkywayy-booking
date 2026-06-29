import { oauthConfig } from "@/lib/config/oauth";

export const OAUTH_AUTHORIZE_PATH = "/oauth/authorize";

function normalizeScope(scope) {
  const values = Array.isArray(scope)
    ? scope
    : String(scope ?? "")
        .split(/\s+/)
        .map((value) => value.trim())
        .filter(Boolean);

  if (values.length === 0) {
    throw new Error("OAuth interaction scope is required.");
  }

  const uniqueScopes = [...new Set(values)];

  for (const value of uniqueScopes) {
    if (!oauthConfig.allowedScopes.includes(value)) {
      throw new Error(`Unsupported OAuth interaction scope: ${value}.`);
    }
  }

  return uniqueScopes;
}

function normalizeRedirectUri(redirectUri) {
  const normalizedValue = String(redirectUri ?? "").trim();

  if (!normalizedValue) {
    throw new Error("OAuth interaction redirect URI is required.");
  }

  let parsedUri;

  try {
    parsedUri = new URL(normalizedValue);
  } catch {
    throw new Error("OAuth interaction redirect URI must be absolute.");
  }

  if (parsedUri.hash) {
    throw new Error(
      "OAuth interaction redirect URI must not include a fragment.",
    );
  }

  return parsedUri.toString();
}

export function normalizeOAuthInteraction(interaction) {
  if (
    !interaction ||
    typeof interaction !== "object" ||
    Array.isArray(interaction)
  ) {
    throw new Error("OAuth interaction must be an object.");
  }

  const clientId = String(interaction.clientId ?? "").trim();
  const state = String(interaction.state ?? "").trim();
  const responseType = String(interaction.responseType ?? "code").trim();
  const scopes = normalizeScope(interaction.scope);

  if (!clientId) {
    throw new Error("OAuth interaction client ID is required.");
  }

  if (!state) {
    throw new Error("OAuth interaction state is required.");
  }

  if (responseType !== "code") {
    throw new Error("OAuth interaction response type must be code.");
  }

  return {
    clientId,
    redirectUri: normalizeRedirectUri(interaction.redirectUri),
    responseType,
    scope: scopes.join(" "),
    scopes,
    state,
  };
}

export function buildAuthorizationRequestSearchParams(interaction) {
  const normalizedInteraction = normalizeOAuthInteraction(interaction);
  const searchParams = new URLSearchParams();

  searchParams.set("client_id", normalizedInteraction.clientId);
  searchParams.set("redirect_uri", normalizedInteraction.redirectUri);
  searchParams.set("response_type", normalizedInteraction.responseType);
  searchParams.set("scope", normalizedInteraction.scope);
  searchParams.set("state", normalizedInteraction.state);

  return searchParams;
}

export function buildAuthorizationRequestPath(interaction) {
  const searchParams = buildAuthorizationRequestSearchParams(interaction);
  return `${OAUTH_AUTHORIZE_PATH}?${searchParams.toString()}`;
}
