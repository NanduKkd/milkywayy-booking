import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

const PromotionRedemption = sequelize.define(
  "PromotionRedemption",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    promotionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "promotion_id",
      references: {
        model: "promotions",
        key: "id",
      },
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
    transactionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "transaction_id",
      references: {
        model: "transactions",
        key: "id",
      },
    },
    bookingId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "booking_id",
      references: {
        model: "bookings",
        key: "id",
      },
    },
    eligibleSubtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: "eligible_subtotal",
    },
    benefitAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: "benefit_amount",
    },
    benefitTypeSnapshot: {
      type: DataTypes.ENUM("FIXED", "PERCENTAGE"),
      allowNull: false,
      field: "benefit_type_snapshot",
    },
    triggerSnapshot: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      field: "trigger_snapshot",
    },
    state: {
      type: DataTypes.ENUM("RESERVED", "APPLIED", "RELEASED", "EXPIRED"),
      allowNull: false,
      defaultValue: "RESERVED",
    },
    reservedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "reserved_at",
    },
    reservationExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "reservation_expires_at",
    },
    appliedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "applied_at",
    },
    releasedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "released_at",
    },
    releaseReason: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "release_reason",
    },
  },
  {
    tableName: "promotion_redemptions",
    timestamps: true,
    underscored: true,
  },
);

export default PromotionRedemption;
