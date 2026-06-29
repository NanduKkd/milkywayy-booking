import {
  grantOAuthConsent,
  hasActiveConsentForScopes,
  listActiveOAuthConnections,
  loadActiveOAuthConsent,
  revokeOAuthConsent,
} from "../consent";

const mockTransaction = {
  LOCK: {
    UPDATE: "UPDATE",
  },
};

const mockTransactionRunner = jest.fn((callback) => callback(mockTransaction));
const mockFindConsent = jest.fn();
const mockFindConsents = jest.fn();
const mockCreateConsent = jest.fn();
const mockUpdateAccessTokens = jest.fn();
const mockUpdateRefreshTokens = jest.fn();

jest.mock("@/lib/db/db", () => ({
  sequelize: {
    transaction: (...args) => mockTransactionRunner(...args),
  },
}));

jest.mock("@/lib/db/models", () => ({
  __esModule: true,
  default: {
    OAuthAccessToken: {
      update: (...args) => mockUpdateAccessTokens(...args),
    },
    OAuthClient: {
      name: "OAuthClientModel",
    },
    OAuthConsent: {
      create: (...args) => mockCreateConsent(...args),
      findAll: (...args) => mockFindConsents(...args),
      findOne: (...args) => mockFindConsent(...args),
    },
    OAuthRefreshToken: {
      update: (...args) => mockUpdateRefreshTokens(...args),
    },
  },
}));

describe("oauth consent service", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockTransactionRunner.mockImplementation((callback) =>
      callback(mockTransaction),
    );
    mockUpdateAccessTokens.mockResolvedValue([0]);
    mockUpdateRefreshTokens.mockResolvedValue([0]);
  });

  it("reports whether an active consent already covers the requested scopes", () => {
    expect(
      hasActiveConsentForScopes({
        consent: {
          scopes: ["customer:read", "customer:read"],
        },
        scopes: ["customer:read"],
      }),
    ).toBe(true);

    expect(
      hasActiveConsentForScopes({
        consent: {
          scopes: ["customer:read"],
        },
        scopes: ["customer:read", "bookings:read"],
      }),
    ).toBe(false);
  });

  it("creates a new persisted consent when no active grant exists", async () => {
    const now = new Date("2026-06-29T12:00:00.000Z");
    mockFindConsent.mockResolvedValue(null);
    mockCreateConsent.mockResolvedValue({ id: 15 });

    const result = await grantOAuthConsent({
      clientId: 7,
      now,
      scopes: ["customer:read", "customer:read"],
      userId: 42,
    });

    expect(mockFindConsent).toHaveBeenCalledWith({
      lock: "UPDATE",
      transaction: mockTransaction,
      where: {
        clientId: 7,
        revokedAt: null,
        userId: 42,
      },
    });
    expect(mockCreateConsent).toHaveBeenCalledWith(
      {
        clientId: 7,
        grantedAt: now,
        revokedAt: null,
        scopes: ["customer:read"],
        userId: 42,
      },
      { transaction: mockTransaction },
    );
    expect(result).toEqual({ id: 15 });
  });

  it("reuses the active consent when the requested scopes are unchanged", async () => {
    const activeConsent = {
      id: 9,
      scopes: ["customer:read"],
      update: jest.fn(),
    };
    mockFindConsent.mockResolvedValue(activeConsent);

    const result = await grantOAuthConsent({
      clientId: 7,
      scopes: ["customer:read"],
      userId: 42,
    });

    expect(result).toBe(activeConsent);
    expect(activeConsent.update).not.toHaveBeenCalled();
    expect(mockCreateConsent).not.toHaveBeenCalled();
  });

  it("requires a fresh persisted consent when the requested scopes increase", async () => {
    const now = new Date("2026-06-29T12:00:00.000Z");
    const activeConsent = {
      id: 9,
      scopes: ["customer:read"],
      update: jest.fn().mockResolvedValue(undefined),
    };
    mockFindConsent.mockResolvedValue(activeConsent);
    mockCreateConsent.mockResolvedValue({ id: 16 });

    await grantOAuthConsent({
      clientId: 7,
      now,
      scopes: ["bookings:read", "customer:read"],
      userId: 42,
    });

    expect(activeConsent.update).toHaveBeenCalledWith(
      {
        revokedAt: now,
      },
      { transaction: mockTransaction },
    );
    expect(mockCreateConsent).toHaveBeenCalledWith(
      {
        clientId: 7,
        grantedAt: now,
        revokedAt: null,
        scopes: ["bookings:read", "customer:read"],
        userId: 42,
      },
      { transaction: mockTransaction },
    );
  });

  it("revokes the active consent and all live tokens for the client/user pair", async () => {
    const now = new Date("2026-06-29T12:00:00.000Z");
    const activeConsent = {
      id: 9,
      update: jest.fn().mockResolvedValue(undefined),
    };
    mockFindConsent.mockResolvedValue(activeConsent);
    mockUpdateAccessTokens.mockResolvedValue([2]);
    mockUpdateRefreshTokens.mockResolvedValue([3]);

    const result = await revokeOAuthConsent({
      clientId: 7,
      now,
      userId: 42,
    });

    expect(activeConsent.update).toHaveBeenCalledWith(
      {
        revokedAt: now,
      },
      { transaction: mockTransaction },
    );
    expect(mockUpdateAccessTokens).toHaveBeenCalledWith(
      {
        revokedAt: now,
      },
      {
        transaction: mockTransaction,
        where: {
          clientId: 7,
          revokedAt: null,
          userId: 42,
        },
      },
    );
    expect(mockUpdateRefreshTokens).toHaveBeenCalledWith(
      {
        revokedAt: now,
      },
      {
        transaction: mockTransaction,
        where: {
          clientId: 7,
          revokedAt: null,
          userId: 42,
        },
      },
    );
    expect(result).toEqual({
      activeConsentId: 9,
      revokedAccessTokenCount: 2,
      revokedConsent: true,
      revokedRefreshTokenCount: 3,
    });
  });

  it("lists active OAuth connections with client metadata", async () => {
    mockFindConsents.mockResolvedValue([{ id: 1 }]);

    const result = await listActiveOAuthConnections({
      userId: 42,
    });

    expect(mockFindConsents).toHaveBeenCalledWith({
      include: [
        {
          as: "client",
          model: {
            name: "OAuthClientModel",
          },
          required: true,
        },
      ],
      order: [
        ["grantedAt", "DESC"],
        ["id", "DESC"],
      ],
      where: {
        revokedAt: null,
        userId: 42,
      },
    });
    expect(result).toEqual([{ id: 1 }]);
  });

  it("loads the current active consent without opening a new transaction", async () => {
    mockFindConsent.mockResolvedValue({ id: 5 });

    const result = await loadActiveOAuthConsent({
      clientId: 7,
      userId: 42,
    });

    expect(mockTransactionRunner).not.toHaveBeenCalled();
    expect(result).toEqual({ id: 5 });
  });
});
