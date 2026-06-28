import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

const OAuthConsent = sequelize.define(
  "OAuthConsent",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "client_id",
      references: {
        model: "oauth_clients",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "user_id",
      references: {
        model: "users",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    scopes: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    grantedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "granted_at",
    },
    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "revoked_at",
    },
  },
  {
    tableName: "oauth_consents",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        name: "oauth_consents_client_user_active_unique",
        fields: ["client_id", "user_id"],
        where: {
          revoked_at: null,
        },
      },
      {
        name: "oauth_consents_revoked_at_idx",
        fields: ["revoked_at"],
      },
    ],
  },
);

export default OAuthConsent;
