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
      allowNull: false,
    },
    slot: {
      type: DataTypes.INTEGER,
      allowNull: false,
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
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "cancelled_at",
    },
    refundedAmount: {
      type: DataTypes.INTEGER,
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
      type: DataTypes.INTEGER,
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
