/** @type {import('sequelize-cli').Migration} */

const buildTimestampColumns = (Sequelize) => ({
  created_at: {
    type: Sequelize.DATE,
    allowNull: false,
  },
  updated_at: {
    type: Sequelize.DATE,
    allowNull: false,
  },
});

const PROMOTION_KINDS = ["GENERIC", "PERSONAL", "AUTOMATIC"];
const PROMOTION_BENEFIT_TYPES = ["FIXED", "PERCENTAGE"];
const PROMOTION_STATUSES = ["DRAFT", "ACTIVE", "PAUSED", "DEACTIVATED"];
const PROMOTION_TRIGGER_TYPES = [
  "NONE",
  "FIRST_PAID_BOOKING",
  "SECOND_PAID_BOOKING",
  "ANY_PAID_BOOKING",
  "DATE_RANGE",
];
const PROMOTION_REDEMPTION_STATES = [
  "RESERVED",
  "APPLIED",
  "RELEASED",
  "EXPIRED",
];
const PROMOTION_AUDIT_ACTIONS = [
  "CREATED",
  "UPDATED",
  "ACTIVATED",
  "PAUSED",
  "DEACTIVATED",
  "ASSIGNED",
  "UNASSIGNED",
  "MIGRATED",
];

const dropEnumTypes = async (queryInterface, transaction) => {
  const enumTypes = [
    "enum_promotions_kind",
    "enum_promotions_benefit_type",
    "enum_promotions_status",
    "enum_promotions_trigger_type",
    "enum_promotion_redemptions_benefit_type_snapshot",
    "enum_promotion_redemptions_state",
    "enum_promotion_audit_events_action",
  ];

  for (const typeName of enumTypes) {
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${typeName}"`, {
      transaction,
    });
  }
};

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "promotions",
        {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
          },
          kind: {
            type: Sequelize.ENUM(...PROMOTION_KINDS),
            allowNull: false,
          },
          code: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          name: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          admin_description: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          customer_message: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          benefit_type: {
            type: Sequelize.ENUM(...PROMOTION_BENEFIT_TYPES),
            allowNull: false,
          },
          benefit_value: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
          },
          benefit_cap: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
          },
          minimum_spend: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0,
          },
          starts_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          ends_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          status: {
            type: Sequelize.ENUM(...PROMOTION_STATUSES),
            allowNull: false,
            defaultValue: "DRAFT",
          },
          system_flag: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          priority: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          per_user_limit: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          total_limit: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          trigger_type: {
            type: Sequelize.ENUM(...PROMOTION_TRIGGER_TYPES),
            allowNull: false,
            defaultValue: "NONE",
          },
          trigger_config: {
            type: Sequelize.JSONB,
            allowNull: false,
            defaultValue: {},
          },
          legacy_source_type: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          legacy_source_id: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          created_by_user_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "users", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          updated_by_user_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "users", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          ...buildTimestampColumns(Sequelize),
        },
        { transaction },
      );

      await queryInterface.addIndex("promotions", ["kind", "status"], {
        name: "promotions_kind_status_idx",
        transaction,
      });
      await queryInterface.addIndex("promotions", ["starts_at", "ends_at"], {
        name: "promotions_active_window_idx",
        transaction,
      });
      await queryInterface.addIndex(
        "promotions",
        ["legacy_source_type", "legacy_source_id"],
        {
          name: "promotions_legacy_source_idx",
          transaction,
        },
      );

      await queryInterface.sequelize.query(
        `
          ALTER TABLE promotions
          ADD CONSTRAINT promotions_code_kind_check
          CHECK (
            (kind = 'GENERIC' AND code IS NOT NULL)
            OR
            (kind IN ('PERSONAL', 'AUTOMATIC') AND code IS NULL)
          )
        `,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `
          ALTER TABLE promotions
          ADD CONSTRAINT promotions_trigger_kind_check
          CHECK (
            (kind IN ('GENERIC', 'PERSONAL') AND trigger_type = 'NONE')
            OR
            (kind = 'AUTOMATIC' AND trigger_type <> 'NONE')
          )
        `,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `
          ALTER TABLE promotions
          ADD CONSTRAINT promotions_benefit_values_check
          CHECK (
            benefit_value > 0
            AND minimum_spend >= 0
            AND (benefit_cap IS NULL OR benefit_cap > 0)
            AND (per_user_limit IS NULL OR per_user_limit > 0)
            AND (total_limit IS NULL OR total_limit > 0)
            AND priority >= 0
            AND (benefit_type <> 'PERCENTAGE' OR benefit_value <= 100)
            AND (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at)
          )
        `,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `
          CREATE UNIQUE INDEX promotions_active_generic_code_unique
          ON promotions (LOWER(code))
          WHERE kind = 'GENERIC'
            AND status = 'ACTIVE'
            AND code IS NOT NULL
        `,
        { transaction },
      );

      await queryInterface.createTable(
        "promotion_assignments",
        {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
          },
          promotion_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: "promotions", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          user_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: "users", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          assigned_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          unassigned_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          assigned_by_user_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "users", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          unassigned_by_user_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "users", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          notes: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          metadata: {
            type: Sequelize.JSONB,
            allowNull: false,
            defaultValue: {},
          },
          ...buildTimestampColumns(Sequelize),
        },
        { transaction },
      );

      await queryInterface.addIndex("promotion_assignments", ["promotion_id"], {
        name: "promotion_assignments_promotion_id_idx",
        transaction,
      });
      await queryInterface.addIndex("promotion_assignments", ["user_id"], {
        name: "promotion_assignments_user_id_idx",
        transaction,
      });
      await queryInterface.sequelize.query(
        `
          CREATE UNIQUE INDEX promotion_assignments_active_promotion_user_unique
          ON promotion_assignments (promotion_id, user_id)
          WHERE unassigned_at IS NULL
        `,
        { transaction },
      );

      await queryInterface.createTable(
        "promotion_redemptions",
        {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
          },
          promotion_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: "promotions", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          user_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: "users", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          transaction_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: "transactions", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          booking_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "bookings", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          eligible_subtotal: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
          },
          benefit_amount: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
          },
          benefit_type_snapshot: {
            type: Sequelize.ENUM(...PROMOTION_BENEFIT_TYPES),
            allowNull: false,
          },
          trigger_snapshot: {
            type: Sequelize.JSONB,
            allowNull: false,
            defaultValue: {},
          },
          state: {
            type: Sequelize.ENUM(...PROMOTION_REDEMPTION_STATES),
            allowNull: false,
            defaultValue: "RESERVED",
          },
          reserved_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          reservation_expires_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          applied_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          released_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          release_reason: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          ...buildTimestampColumns(Sequelize),
        },
        { transaction },
      );

      await queryInterface.addIndex(
        "promotion_redemptions",
        ["promotion_id", "state"],
        {
          name: "promotion_redemptions_promotion_state_idx",
          transaction,
        },
      );
      await queryInterface.addIndex(
        "promotion_redemptions",
        ["user_id", "state"],
        {
          name: "promotion_redemptions_user_state_idx",
          transaction,
        },
      );
      await queryInterface.addIndex("promotion_redemptions", ["booking_id"], {
        name: "promotion_redemptions_booking_id_idx",
        transaction,
      });
      await queryInterface.sequelize.query(
        `
          ALTER TABLE promotion_redemptions
          ADD CONSTRAINT promotion_redemptions_amounts_check
          CHECK (
            eligible_subtotal >= 0
            AND benefit_amount >= 0
          )
        `,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `
          CREATE UNIQUE INDEX promotion_redemptions_active_transaction_unique
          ON promotion_redemptions (transaction_id)
          WHERE state IN ('RESERVED', 'APPLIED')
            AND transaction_id IS NOT NULL
        `,
        { transaction },
      );

      await queryInterface.createTable(
        "promotion_audit_events",
        {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
          },
          promotion_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "promotions", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          promotion_assignment_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "promotion_assignments", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          actor_user_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "users", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          action: {
            type: Sequelize.ENUM(...PROMOTION_AUDIT_ACTIONS),
            allowNull: false,
          },
          before_state: {
            type: Sequelize.JSONB,
            allowNull: true,
          },
          after_state: {
            type: Sequelize.JSONB,
            allowNull: true,
          },
          reason: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          metadata: {
            type: Sequelize.JSONB,
            allowNull: false,
            defaultValue: {},
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
        },
        { transaction },
      );

      await queryInterface.addIndex(
        "promotion_audit_events",
        ["promotion_id"],
        {
          name: "promotion_audit_events_promotion_id_idx",
          transaction,
        },
      );
      await queryInterface.addIndex(
        "promotion_audit_events",
        ["promotion_assignment_id"],
        {
          name: "promotion_audit_events_assignment_id_idx",
          transaction,
        },
      );
      await queryInterface.addIndex(
        "promotion_audit_events",
        ["actor_user_id", "action"],
        {
          name: "promotion_audit_events_actor_action_idx",
          transaction,
        },
      );

      await queryInterface.addColumn(
        "transactions",
        "promotion_id",
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: "promotions", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        { transaction },
      );
      await queryInterface.addColumn(
        "transactions",
        "promotion_redemption_id",
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: "promotion_redemptions", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        { transaction },
      );
      await queryInterface.addColumn(
        "transactions",
        "promotion_snapshot",
        {
          type: Sequelize.JSONB,
          allowNull: true,
        },
        { transaction },
      );

      await queryInterface.addIndex("transactions", ["promotion_id"], {
        name: "transactions_promotion_id_idx",
        transaction,
      });
      await queryInterface.addIndex(
        "transactions",
        ["promotion_redemption_id"],
        {
          name: "transactions_promotion_redemption_id_idx",
          transaction,
        },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn("transactions", "promotion_snapshot", {
        transaction,
      });
      await queryInterface.removeColumn(
        "transactions",
        "promotion_redemption_id",
        { transaction },
      );
      await queryInterface.removeColumn("transactions", "promotion_id", {
        transaction,
      });

      await queryInterface.dropTable("promotion_audit_events", { transaction });
      await queryInterface.dropTable("promotion_redemptions", { transaction });
      await queryInterface.dropTable("promotion_assignments", { transaction });
      await queryInterface.dropTable("promotions", { transaction });

      await dropEnumTypes(queryInterface, transaction);
    });
  },
};
