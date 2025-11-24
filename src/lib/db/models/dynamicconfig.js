import { sequelize } from "../db.js";
import { DataTypes } from "sequelize";

const DynamicConfig = sequelize.define(
  "DynamicConfig",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    key: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    value: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
  },
  {
    tableName: "dynamic_configs",
    timestamps: true,
  },
);

export default DynamicConfig;
