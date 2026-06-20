import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

const BookingDeliveryUpload = sequelize.define(
  "BookingDeliveryUpload",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    bookingId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "booking_id",
      references: { model: "bookings", key: "id" },
    },
    replacementFileId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "replacement_file_id",
      references: { model: "booking_delivery_files", key: "id" },
    },
    s3UploadId: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: "s3_upload_id",
    },
    objectKey: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
      field: "object_key",
    },
    originalFilename: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "original_filename",
    },
    mimeType: { type: DataTypes.STRING, allowNull: false, field: "mime_type" },
    sizeBytes: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: "size_bytes",
    },
    deliverableType: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "deliverable_type",
    },
    deliveryMode: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "direct_download",
      field: "delivery_mode",
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "INITIATED",
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "created_by",
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "completed_at",
    },
    resultJson: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: "result_json",
    },
    failureReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "failure_reason",
    },
  },
  {
    tableName: "booking_delivery_uploads",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["booking_id", "status"] },
      { fields: ["created_by", "status"] },
    ],
  },
);

export default BookingDeliveryUpload;
