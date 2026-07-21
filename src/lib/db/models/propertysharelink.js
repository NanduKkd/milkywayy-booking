import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

const PropertyShareLink = sequelize.define(
  "PropertyShareLink",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    ownerUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "owner_user_id",
    },
    kind: {
      type: DataTypes.ENUM("SINGLE_PROPERTY", "MASTER"),
      allowNull: false,
    },
    singleBookingId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "single_booking_id",
    },
    tokenDigest: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
      field: "token_digest",
    },
    credentialVersion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: "credential_version",
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "revoked_at",
    },
    totalViews: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
      field: "total_views",
    },
    lastViewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "last_viewed_at",
    },
  },
  {
    tableName: "property_share_links",
    timestamps: true,
    underscored: true,
  },
);

export default PropertyShareLink;
