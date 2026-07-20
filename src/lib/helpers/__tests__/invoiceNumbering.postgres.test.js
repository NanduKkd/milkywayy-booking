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
});
