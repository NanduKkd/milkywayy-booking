import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

const PropertySavedContact = sequelize.define(
  "PropertySavedContact",
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
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    normalizedPhone: {
      type: DataTypes.STRING(16),
      allowNull: false,
      field: "normalized_phone",
    },
  },
  {
    tableName: "property_saved_contacts",
    timestamps: true,
    underscored: true,
  },
);

export default PropertySavedContact;
