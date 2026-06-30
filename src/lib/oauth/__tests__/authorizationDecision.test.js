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
  buildOAuthCallbackRedirect,
  issueAuthorizationDecisionToken,
  verifyAuthorizationDecisionToken,
} from "../authorizationDecision";

describe("authorization decision helpers", () => {
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

  it("issues and verifies signed authorization decision tokens", async () => {
    const token = await issueAuthorizationDecisionToken({
      csrfToken: "csrf-token",
      interaction: baseInteraction,
      issuedAt: new Date("2026-06-29T00:00:00.000Z"),
      oauthClientId: 7,
      userId: 42,
    });

    await expect(
      verifyAuthorizationDecisionToken(token, {
        currentDate: new Date("2026-06-29T00:09:59.000Z"),
      }),
    ).resolves.toEqual({
      csrfToken: "csrf-token",
      interaction: {
        ...baseInteraction,
        scopes: ["customer:read"],
      },
      oauthClientId: 7,
      userId: 42,
    });
  });

  it("rejects expired or malformed authorization decision tokens", async () => {
    const token = await issueAuthorizationDecisionToken({
      csrfToken: "csrf-token",
      interaction: baseInteraction,
      issuedAt: new Date("2026-06-29T00:00:00.000Z"),
      oauthClientId: 7,
      userId: 42,
    });

    await expect(
      verifyAuthorizationDecisionToken(token, {
        currentDate: new Date("2026-06-29T00:11:00.000Z"),
      }),
    ).rejects.toThrow("Token expired");
    await expect(verifyAuthorizationDecisionToken("   ")).rejects.toThrow(
      "Authorization decision token is required.",
    );
    await expect(
      issueAuthorizationDecisionToken({
        csrfToken: "",
        interaction: baseInteraction,
        oauthClientId: "not-a-number",
        userId: 42,
      }),
    ).rejects.toThrow("Authorization decision CSRF token is required.");
    await expect(
      issueAuthorizationDecisionToken({
        csrfToken: "csrf-token",
        interaction: baseInteraction,
        oauthClientId: "not-a-number",
        userId: 42,
      }),
    ).rejects.toThrow("Authorization decision OAuth client ID is required.");
  });

  it("builds callback redirects from validated interactions and skips blank params", () => {
    expect(
      buildOAuthCallbackRedirect(baseInteraction, {
        code: "issued-code",
        empty: "",
        error: null,
        state: "opaque-state-value",
      }),
    ).toBe(
      "https://chatgpt.com/aip/oauth/callback-test?code=issued-code&state=opaque-state-value",
    );
  });
});
