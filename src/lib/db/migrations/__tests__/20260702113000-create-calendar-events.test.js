/** @jest-environment node */

const { Sequelize } = require("sequelize");

const migration = require("../20260702113000-create-calendar-events.js");

describe("20260702113000-create-calendar-events migration", () => {
  it("creates the table, indexes, and integrity checks", async () => {
    const transaction = { id: "calendar-events-up-transaction" };
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
      "calendar_events",
      expect.any(Object),
      { transaction },
    );

    const schema = createTable.mock.calls[0][1];
    expect(schema.title.allowNull).toBe(false);
    expect(schema.business_date.type.key).toBe("DATEONLY");
    expect(schema.period.type.options.length).toBe(32);
    expect(schema.property_summary.type.key).toBe("JSONB");
    expect(schema.contact_summary.type.key).toBe("JSONB");
    expect(schema.consumes_capacity.defaultValue).toBe(false);
    expect(schema.reserved_capacity_units.type.options.precision).toBe(6);
    expect(schema.reserved_capacity_units.type.options.scale).toBe(2);
    expect(schema.status.type.values).toEqual(["ACTIVE", "CANCELLED"]);
    expect(schema.created_by_user_id.onDelete).toBe("RESTRICT");
    expect(schema.updated_by_user_id.onDelete).toBe("RESTRICT");
    expect(schema.cancelled_by_user_id.allowNull).toBe(true);
    expect(schema.cancellation_reason.type.key).toBe("TEXT");

    expect(addIndex).toHaveBeenNthCalledWith(
      1,
      "calendar_events",
      ["business_date", "status"],
      {
        name: "calendar_events_business_date_status_idx",
        transaction,
      },
    );
    expect(addIndex).toHaveBeenNthCalledWith(
      2,
      "calendar_events",
      ["created_by_user_id", "business_date"],
      {
        name: "calendar_events_created_by_user_id_business_date_idx",
        transaction,
      },
    );
    expect(rawQuery).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("calendar_events_capacity_reservation_check"),
      { transaction },
    );
    expect(rawQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("calendar_events_cancellation_audit_check"),
      { transaction },
    );
  });

  it("drops the table and enum on rollback", async () => {
    const transaction = { id: "calendar-events-down-transaction" };
    const queryInterface = {
      dropTable: jest.fn(),
      sequelize: {
        transaction: jest.fn(async (callback) => callback(transaction)),
        query: jest.fn(),
      },
    };

    await migration.down(queryInterface);

    expect(queryInterface.dropTable).toHaveBeenCalledWith("calendar_events", {
      transaction,
    });
    expect(queryInterface.sequelize.query).toHaveBeenCalledWith(
      'DROP TYPE IF EXISTS "enum_calendar_events_status";',
      { transaction },
    );
  });
});
