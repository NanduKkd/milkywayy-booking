import { QueryTypes } from "sequelize";
import { sequelize } from "@/lib/db/db";

export const DEFAULT_CLEANUP_BATCH_SIZE = 100;
export const DEFAULT_MAX_BATCHES_PER_TABLE = 10;

const CLEANUP_OPERATIONS = [
  {
    key: "authorizationCodes",
    label: "oauth_authorization_codes",
    sql: `
      WITH deletable AS (
        SELECT id
        FROM oauth_authorization_codes
        WHERE expires_at <= :now
        ORDER BY expires_at ASC, id ASC
        LIMIT :batchSize
      )
      DELETE FROM oauth_authorization_codes target
      USING deletable
      WHERE target.id = deletable.id
      RETURNING target.id AS "id"
    `,
  },
  {
    key: "accessTokens",
    label: "oauth_access_tokens",
    sql: `
      WITH deletable AS (
        SELECT id
        FROM oauth_access_tokens
        WHERE expires_at <= :now OR revoked_at IS NOT NULL
        ORDER BY COALESCE(revoked_at, expires_at) ASC, id ASC
        LIMIT :batchSize
      )
      DELETE FROM oauth_access_tokens target
      USING deletable
      WHERE target.id = deletable.id
      RETURNING target.id AS "id"
    `,
  },
  {
    key: "refreshTokens",
    label: "oauth_refresh_tokens",
    sql: `
      WITH deletable AS (
        SELECT id
        FROM oauth_refresh_tokens
        WHERE expires_at <= :now OR revoked_at IS NOT NULL
        ORDER BY COALESCE(revoked_at, expires_at) ASC, id ASC
        LIMIT :batchSize
      )
      DELETE FROM oauth_refresh_tokens target
      USING deletable
      WHERE target.id = deletable.id
      RETURNING target.id AS "id"
    `,
  },
  {
    key: "rateLimits",
    label: "oauth_rate_limits",
    sql: `
      WITH deletable AS (
        SELECT id
        FROM oauth_rate_limits
        WHERE expires_at <= :now
        ORDER BY expires_at ASC, id ASC
        LIMIT :batchSize
      )
      DELETE FROM oauth_rate_limits target
      USING deletable
      WHERE target.id = deletable.id
      RETURNING target.id AS "id"
    `,
  },
  {
    key: "auditEvents",
    label: "oauth_audit_events",
    sql: `
      WITH deletable AS (
        SELECT id
        FROM oauth_audit_events
        WHERE expires_at <= :now
        ORDER BY expires_at ASC, id ASC
        LIMIT :batchSize
      )
      DELETE FROM oauth_audit_events target
      USING deletable
      WHERE target.id = deletable.id
      RETURNING target.id AS "id"
    `,
  },
];

async function deleteBatch(sql, { now, batchSize }) {
  const rows = await sequelize.query(sql, {
    replacements: {
      now,
      batchSize,
    },
    type: QueryTypes.SELECT,
  });

  return rows.length;
}

export async function cleanupOAuthArtifacts({
  now = new Date(),
  batchSize = DEFAULT_CLEANUP_BATCH_SIZE,
  maxBatchesPerTable = DEFAULT_MAX_BATCHES_PER_TABLE,
} = {}) {
  const operations = {};
  let totalDeleted = 0;
  let hitBatchLimit = false;

  for (const operation of CLEANUP_OPERATIONS) {
    let deletedCount = 0;
    let batchesRun = 0;
    let completed = true;
    let lastBatchDeleted = 0;

    while (batchesRun < maxBatchesPerTable) {
      const batchDeleted = await deleteBatch(operation.sql, { now, batchSize });
      lastBatchDeleted = batchDeleted;
      batchesRun += 1;
      deletedCount += batchDeleted;
      totalDeleted += batchDeleted;

      if (batchDeleted < batchSize) {
        break;
      }
    }

    if (batchesRun === maxBatchesPerTable && lastBatchDeleted === batchSize) {
      completed = false;
      hitBatchLimit = true;
    }

    operations[operation.key] = {
      table: operation.label,
      deletedCount,
      batchesRun,
      completed,
    };
  }

  return {
    now: now.toISOString(),
    batchSize,
    maxBatchesPerTable,
    hitBatchLimit,
    totalDeleted,
    operations,
  };
}
