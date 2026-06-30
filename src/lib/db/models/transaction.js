import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

const Transaction = sequelize.define(
  "Transaction",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
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
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    refundedAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: "refunded_amount",
    },
    stripePaymentIntentId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "stripe_payment_intent_id",
    },
    couponId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "coupon_id",
      references: {
        model: "coupons",
        key: "id",
      },
    },
    couponDeduction: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: "coupon_deduction",
    },
    walletDeduction: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: "wallet_deduction",
    },
    bulkDeduction: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: "bulk_deduction",
    },
    promotionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "promotion_id",
      references: {
        model: "promotions",
        key: "id",
      },
    },
    promotionRedemptionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "promotion_redemption_id",
      references: {
        model: "promotion_redemptions",
        key: "id",
      },
    },
    promotionSnapshot: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: "promotion_snapshot",
    },
    paidAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "paid_at",
    },
    status: {
      type: DataTypes.ENUM,
      values: ["pending", "success", "failed"],
      allowNull: false,
      defaultValue: "pending",
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    invoiceUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "invoice_url",
    },
    invoiceNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      field: "invoice_number",
    },
  },
  {
    tableName: "transactions",
    timestamps: true,
    underscored: true,
  },
);

export default Transaction;
