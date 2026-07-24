import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

const PropertyShareMedia = sequelize.define(
  "PropertyShareMedia",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    sharePropertyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "share_property_id",
    },
    deliveryFileId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "delivery_file_id",
    },
    deliveryFileVersionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "delivery_file_version_id",
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "property_share_media",
    timestamps: true,
    underscored: true,
  },
);

export default PropertyShareMedia;
