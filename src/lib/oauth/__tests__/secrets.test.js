import {
  generateAccessToken,
  generateAuthorizationCode,
  generateOAuthSecret,
  generateRefreshToken,
  hashesMatchConstantTime,
  hashOAuthSecret,
  verifyOAuthSecretHash,
} from "../secrets";

describe("OAuth secret utilities", () => {
  const pepper = "test-oauth-token-pepper";

  it("generates opaque secrets with at least 256 bits of entropy", () => {
    const secret = generateOAuthSecret();

    expect(typeof secret).toBe("string");
    expect(secret).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(Buffer.from(secret, "base64url")).toHaveLength(32);
  });

  it("uses the same secure generator for codes and tokens", () => {
    const authorizationCode = generateAuthorizationCode();
    const accessToken = generateAccessToken();
    const refreshToken = generateRefreshToken();

    expect(Buffer.from(authorizationCode, "base64url")).toHaveLength(32);
    expect(Buffer.from(accessToken, "base64url")).toHaveLength(32);
    expect(Buffer.from(refreshToken, "base64url")).toHaveLength(32);
    expect(new Set([authorizationCode, accessToken, refreshToken]).size).toBe(
      3,
    );
  });

  it("produces deterministic lookup hashes without persisting raw values", () => {
    const secret = "opaque-oauth-secret";
    const hashedSecret = hashOAuthSecret(secret, { pepper });

    expect(hashedSecret).toMatch(/^[a-f0-9]{64}$/);
    expect(hashOAuthSecret(secret, { pepper })).toBe(hashedSecret);
    expect(hashedSecret).not.toContain(secret);
  });

  it("changes the lookup hash when the secret or pepper changes", () => {
    expect(
      hashOAuthSecret("opaque-oauth-secret", { pepper: "pepper-a" }),
    ).not.toBe(hashOAuthSecret("opaque-oauth-secret", { pepper: "pepper-b" }));
    expect(hashOAuthSecret("secret-a", { pepper })).not.toBe(
      hashOAuthSecret("secret-b", { pepper }),
    );
  });

  it("verifies lookup hashes using constant-time comparison", () => {
    const secret = "opaque-oauth-secret";
    const expectedHash = hashOAuthSecret(secret, { pepper });

    expect(verifyOAuthSecretHash(secret, expectedHash, { pepper })).toBe(true);
    expect(
      verifyOAuthSecretHash("different-secret", expectedHash, { pepper }),
    ).toBe(false);
    expect(verifyOAuthSecretHash(secret, "not-a-valid-hash", { pepper })).toBe(
      false,
    );
  });

  it("supports direct constant-time hash comparison for lookup results", () => {
    const leftHash = hashOAuthSecret("shared-secret", { pepper });
    const sameHash = hashOAuthSecret("shared-secret", { pepper });
    const differentHash = hashOAuthSecret("other-secret", { pepper });

    expect(hashesMatchConstantTime(leftHash, sameHash)).toBe(true);
    expect(hashesMatchConstantTime(leftHash, differentHash)).toBe(false);
    expect(hashesMatchConstantTime(leftHash, "short")).toBe(false);
  });

  it("makes accidental collisions unlikely across a generated sample", () => {
    const generatedSecrets = Array.from({ length: 64 }, () =>
      generateOAuthSecret(),
    );

    expect(new Set(generatedSecrets).size).toBe(generatedSecrets.length);
  });
});
