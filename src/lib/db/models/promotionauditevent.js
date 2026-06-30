import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

const PromotionAuditEvent = sequelize.define(
  "PromotionAuditEvent",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    promotionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "promotion_id",
      references: {
        model: "promotions",
        key: "id",
      },
    },
    promotionAssignmentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "promotion_assignment_id",
      references: {
        model: "promotion_assignments",
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
      type: DataTypes.ENUM(
        "CREATED",
        "UPDATED",
        "ACTIVATED",
        "PAUSED",
        "DEACTIVATED",
        "ASSIGNED",
        "UNASSIGNED",
        "MIGRATED",
      ),
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
    tableName: "promotion_audit_events",
    timestamps: true,
    underscored: true,
  },
);

export default PromotionAuditEvent;
