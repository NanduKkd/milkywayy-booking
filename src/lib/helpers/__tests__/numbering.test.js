jest.mock("@/lib/db/db", () => ({
  sequelize: {
    query: jest.fn(),
    transaction: jest.fn(),
  },
}));

import { sequelize as db } from "@/lib/db/db";
import { ensureTransactionInvoiceNumber } from "@/lib/helpers/numbering";

function configureSuccessfulAllocation(sequence = 2) {
  const databaseTransaction = { id: "database-transaction" };
  db.transaction.mockImplementation((callback) =>
    callback(databaseTransaction),
  );
  db.query.mockResolvedValueOnce([]).mockResolvedValueOnce([{ sequence }]);
  return databaseTransaction;
}

describe("ensureTransactionInvoiceNumber", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-07-21T09:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("reuses an existing persisted number without a database allocation", async () => {
    await expect(
      ensureTransactionInvoiceNumber({ invoiceNumber: "MW-2026-0721-004" }),
    ).resolves.toBe("MW-2026-0721-004");
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("uses paid time before created time and passes the exact UTC day window", async () => {
    const databaseTransaction = configureSuccessfulAllocation(2);
    const update = jest.fn().mockResolvedValue(undefined);
    const setDataValue = jest.fn();
    const transaction = {
      id: 8,
      paidAt: new Date("2026-01-01T00:00:00.000Z"),
      createdAt: new Date("2025-12-31T23:59:59.999Z"),
      update,
      setDataValue,
    };

    await expect(ensureTransactionInvoiceNumber(transaction)).resolves.toBe(
      "MW-2026-0101-002",
    );

    expect(db.query).toHaveBeenNthCalledWith(
      1,
      "SELECT pg_advisory_xact_lock(hashtext(:invoiceDayKey))",
      expect.objectContaining({
        replacements: { invoiceDayKey: "mw_invoice:2026-01-01" },
        transaction: databaseTransaction,
      }),
    );
    expect(db.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("COALESCE(paid_at, created_at) < :dayEnd"),
      expect.objectContaining({
        replacements: {
          dayStart: new Date("2026-01-01T00:00:00.000Z"),
          dayEnd: new Date("2026-01-02T00:00:00.000Z"),
          effectiveAt: new Date("2026-01-01T00:00:00.000Z"),
          transactionId: 8,
        },
        transaction: databaseTransaction,
      }),
    );
    expect(update).toHaveBeenCalledWith(
      { invoiceNumber: "MW-2026-0101-002" },
      { transaction: databaseTransaction },
    );
    expect(setDataValue).toHaveBeenCalledWith(
      "invoiceNumber",
      "MW-2026-0101-002",
    );
  });

  it("persists and then synchronizes an unnumbered plain object without update", async () => {
    const databaseTransaction = configureSuccessfulAllocation(1);
    const transaction = {
      id: 9,
      paidAt: "not-a-date",
    };
    db.query.mockResolvedValueOnce([{ invoiceNumber: "MW-2026-0721-001" }]);

    await expect(ensureTransactionInvoiceNumber(transaction)).resolves.toBe(
      "MW-2026-0721-001",
    );
    expect(transaction.invoiceNumber).toBe("MW-2026-0721-001");
    expect(transaction.update).toBeUndefined();
    expect(db.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("UPDATE transactions"),
      expect.objectContaining({
        replacements: {
          invoiceNumber: "MW-2026-0721-001",
          transactionId: 9,
        },
        transaction: databaseTransaction,
      }),
    );
  });

  it("does not mutate a plain object when durable persistence fails", async () => {
    configureSuccessfulAllocation(1);
    const transaction = { id: 12 };
    db.query.mockResolvedValueOnce([]);

    await expect(ensureTransactionInvoiceNumber(transaction)).rejects.toThrow(
      "Invoice number persistence did not update the transaction",
    );
    expect(transaction.invoiceNumber).toBeUndefined();
  });

  it("does not persist unusable count results", async () => {
    configureSuccessfulAllocation(0);
    const transaction = {
      id: 10,
      update: jest.fn().mockResolvedValue(undefined),
    };

    await expect(ensureTransactionInvoiceNumber(transaction)).resolves.toBe("");
    expect(transaction.update).not.toHaveBeenCalled();
    expect(transaction.invoiceNumber).toBeUndefined();
  });

  it("retries a unique collision with the next valid sequence", async () => {
    const firstDatabaseTransaction = { id: "first" };
    const secondDatabaseTransaction = { id: "second" };
    db.transaction
      .mockImplementationOnce((callback) => callback(firstDatabaseTransaction))
      .mockImplementationOnce((callback) =>
        callback(secondDatabaseTransaction),
      );
    db.query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ sequence: 4 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ sequence: 4 }]);
    const transaction = {
      id: 11,
      update: jest
        .fn()
        .mockRejectedValueOnce({ name: "SequelizeUniqueConstraintError" })
        .mockResolvedValueOnce(undefined),
    };

    await expect(ensureTransactionInvoiceNumber(transaction)).resolves.toBe(
      "MW-2026-0721-005",
    );
    expect(transaction.update).toHaveBeenNthCalledWith(
      1,
      { invoiceNumber: "MW-2026-0721-004" },
      { transaction: firstDatabaseTransaction },
    );
    expect(transaction.update).toHaveBeenNthCalledWith(
      2,
      { invoiceNumber: "MW-2026-0721-005" },
      { transaction: secondDatabaseTransaction },
    );
  });
});
