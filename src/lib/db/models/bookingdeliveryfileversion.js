import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

const BookingDeliveryFileVersion = sequelize.define(
  "BookingDeliveryFileVersion",
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
    versionNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "version_number",
    },
    url: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    originalFilename: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "original_filename",
    },
    mimeType: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "mime_type",
    },
    sizeBytes: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: "size_bytes",
    },
    uploadedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "uploaded_at",
    },
    supersededAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "superseded_at",
    },
  },
  {
    tableName: "booking_delivery_file_versions",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ["delivery_file_id", "version_number"],
      },
    ],
  },
);

export default BookingDeliveryFileVersion;
