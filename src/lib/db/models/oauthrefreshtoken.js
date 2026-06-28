import { DataTypes, Op } from "sequelize";
import { sequelize } from "../db.js";
import { hideSensitiveFields } from "./oauthmodelutils.js";

const OAuthRefreshToken = sequelize.define(
  "OAuthRefreshToken",
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
    familyId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "family_id",
    },
    parentTokenId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "parent_token_id",
      references: {
        model: "oauth_refresh_tokens",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "expires_at",
    },
    consumedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "consumed_at",
    },
    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "revoked_at",
    },
  },
  {
    tableName: "oauth_refresh_tokens",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        name: "oauth_refresh_tokens_token_hash_unique",
        fields: ["token_hash"],
      },
      {
        name: "oauth_refresh_tokens_family_id_idx",
        fields: ["family_id"],
      },
      {
        name: "oauth_refresh_tokens_parent_token_id_idx",
        fields: ["parent_token_id"],
      },
      {
        name: "oauth_refresh_tokens_client_user_idx",
        fields: ["client_id", "user_id"],
      },
      {
        name: "oauth_refresh_tokens_expires_at_idx",
        fields: ["expires_at"],
      },
      {
        name: "oauth_refresh_tokens_consumed_at_idx",
        fields: ["consumed_at"],
      },
      {
        name: "oauth_refresh_tokens_revoked_at_idx",
        fields: ["revoked_at"],
      },
    ],
    scopes: {
      active(asOf = new Date()) {
        return {
          where: {
            expiresAt: { [Op.gt]: asOf },
            consumedAt: null,
            revokedAt: null,
          },
        };
      },
    },
  },
);

hideSensitiveFields(OAuthRefreshToken, ["tokenHash"]);

export default OAuthRefreshToken;
