import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

const PropertyShareFile = sequelize.define(
  "PropertyShareFile",
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
  },
  {
    tableName: "property_share_files",
    timestamps: true,
    underscored: true,
  },
);

export default PropertyShareFile;
