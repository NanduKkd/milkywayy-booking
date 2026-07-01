/** @jest-environment node */

const { Sequelize } = require("sequelize");

const migration = require("../20260701130000-create-expense-audit-events.js");

describe("20260701130000-create-expense-audit-events migration", () => {
  it("creates the audit table and supporting indexes", async () => {
    const transaction = { id: "expense-audit-events-transaction" };
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
    expect(createTable).toHaveBeenCalledWith(
      "expense_audit_events",
      expect.any(Object),
      { transaction },
    );

    const schema = createTable.mock.calls[0][1];
    expect(schema.expense_id.allowNull).toBe(false);
    expect(schema.expense_id.references).toEqual({
      model: "expenses",
      key: "id",
    });
    expect(schema.expense_id.onDelete).toBe("CASCADE");
    expect(schema.actor_user_id.onDelete).toBe("SET NULL");
    expect(schema.action.type.values).toEqual([
      "CREATED",
      "UPDATED",
      "DELETED",
    ]);
    expect(schema.before_state.type.key).toBe("JSONB");
    expect(schema.after_state.type.key).toBe("JSONB");
    expect(schema.metadata.type.key).toBe("JSONB");

    expect(addIndex).toHaveBeenNthCalledWith(
      1,
      "expense_audit_events",
      ["expense_id"],
      {
        name: "expense_audit_events_expense_id_idx",
        transaction,
      },
    );
    expect(addIndex).toHaveBeenNthCalledWith(
      2,
      "expense_audit_events",
      ["actor_user_id", "action", "created_at"],
      {
        name: "expense_audit_events_actor_action_created_at_idx",
        transaction,
      },
    );
    expect(rawQuery).not.toHaveBeenCalled();
  });

  it("drops the table and enum on rollback", async () => {
    const transaction = { id: "expense-audit-events-down-transaction" };
    const queryInterface = {
      dropTable: jest.fn(),
      sequelize: {
        transaction: jest.fn(async (callback) => callback(transaction)),
        query: jest.fn(),
      },
    };

    await migration.down(queryInterface);

    expect(queryInterface.dropTable).toHaveBeenCalledWith(
      "expense_audit_events",
      { transaction },
    );
    expect(queryInterface.sequelize.query).toHaveBeenCalledWith(
      'DROP TYPE IF EXISTS "enum_expense_audit_events_action";',
      { transaction },
    );
  });
});
