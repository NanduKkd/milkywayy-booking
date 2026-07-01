import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

const CalendarEvent = sequelize.define(
  "CalendarEvent",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING(160),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    businessDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "business_date",
    },
    period: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    startTime: {
      type: DataTypes.STRING(16),
      allowNull: true,
      field: "start_time",
    },
    endTime: {
      type: DataTypes.STRING(16),
      allowNull: true,
      field: "end_time",
    },
    propertySummary: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: "property_summary",
    },
    contactSummary: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: "contact_summary",
    },
    consumesCapacity: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "consumes_capacity",
    },
    reservedCapacityUnits: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: false,
      defaultValue: 0,
      field: "reserved_capacity_units",
    },
    status: {
      type: DataTypes.ENUM("ACTIVE", "CANCELLED"),
      allowNull: false,
      defaultValue: "ACTIVE",
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
    cancelledByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "cancelled_by_user_id",
      references: {
        model: "users",
        key: "id",
      },
    },
    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "cancelled_at",
    },
    cancellationReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "cancellation_reason",
    },
  },
  {
    tableName: "calendar_events",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: "calendar_events_business_date_status_idx",
        fields: ["business_date", "status"],
      },
      {
        name: "calendar_events_created_by_user_id_business_date_idx",
        fields: ["created_by_user_id", "business_date"],
      },
    ],
  },
);

export default CalendarEvent;
