/** @type {import('sequelize-cli').Migration} */

const buildTimestampColumns = (Sequelize) => ({
  created_at: {
    type: Sequelize.DATE,
    allowNull: false,
  },
  updated_at: {
    type: Sequelize.DATE,
    allowNull: false,
  },
});

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("oauth_clients", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      client_id: {
        type: Sequelize.STRING(128),
        allowNull: false,
      },
      client_secret_hash: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      redirect_uris: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      allowed_scopes: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      token_endpoint_auth_methods: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      is_enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      ...buildTimestampColumns(Sequelize),
    });

    await queryInterface.addIndex("oauth_clients", ["client_id"], {
      unique: true,
      name: "oauth_clients_client_id_unique",
    });

    await queryInterface.addIndex("oauth_clients", ["is_enabled"], {
      name: "oauth_clients_is_enabled_idx",
    });

    await queryInterface.createTable("oauth_authorization_codes", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      code_hash: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      client_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "oauth_clients", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      redirect_uri: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      scopes: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      code_challenge: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      code_challenge_method: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      consumed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      ...buildTimestampColumns(Sequelize),
    });

    await queryInterface.addIndex("oauth_authorization_codes", ["code_hash"], {
      unique: true,
      name: "oauth_authorization_codes_code_hash_unique",
    });

    await queryInterface.addIndex(
      "oauth_authorization_codes",
      ["client_id", "user_id"],
      {
        name: "oauth_authorization_codes_client_user_idx",
      },
    );

    await queryInterface.addIndex("oauth_authorization_codes", ["expires_at"], {
      name: "oauth_authorization_codes_expires_at_idx",
    });

    await queryInterface.addIndex(
      "oauth_authorization_codes",
      ["consumed_at"],
      {
        name: "oauth_authorization_codes_consumed_at_idx",
      },
    );

    await queryInterface.createTable("oauth_access_tokens", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      token_hash: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      client_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "oauth_clients", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      scopes: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      refresh_family_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      revoked_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      ...buildTimestampColumns(Sequelize),
    });

    await queryInterface.addIndex("oauth_access_tokens", ["token_hash"], {
      unique: true,
      name: "oauth_access_tokens_token_hash_unique",
    });

    await queryInterface.addIndex(
      "oauth_access_tokens",
      ["client_id", "user_id"],
      {
        name: "oauth_access_tokens_client_user_idx",
      },
    );

    await queryInterface.addIndex(
      "oauth_access_tokens",
      ["refresh_family_id"],
      {
        name: "oauth_access_tokens_refresh_family_id_idx",
      },
    );

    await queryInterface.addIndex("oauth_access_tokens", ["expires_at"], {
      name: "oauth_access_tokens_expires_at_idx",
    });

    await queryInterface.addIndex("oauth_access_tokens", ["revoked_at"], {
      name: "oauth_access_tokens_revoked_at_idx",
    });

    await queryInterface.createTable("oauth_refresh_tokens", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      token_hash: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      client_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "oauth_clients", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      scopes: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      family_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      parent_token_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "oauth_refresh_tokens", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      consumed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      revoked_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      ...buildTimestampColumns(Sequelize),
    });

    await queryInterface.addIndex("oauth_refresh_tokens", ["token_hash"], {
      unique: true,
      name: "oauth_refresh_tokens_token_hash_unique",
    });

    await queryInterface.addIndex("oauth_refresh_tokens", ["family_id"], {
      name: "oauth_refresh_tokens_family_id_idx",
    });

    await queryInterface.addIndex("oauth_refresh_tokens", ["parent_token_id"], {
      name: "oauth_refresh_tokens_parent_token_id_idx",
    });

    await queryInterface.addIndex(
      "oauth_refresh_tokens",
      ["client_id", "user_id"],
      {
        name: "oauth_refresh_tokens_client_user_idx",
      },
    );

    await queryInterface.addIndex("oauth_refresh_tokens", ["expires_at"], {
      name: "oauth_refresh_tokens_expires_at_idx",
    });

    await queryInterface.addIndex("oauth_refresh_tokens", ["consumed_at"], {
      name: "oauth_refresh_tokens_consumed_at_idx",
    });

    await queryInterface.addIndex("oauth_refresh_tokens", ["revoked_at"], {
      name: "oauth_refresh_tokens_revoked_at_idx",
    });

    await queryInterface.createTable("oauth_consents", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      client_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "oauth_clients", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      scopes: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      granted_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      revoked_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      ...buildTimestampColumns(Sequelize),
    });

    await queryInterface.addIndex("oauth_consents", ["client_id", "user_id"], {
      unique: true,
      where: { revoked_at: null },
      name: "oauth_consents_active_client_user_unique",
    });

    await queryInterface.addIndex("oauth_consents", ["revoked_at"], {
      name: "oauth_consents_revoked_at_idx",
    });

    await queryInterface.createTable("oauth_audit_events", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      correlation_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      event_type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      client_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "oauth_clients", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      outcome: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      reason_code: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex("oauth_audit_events", ["correlation_id"], {
      name: "oauth_audit_events_correlation_id_idx",
    });

    await queryInterface.addIndex("oauth_audit_events", ["expires_at"], {
      name: "oauth_audit_events_expires_at_idx",
    });

    await queryInterface.addIndex(
      "oauth_audit_events",
      ["event_type", "created_at"],
      {
        name: "oauth_audit_events_event_type_created_at_idx",
      },
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable("oauth_audit_events");
    await queryInterface.dropTable("oauth_consents");
    await queryInterface.dropTable("oauth_refresh_tokens");
    await queryInterface.dropTable("oauth_access_tokens");
    await queryInterface.dropTable("oauth_authorization_codes");
    await queryInterface.dropTable("oauth_clients");
  },
};
