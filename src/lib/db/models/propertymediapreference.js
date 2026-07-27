import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

const PropertyMediaPreference = sequelize.define(
  "PropertyMediaPreference",
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
    bookingId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "booking_id",
    },
    deliveryFileId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "delivery_file_id",
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    visible: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    isCover: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_cover",
    },
  },
  {
    tableName: "property_media_preferences",
    timestamps: true,
    underscored: true,
  },
);

export default PropertyMediaPreference;
