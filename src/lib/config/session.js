const SESSION_COOKIE_NAME = "session-token";
const MINIMUM_PRODUCTION_SECRET_LENGTH = 32;

const NON_PRODUCTION_SESSION_SECRETS = {
  development: "development-session-secret-not-for-production",
  test: "test-session-secret-not-for-production",
};

function normalizeNodeEnv(nodeEnv) {
  if (nodeEnv === "production") {
    return "production";
  }

  if (nodeEnv === "test") {
    return "test";
  }

  return "development";
}

export function createSessionConfig({
  nodeEnv = process.env.NODE_ENV,
  jwtSecret = process.env.JWT_SECRET,
} = {}) {
  const environment = normalizeNodeEnv(nodeEnv);
  const trimmedSecret = typeof jwtSecret === "string" ? jwtSecret.trim() : "";

  if (environment === "production") {
    if (trimmedSecret.length < MINIMUM_PRODUCTION_SECRET_LENGTH) {
      throw new Error(
        `JWT_SECRET must be set to at least ${MINIMUM_PRODUCTION_SECRET_LENGTH} characters in production.`,
      );
    }
  }

  const secret = trimmedSecret || NON_PRODUCTION_SESSION_SECRETS[environment];

  return Object.freeze({
    cookieName: SESSION_COOKIE_NAME,
    environment,
    key: new TextEncoder().encode(secret),
    secret,
    secureCookies: environment === "production",
  });
}

export const sessionConfig = createSessionConfig();
