const mockIssuedTokens = new Map();

jest.mock("jose", () => ({
  SignJWT: class SignJWT {
    constructor(payload) {
      this.payload = { ...payload };
    }

    setProtectedHeader() {
      return this;
    }

    setIssuedAt(value) {
      this.payload.iat = value;
      return this;
    }

    setNotBefore(value) {
      this.payload.nbf = value;
      return this;
    }

    setIssuer(value) {
      this.payload.iss = value;
      return this;
    }

    setAudience(value) {
      this.payload.aud = value;
      return this;
    }

    setExpirationTime(value) {
      this.payload.exp = value;
      return this;
    }

    async sign() {
      const token = JSON.stringify(this.payload);
      mockIssuedTokens.set(token, this.payload);
      return token;
    }
  },
  jwtVerify: jest.fn(async (token, _key, options = {}) => {
    const payload = mockIssuedTokens.get(token);

    if (!payload) {
      throw new Error("Invalid token");
    }

    if (options.issuer && payload.iss !== options.issuer) {
      throw new Error("Invalid issuer");
    }

    if (options.audience && payload.aud !== options.audience) {
      throw new Error("Invalid audience");
    }

    if (payload.exp && options.currentDate) {
      const currentSeconds = Math.floor(
        new Date(options.currentDate).getTime() / 1000,
      );

      if (currentSeconds > payload.exp) {
        throw new Error("Token expired");
      }
    }

    return { payload };
  }),
}));

import {
  buildAuthorizationErrorPath,
  buildAuthorizationResumePath,
  issueAuthorizationResumeToken,
  normalizeAuthorizationErrorPath,
  normalizeAuthorizationResumePath,
  OAUTH_AUTHORIZE_ERROR_CODES,
  verifyAuthorizationResumeToken,
} from "../authorizationResume";

describe("authorizationResume helpers", () => {
  const baseInteraction = {
    clientId: "gpt-client",
    redirectUri: "https://chatgpt.com/aip/oauth/callback-test",
    responseType: "code",
    scope: "customer:read",
    state: "opaque-state-value",
  };

  beforeEach(() => {
    mockIssuedTokens.clear();
  });

  it("issues and verifies a signed authorization resume token", async () => {
    const token = await issueAuthorizationResumeToken({
      interaction: baseInteraction,
      issuedAt: new Date("2026-06-29T00:00:00.000Z"),
    });

    await expect(
      verifyAuthorizationResumeToken(token, {
        currentDate: new Date("2026-06-29T00:09:00.000Z"),
      }),
    ).resolves.toEqual({
      ...baseInteraction,
      scopes: ["customer:read"],
    });
  });

  it("rejects an expired authorization resume token", async () => {
    const token = await issueAuthorizationResumeToken({
      interaction: baseInteraction,
      issuedAt: new Date("2026-06-29T00:00:00.000Z"),
    });

    await expect(
      verifyAuthorizationResumeToken(token, {
        currentDate: new Date("2026-06-29T00:11:00.000Z"),
      }),
    ).rejects.toThrow();
  });

  it("allows only local authorization resume redirects", () => {
    const resumePath = buildAuthorizationResumePath("resume-token");

    expect(normalizeAuthorizationResumePath(resumePath)).toBe(resumePath);
    expect(
      normalizeAuthorizationResumePath(
        "https://milkywayy.local/oauth/authorize/resume?resume=resume-token",
      ),
    ).toBe(resumePath);
    expect(
      normalizeAuthorizationResumePath(
        "/oauth/authorize/resume?resume=resume-token&next=https://example.com",
      ),
    ).toBeNull();
    expect(
      normalizeAuthorizationResumePath(
        "https://example.com/oauth/authorize/resume?resume=resume-token",
      ),
    ).toBeNull();
  });

  it("allows only safe local authorization error redirects", () => {
    const errorPath = buildAuthorizationErrorPath(
      OAUTH_AUTHORIZE_ERROR_CODES.loginCancelled,
    );

    expect(normalizeAuthorizationErrorPath(errorPath)).toBe(errorPath);
    expect(
      normalizeAuthorizationErrorPath(
        "https://milkywayy.local/oauth/authorize/error?error=login_cancelled",
      ),
    ).toBe(errorPath);
    expect(
      normalizeAuthorizationErrorPath(
        "/oauth/authorize/error?error=login_cancelled&state=leak",
      ),
    ).toBeNull();
    expect(
      normalizeAuthorizationErrorPath(
        "/oauth/authorize/error?error=access_denied",
      ),
    ).toBeNull();
  });
});
