import { DataTypes } from "sequelize";
import { OUR_WORK_TYPES } from "../../config/app.config.js";
import { sequelize } from "../db.js";

const OurWork = sequelize.define(
  "OurWork",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    subtitle: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM,
      values: Object.values(OUR_WORK_TYPES),
      allowNull: false,
    },
    mediaContent: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: "media_content",
      get() {
        const rawValue = this.getDataValue("mediaContent");
        if (!rawValue) return null;
        try {
          return JSON.parse(rawValue);
        } catch (e) {
          return rawValue;
        }
      },
      set(value) {
        if (value && typeof value === "object") {
          this.setDataValue("mediaContent", JSON.stringify(value));
        } else {
          this.setDataValue("mediaContent", value);
        }
      },
    },
    thumbnail: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    isVisible: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_visible",
    },
  },
  {
    tableName: "our_works",
    timestamps: true,
    underscored: true,
  },
);

export default OurWork;
