import { sequelize } from "../db.js";
import { DataTypes } from "sequelize";
import User from "./user.js";

const WalletTransaction = sequelize.define(
  "WalletTransaction",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "user_id",
      references: {
        model: "users",
        key: "id",
      },
    },
    creditExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "credit_expires_at",
    },
    creditsAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "credits_at",
    },
  },
  {
    tableName: "wallet_transactions",
    timestamps: true,
    underscored: true,
  },
);

export default WalletTransaction;
