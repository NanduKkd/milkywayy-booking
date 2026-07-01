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

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        "calendar_events",
        {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
          },
          title: {
            type: Sequelize.STRING(160),
            allowNull: false,
          },
          description: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          business_date: {
            type: Sequelize.DATEONLY,
            allowNull: false,
          },
          period: {
            type: Sequelize.STRING(32),
            allowNull: true,
          },
          start_time: {
            type: Sequelize.STRING(16),
            allowNull: true,
          },
          end_time: {
            type: Sequelize.STRING(16),
            allowNull: true,
          },
          property_summary: {
            type: Sequelize.JSONB,
            allowNull: true,
          },
          contact_summary: {
            type: Sequelize.JSONB,
            allowNull: true,
          },
          consumes_capacity: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          reserved_capacity_units: {
            type: Sequelize.DECIMAL(6, 2),
            allowNull: false,
            defaultValue: 0,
          },
          status: {
            type: Sequelize.ENUM("ACTIVE", "CANCELLED"),
            allowNull: false,
            defaultValue: "ACTIVE",
          },
          created_by_user_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: "users",
              key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
          },
          updated_by_user_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: "users",
              key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
          },
          cancelled_by_user_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: "users",
              key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
          },
          cancelled_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          cancellation_reason: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          ...buildTimestampColumns(Sequelize),
        },
        { transaction },
      );

      await queryInterface.addIndex(
        "calendar_events",
        ["business_date", "status"],
        {
          name: "calendar_events_business_date_status_idx",
          transaction,
        },
      );
      await queryInterface.addIndex(
        "calendar_events",
        ["created_by_user_id", "business_date"],
        {
          name: "calendar_events_created_by_user_id_business_date_idx",
          transaction,
        },
      );

      await queryInterface.sequelize.query(
        `
          ALTER TABLE calendar_events
          ADD CONSTRAINT calendar_events_capacity_reservation_check
          CHECK (
            reserved_capacity_units >= 0
            AND (
              (consumes_capacity = FALSE AND reserved_capacity_units = 0)
              OR
              (consumes_capacity = TRUE AND reserved_capacity_units > 0)
            )
          )
        `,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `
          ALTER TABLE calendar_events
          ADD CONSTRAINT calendar_events_cancellation_audit_check
          CHECK (
            (status = 'ACTIVE' AND cancelled_at IS NULL AND cancelled_by_user_id IS NULL AND cancellation_reason IS NULL)
            OR
            (status = 'CANCELLED' AND cancelled_at IS NOT NULL AND cancelled_by_user_id IS NOT NULL)
          )
        `,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable("calendar_events", { transaction });
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_calendar_events_status";',
        { transaction },
      );
    });
  },
};
