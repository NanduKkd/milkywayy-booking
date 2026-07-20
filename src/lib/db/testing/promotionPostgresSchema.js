const { DataTypes, Sequelize } = require("sequelize");

const promotionSchemaMigration = require("../migrations/20260701010000-create-promotions-core-schema.js");

const timestampColumns = {
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
  },
};

async function createRequiredPromotionBaseSchema(queryInterface) {
  await queryInterface.createTable("users", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    ...timestampColumns,
  });

  await queryInterface.createTable("transactions", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "users", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    refunded_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    stripe_payment_intent_id: { type: DataTypes.STRING, allowNull: true },
    coupon_id: { type: DataTypes.INTEGER, allowNull: true },
    coupon_deduction: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    wallet_deduction: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    bulk_deduction: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    paid_at: { type: DataTypes.DATE, allowNull: true },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "pending",
    },
    metadata: { type: DataTypes.JSONB, allowNull: true },
    invoice_url: { type: DataTypes.STRING, allowNull: true },
    invoice_number: { type: DataTypes.STRING, allowNull: true, unique: true },
    ...timestampColumns,
  });

  await queryInterface.createTable("bookings", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "users", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    transaction_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "transactions", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    ...timestampColumns,
  });
}

async function applyPromotionPostgresSchema({ queryInterface }) {
  await createRequiredPromotionBaseSchema(queryInterface);
  await promotionSchemaMigration.up(queryInterface, Sequelize);
}

module.exports = {
  applyPromotionPostgresSchema,
  createRequiredPromotionBaseSchema,
};
