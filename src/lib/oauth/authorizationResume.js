import { jwtVerify, SignJWT } from "jose";
import { oauthConfig } from "@/lib/config/oauth";
import { sessionConfig } from "@/lib/config/session";
import { normalizeOAuthInteraction } from "@/lib/oauth/interaction";

export {
  buildAuthorizationErrorPath,
  buildAuthorizationResumePath,
  normalizeAuthorizationErrorPath,
  normalizeAuthorizationResumePath,
  OAUTH_AUTHORIZE_ERROR_CODES,
  OAUTH_AUTHORIZE_ERROR_PATH,
  OAUTH_AUTHORIZE_RESUME_PATH,
} from "@/lib/oauth/authorizationResumePaths";

const AUTHORIZATION_RESUME_AUDIENCE = "oauth-authorization-resume";

export async function issueAuthorizationResumeToken({
  interaction,
  issuedAt = new Date(),
} = {}) {
  const normalizedInteraction = normalizeOAuthInteraction(interaction);
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

  return normalizeOAuthInteraction(payload.interaction);
}
