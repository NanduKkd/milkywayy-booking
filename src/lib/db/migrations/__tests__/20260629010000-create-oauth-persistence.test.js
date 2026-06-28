/** @jest-environment node */

const { Client } = require("pg");
const { QueryTypes, Sequelize, DataTypes } = require("sequelize");

const migration = require("../20260629010000-create-oauth-persistence.js");

const adminConfig = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || undefined,
  database: "postgres",
};

const listIndexes = async (sequelize, tableName) =>
  sequelize.query(
    `
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = :tableName
      ORDER BY indexname
    `,
    {
      replacements: { tableName },
      type: QueryTypes.SELECT,
    },
  );

const listForeignKeys = async (sequelize, tableName) =>
  sequelize.query(
    `
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
       AND tc.table_schema = ccu.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = :tableName
      ORDER BY tc.constraint_name
    `,
    {
      replacements: { tableName },
      type: QueryTypes.SELECT,
    },
  );

describe("20260629010000-create-oauth-persistence migration", () => {
  let adminClient;
  let sequelize;
  let queryInterface;
  let databaseName;

  beforeAll(async () => {
    databaseName = `mw_oauth_migration_${Date.now()}_${process.pid}`;
    adminClient = new Client(adminConfig);
    await adminClient.connect();
    await adminClient.query(`CREATE DATABASE "${databaseName}"`);

    sequelize = new Sequelize(
      databaseName,
      process.env.DB_USER,
      process.env.DB_PASSWORD || undefined,
      {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        dialect: "postgres",
        logging: false,
      },
    );

    await sequelize.authenticate();
    queryInterface = sequelize.getQueryInterface();

    await queryInterface.createTable("users", {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
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
    });
  });

  afterAll(async () => {
    if (sequelize) {
      await sequelize.close();
    }

    if (adminClient) {
      await adminClient.query(
        `
          SELECT pg_terminate_backend(pid)
          FROM pg_stat_activity
          WHERE datname = $1 AND pid <> pg_backend_pid()
        `,
        [databaseName],
      );
      await adminClient.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
      await adminClient.end();
    }
  });

  it("creates the OAuth persistence schema and rolls back cleanly", async () => {
    await migration.up(queryInterface, Sequelize);

    const oauthClients = await queryInterface.describeTable("oauth_clients");
    expect(oauthClients.client_id).toBeDefined();
    expect(oauthClients.client_secret_hash).toBeDefined();
    expect(oauthClients.client_secret).toBeUndefined();

    const authorizationCodes = await queryInterface.describeTable(
      "oauth_authorization_codes",
    );
    expect(authorizationCodes.code_hash).toBeDefined();
    expect(authorizationCodes.client_id).toBeDefined();
    expect(authorizationCodes.user_id).toBeDefined();
    expect(authorizationCodes.expires_at).toBeDefined();

    const accessTokens = await queryInterface.describeTable(
      "oauth_access_tokens",
    );
    expect(accessTokens.token_hash).toBeDefined();
    expect(accessTokens.refresh_family_id).toBeDefined();
    expect(accessTokens.access_token).toBeUndefined();

    const refreshTokens = await queryInterface.describeTable(
      "oauth_refresh_tokens",
    );
    expect(refreshTokens.token_hash).toBeDefined();
    expect(refreshTokens.family_id).toBeDefined();
    expect(refreshTokens.parent_token_id).toBeDefined();
    expect(refreshTokens.refresh_token).toBeUndefined();

    const consents = await queryInterface.describeTable("oauth_consents");
    expect(consents.client_id).toBeDefined();
    expect(consents.user_id).toBeDefined();
    expect(consents.granted_at).toBeDefined();

    const auditEvents =
      await queryInterface.describeTable("oauth_audit_events");
    expect(auditEvents.correlation_id).toBeDefined();
    expect(auditEvents.metadata).toBeDefined();
    expect(auditEvents.expires_at).toBeDefined();

    const consentIndexes = await listIndexes(sequelize, "oauth_consents");
    expect(
      consentIndexes.some(
        ({ indexname, indexdef }) =>
          indexname === "oauth_consents_active_client_user_unique" &&
          indexdef.includes("WHERE (revoked_at IS NULL)"),
      ),
    ).toBe(true);

    const refreshTokenIndexes = await listIndexes(
      sequelize,
      "oauth_refresh_tokens",
    );
    expect(refreshTokenIndexes.map(({ indexname }) => indexname)).toEqual(
      expect.arrayContaining([
        "oauth_refresh_tokens_token_hash_unique",
        "oauth_refresh_tokens_family_id_idx",
        "oauth_refresh_tokens_parent_token_id_idx",
        "oauth_refresh_tokens_expires_at_idx",
        "oauth_refresh_tokens_consumed_at_idx",
        "oauth_refresh_tokens_revoked_at_idx",
      ]),
    );

    const authorizationCodeForeignKeys = await listForeignKeys(
      sequelize,
      "oauth_authorization_codes",
    );
    expect(authorizationCodeForeignKeys).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          column_name: "client_id",
          foreign_table_name: "oauth_clients",
          foreign_column_name: "id",
        }),
        expect.objectContaining({
          column_name: "user_id",
          foreign_table_name: "users",
          foreign_column_name: "id",
        }),
      ]),
    );

    const refreshTokenForeignKeys = await listForeignKeys(
      sequelize,
      "oauth_refresh_tokens",
    );
    expect(refreshTokenForeignKeys).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          column_name: "parent_token_id",
          foreign_table_name: "oauth_refresh_tokens",
          foreign_column_name: "id",
        }),
      ]),
    );

    await migration.down(queryInterface);

    const droppedTables = await sequelize.query(
      `
        SELECT to_regclass('public.oauth_clients') AS oauth_clients,
               to_regclass('public.oauth_authorization_codes') AS oauth_authorization_codes,
               to_regclass('public.oauth_access_tokens') AS oauth_access_tokens,
               to_regclass('public.oauth_refresh_tokens') AS oauth_refresh_tokens,
               to_regclass('public.oauth_consents') AS oauth_consents,
               to_regclass('public.oauth_audit_events') AS oauth_audit_events
      `,
      {
        type: QueryTypes.SELECT,
      },
    );

    expect(droppedTables[0]).toEqual({
      oauth_clients: null,
      oauth_authorization_codes: null,
      oauth_access_tokens: null,
      oauth_refresh_tokens: null,
      oauth_consents: null,
      oauth_audit_events: null,
    });
  });
});
