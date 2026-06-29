const mockAuthenticateGptApiRequest = jest.fn();
const mockBuildGptApiAuthorizationErrorResponse = jest.fn();
const mockFindUserByPk = jest.fn();

jest.mock("@/lib/db/models", () => ({
  User: {
    findByPk: (...args) => mockFindUserByPk(...args),
  },
}));

jest.mock("../../_lib/auth", () => {
  class MockGptApiAuthorizationError extends Error {
    constructor({
      code = "invalid_token",
      description = "Authentication is required.",
      headers = {
        "WWW-Authenticate": 'Bearer realm="gpt-action-api"',
      },
      reasonCode = "authorization_invalid",
      statusCode = 401,
    } = {}) {
      super(description);
      this.name = "GptApiAuthorizationError";
      this.code = code;
      this.description = description;
      this.headers = headers;
      this.reasonCode = reasonCode;
      this.statusCode = statusCode;
    }
  }

  class MockGptApiRateLimitError extends Error {
    constructor({
      bucketType = "oauth-gpt-resource-user",
      retryAfterSeconds = 30,
      statusCode = 429,
    } = {}) {
      super("Too many requests. Please wait before trying again.");
      this.name = "GptApiRateLimitError";
      this.bucketType = bucketType;
      this.retryAfterSeconds = retryAfterSeconds;
      this.statusCode = statusCode;
    }
  }

  return {
    authenticateGptApiRequest: (...args) =>
      mockAuthenticateGptApiRequest(...args),
    buildGptApiAuthorizationErrorResponse: (...args) =>
      mockBuildGptApiAuthorizationErrorResponse(...args),
    GPT_API_AUTH_ERROR_CODES: {
      insufficientScope: "insufficient_scope",
      invalidRequest: "invalid_request",
      invalidToken: "invalid_token",
    },
    GptApiAuthorizationError: MockGptApiAuthorizationError,
    GptApiRateLimitError: MockGptApiRateLimitError,
  };
});

jest.mock("../../_lib/dtos", () => ({
  serializeConnectedAccountDto:
    jest.requireActual("../../_lib/dtos").serializeConnectedAccountDto,
}));

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((data, init = {}) => ({
      json: async () => data,
      headers: new Headers(init.headers || {}),
      status: init.status || 200,
    })),
  },
}));

const {
  GptApiAuthorizationError,
  GptApiRateLimitError,
} = require("../../_lib/auth");
const { GET } = require("../route");

describe("GPT API /me route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBuildGptApiAuthorizationErrorResponse.mockImplementation((error) => ({
      json: async () => ({
        error: error.code,
      }),
      headers: new Headers(error.headers || {}),
      status: error.statusCode || 401,
    }));
  });

  it("returns the minimal connected-account payload for an authenticated customer", async () => {
    mockAuthenticateGptApiRequest.mockResolvedValue({
      clientId: 19,
      customerId: 42,
      scopes: ["customer:read"],
    });
    mockFindUserByPk.mockResolvedValue({
      accountType: "COMPANY",
      companyName: "Acme Estates",
      fullName: "Ignored Name",
      phone: "+971501234567",
      role: "CUSTOMER",
    });

    const response = await GET({
      headers: new Headers({
        authorization: "Bearer oauth-access-token",
      }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      account: {
        accountType: "COMPANY",
        displayName: "Acme Estates",
        phoneLast4: "4567",
      },
    });
    expect(mockAuthenticateGptApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
      {
        requiredScopes: ["customer:read"],
      },
    );
    expect(mockFindUserByPk).toHaveBeenCalledWith(42, {
      attributes: [
        "id",
        "accountType",
        "companyName",
        "fullName",
        "phone",
        "role",
      ],
    });
  });

  it("returns the authorization error response when the bearer token has been revoked", async () => {
    const revokedTokenError = new GptApiAuthorizationError({
      code: "invalid_token",
      reasonCode: "access_token_revoked",
      statusCode: 401,
    });
    mockAuthenticateGptApiRequest.mockRejectedValue(revokedTokenError);

    const response = await GET({
      headers: new Headers({
        authorization: "Bearer revoked-token",
      }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "invalid_token",
    });
    expect(mockBuildGptApiAuthorizationErrorResponse).toHaveBeenCalledWith(
      revokedTokenError,
    );
    expect(mockFindUserByPk).not.toHaveBeenCalled();
  });

  it("returns invalid_token when the token principal no longer resolves to a user", async () => {
    mockAuthenticateGptApiRequest.mockResolvedValue({
      clientId: 19,
      customerId: 42,
      scopes: ["customer:read"],
    });
    mockFindUserByPk.mockResolvedValue(null);

    const response = await GET({
      headers: new Headers({
        authorization: "Bearer oauth-access-token",
      }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "invalid_token",
    });
    expect(mockBuildGptApiAuthorizationErrorResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "invalid_token",
        reasonCode: "access_token_principal_unavailable",
      }),
    );
  });

  it("returns invalid_token when the token principal resolves to a non-customer user", async () => {
    mockAuthenticateGptApiRequest.mockResolvedValue({
      clientId: 19,
      customerId: 42,
      scopes: ["customer:read"],
    });
    mockFindUserByPk.mockResolvedValue({
      accountType: "INDIVIDUAL",
      fullName: "Ops Staff",
      phone: "+971500001234",
      role: "SUPERADMIN",
    });

    const response = await GET({
      headers: new Headers({
        authorization: "Bearer oauth-access-token",
      }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "invalid_token",
    });
    expect(mockBuildGptApiAuthorizationErrorResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "invalid_token",
        reasonCode: "access_token_principal_unavailable",
      }),
    );
  });

  it("returns a 429 response with retry guidance when the shared limiter blocks the request", async () => {
    mockAuthenticateGptApiRequest.mockRejectedValue(
      new GptApiRateLimitError({
        retryAfterSeconds: 21,
      }),
    );

    const response = await GET({
      headers: new Headers({
        authorization: "Bearer throttled-token",
      }),
    });

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("21");
    await expect(response.json()).resolves.toEqual({
      error: "rate_limited",
      retryAfterSeconds: 21,
    });
  });
});
