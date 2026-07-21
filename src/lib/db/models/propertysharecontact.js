import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

const PropertyShareContact = sequelize.define(
  "PropertyShareContact",
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
    sharePropertyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "share_property_id",
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING(16),
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "expires_at",
    },
  },
  {
    tableName: "property_share_contacts",
    timestamps: true,
    underscored: true,
  },
);

export default PropertyShareContact;
