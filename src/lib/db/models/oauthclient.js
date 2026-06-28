import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";
import { hideSensitiveFields } from "./oauthmodelutils.js";

const OAuthClient = sequelize.define(
  "OAuthClient",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    clientId: {
      type: DataTypes.STRING(128),
      allowNull: false,
      field: "client_id",
    },
    clientSecretHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "client_secret_hash",
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    redirectUris: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      field: "redirect_uris",
    },
    allowedScopes: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      field: "allowed_scopes",
    },
    tokenEndpointAuthMethods: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      field: "token_endpoint_auth_methods",
    },
    isEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_enabled",
    },
  },
  {
    tableName: "oauth_clients",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        name: "oauth_clients_client_id_unique",
        fields: ["client_id"],
      },
      {
        name: "oauth_clients_is_enabled_idx",
        fields: ["is_enabled"],
      },
    ],
  },
);

hideSensitiveFields(OAuthClient, ["clientSecretHash"]);

export default OAuthClient;
