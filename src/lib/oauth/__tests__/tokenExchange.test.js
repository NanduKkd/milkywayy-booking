import {
  exchangeAuthorizationCode,
  OAuthTokenExchangeError,
  parseAuthorizationCodeTokenRequest,
} from "../tokenExchange";

const mockTransaction = {
  LOCK: {
    UPDATE: "UPDATE",
  },
};

const mockTransactionRunner = jest.fn((callback) => callback(mockTransaction));
const mockConsumeAuthorizationCodeInTransaction = jest.fn();
const mockCreateAccessToken = jest.fn();
const mockCreateRefreshToken = jest.fn();
const mockCreateAuditEvent = jest.fn();
const mockGenerateAccessToken = jest.fn();
const mockGenerateRefreshToken = jest.fn();
const mockHashOAuthSecret = jest.fn();

jest.mock("@/lib/db/db", () => ({
  sequelize: {
    transaction: (...args) => mockTransactionRunner(...args),
  },
}));

jest.mock("@/lib/db/models", () => ({
  __esModule: true,
  default: {
    OAuthAccessToken: {
      create: (...args) => mockCreateAccessToken(...args),
    },
    OAuthAuditEvent: {
      create: (...args) => mockCreateAuditEvent(...args),
    },
    OAuthRefreshToken: {
      create: (...args) => mockCreateRefreshToken(...args),
    },
  },
}));

jest.mock("@/lib/oauth/authorizationCodes", () => ({
  consumeAuthorizationCodeInTransaction: (...args) =>
    mockConsumeAuthorizationCodeInTransaction(...args),
}));

jest.mock("@/lib/oauth/secrets", () => ({
  generateAccessToken: (...args) => mockGenerateAccessToken(...args),
  generateRefreshToken: (...args) => mockGenerateRefreshToken(...args),
  hashOAuthSecret: (...args) => mockHashOAuthSecret(...args),
}));

describe("oauth token exchange", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("issues hashed access and refresh tokens after consuming a valid authorization code", async () => {
    const now = new Date("2026-06-29T10:00:00.000Z");
    const authorizationCodeRecord = {
      clientId: 7,
      codeChallenge: null,
      codeChallengeMethod: null,
      scopes: ["customer:read", "customer:read"],
      userId: 42,
    };
    mockConsumeAuthorizationCodeInTransaction.mockResolvedValue({
      authorizationCodeRecord,
      correlationId: "corr-1",
    });
    mockGenerateAccessToken.mockReturnValue("raw-access-token");
    mockGenerateRefreshToken.mockReturnValue("raw-refresh-token");
    mockHashOAuthSecret
      .mockReturnValueOnce("hashed-access-token")
      .mockReturnValueOnce("hashed-refresh-token");
    mockCreateAccessToken.mockResolvedValue({ id: 11 });
    mockCreateRefreshToken.mockResolvedValue({ id: 12 });
    mockCreateAuditEvent.mockResolvedValue({ id: 99 });

    const result = await exchangeAuthorizationCode({
      client: {
        id: 7,
      },
      correlationId: "corr-1",
      now,
      parameters: new URLSearchParams({
        code: "raw-code",
        grant_type: "authorization_code",
        redirect_uri: "https://chatgpt.com/aip/oauth/callback-test",
      }),
    });

    expect(mockTransactionRunner).toHaveBeenCalledTimes(1);
    expect(mockConsumeAuthorizationCodeInTransaction).toHaveBeenCalledWith({
      authorizationCode: "raw-code",
      clientId: 7,
      correlationId: "corr-1",
      now,
      redirectUri: "https://chatgpt.com/aip/oauth/callback-test",
      transaction: mockTransaction,
    });
    expect(mockCreateAccessToken).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 7,
        expiresAt: new Date("2026-06-29T10:15:00.000Z"),
        refreshFamilyId: expect.any(String),
        revokedAt: null,
        scopes: ["customer:read"],
        tokenHash: "hashed-access-token",
        userId: 42,
      }),
      { transaction: mockTransaction },
    );
    expect(mockCreateRefreshToken).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 7,
        consumedAt: null,
        expiresAt: new Date("2026-07-29T10:00:00.000Z"),
        familyId: expect.any(String),
        parentTokenId: null,
        revokedAt: null,
        scopes: ["customer:read"],
        tokenHash: "hashed-refresh-token",
        userId: 42,
      }),
      { transaction: mockTransaction },
    );
    expect(mockCreateAccessToken.mock.calls[0][0].refreshFamilyId).toBe(
      mockCreateRefreshToken.mock.calls[0][0].familyId,
    );
    expect(mockCreateAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 7,
        correlationId: "corr-1",
        createdAt: now,
        eventType: "oauth.token.issued",
        expiresAt: new Date("2026-07-29T10:00:00.000Z"),
        metadata: expect.objectContaining({
          accessTokenId: 11,
          authMethod: "authorization_code",
          refreshTokenId: 12,
          scopeCount: 1,
        }),
        outcome: "success",
        reasonCode: "token_issued_authorization_code",
        userId: 42,
      }),
      { transaction: mockTransaction },
    );
    expect(result).toEqual({
      access_token: "raw-access-token",
      expires_in: 900,
      refresh_token: "raw-refresh-token",
      scope: "customer:read",
      token_type: "bearer",
    });
  });

  it("rejects requests with unsupported or malformed grant parameters", () => {
    expect(() =>
      parseAuthorizationCodeTokenRequest(
        new URLSearchParams({
          code: "raw-code",
          grant_type: "refresh_token",
          redirect_uri: "https://chatgpt.com/aip/oauth/callback-test",
        }),
      ),
    ).toThrow(
      expect.objectContaining({
        code: "unsupported_grant_type",
        reasonCode: "grant_type_unsupported",
      }),
    );

    expect(() =>
      parseAuthorizationCodeTokenRequest(
        new URLSearchParams({
          code: "raw-code",
          grant_type: "authorization_code",
        }),
      ),
    ).toThrow(
      expect.objectContaining({
        code: "invalid_request",
        reasonCode: "redirect_uri_invalid",
      }),
    );
  });

  it("rejects PKCE-bound authorization codes when the verifier is missing or invalid", async () => {
    mockConsumeAuthorizationCodeInTransaction.mockResolvedValue({
      authorizationCodeRecord: {
        clientId: 7,
        codeChallenge: "expected-verifier",
        codeChallengeMethod: "plain",
        scopes: ["customer:read"],
        userId: 42,
      },
      correlationId: "corr-2",
    });

    await expect(
      exchangeAuthorizationCode({
        client: {
          id: 7,
        },
        correlationId: "corr-2",
        parameters: new URLSearchParams({
          code: "raw-code",
          grant_type: "authorization_code",
          redirect_uri: "https://chatgpt.com/aip/oauth/callback-test",
        }),
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        code: "invalid_grant",
        reasonCode: "code_verifier_required",
      }),
    );

    await expect(
      exchangeAuthorizationCode({
        client: {
          id: 7,
        },
        correlationId: "corr-3",
        parameters: new URLSearchParams({
          code: "raw-code",
          code_verifier: "wrong-verifier",
          grant_type: "authorization_code",
          redirect_uri: "https://chatgpt.com/aip/oauth/callback-test",
        }),
      }),
    ).rejects.toBeInstanceOf(OAuthTokenExchangeError);
    expect(mockCreateAccessToken).not.toHaveBeenCalled();
    expect(mockCreateRefreshToken).not.toHaveBeenCalled();
  });

  it("accepts S256 PKCE bindings when the verifier matches", async () => {
    mockConsumeAuthorizationCodeInTransaction.mockResolvedValue({
      authorizationCodeRecord: {
        clientId: 7,
        codeChallenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
        codeChallengeMethod: "S256",
        scopes: ["customer:read"],
        userId: 42,
      },
      correlationId: "corr-4",
    });
    mockGenerateAccessToken.mockReturnValue("raw-access-token");
    mockGenerateRefreshToken.mockReturnValue("raw-refresh-token");
    mockHashOAuthSecret
      .mockReturnValueOnce("hashed-access-token")
      .mockReturnValueOnce("hashed-refresh-token");
    mockCreateAccessToken.mockResolvedValue({ id: 21 });
    mockCreateRefreshToken.mockResolvedValue({ id: 22 });
    mockCreateAuditEvent.mockResolvedValue({ id: 23 });

    await expect(
      exchangeAuthorizationCode({
        client: {
          id: 7,
        },
        correlationId: "corr-4",
        parameters: new URLSearchParams({
          code: "raw-code",
          code_verifier: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
          grant_type: "authorization_code",
          redirect_uri: "https://chatgpt.com/aip/oauth/callback-test",
        }),
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        access_token: "raw-access-token",
        refresh_token: "raw-refresh-token",
      }),
    );
  });
});
