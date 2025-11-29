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
      type: DataTypes.DECIMAL(10, 2),
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
    status: {
      type: DataTypes.ENUM,
      values: ["pending", "active", "expired", "used"],
      allowNull: false,
      defaultValue: "active",
    },
    transactionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "transaction_id",
      references: {
        model: "transactions",
        key: "id",
      },
    },
  },
  {
    tableName: "wallet_transactions",
    timestamps: true,
    underscored: true,
  },
);

export default WalletTransaction;
