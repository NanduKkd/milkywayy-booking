/** @jest-environment node */

const { Sequelize } = require("sequelize");

const migration = require("../20260701120000-create-expenses.js");

describe("20260701120000-create-expenses migration", () => {
  it("creates the expense schema, active indexes, and audit constraints", async () => {
    const transaction = { id: "expense-migration-transaction" };
    const createTable = jest.fn();
    const addIndex = jest.fn();
    const rawQuery = jest.fn();
    const queryInterface = {
      createTable,
      addIndex,
      dropTable: jest.fn(),
      sequelize: {
        transaction: jest.fn(async (callback) => callback(transaction)),
        query: rawQuery,
      },
    };

    await migration.up(queryInterface, Sequelize);

    expect(queryInterface.sequelize.transaction).toHaveBeenCalledTimes(1);
    expect(createTable).toHaveBeenCalledTimes(1);
    expect(createTable).toHaveBeenCalledWith("expenses", expect.any(Object), {
      transaction,
    });

    const schema = createTable.mock.calls[0][1];
    expect(schema.amount.allowNull).toBe(false);
    expect(schema.amount.type.key).toBe("DECIMAL");
    expect(schema.expense_date.allowNull).toBe(false);
    expect(schema.expense_date.type.key).toBe("DATEONLY");
    expect(schema.category.type.options.length).toBe(64);
    expect(schema.description.type.key).toBe("TEXT");
    expect(schema.created_by_user_id.allowNull).toBe(false);
    expect(schema.created_by_user_id.references).toEqual({
      model: "users",
      key: "id",
    });
    expect(schema.created_by_user_id.onDelete).toBe("RESTRICT");
    expect(schema.updated_by_user_id.allowNull).toBe(false);
    expect(schema.deleted_by_user_id.allowNull).toBe(true);
    expect(schema.delete_reason.type.key).toBe("TEXT");
    expect(schema.deleted_at.type.key).toBe("DATE");
    expect(schema.created_at.type.key).toBe("DATE");
    expect(schema.updated_at.type.key).toBe("DATE");

    expect(addIndex).toHaveBeenCalledTimes(3);
    expect(addIndex).toHaveBeenNthCalledWith(1, "expenses", ["expense_date"], {
      name: "expenses_active_expense_date_idx",
      where: {
        deleted_at: null,
      },
      transaction,
    });
    expect(addIndex).toHaveBeenNthCalledWith(2, "expenses", ["category"], {
      name: "expenses_active_category_idx",
      where: {
        deleted_at: null,
      },
      transaction,
    });
    expect(addIndex).toHaveBeenNthCalledWith(
      3,
      "expenses",
      ["expense_date", "category"],
      {
        name: "expenses_active_expense_date_category_idx",
        where: {
          deleted_at: null,
        },
        transaction,
      },
    );

    expect(rawQuery).toHaveBeenCalledTimes(2);
    expect(rawQuery).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("expenses_amount_positive_check"),
      { transaction },
    );
    expect(rawQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("expenses_soft_delete_audit_check"),
      { transaction },
    );
    expect(rawQuery.mock.calls[1][0]).toContain("delete_reason IS NOT NULL");
  });

  it("drops the expenses table on rollback", async () => {
    const queryInterface = {
      dropTable: jest.fn(),
    };

    await migration.down(queryInterface);

    expect(queryInterface.dropTable).toHaveBeenCalledWith("expenses");
  });
});
