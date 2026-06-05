import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

const BookingRevision = sequelize.define(
  "BookingRevision",
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
    revisionNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "revision_number",
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
  },
  {
    tableName: "booking_revisions",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ["booking_id", "revision_number"],
      },
    ],
  },
);

export default BookingRevision;
