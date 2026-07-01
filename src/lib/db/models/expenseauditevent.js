import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

const ExpenseAuditEvent = sequelize.define(
  "ExpenseAuditEvent",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    expenseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "expense_id",
      references: {
        model: "expenses",
        key: "id",
      },
    },
    actorUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "actor_user_id",
      references: {
        model: "users",
        key: "id",
      },
    },
    action: {
      type: DataTypes.ENUM("CREATED", "UPDATED", "DELETED"),
      allowNull: false,
    },
    beforeState: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: "before_state",
    },
    afterState: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: "after_state",
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
  },
  {
    tableName: "expense_audit_events",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: "expense_audit_events_expense_id_idx",
        fields: ["expense_id"],
      },
      {
        name: "expense_audit_events_actor_action_created_at_idx",
        fields: ["actor_user_id", "action", "created_at"],
      },
    ],
  },
);

export default ExpenseAuditEvent;
