import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

const OAuthRateLimit = sequelize.define(
  "OAuthRateLimit",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    bucketType: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "bucket_type",
    },
    keyHash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      field: "key_hash",
    },
    windowStart: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "window_start",
    },
    requestCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "request_count",
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "expires_at",
    },
  },
  {
    tableName: "oauth_rate_limits",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        name: "oauth_rate_limits_bucket_key_window_unique",
        fields: ["bucket_type", "key_hash", "window_start"],
      },
      {
        name: "oauth_rate_limits_expires_at_idx",
        fields: ["expires_at"],
      },
    ],
  },
);

export default OAuthRateLimit;
