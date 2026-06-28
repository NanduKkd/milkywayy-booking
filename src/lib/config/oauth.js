const NON_PRODUCTION_DEFAULTS = {
  baseUrl: "http://localhost:3000",
  allowedScopes: ["customer:read"],
  callbackUris: [
    "https://chat.openai.com/aip/oauth/callback-test",
    "https://chatgpt.com/aip/oauth/callback-test",
  ],
  interactionTtlSeconds: 600,
  codeTtlSeconds: 120,
  accessTokenTtlSeconds: 900,
  refreshTokenTtlSeconds: 2_592_000,
  tokenHashPepper: "test-oauth-token-hash-pepper-not-for-production",
  clientSecretHashPepper:
    "test-oauth-client-secret-hash-pepper-not-for-production",
};

const ALLOWED_CALLBACK_HOSTS = new Set(["chat.openai.com", "chatgpt.com"]);
const ALLOWED_SCOPES = new Set(["customer:read"]);
const FORBIDDEN_PUBLIC_SECRET_ENV_VARS = [
  "NEXT_PUBLIC_OAUTH_TOKEN_HASH_PEPPER",
  "NEXT_PUBLIC_OAUTH_CLIENT_SECRET_HASH_PEPPER",
];

function normalizeNodeEnv(nodeEnv) {
  if (nodeEnv === "production") {
    return "production";
  }

  if (nodeEnv === "test") {
    return "test";
  }

  return "development";
}

function readString(env, key) {
  const value = env[key];
  return typeof value === "string" ? value.trim() : "";
}

function parsePositiveInteger({ env, key, fallback, environment }) {
  const rawValue = readString(env, key);

  if (!rawValue) {
    if (environment === "production") {
      throw new Error(`${key} must be configured in production.`);
    }

    return fallback;
  }

  const parsedValue = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${key} must be a positive integer.`);
  }

  return parsedValue;
}

function parseBaseUrl({ env, environment }) {
  const rawValue = readString(env, "OAUTH_BASE_URL");
  const candidate =
    rawValue ||
    (environment === "production" ? "" : NON_PRODUCTION_DEFAULTS.baseUrl);

  if (!candidate) {
    throw new Error("OAUTH_BASE_URL must be configured in production.");
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(candidate);
  } catch {
    throw new Error("OAUTH_BASE_URL must be a valid absolute URL.");
  }

  if (parsedUrl.username || parsedUrl.password || parsedUrl.hash) {
    throw new Error(
      "OAUTH_BASE_URL must not contain credentials or fragments.",
    );
  }

  if (environment === "production" && parsedUrl.protocol !== "https:") {
    throw new Error("OAUTH_BASE_URL must use HTTPS in production.");
  }

  return parsedUrl.toString().replace(/\/$/, "");
}

function parseScopes({ env, environment }) {
  const rawScopes = readString(env, "OAUTH_ALLOWED_SCOPES");
  const source =
    rawScopes ||
    (environment === "production"
      ? ""
      : NON_PRODUCTION_DEFAULTS.allowedScopes.join(" "));

  if (!source) {
    throw new Error("OAUTH_ALLOWED_SCOPES must be configured in production.");
  }

  const scopes = source
    .split(/[,\s]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);

  if (scopes.length === 0) {
    throw new Error("OAUTH_ALLOWED_SCOPES must contain at least one scope.");
  }

  for (const scope of scopes) {
    if (!ALLOWED_SCOPES.has(scope)) {
      throw new Error(`Unsupported OAuth scope configured: ${scope}.`);
    }
  }

  return [...new Set(scopes)];
}

function parseCallbackUris({ env, environment }) {
  const rawCallbackUris = readString(env, "OAUTH_CALLBACK_URIS");
  const source =
    rawCallbackUris ||
    (environment === "production"
      ? ""
      : NON_PRODUCTION_DEFAULTS.callbackUris.join(","));

  if (!source) {
    throw new Error("OAUTH_CALLBACK_URIS must be configured in production.");
  }

  const callbackUris = source
    .split(/[\n,]+/)
    .map((uri) => uri.trim())
    .filter(Boolean);

  if (callbackUris.length === 0) {
    throw new Error(
      "OAUTH_CALLBACK_URIS must contain at least one callback URI.",
    );
  }

  const normalizedUris = callbackUris.map((uri) => {
    let parsedUrl;

    try {
      parsedUrl = new URL(uri);
    } catch {
      throw new Error(`Invalid OAuth callback URI: ${uri}`);
    }

    if (parsedUrl.protocol !== "https:") {
      throw new Error(`OAuth callback URI must use HTTPS: ${uri}`);
    }

    if (parsedUrl.username || parsedUrl.password || parsedUrl.hash) {
      throw new Error(
        `OAuth callback URI must not contain credentials or fragments: ${uri}`,
      );
    }

    if (!ALLOWED_CALLBACK_HOSTS.has(parsedUrl.hostname)) {
      throw new Error(
        `OAuth callback URI must use an approved ChatGPT host: ${uri}`,
      );
    }

    return parsedUrl.toString();
  });

  return [...new Set(normalizedUris)];
}

function parsePepper({ env, key, fallback, environment }) {
  const value = readString(env, key);

  if (value) {
    return value;
  }

  if (environment === "production") {
    throw new Error(`${key} must be configured in production.`);
  }

  return fallback;
}

function assertNoPublicSecretOverrides(env) {
  for (const envVar of FORBIDDEN_PUBLIC_SECRET_ENV_VARS) {
    if (readString(env, envVar)) {
      throw new Error(
        `${envVar} must not be set because OAuth secrets must remain server-only.`,
      );
    }
  }
}

export function createOAuthConfig(env = process.env) {
  const environment = normalizeNodeEnv(env.NODE_ENV);
  assertNoPublicSecretOverrides(env);

  return Object.freeze({
    environment,
    baseUrl: parseBaseUrl({ env, environment }),
    allowedScopes: parseScopes({ env, environment }),
    callbackUris: parseCallbackUris({ env, environment }),
    interactionTtlSeconds: parsePositiveInteger({
      env,
      key: "OAUTH_INTERACTION_TTL_SECONDS",
      fallback: NON_PRODUCTION_DEFAULTS.interactionTtlSeconds,
      environment,
    }),
    codeTtlSeconds: parsePositiveInteger({
      env,
      key: "OAUTH_CODE_TTL_SECONDS",
      fallback: NON_PRODUCTION_DEFAULTS.codeTtlSeconds,
      environment,
    }),
    accessTokenTtlSeconds: parsePositiveInteger({
      env,
      key: "OAUTH_ACCESS_TOKEN_TTL_SECONDS",
      fallback: NON_PRODUCTION_DEFAULTS.accessTokenTtlSeconds,
      environment,
    }),
    refreshTokenTtlSeconds: parsePositiveInteger({
      env,
      key: "OAUTH_REFRESH_TOKEN_TTL_SECONDS",
      fallback: NON_PRODUCTION_DEFAULTS.refreshTokenTtlSeconds,
      environment,
    }),
    tokenHashPepper: parsePepper({
      env,
      key: "OAUTH_TOKEN_HASH_PEPPER",
      fallback: NON_PRODUCTION_DEFAULTS.tokenHashPepper,
      environment,
    }),
    clientSecretHashPepper: parsePepper({
      env,
      key: "OAUTH_CLIENT_SECRET_HASH_PEPPER",
      fallback: NON_PRODUCTION_DEFAULTS.clientSecretHashPepper,
      environment,
    }),
  });
}

export const oauthConfig = createOAuthConfig();
