import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

const PromotionAssignment = sequelize.define(
  "PromotionAssignment",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    promotionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "promotion_id",
      references: {
        model: "promotions",
        key: "id",
      },
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "user_id",
      references: {
        model: "users",
        key: "id",
      },
    },
    assignedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "assigned_at",
    },
    unassignedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "unassigned_at",
    },
    assignedByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "assigned_by_user_id",
      references: {
        model: "users",
        key: "id",
      },
    },
    unassignedByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "unassigned_by_user_id",
      references: {
        model: "users",
        key: "id",
      },
    },
    notes: {
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
    tableName: "promotion_assignments",
    timestamps: true,
    underscored: true,
  },
);

export default PromotionAssignment;
