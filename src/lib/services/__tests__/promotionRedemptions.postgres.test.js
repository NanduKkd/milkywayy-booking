/** @jest-environment node */

const { QueryTypes } = require("sequelize");

const {
  RESERVED_DATABASE_PREFIX,
  createDisposablePostgresDatabase,
} = require("../../db/testing/disposablePostgres");
const {
  applyPromotionPostgresSchema,
} = require("../../db/testing/promotionPostgresSchema");

jest.setTimeout(30000);

describe("promotion redemptions with real PostgreSQL contention", () => {
  const originalDbEnvironment = Object.fromEntries(
    ["DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME"].map((name) => [
      name,
      process.env[name],
    ]),
  );
  let appSequelize;
  let database;
  let models;
  let applyPromotionRedemption;
  let expirePromotionRedemption;
  let getActivePromotionRedemptionCounts;
  let releasePromotionRedemption;
  let reservePromotionForCheckoutTransaction;
  let reservePromotionRedemption;
  let fixtureSequence = 0;

  function replaceApplicationDatabaseEnvironment(environment) {
    for (const [name, value] of Object.entries(environment)) {
      if (value == null) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  }

  async function createUser() {
    const [user] = await database.sequelize.query(
      `
        INSERT INTO users (created_at, updated_at)
        VALUES (CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id
      `,
      { type: QueryTypes.INSERT },
    );

    return Number(user[0].id);
  }

  async function createTransaction(userId) {
    return models.Transaction.create({
      userId,
      amount: 100,
      status: "pending",
    });
  }

  async function createPromotion({
    perUserLimit = null,
    totalLimit = null,
  } = {}) {
    fixtureSequence += 1;
    return models.Promotion.create({
      kind: "GENERIC",
      code: `PG-${fixtureSequence}`,
      name: `PostgreSQL promotion ${fixtureSequence}`,
      benefitType: "FIXED",
      benefitValue: 10,
      minimumSpend: 0,
      status: "ACTIVE",
      perUserLimit,
      totalLimit,
      triggerType: "NONE",
      triggerConfig: {},
    });
  }

  function reservationArguments({ promotionId, transactionId, userId }) {
    return {
      promotionId,
      userId,
      transactionId,
      eligibleSubtotal: 100,
      benefitAmount: 10,
      benefitTypeSnapshot: "FIXED",
      now: new Date("2026-07-20T10:00:00.000Z"),
    };
  }

  async function runConcurrentReservations(firstArguments, secondArguments) {
    const [firstTransaction, secondTransaction] = await Promise.all([
      appSequelize.transaction(),
      appSequelize.transaction(),
    ]);
    const [firstConnection, secondConnection] = await Promise.all([
      appSequelize.query("SELECT pg_backend_pid() AS pid", {
        type: QueryTypes.SELECT,
        transaction: firstTransaction,
      }),
      appSequelize.query("SELECT pg_backend_pid() AS pid", {
        type: QueryTypes.SELECT,
        transaction: secondTransaction,
      }),
    ]);

    expect(firstConnection[0].pid).not.toBe(secondConnection[0].pid);

    const attempt = async (transaction, arguments_) => {
      try {
        const redemption = await reservePromotionRedemption({
          ...arguments_,
          transaction,
        });
        await transaction.commit();
        return redemption;
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    };

    return Promise.allSettled([
      attempt(firstTransaction, firstArguments),
      attempt(secondTransaction, secondArguments),
    ]);
  }

  async function runConcurrentCreates(firstValues, secondValues) {
    const [firstTransaction, secondTransaction] = await Promise.all([
      appSequelize.transaction(),
      appSequelize.transaction(),
    ]);
    const [firstConnection, secondConnection] = await Promise.all([
      appSequelize.query("SELECT pg_backend_pid() AS pid", {
        type: QueryTypes.SELECT,
        transaction: firstTransaction,
      }),
      appSequelize.query("SELECT pg_backend_pid() AS pid", {
        type: QueryTypes.SELECT,
        transaction: secondTransaction,
      }),
    ]);

    expect(firstConnection[0].pid).not.toBe(secondConnection[0].pid);

    const attempt = async (transaction, values) => {
      try {
        const redemption = await models.PromotionRedemption.create(values, {
          transaction,
        });
        await transaction.commit();
        return redemption;
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    };

    return Promise.allSettled([
      attempt(firstTransaction, firstValues),
      attempt(secondTransaction, secondValues),
    ]);
  }

  function expectOneSuccessAndOneRejection(results, rejectionMessage) {
    const fulfilled = results.filter(({ status }) => status === "fulfilled");
    const rejected = results.filter(({ status }) => status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    if (rejectionMessage) {
      expect(rejected[0].reason).toHaveProperty("message", rejectionMessage);
    }

    return { fulfilled, rejected };
  }

  beforeAll(async () => {
    database = await createDisposablePostgresDatabase({
      databaseLabel: "promotion_redemptions",
      setup: applyPromotionPostgresSchema,
    });
    replaceApplicationDatabaseEnvironment(
      database.applicationDatabaseEnvironment,
    );
    jest.resetModules();

    appSequelize = require("../../db/db").sequelize;
    database.registerConnection(appSequelize);
    models = require("../../db/models").default;
    ({
      applyPromotionRedemption,
      expirePromotionRedemption,
      getActivePromotionRedemptionCounts,
      releasePromotionRedemption,
      reservePromotionRedemption,
    } = require("../promotionRedemptions"));
    ({
      reservePromotionForCheckoutTransaction,
    } = require("../promotionCheckout"));

    await appSequelize.authenticate();
  });

  afterAll(async () => {
    await database?.close();
    replaceApplicationDatabaseEnvironment(originalDbEnvironment);
    jest.resetModules();
  });

  beforeEach(async () => {
    fixtureSequence = 0;
    await database.sequelize.query(`
      TRUNCATE TABLE
        promotion_audit_events,
        promotion_assignments,
        promotion_redemptions,
        bookings,
        promotions,
        transactions,
        users
      RESTART IDENTITY CASCADE
    `);
  });

  it("allows exactly one reservation at total limit 1", async () => {
    const [firstUserId, secondUserId] = await Promise.all([
      createUser(),
      createUser(),
    ]);
    const [firstTransaction, secondTransaction] = await Promise.all([
      createTransaction(firstUserId),
      createTransaction(secondUserId),
    ]);
    const promotion = await createPromotion({ totalLimit: 1 });

    const results = await runConcurrentReservations(
      reservationArguments({
        promotionId: promotion.id,
        transactionId: firstTransaction.id,
        userId: firstUserId,
      }),
      reservationArguments({
        promotionId: promotion.id,
        transactionId: secondTransaction.id,
        userId: secondUserId,
      }),
    );

    expectOneSuccessAndOneRejection(
      results,
      "Promotion total usage limit reached",
    );
    expect(
      await models.PromotionRedemption.count({
        where: { promotionId: promotion.id },
      }),
    ).toBe(1);
    console.info("[postgres-contention] total_limit=1 reserved=1 rejected=1");
  });

  it("allows exactly one reservation at per-user limit 1", async () => {
    const userId = await createUser();
    const [firstTransaction, secondTransaction] = await Promise.all([
      createTransaction(userId),
      createTransaction(userId),
    ]);
    const promotion = await createPromotion({ perUserLimit: 1 });

    const results = await runConcurrentReservations(
      reservationArguments({
        promotionId: promotion.id,
        transactionId: firstTransaction.id,
        userId,
      }),
      reservationArguments({
        promotionId: promotion.id,
        transactionId: secondTransaction.id,
        userId,
      }),
    );

    expectOneSuccessAndOneRejection(
      results,
      "Promotion per-user usage limit reached",
    );
    expect(
      await models.PromotionRedemption.count({
        where: { promotionId: promotion.id, userId },
      }),
    ).toBe(1);
    console.info(
      "[postgres-contention] per_user_limit=1 reserved=1 rejected=1",
    );
  });

  it("uses the partial unique index to prevent concurrent active redemptions for one transaction", async () => {
    const userId = await createUser();
    const checkoutTransaction = await createTransaction(userId);
    const [firstPromotion, secondPromotion] = await Promise.all([
      createPromotion(),
      createPromotion(),
    ]);
    const values = (promotionId) => ({
      promotionId,
      transactionId: checkoutTransaction.id,
      userId,
      eligibleSubtotal: 100,
      benefitAmount: 10,
      benefitTypeSnapshot: "FIXED",
      reservedAt: new Date("2026-07-20T10:00:00.000Z"),
      state: "RESERVED",
      triggerSnapshot: {},
    });

    const results = await runConcurrentCreates(
      values(firstPromotion.id),
      values(secondPromotion.id),
    );
    const { rejected } = expectOneSuccessAndOneRejection(results);

    expect(rejected[0].reason.name).toBe("SequelizeUniqueConstraintError");
    expect(
      await models.PromotionRedemption.count({
        where: { transactionId: checkoutTransaction.id },
      }),
    ).toBe(1);
  });

  it("counts RESERVED and APPLIED while RELEASED and EXPIRED free the limit", async () => {
    const userId = await createUser();
    const promotion = await createPromotion({ perUserLimit: 1 });
    const transactions = await Promise.all(
      Array.from({ length: 4 }, () => createTransaction(userId)),
    );

    const first = await reservePromotionRedemption(
      reservationArguments({
        promotionId: promotion.id,
        transactionId: transactions[0].id,
        userId,
      }),
    );
    expect(
      await getActivePromotionRedemptionCounts({
        promotionId: promotion.id,
        userId,
      }),
    ).toEqual({ totalActiveCount: 1, userActiveCount: 1 });

    await releasePromotionRedemption({ redemptionId: first.id });
    const second = await reservePromotionRedemption(
      reservationArguments({
        promotionId: promotion.id,
        transactionId: transactions[1].id,
        userId,
      }),
    );
    await expirePromotionRedemption({ redemptionId: second.id });
    const third = await reservePromotionRedemption(
      reservationArguments({
        promotionId: promotion.id,
        transactionId: transactions[2].id,
        userId,
      }),
    );
    await applyPromotionRedemption({ redemptionId: third.id });

    expect(
      await getActivePromotionRedemptionCounts({
        promotionId: promotion.id,
        userId,
      }),
    ).toEqual({ totalActiveCount: 1, userActiveCount: 1 });
    await expect(
      reservePromotionRedemption(
        reservationArguments({
          promotionId: promotion.id,
          transactionId: transactions[3].id,
          userId,
        }),
      ),
    ).rejects.toThrow("Promotion per-user usage limit reached");
  });

  it("keeps apply, release, and expire retries idempotent and rejects cross-state transitions", async () => {
    const userId = await createUser();
    const promotion = await createPromotion();
    const transactions = await Promise.all(
      Array.from({ length: 3 }, () => createTransaction(userId)),
    );
    const redemptions = await Promise.all(
      transactions.map((transaction) =>
        reservePromotionRedemption(
          reservationArguments({
            promotionId: promotion.id,
            transactionId: transaction.id,
            userId,
          }),
        ),
      ),
    );
    const appliedAt = new Date("2026-07-20T11:00:00.000Z");
    const releasedAt = new Date("2026-07-20T11:01:00.000Z");
    const expiredAt = new Date("2026-07-20T11:02:00.000Z");

    await applyPromotionRedemption({
      redemptionId: redemptions[0].id,
      now: appliedAt,
    });
    await applyPromotionRedemption({
      redemptionId: redemptions[0].id,
      now: new Date("2026-07-20T12:00:00.000Z"),
    });
    await releasePromotionRedemption({
      redemptionId: redemptions[1].id,
      reason: "synthetic_failure",
      now: releasedAt,
    });
    await releasePromotionRedemption({
      redemptionId: redemptions[1].id,
      reason: "must_not_overwrite",
      now: new Date("2026-07-20T12:01:00.000Z"),
    });
    await expirePromotionRedemption({
      redemptionId: redemptions[2].id,
      now: expiredAt,
    });
    await expirePromotionRedemption({
      redemptionId: redemptions[2].id,
      now: new Date("2026-07-20T12:02:00.000Z"),
    });

    const [applied, released, expired] = await Promise.all(
      redemptions.map((redemption) =>
        models.PromotionRedemption.findByPk(redemption.id),
      ),
    );
    expect(applied).toMatchObject({ state: "APPLIED", appliedAt });
    expect(released).toMatchObject({
      state: "RELEASED",
      releasedAt,
      releaseReason: "synthetic_failure",
    });
    expect(expired).toMatchObject({
      state: "EXPIRED",
      releasedAt: expiredAt,
      releaseReason: "expired",
    });

    await expect(
      releasePromotionRedemption({ redemptionId: applied.id }),
    ).rejects.toThrow("Only reserved promotion redemptions can be released");
    await expect(
      expirePromotionRedemption({ redemptionId: applied.id }),
    ).rejects.toThrow("Only reserved promotion redemptions can expire");
    await expect(
      applyPromotionRedemption({ redemptionId: released.id }),
    ).rejects.toThrow("Only reserved promotion redemptions can be applied");
    await expect(
      expirePromotionRedemption({ redemptionId: released.id }),
    ).rejects.toThrow("Only reserved promotion redemptions can expire");
    await expect(
      applyPromotionRedemption({ redemptionId: expired.id }),
    ).rejects.toThrow("Only reserved promotion redemptions can be applied");
    await expect(
      releasePromotionRedemption({ redemptionId: expired.id }),
    ).rejects.toThrow("Only reserved promotion redemptions can be released");
  });

  it("rolls back both the redemption and transaction attachment", async () => {
    const userId = await createUser();
    const checkoutTransaction = await createTransaction(userId);
    const promotion = await createPromotion();

    await expect(
      appSequelize.transaction(async (transaction) => {
        await reservePromotionForCheckoutTransaction({
          transactionId: checkoutTransaction.id,
          userId,
          selectedPromotion: {
            promotionId: promotion.id,
            benefitAmount: 10,
          },
          eligibleSubtotal: 100,
          transaction,
        });
        throw new Error("synthetic rollback after attachment");
      }),
    ).rejects.toThrow("synthetic rollback after attachment");

    expect(
      await models.PromotionRedemption.count({
        where: { transactionId: checkoutTransaction.id },
      }),
    ).toBe(0);
    await checkoutTransaction.reload();
    expect(checkoutTransaction).toMatchObject({
      promotionId: null,
      promotionRedemptionId: null,
      promotionSnapshot: null,
    });
  });

  it("drops disposable databases after success and setup failure", async () => {
    const successLabel = `cleanup_success_${process.pid}`;
    const successDatabase = await createDisposablePostgresDatabase({
      databaseLabel: successLabel,
    });
    const successDatabaseName = successDatabase.databaseName;
    await successDatabase.close();

    const successRows = await database.sequelize.query(
      "SELECT datname FROM pg_database WHERE datname = :databaseName",
      {
        replacements: { databaseName: successDatabaseName },
        type: QueryTypes.SELECT,
      },
    );
    expect(successRows).toEqual([]);

    const failureLabel = `cleanup_failure_${process.pid}`;
    await expect(
      createDisposablePostgresDatabase({
        databaseLabel: failureLabel,
        setup: async () => {
          throw new Error("synthetic setup failure");
        },
      }),
    ).rejects.toThrow("synthetic setup failure");

    const failureRows = await database.sequelize.query(
      "SELECT datname FROM pg_database WHERE datname LIKE :databasePrefix",
      {
        replacements: {
          databasePrefix: `${RESERVED_DATABASE_PREFIX}${failureLabel}%`,
        },
        type: QueryTypes.SELECT,
      },
    );
    expect(failureRows).toEqual([]);
  });
});
