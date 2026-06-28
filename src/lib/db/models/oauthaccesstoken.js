import { DataTypes, Op } from "sequelize";
import { sequelize } from "../db.js";
import { hideSensitiveFields } from "./oauthmodelutils.js";

const OAuthAccessToken = sequelize.define(
  "OAuthAccessToken",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    tokenHash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      field: "token_hash",
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
    refreshFamilyId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "refresh_family_id",
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "expires_at",
    },
    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "revoked_at",
    },
  },
  {
    tableName: "oauth_access_tokens",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        name: "oauth_access_tokens_token_hash_unique",
        fields: ["token_hash"],
      },
      {
        name: "oauth_access_tokens_client_user_idx",
        fields: ["client_id", "user_id"],
      },
      {
        name: "oauth_access_tokens_refresh_family_id_idx",
        fields: ["refresh_family_id"],
      },
      {
        name: "oauth_access_tokens_expires_at_idx",
        fields: ["expires_at"],
      },
      {
        name: "oauth_access_tokens_revoked_at_idx",
        fields: ["revoked_at"],
      },
    ],
    scopes: {
      active(asOf = new Date()) {
        return {
          where: {
            expiresAt: { [Op.gt]: asOf },
            revokedAt: null,
          },
        };
      },
    },
  },
);

hideSensitiveFields(OAuthAccessToken, ["tokenHash"]);

export default OAuthAccessToken;
