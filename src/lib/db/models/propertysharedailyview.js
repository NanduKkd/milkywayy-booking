import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

const PropertyShareDailyView = sequelize.define(
  "PropertyShareDailyView",
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
    viewDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "view_date",
    },
    requestViews: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
      field: "request_views",
    },
  },
  {
    tableName: "property_share_daily_views",
    timestamps: true,
    underscored: true,
  },
);

export default PropertyShareDailyView;
