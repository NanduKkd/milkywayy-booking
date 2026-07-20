/** @jest-environment node */

const { QueryTypes } = require("sequelize");

const {
  createDisposablePostgresDatabase,
} = require("../../db/testing/disposablePostgres");
const {
  applyPromotionPostgresSchema,
} = require("../../db/testing/promotionPostgresSchema");

jest.setTimeout(30000);

describe("invoice numbering with disposable PostgreSQL", () => {
  const originalDbEnvironment = Object.fromEntries(
    ["DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME"].map((name) => [
      name,
      process.env[name],
    ]),
  );
  const sameDay = new Date("2026-07-21T10:00:00.000Z");
  let appSequelize;
  let database;
  let ensureTransactionInvoiceNumber;
  let models;

  function replaceApplicationDatabaseEnvironment(environment) {
    for (const [name, value] of Object.entries(environment)) {
      if (value == null) delete process.env[name];
      else process.env[name] = value;
    }
  }

  function createDeferred() {
    let resolve;
    const promise = new Promise((promiseResolve) => {
      resolve = promiseResolve;
    });
    return { promise, resolve };
  }

  async function withTimeout(promise, label, timeoutMs = 1500) {
    let timeoutId;
    const timeout = new Promise((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error(`${label} exceeded ${timeoutMs}ms`)),
        timeoutMs,
      );
    });

    try {
      return await Promise.race([promise, timeout]);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function waitFor(predicate, label, timeoutMs = 1500) {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const result = await predicate();
      if (result) return result;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    throw new Error(`${label} exceeded ${timeoutMs}ms`);
  }

  async function createUser() {
    const [row] = await database.sequelize.query(
      `INSERT INTO users (created_at, updated_at)
       VALUES (CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id`,
      { type: QueryTypes.INSERT },
    );
    return Number(row[0].id);
  }

  async function createSuccessfulTransaction(userId) {
    return models.Transaction.create({
      userId,
      amount: 100,
      status: "success",
      paidAt: sameDay,
    });
  }

  beforeAll(async () => {
    database = await createDisposablePostgresDatabase({
      databaseLabel: "invoice_numbering",
      setup: applyPromotionPostgresSchema,
    });
    replaceApplicationDatabaseEnvironment(
      database.applicationDatabaseEnvironment,
    );
    jest.resetModules();

    appSequelize = require("../../db/db").sequelize;
    database.registerConnection(appSequelize);
    models = require("../../db/models").default;
    ({ ensureTransactionInvoiceNumber } = require("../numbering"));
    await appSequelize.authenticate();
  });

  afterAll(async () => {
    try {
      await database?.close();
    } finally {
      replaceApplicationDatabaseEnvironment(originalDbEnvironment);
      jest.resetModules();
    }
  });

  beforeEach(async () => {
    await database.sequelize.query(
      "TRUNCATE TABLE bookings, promotions, transactions, users RESTART IDENTITY CASCADE",
    );
  });

  it("serializes concurrent same-day allocation and preserves the unique constraint", async () => {
    const [firstUserId, secondUserId] = await Promise.all([
      createUser(),
      createUser(),
    ]);
    const [first, second] = await Promise.all([
      createSuccessfulTransaction(firstUserId),
      createSuccessfulTransaction(secondUserId),
    ]);

    const invoiceNumbers = await Promise.all([
      ensureTransactionInvoiceNumber(first),
      ensureTransactionInvoiceNumber(second),
    ]);
    const persisted = await models.Transaction.findAll({
      where: { id: [first.id, second.id] },
      attributes: ["id", "invoiceNumber"],
      order: [["id", "ASC"]],
    });

    expect(new Set(invoiceNumbers)).toEqual(
      new Set(["MW-2026-0721-001", "MW-2026-0721-002"]),
    );
    expect(persisted.map((transaction) => transaction.invoiceNumber)).toEqual([
      "MW-2026-0721-001",
      "MW-2026-0721-002",
    ]);
    expect(
      await models.Transaction.count({
        where: { invoiceNumber: invoiceNumbers },
      }),
    ).toBe(2);

    const duplicate = await createSuccessfulTransaction(firstUserId);
    await expect(
      duplicate.update({ invoiceNumber: invoiceNumbers[0] }),
    ).rejects.toMatchObject({ name: "SequelizeUniqueConstraintError" });
    await duplicate.reload();
    expect(duplicate.invoiceNumber).toBeNull();
    console.info(
      `[invoice-numbering-postgres] concurrent=${invoiceNumbers.join(",")} persisted=2 duplicate_rejected=true`,
    );
  });

  it("durably persists a methodless transaction object through the unique row", async () => {
    const userId = await createUser();
    const persistedTransaction = await createSuccessfulTransaction(userId);
    const transaction = {
      id: persistedTransaction.id,
      paidAt: sameDay,
    };

    await expect(ensureTransactionInvoiceNumber(transaction)).resolves.toBe(
      "MW-2026-0721-001",
    );
    expect(transaction.invoiceNumber).toBe("MW-2026-0721-001");
    await persistedTransaction.reload();
    expect(persistedTransaction.invoiceNumber).toBe("MW-2026-0721-001");
    expect(
      await models.Transaction.count({
        where: { invoiceNumber: transaction.invoiceNumber },
      }),
    ).toBe(1);

    const duplicate = await createSuccessfulTransaction(userId);
    await expect(
      duplicate.update({ invoiceNumber: transaction.invoiceNumber }),
    ).rejects.toMatchObject({ name: "SequelizeUniqueConstraintError" });
    console.info(
      `[invoice-numbering-postgres] methodless_persisted=${transaction.invoiceNumber} unique=true`,
    );
  });

  it("holds the daily advisory lock until a separate allocator backend is visibly waiting", async () => {
    const [firstUserId, secondUserId] = await Promise.all([
      createUser(),
      createUser(),
    ]);
    const [first, second] = await Promise.all([
      createSuccessfulTransaction(firstUserId),
      createSuccessfulTransaction(secondUserId),
    ]);
    const firstInvoiceNumber = await ensureTransactionInvoiceNumber(first);
    const holder = await appSequelize.transaction();
    const allocationLockAttempt = createDeferred();
    let allocatorBackendPid;
    let holderOpen = true;
    let querySpy;

    try {
      const [holderBackend] = await appSequelize.query(
        'SELECT pg_backend_pid() AS "pid"',
        { transaction: holder, type: QueryTypes.SELECT },
      );
      const holderBackendPid = Number(holderBackend.pid);
      await appSequelize.query(
        "SELECT pg_advisory_xact_lock(hashtext(:invoiceDayKey))",
        {
          replacements: { invoiceDayKey: "mw_invoice:2026-07-21" },
          transaction: holder,
          type: QueryTypes.SELECT,
        },
      );

      const originalQuery = appSequelize.query;
      querySpy = jest
        .spyOn(appSequelize, "query")
        .mockImplementation(function queryWithAllocatorProbe(sql, options) {
          if (
            String(sql).includes("pg_advisory_xact_lock") &&
            options?.transaction &&
            options.transaction !== holder
          ) {
            allocatorBackendPid = Number(
              options.transaction.connection?.processID,
            );
            allocationLockAttempt.resolve();
          }
          return originalQuery.call(this, sql, options);
        });

      let allocationCompleted = false;
      const allocation = ensureTransactionInvoiceNumber(second).then(
        (result) => {
          allocationCompleted = true;
          return result;
        },
      );

      await withTimeout(
        allocationLockAttempt.promise,
        "Second invoice allocation lock attempt",
      );
      expect(allocatorBackendPid).toEqual(expect.any(Number));
      expect(allocatorBackendPid).toBeGreaterThan(0);
      expect(allocatorBackendPid).not.toBe(holderBackendPid);

      const waitingAllocator = await waitFor(async () => {
        const [session] = await database.sequelize.query(
          `
            SELECT
              wait_event_type AS "waitEventType",
              state
            FROM pg_stat_activity
            WHERE pid = :pid
          `,
          {
            replacements: { pid: allocatorBackendPid },
            type: QueryTypes.SELECT,
          },
        );
        return session?.waitEventType === "Lock" && session.state === "active"
          ? session
          : null;
      }, "Second invoice allocator advisory-lock wait");

      expect(waitingAllocator).toEqual({
        waitEventType: "Lock",
        state: "active",
      });
      expect(allocationCompleted).toBe(false);

      await holder.commit();
      holderOpen = false;

      await expect(
        withTimeout(allocation, "Second invoice allocation completion"),
      ).resolves.toBe("MW-2026-0721-002");
      await second.reload();
      expect(firstInvoiceNumber).toBe("MW-2026-0721-001");
      expect(second.invoiceNumber).toBe("MW-2026-0721-002");
      console.info(
        `[invoice-numbering-postgres] advisory_lock_wait=true distinct=${firstInvoiceNumber},${second.invoiceNumber}`,
      );
    } finally {
      querySpy?.mockRestore();
      if (holderOpen) await holder.rollback();
    }
  });
});
