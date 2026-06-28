describe("oauth config", () => {
  const originalEnv = { ...process.env };

  const setValidProductionEnv = () => {
    process.env.NODE_ENV = "production";
    process.env.OAUTH_BASE_URL = "https://api.milkywayy.com";
    process.env.OAUTH_ALLOWED_SCOPES = "customer:read";
    process.env.OAUTH_CALLBACK_URIS =
      "https://chat.openai.com/aip/oauth/callback,https://chatgpt.com/aip/oauth/callback";
    process.env.OAUTH_INTERACTION_TTL_SECONDS = "600";
    process.env.OAUTH_CODE_TTL_SECONDS = "120";
    process.env.OAUTH_ACCESS_TOKEN_TTL_SECONDS = "900";
    process.env.OAUTH_REFRESH_TOKEN_TTL_SECONDS = "2592000";
    process.env.OAUTH_TOKEN_HASH_PEPPER = "token-pepper";
    process.env.OAUTH_CLIENT_SECRET_HASH_PEPPER = "client-pepper";
  };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  it("uses explicit non-production defaults in development", () => {
    process.env.NODE_ENV = "development";
    delete process.env.OAUTH_BASE_URL;
    delete process.env.OAUTH_CALLBACK_URIS;
    delete process.env.OAUTH_ALLOWED_SCOPES;
    delete process.env.OAUTH_INTERACTION_TTL_SECONDS;
    delete process.env.OAUTH_CODE_TTL_SECONDS;
    delete process.env.OAUTH_ACCESS_TOKEN_TTL_SECONDS;
    delete process.env.OAUTH_REFRESH_TOKEN_TTL_SECONDS;
    delete process.env.OAUTH_TOKEN_HASH_PEPPER;
    delete process.env.OAUTH_CLIENT_SECRET_HASH_PEPPER;

    jest.isolateModules(() => {
      const { oauthConfig } = require("../oauth");

      expect(oauthConfig.environment).toBe("development");
      expect(oauthConfig.baseUrl).toBe("http://localhost:3000");
      expect(oauthConfig.allowedScopes).toEqual(["customer:read"]);
      expect(oauthConfig.callbackUris).toEqual([
        "https://chat.openai.com/aip/oauth/callback-test",
        "https://chatgpt.com/aip/oauth/callback-test",
      ]);
      expect(oauthConfig.codeTtlSeconds).toBe(120);
      expect(oauthConfig.accessTokenTtlSeconds).toBe(900);
      expect(oauthConfig.refreshTokenTtlSeconds).toBe(2_592_000);
    });
  });

  it("fails closed in production when required secrets are missing", () => {
    setValidProductionEnv();
    delete process.env.OAUTH_TOKEN_HASH_PEPPER;
    delete process.env.OAUTH_CLIENT_SECRET_HASH_PEPPER;

    expect(() => {
      jest.isolateModules(() => {
        require("../oauth");
      });
    }).toThrow("OAUTH_TOKEN_HASH_PEPPER must be configured in production.");
  });

  it("fails closed in production when callback uris are missing", () => {
    setValidProductionEnv();
    delete process.env.OAUTH_CALLBACK_URIS;

    expect(() => {
      jest.isolateModules(() => {
        require("../oauth");
      });
    }).toThrow("OAUTH_CALLBACK_URIS must be configured in production.");
  });

  it("rejects insecure production base urls", () => {
    setValidProductionEnv();
    process.env.OAUTH_BASE_URL = "http://api.milkywayy.com";

    expect(() => {
      jest.isolateModules(() => {
        require("../oauth");
      });
    }).toThrow("OAUTH_BASE_URL must use HTTPS in production.");
  });

  it("rejects callback uris on unapproved hosts", () => {
    setValidProductionEnv();
    process.env.OAUTH_CALLBACK_URIS = "https://evil.example.com/oauth/callback";

    expect(() => {
      jest.isolateModules(() => {
        require("../oauth");
      });
    }).toThrow(
      "OAuth callback URI must use an approved ChatGPT host: https://evil.example.com/oauth/callback",
    );
  });

  it("rejects public env vars for OAuth secrets", () => {
    process.env.NODE_ENV = "development";
    process.env.NEXT_PUBLIC_OAUTH_TOKEN_HASH_PEPPER = "leaked";

    expect(() => {
      jest.isolateModules(() => {
        require("../oauth");
      });
    }).toThrow(
      "NEXT_PUBLIC_OAUTH_TOKEN_HASH_PEPPER must not be set because OAuth secrets must remain server-only.",
    );
  });
});
