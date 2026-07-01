import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

const Expense = sequelize.define(
  "Expense",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    expenseDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "expense_date",
    },
    category: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdByUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "created_by_user_id",
      references: {
        model: "users",
        key: "id",
      },
    },
    updatedByUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "updated_by_user_id",
      references: {
        model: "users",
        key: "id",
      },
    },
    deletedByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "deleted_by_user_id",
      references: {
        model: "users",
        key: "id",
      },
    },
    deleteReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "delete_reason",
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "deleted_at",
    },
  },
  {
    tableName: "expenses",
    timestamps: true,
    underscored: true,
    paranoid: true,
    indexes: [
      {
        name: "expenses_active_expense_date_idx",
        fields: ["expense_date"],
        where: {
          deleted_at: null,
        },
      },
      {
        name: "expenses_active_category_idx",
        fields: ["category"],
        where: {
          deleted_at: null,
        },
      },
      {
        name: "expenses_active_expense_date_category_idx",
        fields: ["expense_date", "category"],
        where: {
          deleted_at: null,
        },
      },
    ],
  },
);

export default Expense;
