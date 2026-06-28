import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

const OAuthAuditEvent = sequelize.define(
  "OAuthAuditEvent",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    correlationId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "correlation_id",
    },
    eventType: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "event_type",
    },
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "client_id",
      references: {
        model: "oauth_clients",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "user_id",
      references: {
        model: "users",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    outcome: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    reasonCode: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "reason_code",
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "created_at",
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "expires_at",
    },
  },
  {
    tableName: "oauth_audit_events",
    timestamps: false,
    indexes: [
      {
        name: "oauth_audit_events_correlation_id_idx",
        fields: ["correlation_id"],
      },
      {
        name: "oauth_audit_events_expires_at_idx",
        fields: ["expires_at"],
      },
      {
        name: "oauth_audit_events_event_type_created_at_idx",
        fields: ["event_type", "created_at"],
      },
    ],
  },
);

export default OAuthAuditEvent;
