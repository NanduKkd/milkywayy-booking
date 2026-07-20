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
    booking_code: { type: DataTypes.STRING, allowNull: true, unique: true },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "DRAFT",
    },
    workflow_status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "SHOOT_BOOKED",
    },
    shoot_details: { type: DataTypes.JSONB, allowNull: true },
    property_details: { type: DataTypes.JSONB, allowNull: true },
    contact_details: { type: DataTypes.JSONB, allowNull: true },
    date: { type: DataTypes.DATEONLY, allowNull: true },
    slot: { type: DataTypes.INTEGER, allowNull: true },
    start_time: { type: DataTypes.STRING, allowNull: true },
    duration: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    total: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    rescheduled_at: { type: DataTypes.DATE, allowNull: true },
    reschedule_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    cancelled_at: { type: DataTypes.DATE, allowNull: true },
    refunded_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    completed_at: { type: DataTypes.DATE, allowNull: true },
    shoot_completed_at: { type: DataTypes.DATE, allowNull: true },
    editing_started_at: { type: DataTypes.DATE, allowNull: true },
    files_uploaded_at: { type: DataTypes.DATE, allowNull: true },
    review_deadline_at: { type: DataTypes.DATE, allowNull: true },
    delivery_finished_at: { type: DataTypes.DATE, allowNull: true },
    delivery_notification_metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    revision_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    files_url: { type: DataTypes.TEXT, allowNull: true },
    paid_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
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
