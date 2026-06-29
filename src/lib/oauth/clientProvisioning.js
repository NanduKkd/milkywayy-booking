import bcrypt from "bcrypt";
import { oauthConfig } from "../config/oauth.js";
import models from "../db/models/index.js";
import { generateOAuthSecret } from "./secrets.js";

export const OAUTH_CLIENT_SECRET_HASH_ROUNDS = 12;
export const OAUTH_CLIENT_TOKEN_ENDPOINT_AUTH_METHODS = Object.freeze([
  "client_secret_basic",
  "client_secret_post",
]);

function assertNonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
}

function normalizeUniqueStringList(values, label) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new TypeError(`${label} must be a non-empty array.`);
  }

  const normalizedValues = values.map((value) => {
    assertNonEmptyString(value, label);
    return value.trim();
  });

  return [...new Set(normalizedValues)];
}

function normalizeRedirectUri(uri) {
  let parsedUrl;

  try {
    parsedUrl = new URL(uri);
  } catch {
    throw new Error(`OAuth redirect URI must be a valid absolute URL: ${uri}`);
  }

  if (parsedUrl.protocol !== "https:") {
    throw new Error(`OAuth redirect URI must use HTTPS: ${uri}`);
  }

  if (parsedUrl.username || parsedUrl.password || parsedUrl.hash) {
    throw new Error(
      `OAuth redirect URI must not contain credentials or fragments: ${uri}`,
    );
  }

  return parsedUrl.toString();
}

export function normalizeProvisionedRedirectUris(
  redirectUris,
  { allowedCallbackUris = oauthConfig.callbackUris } = {},
) {
  const allowedCallbackUriSet = new Set(allowedCallbackUris);

  return normalizeUniqueStringList(redirectUris, "OAuth redirect URIs").map(
    (redirectUri) => {
      const normalizedRedirectUri = normalizeRedirectUri(redirectUri);

      if (!allowedCallbackUriSet.has(normalizedRedirectUri)) {
        throw new Error(
          `OAuth redirect URI is not in the approved callback allowlist: ${redirectUri}`,
        );
      }

      return normalizedRedirectUri;
    },
  );
}

export function normalizeProvisionedScopes(
  scopes,
  { allowedScopes = oauthConfig.allowedScopes } = {},
) {
  const allowedScopeSet = new Set(allowedScopes);

  return normalizeUniqueStringList(scopes, "OAuth scopes").map((scope) => {
    if (!allowedScopeSet.has(scope)) {
      throw new Error(`Unsupported OAuth scope: ${scope}`);
    }

    return scope;
  });
}

export function normalizeTokenEndpointAuthMethods(authMethods) {
  const allowedAuthMethodSet = new Set(
    OAUTH_CLIENT_TOKEN_ENDPOINT_AUTH_METHODS,
  );

  return normalizeUniqueStringList(
    authMethods,
    "OAuth token endpoint auth methods",
  ).map((authMethod) => {
    if (!allowedAuthMethodSet.has(authMethod)) {
      throw new Error(
        `Unsupported OAuth token endpoint auth method: ${authMethod}`,
      );
    }

    return authMethod;
  });
}

function getOAuthClientSecretHashInput(secret, pepper) {
  assertNonEmptyString(secret, "OAuth client secret");
  assertNonEmptyString(pepper, "OAuth client secret hash pepper");

  return `${pepper}:${secret}`;
}

export async function hashOAuthClientSecret(
  secret,
  {
    pepper = oauthConfig.clientSecretHashPepper,
    bcryptImpl = bcrypt,
    saltRounds = OAUTH_CLIENT_SECRET_HASH_ROUNDS,
  } = {},
) {
  if (!Number.isInteger(saltRounds) || saltRounds <= 0) {
    throw new TypeError("OAuth client secret hash rounds must be positive.");
  }

  return bcryptImpl.hash(
    getOAuthClientSecretHashInput(secret, pepper),
    saltRounds,
  );
}

export async function verifyOAuthClientSecret(
  secret,
  storedHash,
  { pepper = oauthConfig.clientSecretHashPepper, bcryptImpl = bcrypt } = {},
) {
  assertNonEmptyString(storedHash, "Stored OAuth client secret hash");

  return bcryptImpl.compare(
    getOAuthClientSecretHashInput(secret, pepper),
    storedHash,
  );
}

export async function provisionOAuthClient(
  {
    name,
    redirectUris,
    allowedScopes = oauthConfig.allowedScopes,
    tokenEndpointAuthMethods = OAUTH_CLIENT_TOKEN_ENDPOINT_AUTH_METHODS,
    isEnabled = true,
  },
  {
    createClient = (values) => models.OAuthClient.create(values),
    generateClientId = generateOAuthSecret,
    generateClientSecret = generateOAuthSecret,
    hashClientSecret = hashOAuthClientSecret,
  } = {},
) {
  assertNonEmptyString(name, "OAuth client name");

  if (typeof isEnabled !== "boolean") {
    throw new TypeError("OAuth client enabled flag must be a boolean.");
  }

  const normalizedRedirectUris = normalizeProvisionedRedirectUris(redirectUris);
  const normalizedScopes = normalizeProvisionedScopes(allowedScopes);
  const normalizedAuthMethods = normalizeTokenEndpointAuthMethods(
    tokenEndpointAuthMethods,
  );
  const clientId = generateClientId();
  const clientSecret = generateClientSecret();
  const clientSecretHash = await hashClientSecret(clientSecret);
  const client = await createClient({
    clientId,
    clientSecretHash,
    name: name.trim(),
    redirectUris: normalizedRedirectUris,
    allowedScopes: normalizedScopes,
    tokenEndpointAuthMethods: normalizedAuthMethods,
    isEnabled,
  });

  return {
    client,
    clientId,
    clientSecret,
  };
}
