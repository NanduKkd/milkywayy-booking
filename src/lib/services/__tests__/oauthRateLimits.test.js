import { sequelize } from "@/lib/db/db";
import { consumeRateLimit, hashRateLimitKey } from "../oauthRateLimits";

jest.mock("@/lib/db/db", () => ({
  sequelize: {
    query: jest.fn(),
  },
}));

describe("oauthRateLimits service", () => {
  let warnSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("hashes user-controlled keys before persistence", () => {
    const hashed = hashRateLimitKey("+971500000000");

    expect(hashed).toHaveLength(64);
    expect(hashed).not.toContain("+971500000000");
    expect(hashRateLimitKey("+971500000000")).toBe(hashed);
  });

  it("returns the remaining capacity after an atomic increment", async () => {
    sequelize.query.mockResolvedValue([
      {
        requestCount: 2,
        expiresAt: "2026-06-29T00:15:00.000Z",
      },
    ]);

    const result = await consumeRateLimit({
      bucketType: "customer-otp-send-phone",
      key: "phone:+971500000000",
      limit: 5,
      windowMs: 15 * 60 * 1000,
      now: new Date("2026-06-29T00:01:00.000Z"),
    });

    expect(result.requestCount).toBe(2);
    expect(result.remaining).toBe(3);
    expect(result.expiresAt).toEqual(new Date("2026-06-29T00:15:00.000Z"));
    expect(sequelize.query).toHaveBeenCalledTimes(1);
  });

  it("throws a typed error when the bucket limit is exceeded", async () => {
    sequelize.query.mockResolvedValue([
      {
        requestCount: 6,
        expiresAt: "2026-06-29T00:15:00.000Z",
      },
    ]);

    await expect(
      consumeRateLimit({
        bucketType: "customer-otp-send-phone",
        key: "phone:+971500000000",
        limit: 5,
        windowMs: 15 * 60 * 1000,
        now: new Date("2026-06-29T00:01:00.000Z"),
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        name: "RateLimitExceededError",
        bucketType: "customer-otp-send-phone",
        retryAfterSeconds: 840,
      }),
    );
  });

  it("fails loudly when the database does not return a rate-limit row", async () => {
    sequelize.query.mockResolvedValue([]);

    await expect(
      consumeRateLimit({
        bucketType: "customer-otp-send-phone",
        key: "phone:+971500000000",
        limit: 5,
        windowMs: 15 * 60 * 1000,
      }),
    ).rejects.toThrow(
      "Failed to record rate limit bucket for customer-otp-send-phone.",
    );
  });
});
