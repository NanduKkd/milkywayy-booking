import {
  consumeAuthorizationCode,
  issueAuthorizationCode,
  OAUTH_AUTHORIZATION_CODE_AUDIT_EVENTS,
  OAuthAuthorizationCodeError,
} from "../authorizationCodes";

const mockTransaction = {
  LOCK: {
    UPDATE: "UPDATE",
  },
};

const mockTransactionRunner = jest.fn((callback) => callback(mockTransaction));
const mockCreateAuthorizationCode = jest.fn();
const mockFindAuthorizationCode = jest.fn();
const mockCreateAuditEvent = jest.fn();
const mockGenerateAuthorizationCode = jest.fn();
const mockHashOAuthSecret = jest.fn();

jest.mock("@/lib/db/db", () => ({
  sequelize: {
    transaction: (...args) => mockTransactionRunner(...args),
  },
}));

jest.mock("@/lib/db/models", () => ({
  __esModule: true,
  default: {
    OAuthAuthorizationCode: {
      create: (...args) => mockCreateAuthorizationCode(...args),
      findOne: (...args) => mockFindAuthorizationCode(...args),
    },
    OAuthAuditEvent: {
      create: (...args) => mockCreateAuditEvent(...args),
    },
  },
}));

jest.mock("@/lib/oauth/secrets", () => ({
  generateAuthorizationCode: (...args) =>
    mockGenerateAuthorizationCode(...args),
  hashOAuthSecret: (...args) => mockHashOAuthSecret(...args),
}));

describe("authorization code service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("issues hashed authorization codes and audits the grant in one transaction", async () => {
    const now = new Date("2026-06-29T10:00:00.000Z");
    const createdRecord = { id: 11 };
    mockGenerateAuthorizationCode.mockReturnValue("raw-code");
    mockHashOAuthSecret.mockReturnValue("hashed-code");
    mockCreateAuthorizationCode.mockResolvedValue(createdRecord);
    mockCreateAuditEvent.mockResolvedValue({ id: 99 });

    const result = await issueAuthorizationCode({
      clientId: 7,
      correlationId: "corr-1",
      now,
      redirectUri: "https://chatgpt.com/aip/oauth/callback-test",
      scopes: ["customer:read", "customer:read"],
      userId: 42,
    });

    expect(mockTransactionRunner).toHaveBeenCalledTimes(1);
    expect(mockCreateAuthorizationCode).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 7,
        codeHash: "hashed-code",
        consumedAt: null,
        expiresAt: new Date("2026-06-29T10:02:00.000Z"),
        redirectUri: "https://chatgpt.com/aip/oauth/callback-test",
        scopes: ["customer:read"],
        userId: 42,
      }),
      { transaction: mockTransaction },
    );
    expect(mockCreateAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 7,
        correlationId: "corr-1",
        createdAt: now,
        eventType: OAUTH_AUTHORIZATION_CODE_AUDIT_EVENTS.issued,
        expiresAt: new Date("2026-07-29T10:00:00.000Z"),
        metadata: {
          scopeCount: 1,
        },
        outcome: "success",
        reasonCode: "authorization_code_issued",
        userId: 42,
      }),
      { transaction: mockTransaction },
    );
    expect(result).toEqual(
      expect.objectContaining({
        authorizationCode: "raw-code",
        authorizationCodeRecord: createdRecord,
        correlationId: "corr-1",
        expiresAt: new Date("2026-06-29T10:02:00.000Z"),
      }),
    );
  });

  it("atomically consumes a valid authorization code", async () => {
    const now = new Date("2026-06-29T10:01:00.000Z");
    const authorizationCodeRecord = {
      clientId: 7,
      consumedAt: null,
      expiresAt: new Date("2026-06-29T10:02:00.000Z"),
      redirectUri: "https://chatgpt.com/aip/oauth/callback-test",
      scopes: ["customer:read"],
      update: jest.fn(async (values) =>
        Object.assign(authorizationCodeRecord, values),
      ),
      userId: 42,
    };
    mockHashOAuthSecret.mockReturnValue("hashed-code");
    mockFindAuthorizationCode.mockResolvedValue(authorizationCodeRecord);
    mockCreateAuditEvent.mockResolvedValue({ id: 100 });

    const result = await consumeAuthorizationCode({
      authorizationCode: "raw-code",
      clientId: 7,
      correlationId: "corr-2",
      now,
      redirectUri: "https://chatgpt.com/aip/oauth/callback-test",
    });

    expect(mockFindAuthorizationCode).toHaveBeenCalledWith({
      lock: mockTransaction.LOCK.UPDATE,
      transaction: mockTransaction,
      where: {
        codeHash: "hashed-code",
      },
    });
    expect(authorizationCodeRecord.update).toHaveBeenCalledWith(
      {
        consumedAt: now,
      },
      { transaction: mockTransaction },
    );
    expect(mockCreateAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 7,
        correlationId: "corr-2",
        createdAt: now,
        eventType: OAUTH_AUTHORIZATION_CODE_AUDIT_EVENTS.consumed,
        metadata: {
          scopeCount: 1,
        },
        outcome: "success",
        reasonCode: "authorization_code_consumed",
        userId: 42,
      }),
      { transaction: mockTransaction },
    );
    expect(result.authorizationCodeRecord.consumedAt).toEqual(now);
  });

  it("rejects a replayed authorization code with invalid_grant and audits the replay", async () => {
    const now = new Date("2026-06-29T10:03:00.000Z");
    const authorizationCodeRecord = {
      clientId: 7,
      consumedAt: new Date("2026-06-29T10:01:30.000Z"),
      expiresAt: new Date("2026-06-29T10:05:00.000Z"),
      redirectUri: "https://chatgpt.com/aip/oauth/callback-test",
      update: jest.fn(),
      userId: 42,
    };
    mockHashOAuthSecret.mockReturnValue("hashed-code");
    mockFindAuthorizationCode.mockResolvedValue(authorizationCodeRecord);
    mockCreateAuditEvent.mockResolvedValue({ id: 101 });

    await expect(
      consumeAuthorizationCode({
        authorizationCode: "raw-code",
        clientId: 7,
        correlationId: "corr-3",
        now,
        redirectUri: "https://chatgpt.com/aip/oauth/callback-test",
      }),
    ).rejects.toMatchObject({
      code: "invalid_grant",
      name: "OAuthAuthorizationCodeError",
      reasonCode: "code_replayed",
    });
    expect(authorizationCodeRecord.update).not.toHaveBeenCalled();
    expect(mockCreateAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 7,
        correlationId: "corr-3",
        eventType: OAUTH_AUTHORIZATION_CODE_AUDIT_EVENTS.replayRejected,
        outcome: "failure",
        reasonCode: "code_replayed",
        userId: 42,
      }),
      { transaction: mockTransaction },
    );
  });

  it("rejects mismatched client or redirect bindings with invalid_grant", async () => {
    const now = new Date("2026-06-29T10:01:00.000Z");
    const authorizationCodeRecord = {
      clientId: 7,
      consumedAt: null,
      expiresAt: new Date("2026-06-29T10:05:00.000Z"),
      redirectUri: "https://chatgpt.com/aip/oauth/callback-test",
      update: jest.fn(),
      userId: 42,
    };
    mockHashOAuthSecret.mockReturnValue("hashed-code");
    mockFindAuthorizationCode.mockResolvedValue(authorizationCodeRecord);
    mockCreateAuditEvent.mockResolvedValue({ id: 102 });

    await expect(
      consumeAuthorizationCode({
        authorizationCode: "raw-code",
        clientId: 8,
        correlationId: "corr-4",
        now,
        redirectUri: "https://chatgpt.com/aip/oauth/callback-test",
      }),
    ).rejects.toBeInstanceOf(OAuthAuthorizationCodeError);
    expect(mockCreateAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: OAUTH_AUTHORIZATION_CODE_AUDIT_EVENTS.invalidGrant,
        reasonCode: "client_mismatch",
      }),
      { transaction: mockTransaction },
    );

    mockCreateAuditEvent.mockClear();

    await expect(
      consumeAuthorizationCode({
        authorizationCode: "raw-code",
        clientId: 7,
        correlationId: "corr-5",
        now,
        redirectUri: "https://chatgpt.com/aip/oauth/callback-other",
      }),
    ).rejects.toMatchObject({
      code: "invalid_grant",
      reasonCode: "redirect_uri_mismatch",
    });
    expect(mockCreateAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: OAUTH_AUTHORIZATION_CODE_AUDIT_EVENTS.invalidGrant,
        reasonCode: "redirect_uri_mismatch",
      }),
      { transaction: mockTransaction },
    );
  });

  it("rejects missing or expired codes with invalid_grant", async () => {
    const now = new Date("2026-06-29T10:03:00.000Z");
    mockHashOAuthSecret.mockReturnValue("hashed-code");
    mockFindAuthorizationCode.mockResolvedValueOnce(null);
    mockCreateAuditEvent.mockResolvedValue({ id: 103 });

    await expect(
      consumeAuthorizationCode({
        authorizationCode: "raw-code",
        clientId: 7,
        correlationId: "corr-6",
        now,
        redirectUri: "https://chatgpt.com/aip/oauth/callback-test",
      }),
    ).rejects.toMatchObject({
      code: "invalid_grant",
      reasonCode: "code_not_found",
    });
    expect(mockCreateAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 7,
        eventType: OAUTH_AUTHORIZATION_CODE_AUDIT_EVENTS.invalidGrant,
        outcome: "failure",
        reasonCode: "code_not_found",
        userId: null,
      }),
      { transaction: mockTransaction },
    );

    mockCreateAuditEvent.mockClear();

    const expiredAuthorizationCodeRecord = {
      clientId: 7,
      consumedAt: null,
      expiresAt: new Date("2026-06-29T10:02:00.000Z"),
      redirectUri: "https://chatgpt.com/aip/oauth/callback-test",
      update: jest.fn(),
      userId: 42,
    };
    mockFindAuthorizationCode.mockResolvedValueOnce(
      expiredAuthorizationCodeRecord,
    );

    await expect(
      consumeAuthorizationCode({
        authorizationCode: "raw-code",
        clientId: 7,
        correlationId: "corr-7",
        now,
        redirectUri: "https://chatgpt.com/aip/oauth/callback-test",
      }),
    ).rejects.toMatchObject({
      code: "invalid_grant",
      reasonCode: "code_expired",
    });
    expect(mockCreateAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: OAUTH_AUTHORIZATION_CODE_AUDIT_EVENTS.invalidGrant,
        reasonCode: "code_expired",
      }),
      { transaction: mockTransaction },
    );
  });
});
