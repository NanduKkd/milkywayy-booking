/** @jest-environment node */

const migration = require("../20260702100000-add-financial-analytics-indexes.js");

describe("20260702100000-add-financial-analytics-indexes migration", () => {
  it("adds the bounded analytics indexes inside one transaction", async () => {
    const transaction = { id: "financial-analytics-indexes-up" };
    const queryInterface = {
      addIndex: jest.fn(),
      removeIndex: jest.fn(),
      sequelize: {
        transaction: jest.fn(async (callback) => callback(transaction)),
      },
    };

    await migration.up(queryInterface);

    expect(queryInterface.sequelize.transaction).toHaveBeenCalledTimes(1);
    expect(queryInterface.addIndex).toHaveBeenCalledTimes(6);
    expect(queryInterface.addIndex).toHaveBeenNthCalledWith(
      1,
      "transactions",
      ["status", "paid_at"],
      {
        name: "transactions_status_paid_at_idx",
        transaction,
      },
    );
    expect(queryInterface.addIndex).toHaveBeenNthCalledWith(
      2,
      "transactions",
      ["status", "refunded_amount"],
      {
        name: "transactions_status_refunded_amount_idx",
        transaction,
      },
    );
    expect(queryInterface.addIndex).toHaveBeenNthCalledWith(
      3,
      "bookings",
      ["date"],
      {
        name: "bookings_date_idx",
        transaction,
      },
    );
    expect(queryInterface.addIndex).toHaveBeenNthCalledWith(
      4,
      "bookings",
      ["completed_at"],
      {
        name: "bookings_completed_at_idx",
        transaction,
      },
    );
    expect(queryInterface.addIndex).toHaveBeenNthCalledWith(
      5,
      "bookings",
      ["cancelled_at"],
      {
        name: "bookings_cancelled_at_idx",
        transaction,
      },
    );
    expect(queryInterface.addIndex).toHaveBeenNthCalledWith(
      6,
      "bookings",
      ["transaction_id"],
      {
        name: "bookings_transaction_id_idx",
        transaction,
      },
    );
  });

  it("removes the analytics indexes on rollback", async () => {
    const transaction = { id: "financial-analytics-indexes-down" };
    const queryInterface = {
      addIndex: jest.fn(),
      removeIndex: jest.fn(),
      sequelize: {
        transaction: jest.fn(async (callback) => callback(transaction)),
      },
    };

    await migration.down(queryInterface);

    expect(queryInterface.sequelize.transaction).toHaveBeenCalledTimes(1);
    expect(queryInterface.removeIndex).toHaveBeenCalledTimes(6);
    expect(queryInterface.removeIndex).toHaveBeenNthCalledWith(
      1,
      "bookings",
      "bookings_transaction_id_idx",
      {
        transaction,
      },
    );
    expect(queryInterface.removeIndex).toHaveBeenNthCalledWith(
      2,
      "bookings",
      "bookings_cancelled_at_idx",
      {
        transaction,
      },
    );
    expect(queryInterface.removeIndex).toHaveBeenNthCalledWith(
      3,
      "bookings",
      "bookings_completed_at_idx",
      {
        transaction,
      },
    );
    expect(queryInterface.removeIndex).toHaveBeenNthCalledWith(
      4,
      "bookings",
      "bookings_date_idx",
      {
        transaction,
      },
    );
    expect(queryInterface.removeIndex).toHaveBeenNthCalledWith(
      5,
      "transactions",
      "transactions_status_refunded_amount_idx",
      {
        transaction,
      },
    );
    expect(queryInterface.removeIndex).toHaveBeenNthCalledWith(
      6,
      "transactions",
      "transactions_status_paid_at_idx",
      {
        transaction,
      },
    );
  });
});
