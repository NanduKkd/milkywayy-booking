import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

const BookingDeliveryFile = sequelize.define(
  "BookingDeliveryFile",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    bookingId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "booking_id",
      references: {
        model: "bookings",
        key: "id",
      },
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    label: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    deliveryMode: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "download",
      field: "delivery_mode",
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "UNDER_REVIEW",
    },
    revisionCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "revision_count",
    },
    reviewDeadlineAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "review_deadline_at",
    },
    currentVersionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "current_version_id",
      references: {
        model: "booking_delivery_file_versions",
        key: "id",
      },
    },
    acceptedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "accepted_at",
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "deleted_at",
    },
  },
  {
    tableName: "booking_delivery_files",
    timestamps: true,
    underscored: true,
    paranoid: true,
    indexes: [
      { fields: ["booking_id", "status"] },
      { fields: ["review_deadline_at"] },
    ],
  },
);

export default BookingDeliveryFile;
