/** @jest-environment node */

const { Client } = require("pg");
const { QueryTypes, Sequelize, DataTypes } = require("sequelize");

const migration = require("../20260701010000-create-promotions-core-schema.js");

const adminConfig = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || undefined,
  database: "postgres",
};

const listIndexes = async (sequelize, tableName) =>
  sequelize.query(
    `
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = :tableName
      ORDER BY indexname
    `,
    {
      replacements: { tableName },
      type: QueryTypes.SELECT,
    },
  );

const listForeignKeys = async (sequelize, tableName) =>
  sequelize.query(
    `
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
       AND tc.table_schema = ccu.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = :tableName
      ORDER BY tc.constraint_name
    `,
    {
      replacements: { tableName },
      type: QueryTypes.SELECT,
    },
  );

const listEnumTypes = async (sequelize) =>
  sequelize.query(
    `
      SELECT typname
      FROM pg_type
      WHERE typname IN (
        'enum_promotions_kind',
        'enum_promotions_benefit_type',
        'enum_promotions_status',
        'enum_promotions_trigger_type',
        'enum_promotion_redemptions_benefit_type_snapshot',
        'enum_promotion_redemptions_state',
        'enum_promotion_audit_events_action'
      )
      ORDER BY typname
    `,
    {
      type: QueryTypes.SELECT,
    },
  );

describe("20260701010000-create-promotions-core-schema migration", () => {
  let adminClient;
  let sequelize;
  let queryInterface;
  let databaseName;

  beforeAll(async () => {
    databaseName = `mw_promotions_migration_${Date.now()}_${process.pid}`;
    adminClient = new Client(adminConfig);
    await adminClient.connect();
    await adminClient.query(`CREATE DATABASE "${databaseName}"`);

    sequelize = new Sequelize(
      databaseName,
      process.env.DB_USER,
      process.env.DB_PASSWORD || undefined,
      {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        dialect: "postgres",
        logging: false,
      },
    );

    await sequelize.authenticate();
    queryInterface = sequelize.getQueryInterface();

    await queryInterface.createTable("users", {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.createTable("transactions", {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "pending",
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.createTable("bookings", {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      transaction_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "transactions", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });
  });

  afterAll(async () => {
    if (sequelize) {
      await sequelize.close();
    }

    if (adminClient) {
      await adminClient.query(
        `
          SELECT pg_terminate_backend(pid)
          FROM pg_stat_activity
          WHERE datname = $1 AND pid <> pg_backend_pid()
        `,
        [databaseName],
      );
      await adminClient.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
      await adminClient.end();
    }
  });

  it("creates the promotion schema and rolls back cleanly", async () => {
    await migration.up(queryInterface, Sequelize);

    const promotions = await queryInterface.describeTable("promotions");
    expect(promotions.kind).toBeDefined();
    expect(promotions.trigger_config).toBeDefined();
    expect(promotions.legacy_source_id).toBeDefined();
    expect(promotions.created_by_user_id).toBeDefined();

    const assignments = await queryInterface.describeTable(
      "promotion_assignments",
    );
    expect(assignments.promotion_id).toBeDefined();
    expect(assignments.user_id).toBeDefined();
    expect(assignments.metadata).toBeDefined();

    const redemptions = await queryInterface.describeTable(
      "promotion_redemptions",
    );
    expect(redemptions.transaction_id).toBeDefined();
    expect(redemptions.booking_id).toBeDefined();
    expect(redemptions.benefit_type_snapshot).toBeDefined();
    expect(redemptions.state).toBeDefined();

    const auditEvents = await queryInterface.describeTable(
      "promotion_audit_events",
    );
    expect(auditEvents.promotion_assignment_id).toBeDefined();
    expect(auditEvents.actor_user_id).toBeDefined();
    expect(auditEvents.action).toBeDefined();

    const transactions = await queryInterface.describeTable("transactions");
    expect(transactions.promotion_id).toBeDefined();
    expect(transactions.promotion_redemption_id).toBeDefined();
    expect(transactions.promotion_snapshot).toBeDefined();

    const promotionIndexes = await listIndexes(sequelize, "promotions");
    expect(promotionIndexes.map(({ indexname }) => indexname)).toEqual(
      expect.arrayContaining([
        "promotions_kind_status_idx",
        "promotions_active_window_idx",
        "promotions_legacy_source_idx",
        "promotions_active_generic_code_unique",
      ]),
    );
    expect(
      promotionIndexes.some(
        ({ indexname, indexdef }) =>
          indexname === "promotions_active_generic_code_unique" &&
          indexdef.includes("UNIQUE INDEX") &&
          indexdef.toLowerCase().includes("lower("),
      ),
    ).toBe(true);

    const assignmentIndexes = await listIndexes(
      sequelize,
      "promotion_assignments",
    );
    expect(assignmentIndexes.map(({ indexname }) => indexname)).toEqual(
      expect.arrayContaining([
        "promotion_assignments_promotion_id_idx",
        "promotion_assignments_user_id_idx",
        "promotion_assignments_active_promotion_user_unique",
      ]),
    );

    const redemptionIndexes = await listIndexes(
      sequelize,
      "promotion_redemptions",
    );
    expect(redemptionIndexes.map(({ indexname }) => indexname)).toEqual(
      expect.arrayContaining([
        "promotion_redemptions_promotion_state_idx",
        "promotion_redemptions_user_state_idx",
        "promotion_redemptions_booking_id_idx",
        "promotion_redemptions_active_transaction_unique",
      ]),
    );

    const transactionIndexes = await listIndexes(sequelize, "transactions");
    expect(transactionIndexes.map(({ indexname }) => indexname)).toEqual(
      expect.arrayContaining([
        "transactions_promotion_id_idx",
        "transactions_promotion_redemption_id_idx",
      ]),
    );

    const promotionForeignKeys = await listForeignKeys(sequelize, "promotions");
    expect(promotionForeignKeys).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          column_name: "created_by_user_id",
          foreign_table_name: "users",
          foreign_column_name: "id",
        }),
        expect.objectContaining({
          column_name: "updated_by_user_id",
          foreign_table_name: "users",
          foreign_column_name: "id",
        }),
      ]),
    );

    const assignmentForeignKeys = await listForeignKeys(
      sequelize,
      "promotion_assignments",
    );
    expect(assignmentForeignKeys).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          column_name: "promotion_id",
          foreign_table_name: "promotions",
          foreign_column_name: "id",
        }),
        expect.objectContaining({
          column_name: "user_id",
          foreign_table_name: "users",
          foreign_column_name: "id",
        }),
      ]),
    );

    const redemptionForeignKeys = await listForeignKeys(
      sequelize,
      "promotion_redemptions",
    );
    expect(redemptionForeignKeys).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          column_name: "promotion_id",
          foreign_table_name: "promotions",
          foreign_column_name: "id",
        }),
        expect.objectContaining({
          column_name: "transaction_id",
          foreign_table_name: "transactions",
          foreign_column_name: "id",
        }),
        expect.objectContaining({
          column_name: "booking_id",
          foreign_table_name: "bookings",
          foreign_column_name: "id",
        }),
      ]),
    );

    const transactionForeignKeys = await listForeignKeys(
      sequelize,
      "transactions",
    );
    expect(transactionForeignKeys).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          column_name: "promotion_id",
          foreign_table_name: "promotions",
          foreign_column_name: "id",
        }),
        expect.objectContaining({
          column_name: "promotion_redemption_id",
          foreign_table_name: "promotion_redemptions",
          foreign_column_name: "id",
        }),
      ]),
    );

    const enumTypes = await listEnumTypes(sequelize);
    expect(enumTypes.map(({ typname }) => typname)).toEqual([
      "enum_promotion_audit_events_action",
      "enum_promotion_redemptions_benefit_type_snapshot",
      "enum_promotion_redemptions_state",
      "enum_promotions_benefit_type",
      "enum_promotions_kind",
      "enum_promotions_status",
      "enum_promotions_trigger_type",
    ]);

    await migration.down(queryInterface);

    const droppedTables = await sequelize.query(
      `
        SELECT
          to_regclass('public.promotions') AS promotions,
          to_regclass('public.promotion_assignments') AS promotion_assignments,
          to_regclass('public.promotion_redemptions') AS promotion_redemptions,
          to_regclass('public.promotion_audit_events') AS promotion_audit_events
      `,
      {
        type: QueryTypes.SELECT,
      },
    );

    expect(droppedTables[0]).toEqual({
      promotions: null,
      promotion_assignments: null,
      promotion_redemptions: null,
      promotion_audit_events: null,
    });

    const rolledBackTransactions =
      await queryInterface.describeTable("transactions");
    expect(rolledBackTransactions.promotion_id).toBeUndefined();
    expect(rolledBackTransactions.promotion_redemption_id).toBeUndefined();
    expect(rolledBackTransactions.promotion_snapshot).toBeUndefined();

    const rolledBackEnums = await listEnumTypes(sequelize);
    expect(rolledBackEnums).toEqual([]);
  });
});
