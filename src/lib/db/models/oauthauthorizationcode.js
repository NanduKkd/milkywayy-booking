import { DataTypes, Op } from "sequelize";
import { sequelize } from "../db.js";
import { hideSensitiveFields } from "./oauthmodelutils.js";

const OAuthAuthorizationCode = sequelize.define(
  "OAuthAuthorizationCode",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    codeHash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      field: "code_hash",
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
    redirectUri: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: "redirect_uri",
    },
    scopes: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    codeChallenge: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "code_challenge",
    },
    codeChallengeMethod: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "code_challenge_method",
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
  },
  {
    tableName: "oauth_authorization_codes",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        name: "oauth_authorization_codes_code_hash_unique",
        fields: ["code_hash"],
      },
      {
        name: "oauth_authorization_codes_client_user_idx",
        fields: ["client_id", "user_id"],
      },
      {
        name: "oauth_authorization_codes_expires_at_idx",
        fields: ["expires_at"],
      },
      {
        name: "oauth_authorization_codes_consumed_at_idx",
        fields: ["consumed_at"],
      },
    ],
    scopes: {
      active(asOf = new Date()) {
        return {
          where: {
            expiresAt: { [Op.gt]: asOf },
            consumedAt: null,
          },
        };
      },
    },
  },
);

hideSensitiveFields(OAuthAuthorizationCode, ["codeHash"]);

export default OAuthAuthorizationCode;
