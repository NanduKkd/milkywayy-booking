import {
  exchangeAuthorizationCode,
  exchangeOAuthToken,
  exchangeRefreshToken,
  OAuthTokenExchangeError,
  parseAuthorizationCodeTokenRequest,
  parseRefreshTokenRequest,
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
const mockFindRefreshToken = jest.fn();
const mockUpdateAccessTokens = jest.fn();
const mockUpdateRefreshTokens = jest.fn();
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
      update: (...args) => mockUpdateAccessTokens(...args),
    },
    OAuthAuditEvent: {
      create: (...args) => mockCreateAuditEvent(...args),
    },
    OAuthRefreshToken: {
      create: (...args) => mockCreateRefreshToken(...args),
      findOne: (...args) => mockFindRefreshToken(...args),
      update: (...args) => mockUpdateRefreshTokens(...args),
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
    jest.resetAllMocks();
    mockTransactionRunner.mockImplementation((callback) =>
      callback(mockTransaction),
    );
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

    expect(() =>
      parseRefreshTokenRequest(
        new URLSearchParams({
          grant_type: "authorization_code",
          refresh_token: "raw-refresh-token",
        }),
      ),
    ).toThrow(
      expect.objectContaining({
        code: "unsupported_grant_type",
        reasonCode: "grant_type_unsupported",
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

  it("routes token exchanges by grant type", async () => {
    mockConsumeAuthorizationCodeInTransaction.mockResolvedValue({
      authorizationCodeRecord: {
        clientId: 7,
        codeChallenge: null,
        codeChallengeMethod: null,
        scopes: ["customer:read"],
        userId: 42,
      },
      correlationId: "corr-5",
    });
    mockGenerateAccessToken.mockReturnValue("raw-access-token");
    mockGenerateRefreshToken.mockReturnValue("raw-refresh-token");
    mockHashOAuthSecret
      .mockReturnValueOnce("hashed-code-token")
      .mockReturnValueOnce("hashed-access-token")
      .mockReturnValueOnce("hashed-refresh-token");
    mockCreateAccessToken.mockResolvedValue({ id: 31 });
    mockCreateRefreshToken.mockResolvedValue({ id: 32 });
    mockCreateAuditEvent.mockResolvedValue({ id: 33 });

    await expect(
      exchangeOAuthToken({
        client: {
          id: 7,
        },
        correlationId: "corr-5",
        parameters: new URLSearchParams({
          code: "raw-code",
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

    expect(mockConsumeAuthorizationCodeInTransaction).toHaveBeenCalledTimes(1);
  });

  it("rotates a refresh token and links the replacement token to the same family", async () => {
    const now = new Date("2026-06-29T12:00:00.000Z");
    const refreshTokenRecord = {
      clientId: 7,
      consumedAt: null,
      expiresAt: new Date("2026-07-01T12:00:00.000Z"),
      familyId: "family-1",
      id: 77,
      revokedAt: null,
      scopes: ["customer:read", "customer:read"],
      update: jest.fn().mockResolvedValue(undefined),
      userId: 42,
    };
    mockHashOAuthSecret
      .mockReturnValueOnce("hashed-refresh-lookup")
      .mockReturnValueOnce("hashed-access-token")
      .mockReturnValueOnce("hashed-refresh-token");
    mockFindRefreshToken.mockResolvedValue(refreshTokenRecord);
    mockGenerateAccessToken.mockReturnValue("rotated-access-token");
    mockGenerateRefreshToken.mockReturnValue("rotated-refresh-token");
    mockCreateAccessToken.mockResolvedValue({ id: 41 });
    mockCreateRefreshToken.mockResolvedValue({ id: 42 });
    mockCreateAuditEvent.mockResolvedValue({ id: 43 });

    const result = await exchangeRefreshToken({
      client: {
        id: 7,
      },
      correlationId: "corr-6",
      now,
      parameters: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: "old-refresh-token",
      }),
    });

    expect(mockFindRefreshToken).toHaveBeenCalledWith({
      lock: mockTransaction.LOCK.UPDATE,
      transaction: mockTransaction,
      where: {
        tokenHash: "hashed-refresh-lookup",
      },
    });
    expect(refreshTokenRecord.update).toHaveBeenCalledWith(
      {
        consumedAt: now,
      },
      { transaction: mockTransaction },
    );
    expect(mockCreateAccessToken).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 7,
        expiresAt: new Date("2026-06-29T12:15:00.000Z"),
        refreshFamilyId: "family-1",
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
        expiresAt: new Date("2026-07-29T12:00:00.000Z"),
        familyId: "family-1",
        parentTokenId: 77,
        revokedAt: null,
        scopes: ["customer:read"],
        tokenHash: "hashed-refresh-token",
        userId: 42,
      }),
      { transaction: mockTransaction },
    );
    expect(mockCreateAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 7,
        correlationId: "corr-6",
        eventType: "oauth.token.issued",
        metadata: expect.objectContaining({
          accessTokenId: 41,
          authMethod: "refresh_token",
          refreshFamilyId: "family-1",
          refreshTokenId: 42,
          scopeCount: 1,
        }),
        outcome: "success",
        reasonCode: "token_issued_refresh_token",
        userId: 42,
      }),
      { transaction: mockTransaction },
    );
    expect(result).toEqual({
      access_token: "rotated-access-token",
      expires_in: 900,
      refresh_token: "rotated-refresh-token",
      scope: "customer:read",
      token_type: "bearer",
    });
  });

  it("rejects refresh token scope expansion requests", async () => {
    mockHashOAuthSecret.mockReturnValue("hashed-refresh-lookup");
    mockFindRefreshToken.mockResolvedValue({
      clientId: 7,
      consumedAt: null,
      expiresAt: new Date("2026-07-01T12:00:00.000Z"),
      familyId: "family-2",
      id: 78,
      revokedAt: null,
      scopes: ["customer:read"],
      update: jest.fn(),
      userId: 42,
    });

    await expect(
      exchangeRefreshToken({
        client: {
          id: 7,
        },
        correlationId: "corr-7",
        parameters: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: "old-refresh-token",
          scope: "customer:read bookings:write",
        }),
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        code: "invalid_scope",
        reasonCode: "scope_not_granted",
      }),
    );
  });

  it("revokes the full token family when a consumed refresh token is replayed", async () => {
    const replayedToken = {
      clientId: 7,
      consumedAt: new Date("2026-06-29T11:59:00.000Z"),
      expiresAt: new Date("2026-07-01T12:00:00.000Z"),
      familyId: "family-3",
      id: 79,
      revokedAt: null,
      scopes: ["customer:read"],
      userId: 42,
    };
    mockHashOAuthSecret.mockReturnValue("hashed-refresh-lookup");
    mockFindRefreshToken.mockResolvedValue(replayedToken);
    mockUpdateAccessTokens.mockResolvedValue([2]);
    mockUpdateRefreshTokens.mockResolvedValue([2]);
    mockCreateAuditEvent.mockResolvedValue({ id: 51 });

    await expect(
      exchangeRefreshToken({
        client: {
          id: 7,
        },
        correlationId: "corr-8",
        now: new Date("2026-06-29T12:00:00.000Z"),
        parameters: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: "replayed-refresh-token",
        }),
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        code: "invalid_grant",
        reasonCode: "refresh_token_replayed",
      }),
    );

    expect(mockUpdateAccessTokens).toHaveBeenCalledWith(
      {
        revokedAt: new Date("2026-06-29T12:00:00.000Z"),
      },
      {
        transaction: mockTransaction,
        where: {
          refreshFamilyId: "family-3",
          revokedAt: null,
        },
      },
    );
    expect(mockUpdateRefreshTokens).toHaveBeenCalledWith(
      {
        revokedAt: new Date("2026-06-29T12:00:00.000Z"),
      },
      {
        transaction: mockTransaction,
        where: {
          familyId: "family-3",
          revokedAt: null,
        },
      },
    );
    expect(mockCreateAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 7,
        correlationId: "corr-8",
        eventType: "oauth.refresh_token.replay_detected",
        metadata: {
          familyId: "family-3",
          refreshTokenId: 79,
          severity: "high",
        },
        outcome: "failure",
        reasonCode: "refresh_token_replayed",
        userId: 42,
      }),
      { transaction: mockTransaction },
    );
    expect(mockCreateAccessToken).not.toHaveBeenCalled();
    expect(mockCreateRefreshToken).not.toHaveBeenCalled();
  });
});
