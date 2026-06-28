import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { oauthConfig } from "@/lib/config/oauth";

const OAUTH_SECRET_BYTES = 32;
const SHA256_HEX_LENGTH = 64;
const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/u;

function assertNonEmptyString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
}

function getLookupHashInput(secret, pepper) {
  assertNonEmptyString(secret, "OAuth secret");
  assertNonEmptyString(pepper, "OAuth hash pepper");

  return `${pepper}:${secret}`;
}

function isHexDigest(value) {
  return (
    typeof value === "string" &&
    value.length === SHA256_HEX_LENGTH &&
    SHA256_HEX_PATTERN.test(value)
  );
}

export function generateOAuthSecret() {
  return randomBytes(OAUTH_SECRET_BYTES).toString("base64url");
}

export function generateAuthorizationCode() {
  return generateOAuthSecret();
}

export function generateAccessToken() {
  return generateOAuthSecret();
}

export function generateRefreshToken() {
  return generateOAuthSecret();
}

export function hashOAuthSecret(
  secret,
  { pepper = oauthConfig.tokenHashPepper } = {},
) {
  return createHash("sha256")
    .update(getLookupHashInput(secret, pepper))
    .digest("hex");
}

export function hashesMatchConstantTime(leftHash, rightHash) {
  if (!isHexDigest(leftHash) || !isHexDigest(rightHash)) {
    return false;
  }

  return timingSafeEqual(
    Buffer.from(leftHash, "hex"),
    Buffer.from(rightHash, "hex"),
  );
}

export function verifyOAuthSecretHash(
  secret,
  expectedHash,
  { pepper = oauthConfig.tokenHashPepper } = {},
) {
  if (!isHexDigest(expectedHash)) {
    return false;
  }

  return hashesMatchConstantTime(
    hashOAuthSecret(secret, { pepper }),
    expectedHash,
  );
}
