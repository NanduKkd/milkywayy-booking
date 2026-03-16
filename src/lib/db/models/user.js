import { DataTypes } from "sequelize";
import { USER_ROLES } from "../../config/app.config.js";
import { sequelize } from "../db.js";

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    fullName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    accountType: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "INDIVIDUAL",
      validate: {
        isIn: [["INDIVIDUAL", "COMPANY"]],
      },
    },
    companyName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    billingAddress: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    trn: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    role: {
      type: DataTypes.ENUM,
      values: Object.values(USER_ROLES),
      allowNull: false,
      defaultValue: USER_ROLES.SHOOT,
    },
    otp: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "users",
    timestamps: true,
  },
);

export default User;
