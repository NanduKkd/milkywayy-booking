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
        "expense_audit_events",
        {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
          },
          expense_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: "expenses",
              key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          actor_user_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: "users",
              key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          action: {
            type: Sequelize.ENUM("CREATED", "UPDATED", "DELETED"),
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
          ...buildTimestampColumns(Sequelize),
        },
        { transaction },
      );

      await queryInterface.addIndex("expense_audit_events", ["expense_id"], {
        name: "expense_audit_events_expense_id_idx",
        transaction,
      });
      await queryInterface.addIndex(
        "expense_audit_events",
        ["actor_user_id", "action", "created_at"],
        {
          name: "expense_audit_events_actor_action_created_at_idx",
          transaction,
        },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable("expense_audit_events", { transaction });
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_expense_audit_events_action";',
        { transaction },
      );
    });
  },
};
