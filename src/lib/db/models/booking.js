import { sequelize } from "../db.js";
import { DataTypes } from "sequelize";
import User from "./user.js";
import Transaction from "./transaction.js";

const Booking = sequelize.define(
  "Booking",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "DRAFT",
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
    shootDetails: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: "shoot_details",
    },
    propertyDetails: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: "property_details",
    },
    contactDetails: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: "contact_details",
    },
    date: {
      type: DataTypes.DATEONLY, // For "yyyy-mm-dd" format
      allowNull: true,
    },
    slot: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    transactionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "transaction_id",
      references: {
        model: "transactions",
        key: "id",
      },
    },
    rescheduledAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "rescheduled_at",
    },
    rescheduleCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "reschedule_count",
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "cancelled_at",
    },
    refundedAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: "refunded_amount",
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "completed_at",
    },
    filesUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "files_url",
    },
    paidAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: "paid_amount",
    },
  },
  {
    tableName: "bookings",
    timestamps: true,
    underscored: true,
  },
);

export default Booking;
