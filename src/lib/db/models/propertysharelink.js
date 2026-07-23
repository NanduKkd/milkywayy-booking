import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

const PropertyShareLink = sequelize.define(
  "PropertyShareLink",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    ownerUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "owner_user_id",
    },
    kind: {
      type: DataTypes.ENUM("SINGLE_PROPERTY", "MASTER"),
      allowNull: false,
    },
    singleBookingId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "single_booking_id",
    },
    publicId: {
      type: DataTypes.STRING(43),
      allowNull: false,
      unique: true,
      field: "public_id",
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    totalViews: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
      field: "total_views",
    },
  },
  {
    tableName: "property_share_links",
    timestamps: true,
    underscored: true,
  },
);

export default PropertyShareLink;
