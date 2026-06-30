import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

const Promotion = sequelize.define(
  "Promotion",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    kind: {
      type: DataTypes.ENUM("GENERIC", "PERSONAL", "AUTOMATIC"),
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    adminDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "admin_description",
    },
    customerMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "customer_message",
    },
    benefitType: {
      type: DataTypes.ENUM("FIXED", "PERCENTAGE"),
      allowNull: false,
      field: "benefit_type",
    },
    benefitValue: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: "benefit_value",
    },
    benefitCap: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: "benefit_cap",
    },
    minimumSpend: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: "minimum_spend",
    },
    startsAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "starts_at",
    },
    endsAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "ends_at",
    },
    status: {
      type: DataTypes.ENUM("DRAFT", "ACTIVE", "PAUSED", "DEACTIVATED"),
      allowNull: false,
      defaultValue: "DRAFT",
    },
    systemFlag: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "system_flag",
    },
    priority: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    perUserLimit: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "per_user_limit",
    },
    totalLimit: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "total_limit",
    },
    triggerType: {
      type: DataTypes.ENUM(
        "NONE",
        "FIRST_PAID_BOOKING",
        "SECOND_PAID_BOOKING",
        "ANY_PAID_BOOKING",
        "DATE_RANGE",
      ),
      allowNull: false,
      defaultValue: "NONE",
      field: "trigger_type",
    },
    triggerConfig: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      field: "trigger_config",
    },
    legacySourceType: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "legacy_source_type",
    },
    legacySourceId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "legacy_source_id",
    },
    createdByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "created_by_user_id",
      references: {
        model: "users",
        key: "id",
      },
    },
    updatedByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "updated_by_user_id",
      references: {
        model: "users",
        key: "id",
      },
    },
  },
  {
    tableName: "promotions",
    timestamps: true,
    underscored: true,
  },
);

export default Promotion;
