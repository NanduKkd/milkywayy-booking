import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

const BookingFileRevision = sequelize.define(
  "BookingFileRevision",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    deliveryFileId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "delivery_file_id",
      references: {
        model: "booking_delivery_files",
        key: "id",
      },
    },
    versionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "version_id",
      references: {
        model: "booking_delivery_file_versions",
        key: "id",
      },
    },
    requestNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "request_number",
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    requestedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "requested_at",
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "resolved_at",
    },
    replacementVersionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "replacement_version_id",
      references: {
        model: "booking_delivery_file_versions",
        key: "id",
      },
    },
  },
  {
    tableName: "booking_file_revisions",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["delivery_file_id", "resolved_at"] }],
  },
);

export default BookingFileRevision;
