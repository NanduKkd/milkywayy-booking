import { createHash } from "node:crypto";
import { QueryTypes } from "sequelize";
import { sequelize } from "@/lib/db/db";

export class RateLimitExceededError extends Error {
  constructor({ bucketType, retryAfterSeconds }) {
    super("Too many requests. Please wait before trying again.");
    this.name = "RateLimitExceededError";
    this.bucketType = bucketType;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function hashRateLimitKey(key) {
  return createHash("sha256").update(String(key)).digest("hex");
}

function getWindowStart(now, windowMs) {
  return new Date(Math.floor(now.getTime() / windowMs) * windowMs);
}

function getRetryAfterSeconds(expiresAt, now) {
  return Math.max(
    1,
    Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / 1000),
  );
}

function logRateLimitEvent({ bucketType, keyHash, requestCount, limit }) {
  console.warn("[AUTH_RATE_LIMIT]", {
    bucketType,
    keyHashPrefix: keyHash.slice(0, 12),
    requestCount,
    limit,
  });
}

export async function consumeRateLimit({
  bucketType,
  key,
  limit,
  windowMs,
  now = new Date(),
}) {
  const windowStart = getWindowStart(now, windowMs);
  const expiresAt = new Date(windowStart.getTime() + windowMs);
  const keyHash = hashRateLimitKey(key);

  const [row] = await sequelize.query(
    `
      INSERT INTO oauth_rate_limits (
        bucket_type,
        key_hash,
        window_start,
        request_count,
        expires_at,
        created_at,
        updated_at
      )
      VALUES (
        :bucketType,
        :keyHash,
        :windowStart,
        1,
        :expiresAt,
        NOW(),
        NOW()
      )
      ON CONFLICT (bucket_type, key_hash, window_start)
      DO UPDATE
      SET
        request_count = oauth_rate_limits.request_count + 1,
        updated_at = NOW()
      RETURNING
        request_count AS "requestCount",
        expires_at AS "expiresAt"
    `,
    {
      replacements: {
        bucketType,
        keyHash,
        windowStart,
        expiresAt,
      },
      type: QueryTypes.SELECT,
    },
  );

  if (!row) {
    throw new Error(`Failed to record rate limit bucket for ${bucketType}.`);
  }

  if (row.requestCount > limit) {
    logRateLimitEvent({
      bucketType,
      keyHash,
      requestCount: row.requestCount,
      limit,
    });

    throw new RateLimitExceededError({
      bucketType,
      retryAfterSeconds: getRetryAfterSeconds(row.expiresAt, now),
    });
  }

  return {
    expiresAt: new Date(row.expiresAt),
    requestCount: row.requestCount,
    remaining: Math.max(0, limit - row.requestCount),
  };
}
