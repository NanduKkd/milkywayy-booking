import { POST } from "../route";

const mockAuthenticateOAuthClient = jest.fn();
const mockExchangeAuthorizationCode = jest.fn();

jest.mock("@/lib/oauth/clientAuthentication", () => {
  class MockOAuthClientAuthenticationError extends Error {
    constructor({
      code = "invalid_client",
      headers = {
        "WWW-Authenticate": 'Basic realm="oauth"',
      },
      statusCode = 401,
    } = {}) {
      super("OAuth client authentication failed.");
      this.code = code;
      this.headers = headers;
      this.name = "OAuthClientAuthenticationError";
      this.statusCode = statusCode;
    }
  }

  return {
    OAuthClientAuthenticationError: MockOAuthClientAuthenticationError,
    authenticateOAuthClient: (...args) => mockAuthenticateOAuthClient(...args),
  };
});

jest.mock("@/lib/oauth/tokenExchange", () => {
  class MockOAuthTokenExchangeError extends Error {
    constructor({ code = "invalid_grant", statusCode = 400 } = {}) {
      super("Invalid OAuth token request.");
      this.code = code;
      this.name = "OAuthTokenExchangeError";
      this.statusCode = statusCode;
    }
  }

  return {
    OAuthTokenExchangeError: MockOAuthTokenExchangeError,
    exchangeAuthorizationCode: (...args) =>
      mockExchangeAuthorizationCode(...args),
  };
});

jest.mock("@/lib/services/oauthRateLimits", () => {
  class MockRateLimitExceededError extends Error {
    constructor({ retryAfterSeconds = 30 } = {}) {
      super("Too many requests.");
      this.name = "RateLimitExceededError";
      this.retryAfterSeconds = retryAfterSeconds;
    }
  }

  return {
    RateLimitExceededError: MockRateLimitExceededError,
  };
});

if (typeof global.Response === "undefined") {
  global.Response = class MockResponse {
    constructor(body, init = {}) {
      this.body = body;
      this.headers = new Headers(init.headers || {});
      this.status = init.status || 200;
    }

    async json() {
      return JSON.parse(this.body);
    }
  };
}

function createRequest({
  body = "",
  contentType = "application/x-www-form-urlencoded",
  headers = {},
} = {}) {
  const normalizedHeaders = new Headers({
    "content-type": contentType,
    ...headers,
  });

  return {
    headers: normalizedHeaders,
    text: async () => body,
  };
}

describe("oauth token route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns access and refresh tokens for a valid form-encoded exchange", async () => {
    mockAuthenticateOAuthClient.mockResolvedValue({
      client: {
        id: 7,
      },
    });
    mockExchangeAuthorizationCode.mockResolvedValue({
      access_token: "raw-access-token",
      expires_in: 900,
      refresh_token: "raw-refresh-token",
      scope: "customer:read",
      token_type: "bearer",
    });

    const response = await POST(
      createRequest({
        body: new URLSearchParams({
          client_id: "client-123",
          client_secret: "secret-abc",
          code: "raw-code",
          grant_type: "authorization_code",
          redirect_uri: "https://chatgpt.com/aip/oauth/callback-test",
        }).toString(),
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("pragma")).toBe("no-cache");
    await expect(response.json()).resolves.toEqual({
      access_token: "raw-access-token",
      expires_in: 900,
      refresh_token: "raw-refresh-token",
      scope: "customer:read",
      token_type: "bearer",
    });
    expect(mockAuthenticateOAuthClient).toHaveBeenCalledWith({
      body: expect.any(URLSearchParams),
      headers: expect.any(Headers),
    });
    expect(mockExchangeAuthorizationCode).toHaveBeenCalledWith({
      client: {
        id: 7,
      },
      parameters: expect.any(URLSearchParams),
    });
  });

  it("rejects unsupported request content types before reading client credentials", async () => {
    const response = await POST(
      createRequest({
        body: JSON.stringify({ grant_type: "authorization_code" }),
        contentType: "application/json",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "invalid_request",
    });
    expect(mockAuthenticateOAuthClient).not.toHaveBeenCalled();
  });

  it("returns an OAuth invalid_client response when client authentication fails", async () => {
    const { OAuthClientAuthenticationError } = jest.requireMock(
      "@/lib/oauth/clientAuthentication",
    );
    mockAuthenticateOAuthClient.mockRejectedValue(
      new OAuthClientAuthenticationError(),
    );

    const response = await POST(
      createRequest({
        body: new URLSearchParams({
          client_id: "client-123",
          client_secret: "wrong-secret",
        }).toString(),
      }),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toBe(
      'Basic realm="oauth"',
    );
    await expect(response.json()).resolves.toEqual({
      error: "invalid_client",
    });
  });

  it("returns a safe invalid_grant response when the authorization code exchange fails", async () => {
    const { OAuthTokenExchangeError } = jest.requireMock(
      "@/lib/oauth/tokenExchange",
    );
    mockAuthenticateOAuthClient.mockResolvedValue({
      client: {
        id: 7,
      },
    });
    mockExchangeAuthorizationCode.mockRejectedValue(
      new OAuthTokenExchangeError({ code: "invalid_grant" }),
    );

    const response = await POST(
      createRequest({
        body: new URLSearchParams({
          client_id: "client-123",
          client_secret: "secret-abc",
          code: "raw-code",
          grant_type: "authorization_code",
          redirect_uri: "https://chatgpt.com/aip/oauth/callback-test",
        }).toString(),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "invalid_grant",
    });
  });

  it("maps rate-limit failures to temporarily_unavailable with retry guidance", async () => {
    const { RateLimitExceededError } = jest.requireMock(
      "@/lib/services/oauthRateLimits",
    );
    mockAuthenticateOAuthClient.mockRejectedValue(
      new RateLimitExceededError({ retryAfterSeconds: 17 }),
    );

    const response = await POST(
      createRequest({
        body: new URLSearchParams({
          client_id: "client-123",
          client_secret: "secret-abc",
        }).toString(),
      }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("17");
    await expect(response.json()).resolves.toEqual({
      error: "temporarily_unavailable",
    });
  });
});
