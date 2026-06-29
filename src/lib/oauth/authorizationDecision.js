import { jwtVerify, SignJWT } from "jose";
import { oauthConfig } from "@/lib/config/oauth";
import { sessionConfig } from "@/lib/config/session";
import { normalizeOAuthInteraction } from "@/lib/oauth/interaction";

const AUTHORIZATION_DECISION_AUDIENCE = "oauth-authorization-decision";

function normalizeUserId(userId) {
  const normalizedUserId =
    typeof userId === "number" || typeof userId === "string"
      ? Number(userId)
      : Number.NaN;

  if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
    throw new Error("Authorization decision user ID is required.");
  }

  return normalizedUserId;
}

function normalizeOAuthClientId(oauthClientId) {
  const normalizedOAuthClientId =
    typeof oauthClientId === "number" || typeof oauthClientId === "string"
      ? Number(oauthClientId)
      : Number.NaN;

  if (
    !Number.isInteger(normalizedOAuthClientId) ||
    normalizedOAuthClientId <= 0
  ) {
    throw new Error("Authorization decision OAuth client ID is required.");
  }

  return normalizedOAuthClientId;
}

function normalizeDecisionPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Authorization decision payload must be an object.");
  }

  return {
    interaction: normalizeOAuthInteraction(payload.interaction),
    oauthClientId: normalizeOAuthClientId(payload.oauthClientId),
    userId: normalizeUserId(payload.userId),
  };
}

export async function issueAuthorizationDecisionToken({
  interaction,
  oauthClientId,
  userId,
  issuedAt = new Date(),
} = {}) {
  const payload = normalizeDecisionPayload({
    interaction,
    oauthClientId,
    userId,
  });
  const issuedAtSeconds = Math.floor(issuedAt.getTime() / 1000);

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(issuedAtSeconds)
    .setNotBefore(issuedAtSeconds)
    .setIssuer(oauthConfig.baseUrl)
    .setAudience(AUTHORIZATION_DECISION_AUDIENCE)
    .setExpirationTime(issuedAtSeconds + oauthConfig.interactionTtlSeconds)
    .sign(sessionConfig.key);
}

export async function verifyAuthorizationDecisionToken(token, options = {}) {
  const normalizedToken = String(token ?? "").trim();

  if (!normalizedToken) {
    throw new Error("Authorization decision token is required.");
  }

  const { payload } = await jwtVerify(normalizedToken, sessionConfig.key, {
    audience: AUTHORIZATION_DECISION_AUDIENCE,
    currentDate: options.currentDate,
    issuer: oauthConfig.baseUrl,
  });

  return normalizeDecisionPayload(payload);
}

export function buildOAuthCallbackRedirect(interaction, parameters = {}) {
  const normalizedInteraction = normalizeOAuthInteraction(interaction);
  const redirectUrl = new URL(normalizedInteraction.redirectUri);

  for (const [key, value] of Object.entries(parameters)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    redirectUrl.searchParams.set(key, String(value));
  }

  return redirectUrl.toString();
}
