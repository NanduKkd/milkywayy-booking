const mockFindActiveAccessToken = jest.fn();
const mockFindAccessToken = jest.fn();
const mockHashOAuthSecret = jest.fn();

jest.mock("@/lib/db/models", () => ({
  __esModule: true,
  default: {
    OAuthAccessToken: {
      findOne: (...args) => mockFindAccessToken(...args),
      scope: (...args) => {
        if (args.length === 1) {
          return {
            findOne: (...findArgs) => mockFindActiveAccessToken(...findArgs),
          };
        }

        throw new Error("Unexpected scope call.");
      },
    },
    User: { name: "User" },
  },
}));

jest.mock("@/lib/oauth/secrets", () => ({
  hashOAuthSecret: (...args) => mockHashOAuthSecret(...args),
}));

import {
  OAUTH_ACCESS_TOKEN_ERROR_CODES,
  OAuthAccessTokenError,
  resolveOAuthAccessToken,
} from "../accessTokens";

describe("resolveOAuthAccessToken", () => {
  const now = new Date("2026-06-29T12:00:00.000Z");

  beforeEach(() => {
    mockFindActiveAccessToken.mockReset();
    mockFindAccessToken.mockReset();
    mockHashOAuthSecret.mockReset();
    mockHashOAuthSecret.mockReturnValue("hashed-token");
  });

  it("resolves an active customer token to a minimal principal", async () => {
    mockFindActiveAccessToken.mockResolvedValue({
      clientId: 9,
      id: 12,
      scopes: ["customer:read", "customer:read"],
      user: {
        id: 22,
        role: "CUSTOMER",
      },
      userId: 22,
    });

    await expect(
      resolveOAuthAccessToken("raw-access-token", { now }),
    ).resolves.toEqual({
      accessTokenId: 12,
      clientId: 9,
      customerId: 22,
      scopes: ["customer:read"],
    });

    expect(mockHashOAuthSecret).toHaveBeenCalledWith("raw-access-token");
    expect(mockFindActiveAccessToken).toHaveBeenCalledWith({
      attributes: [
        "clientId",
        "expiresAt",
        "id",
        "revokedAt",
        "scopes",
        "userId",
      ],
      include: [
        {
          as: "user",
          attributes: ["id", "role"],
          model: { name: "User" },
          required: false,
        },
      ],
      where: {
        tokenHash: "hashed-token",
      },
    });
  });

  it("rejects an empty access token", async () => {
    await expect(resolveOAuthAccessToken("   ", { now })).rejects.toEqual(
      expect.objectContaining({
        code: OAUTH_ACCESS_TOKEN_ERROR_CODES.invalidToken,
        name: "OAuthAccessTokenError",
        reasonCode: "access_token_missing",
        statusCode: 401,
      }),
    );
  });

  it("rejects an unknown access token", async () => {
    mockFindActiveAccessToken.mockResolvedValue(null);
    mockFindAccessToken.mockResolvedValue(null);

    await expect(
      resolveOAuthAccessToken("unknown-token", { now }),
    ).rejects.toEqual(
      expect.objectContaining({
        reasonCode: "access_token_unknown",
      }),
    );
  });

  it("rejects an expired access token", async () => {
    mockFindActiveAccessToken.mockResolvedValue(null);
    mockFindAccessToken.mockResolvedValue({
      expiresAt: "2026-06-29T11:59:59.000Z",
      revokedAt: null,
    });

    await expect(
      resolveOAuthAccessToken("expired-token", { now }),
    ).rejects.toEqual(
      expect.objectContaining({
        reasonCode: "access_token_expired",
      }),
    );
  });

  it("rejects a revoked access token", async () => {
    mockFindActiveAccessToken.mockResolvedValue(null);
    mockFindAccessToken.mockResolvedValue({
      expiresAt: "2026-06-29T12:10:00.000Z",
      revokedAt: "2026-06-29T11:50:00.000Z",
    });

    await expect(
      resolveOAuthAccessToken("revoked-token", { now }),
    ).rejects.toEqual(
      expect.objectContaining({
        reasonCode: "access_token_revoked",
      }),
    );
  });

  it("rejects a token whose principal is not a customer", async () => {
    mockFindActiveAccessToken.mockResolvedValue({
      clientId: 9,
      id: 12,
      scopes: ["customer:read"],
      user: {
        id: 22,
        role: "SHOOT",
      },
      userId: 22,
    });

    await expect(
      resolveOAuthAccessToken("staff-token", { now }),
    ).rejects.toEqual(
      expect.objectContaining({
        reasonCode: "access_token_principal_unavailable",
      }),
    );
  });

  it("rejects a token with invalid stored scopes", async () => {
    mockFindActiveAccessToken.mockResolvedValue({
      clientId: 9,
      id: 12,
      scopes: [],
      user: {
        id: 22,
        role: "CUSTOMER",
      },
      userId: 22,
    });

    await expect(
      resolveOAuthAccessToken("scope-less-token", { now }),
    ).rejects.toEqual(
      expect.objectContaining({
        reasonCode: "access_token_scope_invalid",
      }),
    );
  });

  it("throws a typed error instance for invalid access tokens", async () => {
    mockFindActiveAccessToken.mockResolvedValue(null);
    mockFindAccessToken.mockResolvedValue(null);

    await expect(
      resolveOAuthAccessToken("unknown-token", { now }),
    ).rejects.toBeInstanceOf(OAuthAccessTokenError);
  });
});
