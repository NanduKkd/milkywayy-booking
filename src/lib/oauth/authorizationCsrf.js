import { randomBytes, timingSafeEqual } from "node:crypto";
import { sessionConfig } from "@/lib/config/session";

const OAUTH_AUTHORIZATION_CSRF_COOKIE = "oauth-authorize-csrf";

function normalizeToken(token) {
  return typeof token === "string" ? token.trim() : "";
}

export function issueAuthorizationCsrfToken() {
  return randomBytes(32).toString("base64url");
}

export function setAuthorizationCsrfCookie(cookieStore, token) {
  cookieStore.set(OAUTH_AUTHORIZATION_CSRF_COOKIE, token, {
    httpOnly: true,
    path: "/oauth/authorize",
    sameSite: "lax",
    secure: sessionConfig.secureCookies,
  });
}

export function clearAuthorizationCsrfCookie(cookieStore) {
  cookieStore.delete(OAUTH_AUTHORIZATION_CSRF_COOKIE);
}

export function readAuthorizationCsrfCookie(cookieStore) {
  return normalizeToken(
    cookieStore.get(OAUTH_AUTHORIZATION_CSRF_COOKIE)?.value ?? "",
  );
}

export function verifyAuthorizationCsrfToken({ cookieToken, formToken } = {}) {
  const normalizedCookieToken = normalizeToken(cookieToken);
  const normalizedFormToken = normalizeToken(formToken);

  if (!normalizedCookieToken || !normalizedFormToken) {
    return false;
  }

  const left = Buffer.from(normalizedCookieToken);
  const right = Buffer.from(normalizedFormToken);

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}
