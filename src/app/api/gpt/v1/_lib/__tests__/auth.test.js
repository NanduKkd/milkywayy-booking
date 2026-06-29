const mockResolveOAuthAccessToken = jest.fn();

global.Response = class MockResponse {
  constructor(body, { headers = {}, status = 200 } = {}) {
    this._body = body;
    this.headers = new Headers(headers);
    this.status = status;
  }

  async json() {
    return JSON.parse(this._body);
  }
};

jest.mock("@/lib/oauth/accessTokens", () => {
  class MockOAuthAccessTokenError extends Error {
    constructor({
      code = "invalid_token",
      description = "OAuth access token is invalid.",
      reasonCode = "access_token_invalid",
      statusCode = 401,
    } = {}) {
      super(description);
      this.name = "OAuthAccessTokenError";
      this.code = code;
      this.description = description;
      this.reasonCode = reasonCode;
      this.statusCode = statusCode;
    }
  }

  return {
    OAUTH_ACCESS_TOKEN_ERROR_CODES: {
      invalidToken: "invalid_token",
    },
    OAuthAccessTokenError: MockOAuthAccessTokenError,
    resolveOAuthAccessToken: (...args) => mockResolveOAuthAccessToken(...args),
  };
});
const { OAuthAccessTokenError } = require("@/lib/oauth/accessTokens");
const {
  authenticateGptApiRequest,
  buildGptApiAuthorizationErrorResponse,
  extractBearerTokenFromRequest,
  GPT_API_AUTH_ERROR_CODES,
  GptApiAuthorizationError,
} = require("../auth");

function createRequest({ authorization, cookie, sessionToken } = {}) {
  const headers = new Headers();

  if (authorization !== undefined) {
    headers.set("authorization", authorization);
  }

  if (cookie !== undefined) {
    headers.set("cookie", cookie);
  }

  if (sessionToken !== undefined) {
    headers.set("cookie", `session-token=${sessionToken}`);
  }

  return {
    headers,
  };
}

describe("GPT API authorization helper", () => {
  beforeEach(() => {
    mockResolveOAuthAccessToken.mockReset();
  });

  it("extracts a bearer token from the authorization header only", () => {
    expect(
      extractBearerTokenFromRequest(
        createRequest({
          authorization: "Bearer raw-access-token",
          cookie: "oauthAccessToken=raw-access-token",
        }),
      ),
    ).toBe("raw-access-token");
  });

  it("rejects requests without a bearer token header even if cookies are present", async () => {
    await expect(
      authenticateGptApiRequest(
        createRequest({
          cookie: "oauthAccessToken=raw-access-token",
          sessionToken: "website-session-token",
        }),
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        code: GPT_API_AUTH_ERROR_CODES.invalidToken,
        reasonCode: "authorization_missing",
        statusCode: 401,
      }),
    );

    expect(mockResolveOAuthAccessToken).not.toHaveBeenCalled();
  });

  it("rejects non-bearer authorization headers", async () => {
    await expect(
      authenticateGptApiRequest(
        createRequest({
          authorization: "Basic Zm9vOmJhcg==",
        }),
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        code: GPT_API_AUTH_ERROR_CODES.invalidRequest,
        reasonCode: "authorization_scheme_invalid",
        statusCode: 401,
      }),
    );
  });

  it("resolves a valid request to the minimal principal", async () => {
    mockResolveOAuthAccessToken.mockResolvedValue({
      clientId: 7,
      customerId: 15,
      scopes: ["customer:read"],
    });

    await expect(
      authenticateGptApiRequest(
        createRequest({
          authorization: "Bearer oauth-access-token",
        }),
      ),
    ).resolves.toEqual({
      clientId: 7,
      customerId: 15,
      scopes: ["customer:read"],
    });

    expect(mockResolveOAuthAccessToken).toHaveBeenCalledWith(
      "oauth-access-token",
      {
        now: undefined,
      },
    );
  });

  it("rejects a website session token passed as a bearer token", async () => {
    mockResolveOAuthAccessToken.mockRejectedValue(
      new OAuthAccessTokenError({
        description: "OAuth access token is unknown.",
        reasonCode: "access_token_unknown",
      }),
    );

    await expect(
      authenticateGptApiRequest(
        createRequest({
          authorization: "Bearer website.session.jwt",
        }),
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        code: GPT_API_AUTH_ERROR_CODES.invalidToken,
        reasonCode: "access_token_unknown",
        statusCode: 401,
      }),
    );
  });

  it("returns 403 when the token is missing a required scope", async () => {
    mockResolveOAuthAccessToken.mockResolvedValue({
      clientId: 7,
      customerId: 15,
      scopes: ["customer:read"],
    });

    await expect(
      authenticateGptApiRequest(
        createRequest({
          authorization: "Bearer oauth-access-token",
        }),
        {
          requiredScopes: ["bookings:write"],
        },
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        code: GPT_API_AUTH_ERROR_CODES.insufficientScope,
        reasonCode: "scope_missing",
        statusCode: 403,
      }),
    );
  });

  it("builds a safe JSON response for auth failures", async () => {
    const response = buildGptApiAuthorizationErrorResponse(
      new GptApiAuthorizationError({
        code: GPT_API_AUTH_ERROR_CODES.invalidToken,
        description: "Bearer token is invalid.",
        reasonCode: "access_token_unknown",
        statusCode: 401,
      }),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("content-type")).toBe(
      "application/json; charset=utf-8",
    );
    expect(response.headers.get("www-authenticate")).toContain(
      'error="invalid_token"',
    );
    await expect(response.json()).resolves.toEqual({
      error: "invalid_token",
    });
  });
});
