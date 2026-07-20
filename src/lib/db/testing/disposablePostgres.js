const { randomUUID } = require("node:crypto");
const { Client } = require("pg");
const { Sequelize } = require("sequelize");

const DATABASE_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;
const DEFAULT_DATABASE_PREFIX = "mw_test";

function getAdminConfig() {
  return {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
    user: process.env.DB_USER || undefined,
    password: process.env.DB_PASSWORD || undefined,
    database: "postgres",
    connectionTimeoutMillis: 5000,
    query_timeout: 5000,
  };
}

function buildDatabaseName(prefix = DEFAULT_DATABASE_PREFIX) {
  const normalizedPrefix = String(prefix)
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/^[^a-z]+/, "")
    .slice(0, 32);
  const safePrefix = normalizedPrefix || DEFAULT_DATABASE_PREFIX;
  const suffix = `${Date.now()}_${process.pid}_${randomUUID().slice(0, 8)}`;
  const databaseName = `${safePrefix}_${suffix}`.slice(0, 63);

  if (!DATABASE_NAME_PATTERN.test(databaseName)) {
    throw new Error(
      "Could not build a safe disposable PostgreSQL database name",
    );
  }

  return databaseName;
}

async function createDisposablePostgresDatabase({
  databasePrefix = DEFAULT_DATABASE_PREFIX,
  setup = null,
} = {}) {
  const databaseName = buildDatabaseName(databasePrefix);
  const adminClient = new Client(getAdminConfig());
  const managedConnections = new Set();
  let databaseCreated = false;
  let adminConnected = false;
  let closed = false;

  async function close() {
    if (closed) return;
    closed = true;

    let cleanupError = null;

    for (const connection of [...managedConnections].reverse()) {
      try {
        await connection.close();
      } catch (error) {
        cleanupError ||= error;
      }
    }
    managedConnections.clear();

    if (adminConnected && databaseCreated) {
      try {
        await adminClient.query(
          `
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = $1 AND pid <> pg_backend_pid()
          `,
          [databaseName],
        );
        await adminClient.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
        databaseCreated = false;
      } catch (error) {
        cleanupError ||= error;
      }
    }

    if (adminConnected) {
      try {
        await adminClient.end();
        adminConnected = false;
      } catch (error) {
        cleanupError ||= error;
      }
    }

    if (cleanupError) throw cleanupError;
  }

  try {
    await adminClient.connect();
    adminConnected = true;
    await adminClient.query(`CREATE DATABASE "${databaseName}"`);
    databaseCreated = true;
    await adminClient.query(
      `ALTER DATABASE "${databaseName}" SET statement_timeout = '5s'`,
    );
    await adminClient.query(
      `ALTER DATABASE "${databaseName}" SET lock_timeout = '3s'`,
    );
    await adminClient.query(
      `ALTER DATABASE "${databaseName}" SET idle_in_transaction_session_timeout = '5s'`,
    );

    const sequelize = new Sequelize(
      databaseName,
      process.env.DB_USER || undefined,
      process.env.DB_PASSWORD || undefined,
      {
        host: process.env.DB_HOST || "localhost",
        port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
        dialect: "postgres",
        logging: false,
        pool: {
          max: 5,
          min: 0,
          acquire: 5000,
          idle: 1000,
          evict: 1000,
        },
        dialectOptions: {
          options:
            "-c statement_timeout=5000 -c lock_timeout=3000 " +
            "-c idle_in_transaction_session_timeout=5000",
        },
      },
    );
    managedConnections.add(sequelize);
    await sequelize.authenticate();

    const disposableDatabase = {
      databaseName,
      sequelize,
      queryInterface: sequelize.getQueryInterface(),
      registerConnection(connection) {
        if (closed) {
          throw new Error("Cannot register a connection after cleanup");
        }
        managedConnections.add(connection);
        return connection;
      },
      close,
    };

    if (setup) {
      await setup(disposableDatabase);
    }

    return disposableDatabase;
  } catch (error) {
    try {
      await close();
    } catch (cleanupError) {
      error.cleanupError = cleanupError;
    }
    throw error;
  }
}

module.exports = {
  createDisposablePostgresDatabase,
};
