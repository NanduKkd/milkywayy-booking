import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

const PropertyShareProperty = sequelize.define(
  "PropertyShareProperty",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    shareLinkId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "share_link_id",
    },
    bookingId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "booking_id",
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "property_share_properties",
    timestamps: true,
    underscored: true,
  },
);

export default PropertyShareProperty;
