import { sequelize } from "@/lib/db/db";
import {
  cleanupOAuthArtifacts,
  DEFAULT_CLEANUP_BATCH_SIZE,
  DEFAULT_MAX_BATCHES_PER_TABLE,
} from "../cleanup";

jest.mock("@/lib/db/db", () => ({
  sequelize: {
    query: jest.fn(),
  },
}));

describe("cleanupOAuthArtifacts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("removes expired and revoked OAuth artifacts in bounded batches", async () => {
    sequelize.query
      .mockResolvedValueOnce([{ id: 1 }, { id: 2 }])
      .mockResolvedValueOnce([{ id: 3 }])
      .mockResolvedValueOnce([{ id: 4 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 5 }])
      .mockResolvedValueOnce([]);

    const now = new Date("2026-06-29T12:00:00.000Z");
    const result = await cleanupOAuthArtifacts({
      now,
      batchSize: 2,
      maxBatchesPerTable: 2,
    });

    expect(result).toEqual({
      now: now.toISOString(),
      batchSize: 2,
      maxBatchesPerTable: 2,
      hitBatchLimit: false,
      totalDeleted: 5,
      operations: {
        authorizationCodes: {
          table: "oauth_authorization_codes",
          deletedCount: 3,
          batchesRun: 2,
          completed: true,
        },
        accessTokens: {
          table: "oauth_access_tokens",
          deletedCount: 1,
          batchesRun: 1,
          completed: true,
        },
        refreshTokens: {
          table: "oauth_refresh_tokens",
          deletedCount: 0,
          batchesRun: 1,
          completed: true,
        },
        rateLimits: {
          table: "oauth_rate_limits",
          deletedCount: 1,
          batchesRun: 1,
          completed: true,
        },
        auditEvents: {
          table: "oauth_audit_events",
          deletedCount: 0,
          batchesRun: 1,
          completed: true,
        },
      },
    });
    expect(sequelize.query).toHaveBeenCalledTimes(6);
  });

  it("marks cleanup as incomplete when a table keeps filling full batches", async () => {
    sequelize.query
      .mockResolvedValueOnce([{ id: 1 }])
      .mockResolvedValueOnce([{ id: 2 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await cleanupOAuthArtifacts({
      now: new Date("2026-06-29T12:00:00.000Z"),
      batchSize: 1,
      maxBatchesPerTable: 2,
    });

    expect(result.hitBatchLimit).toBe(true);
    expect(result.operations.authorizationCodes).toEqual({
      table: "oauth_authorization_codes",
      deletedCount: 2,
      batchesRun: 2,
      completed: false,
    });
    expect(result.operations.accessTokens.completed).toBe(true);
  });

  it("targets only expired or revoked rows with sane defaults", async () => {
    sequelize.query.mockResolvedValue([]);

    await cleanupOAuthArtifacts();

    expect(sequelize.query).toHaveBeenCalledTimes(5);

    const [
      [authorizationSql, authorizationOptions],
      [accessSql, accessOptions],
      [refreshSql, refreshOptions],
      [rateLimitSql],
      [auditSql],
    ] = sequelize.query.mock.calls;

    expect(authorizationSql).toContain("FROM oauth_authorization_codes");
    expect(authorizationSql).toContain("WHERE expires_at <= :now");

    expect(accessSql).toContain("FROM oauth_access_tokens");
    expect(accessSql).toContain(
      "WHERE expires_at <= :now OR revoked_at IS NOT NULL",
    );

    expect(refreshSql).toContain("FROM oauth_refresh_tokens");
    expect(refreshSql).toContain(
      "WHERE expires_at <= :now OR revoked_at IS NOT NULL",
    );

    expect(rateLimitSql).toContain("FROM oauth_rate_limits");
    expect(rateLimitSql).toContain("WHERE expires_at <= :now");

    expect(auditSql).toContain("FROM oauth_audit_events");
    expect(auditSql).toContain("WHERE expires_at <= :now");

    expect(authorizationOptions.replacements.batchSize).toBe(
      DEFAULT_CLEANUP_BATCH_SIZE,
    );
    expect(accessOptions.replacements.batchSize).toBe(
      DEFAULT_CLEANUP_BATCH_SIZE,
    );
    expect(refreshOptions.replacements.batchSize).toBe(
      DEFAULT_CLEANUP_BATCH_SIZE,
    );
    expect(authorizationOptions.type).toBeDefined();
    expect(DEFAULT_MAX_BATCHES_PER_TABLE).toBe(10);
  });
});
