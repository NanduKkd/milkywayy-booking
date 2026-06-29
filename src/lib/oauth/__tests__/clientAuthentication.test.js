import { RateLimitExceededError } from "@/lib/services/oauthRateLimits";
import {
  authenticateOAuthClient,
  extractOAuthClientCredentials,
  OAUTH_CLIENT_AUTH_RATE_LIMIT,
  OAUTH_CLIENT_AUTHENTICATION_ERROR_CODES,
  OAuthClientAuthenticationError,
} from "../clientAuthentication";

describe("OAuth client authentication", () => {
  const validClient = {
    id: 7,
    clientId: "client-123",
    clientSecretHash: "stored-secret-hash",
    isEnabled: true,
    tokenEndpointAuthMethods: ["client_secret_post", "client_secret_basic"],
  };

  let loadClient;
  let verifyClientSecret;
  let consumeClientRateLimit;

  beforeEach(() => {
    loadClient = jest.fn().mockResolvedValue(validClient);
    verifyClientSecret = jest.fn().mockResolvedValue(true);
    consumeClientRateLimit = jest.fn().mockResolvedValue({
      requestCount: 1,
      remaining: OAUTH_CLIENT_AUTH_RATE_LIMIT.limit - 1,
    });
  });

  it("extracts client_secret_post credentials from form data", () => {
    expect(
      extractOAuthClientCredentials({
        body: new URLSearchParams({
          client_id: "client-123",
          client_secret: "secret-abc",
        }),
      }),
    ).toEqual({
      authMethod: "client_secret_post",
      clientId: "client-123",
      clientSecret: "secret-abc",
    });
  });

  it("extracts client_secret_basic credentials from the Authorization header", () => {
    expect(
      extractOAuthClientCredentials({
        headers: {
          authorization: `Basic ${Buffer.from("client-123:secret-abc").toString("base64")}`,
        },
      }),
    ).toEqual({
      authMethod: "client_secret_basic",
      clientId: "client-123",
      clientSecret: "secret-abc",
    });
  });

  it("authenticates a client using client_secret_post", async () => {
    const result = await authenticateOAuthClient(
      {
        body: new URLSearchParams({
          client_id: "client-123",
          client_secret: "secret-abc",
        }),
      },
      {
        loadClient,
        verifyClientSecret,
        consumeClientRateLimit,
      },
    );

    expect(consumeClientRateLimit).toHaveBeenCalledWith({
      bucketType: "oauth-client-auth-client",
      key: "client:client-123",
      limit: 30,
      windowMs: 60_000,
    });
    expect(loadClient).toHaveBeenCalledWith("client-123");
    expect(verifyClientSecret).toHaveBeenCalledWith(
      "secret-abc",
      "stored-secret-hash",
    );
    expect(result).toEqual({
      authMethod: "client_secret_post",
      client: validClient,
      clientId: "client-123",
    });
  });

  it("authenticates a client using client_secret_basic", async () => {
    const result = await authenticateOAuthClient(
      {
        headers: {
          authorization: `Basic ${Buffer.from("client-123:secret-abc").toString("base64")}`,
        },
      },
      {
        loadClient,
        verifyClientSecret,
        consumeClientRateLimit,
      },
    );

    expect(consumeClientRateLimit).toHaveBeenCalledWith({
      bucketType: "oauth-client-auth-client",
      key: "client:client-123",
      limit: 30,
      windowMs: 60_000,
    });
    expect(result.authMethod).toBe("client_secret_basic");
  });

  it("rejects credentials supplied through both auth methods", async () => {
    await expect(
      authenticateOAuthClient(
        {
          body: new URLSearchParams({
            client_id: "client-123",
            client_secret: "secret-abc",
          }),
          headers: {
            authorization: `Basic ${Buffer.from("client-123:secret-abc").toString("base64")}`,
          },
        },
        {
          loadClient,
          verifyClientSecret,
          consumeClientRateLimit,
        },
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        name: "OAuthClientAuthenticationError",
        code: OAUTH_CLIENT_AUTHENTICATION_ERROR_CODES.invalidClient,
        reasonCode: "credentials_conflicting",
      }),
    );
  });

  it("rejects duplicated or malformed credentials", async () => {
    await expect(
      authenticateOAuthClient(
        {
          body: new URLSearchParams(
            "client_id=client-123&client_secret=first&client_secret=second",
          ),
        },
        {
          loadClient,
          verifyClientSecret,
          consumeClientRateLimit,
        },
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        reasonCode: "client_secret_duplicated",
      }),
    );
    expect(consumeClientRateLimit).toHaveBeenNthCalledWith(1, {
      bucketType: "oauth-client-auth-client",
      key: "client:client-123",
      limit: 30,
      windowMs: 60_000,
    });

    await expect(
      authenticateOAuthClient(
        {
          headers: {
            authorization: "Basic !!!not-base64!!!",
          },
        },
        {
          loadClient,
          verifyClientSecret,
          consumeClientRateLimit,
        },
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        reasonCode: "authorization_header_malformed",
      }),
    );
    expect(consumeClientRateLimit).toHaveBeenNthCalledWith(2, {
      bucketType: "oauth-client-auth-client",
      key: "header:Basic !!!not-base64!!!",
      limit: 30,
      windowMs: 60_000,
    });
  });

  it("rejects missing credentials", async () => {
    await expect(
      authenticateOAuthClient(
        {},
        {
          loadClient,
          verifyClientSecret,
          consumeClientRateLimit,
        },
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        reasonCode: "credentials_missing",
      }),
    );
    expect(consumeClientRateLimit).toHaveBeenCalledWith({
      bucketType: "oauth-client-auth-client",
      key: "missing",
      limit: 30,
      windowMs: 60_000,
    });
  });

  it("returns the same invalid_client response shape for unknown, disabled, and invalid secrets", async () => {
    loadClient
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        ...validClient,
        isEnabled: false,
      })
      .mockResolvedValueOnce(validClient);
    verifyClientSecret.mockResolvedValueOnce(false);

    const unknownClientPromise = authenticateOAuthClient(
      {
        body: new URLSearchParams({
          client_id: "missing-client",
          client_secret: "secret-abc",
        }),
      },
      {
        loadClient,
        verifyClientSecret,
        consumeClientRateLimit,
      },
    );
    const disabledClientPromise = authenticateOAuthClient(
      {
        body: new URLSearchParams({
          client_id: "disabled-client",
          client_secret: "secret-abc",
        }),
      },
      {
        loadClient,
        verifyClientSecret,
        consumeClientRateLimit,
      },
    );
    const invalidSecretPromise = authenticateOAuthClient(
      {
        body: new URLSearchParams({
          client_id: "client-123",
          client_secret: "wrong-secret",
        }),
      },
      {
        loadClient,
        verifyClientSecret,
        consumeClientRateLimit,
      },
    );

    await expect(unknownClientPromise).rejects.toMatchObject({
      name: "OAuthClientAuthenticationError",
      code: "invalid_client",
      message: "OAuth client authentication failed.",
      statusCode: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="oauth"',
      },
    });
    await expect(disabledClientPromise).rejects.toMatchObject({
      name: "OAuthClientAuthenticationError",
      code: "invalid_client",
      message: "OAuth client authentication failed.",
      statusCode: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="oauth"',
      },
    });
    await expect(invalidSecretPromise).rejects.toMatchObject({
      name: "OAuthClientAuthenticationError",
      code: "invalid_client",
      message: "OAuth client authentication failed.",
      statusCode: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="oauth"',
      },
    });
  });

  it("rejects auth methods that are not enabled on the registered client", async () => {
    loadClient.mockResolvedValue({
      ...validClient,
      tokenEndpointAuthMethods: ["client_secret_post"],
    });

    await expect(
      authenticateOAuthClient(
        {
          headers: {
            authorization: `Basic ${Buffer.from("client-123:secret-abc").toString("base64")}`,
          },
        },
        {
          loadClient,
          verifyClientSecret,
          consumeClientRateLimit,
        },
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        reasonCode: "auth_method_not_allowed",
      }),
    );
  });

  it("propagates client-auth rate limiting", async () => {
    consumeClientRateLimit.mockRejectedValue(
      new RateLimitExceededError({
        bucketType: "oauth-client-auth-client",
        retryAfterSeconds: 60,
      }),
    );

    await expect(
      authenticateOAuthClient(
        {
          body: new URLSearchParams({
            client_id: "client-123",
            client_secret: "secret-abc",
          }),
        },
        {
          loadClient,
          verifyClientSecret,
          consumeClientRateLimit,
        },
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        name: "RateLimitExceededError",
        bucketType: "oauth-client-auth-client",
        retryAfterSeconds: 60,
      }),
    );
  });

  it("exposes a typed invalid_client error", () => {
    const error = new OAuthClientAuthenticationError();

    expect(error).toMatchObject({
      name: "OAuthClientAuthenticationError",
      code: "invalid_client",
      reasonCode: "invalid_client",
      statusCode: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="oauth"',
      },
    });
  });
});
