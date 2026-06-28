import { jwtVerify, SignJWT } from "jose";
import { oauthConfig } from "@/lib/config/oauth";
import { sessionConfig } from "@/lib/config/session";

export const OAUTH_AUTHORIZE_PATH = "/oauth/authorize";
export const OAUTH_AUTHORIZE_RESUME_PATH = "/oauth/authorize/resume";
export const OAUTH_AUTHORIZE_ERROR_PATH = "/oauth/authorize/error";

export const OAUTH_AUTHORIZE_ERROR_CODES = Object.freeze({
  interactionExpired: "interaction_expired",
  invalidResume: "invalid_resume",
  loginCancelled: "login_cancelled",
});

const AUTHORIZATION_RESUME_AUDIENCE = "oauth-authorization-resume";
const LOCAL_BASE_URL = "https://milkywayy.local";
const ALLOWED_ERROR_CODES = new Set(Object.values(OAUTH_AUTHORIZE_ERROR_CODES));

function normalizeScope(scope) {
  const values = Array.isArray(scope)
    ? scope
    : String(scope ?? "")
        .split(/\s+/)
        .map((value) => value.trim())
        .filter(Boolean);

  if (values.length === 0) {
    throw new Error("Authorization resume scope is required.");
  }

  const uniqueScopes = [...new Set(values)];

  for (const value of uniqueScopes) {
    if (!oauthConfig.allowedScopes.includes(value)) {
      throw new Error(`Unsupported authorization resume scope: ${value}.`);
    }
  }

  return uniqueScopes.join(" ");
}

function normalizeRedirectUri(redirectUri) {
  const normalizedValue = String(redirectUri ?? "").trim();

  if (!normalizedValue) {
    throw new Error("Authorization resume redirect URI is required.");
  }

  let parsedUri;

  try {
    parsedUri = new URL(normalizedValue);
  } catch {
    throw new Error("Authorization resume redirect URI must be absolute.");
  }

  if (parsedUri.hash) {
    throw new Error(
      "Authorization resume redirect URI must not include a fragment.",
    );
  }

  return parsedUri.toString();
}

function normalizeInteraction(interaction) {
  if (
    !interaction ||
    typeof interaction !== "object" ||
    Array.isArray(interaction)
  ) {
    throw new Error("Authorization resume interaction must be an object.");
  }

  const clientId = String(interaction.clientId ?? "").trim();
  const state = String(interaction.state ?? "").trim();
  const responseType = String(interaction.responseType ?? "code").trim();

  if (!clientId) {
    throw new Error("Authorization resume client ID is required.");
  }

  if (!state) {
    throw new Error("Authorization resume state is required.");
  }

  if (responseType !== "code") {
    throw new Error("Authorization resume response type must be code.");
  }

  return {
    clientId,
    redirectUri: normalizeRedirectUri(interaction.redirectUri),
    responseType,
    scope: normalizeScope(interaction.scope),
    state,
  };
}

function parseLocalPath(rawPath, allowedPathname) {
  const normalizedPath = String(rawPath ?? "").trim();

  if (!normalizedPath || normalizedPath.startsWith("//")) {
    return null;
  }

  let parsedPath;

  try {
    parsedPath = new URL(normalizedPath, LOCAL_BASE_URL);
  } catch {
    return null;
  }

  if (parsedPath.origin !== LOCAL_BASE_URL) {
    return null;
  }

  if (parsedPath.pathname !== allowedPathname || parsedPath.hash) {
    return null;
  }

  return parsedPath;
}

function hasOnlySearchParam(searchParams, expectedKey) {
  const keys = [...searchParams.keys()];
  return keys.length === 1 && keys[0] === expectedKey;
}

export async function issueAuthorizationResumeToken({
  interaction,
  issuedAt = new Date(),
} = {}) {
  const normalizedInteraction = normalizeInteraction(interaction);
  const issuedAtSeconds = Math.floor(issuedAt.getTime() / 1000);

  return new SignJWT({ interaction: normalizedInteraction })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(issuedAtSeconds)
    .setNotBefore(issuedAtSeconds)
    .setIssuer(oauthConfig.baseUrl)
    .setAudience(AUTHORIZATION_RESUME_AUDIENCE)
    .setExpirationTime(issuedAtSeconds + oauthConfig.interactionTtlSeconds)
    .sign(sessionConfig.key);
}

export async function verifyAuthorizationResumeToken(token, options = {}) {
  const normalizedToken = String(token ?? "").trim();

  if (!normalizedToken) {
    throw new Error("Authorization resume token is required.");
  }

  const { payload } = await jwtVerify(normalizedToken, sessionConfig.key, {
    audience: AUTHORIZATION_RESUME_AUDIENCE,
    currentDate: options.currentDate,
    issuer: oauthConfig.baseUrl,
  });

  return normalizeInteraction(payload.interaction);
}

export function buildAuthorizationResumePath(resumeToken) {
  const normalizedToken = String(resumeToken ?? "").trim();

  if (!normalizedToken) {
    throw new Error("Authorization resume token is required.");
  }

  return `${OAUTH_AUTHORIZE_RESUME_PATH}?resume=${encodeURIComponent(normalizedToken)}`;
}

export function normalizeAuthorizationResumePath(rawPath) {
  const parsedPath = parseLocalPath(rawPath, OAUTH_AUTHORIZE_RESUME_PATH);

  if (!parsedPath || !hasOnlySearchParam(parsedPath.searchParams, "resume")) {
    return null;
  }

  const [resumeToken] = parsedPath.searchParams.getAll("resume");

  if (!resumeToken?.trim()) {
    return null;
  }

  return buildAuthorizationResumePath(resumeToken);
}

export function buildAuthorizationErrorPath(
  errorCode = OAUTH_AUTHORIZE_ERROR_CODES.loginCancelled,
) {
  if (!ALLOWED_ERROR_CODES.has(errorCode)) {
    throw new Error(`Unsupported authorization error code: ${errorCode}.`);
  }

  return `${OAUTH_AUTHORIZE_ERROR_PATH}?error=${encodeURIComponent(errorCode)}`;
}

export function normalizeAuthorizationErrorPath(rawPath) {
  const parsedPath = parseLocalPath(rawPath, OAUTH_AUTHORIZE_ERROR_PATH);

  if (!parsedPath || !hasOnlySearchParam(parsedPath.searchParams, "error")) {
    return null;
  }

  const [errorCode] = parsedPath.searchParams.getAll("error");

  if (!ALLOWED_ERROR_CODES.has(errorCode)) {
    return null;
  }

  return buildAuthorizationErrorPath(errorCode);
}
