import { sequelize } from "../db.js";
import { DataTypes } from "sequelize";

const Coupon = sequelize.define(
  "Coupon",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    perUser: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "per_user",
    },
    minimumAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: "minimum_amount",
    },
    percentDiscount: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      field: "percent_discount",
    },
    maxDiscount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: "max_discount",
    },
    activatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "activated_at",
    },
    deactivatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "deactivated_at",
    },
    isActive: {
      type: DataTypes.VIRTUAL,
      get() {
        const now = new Date();
        const activatedAt = this.getDataValue("activatedAt");
        const deactivatedAt = this.getDataValue("deactivatedAt");
        return (
          activatedAt &&
          activatedAt < now &&
          (!deactivatedAt || deactivatedAt > now)
        );
      },
    },
  },
  {
    tableName: "coupons",
    timestamps: true,
    underscored: true,
  },
);

export default Coupon;
