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
        "expenses",
        {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
          },
          amount: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
          },
          expense_date: {
            type: Sequelize.DATEONLY,
            allowNull: false,
          },
          category: {
            type: Sequelize.STRING(64),
            allowNull: false,
          },
          description: {
            type: Sequelize.TEXT,
            allowNull: true,
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
          deleted_by_user_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: "users",
              key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
          },
          delete_reason: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          deleted_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          ...buildTimestampColumns(Sequelize),
        },
        { transaction },
      );

      await queryInterface.addIndex("expenses", ["expense_date"], {
        name: "expenses_active_expense_date_idx",
        where: {
          deleted_at: null,
        },
        transaction,
      });
      await queryInterface.addIndex("expenses", ["category"], {
        name: "expenses_active_category_idx",
        where: {
          deleted_at: null,
        },
        transaction,
      });
      await queryInterface.addIndex("expenses", ["expense_date", "category"], {
        name: "expenses_active_expense_date_category_idx",
        where: {
          deleted_at: null,
        },
        transaction,
      });

      await queryInterface.sequelize.query(
        `
          ALTER TABLE expenses
          ADD CONSTRAINT expenses_amount_positive_check
          CHECK (amount > 0)
        `,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `
          ALTER TABLE expenses
          ADD CONSTRAINT expenses_soft_delete_audit_check
          CHECK (
            (deleted_at IS NULL AND deleted_by_user_id IS NULL AND delete_reason IS NULL)
            OR
            (deleted_at IS NOT NULL AND deleted_by_user_id IS NOT NULL AND delete_reason IS NOT NULL)
          )
        `,
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("expenses");
  },
};
