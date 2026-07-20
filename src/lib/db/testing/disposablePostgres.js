const { randomUUID } = require("node:crypto");
const { Client } = require("pg");
const { Sequelize } = require("sequelize");

const RESERVED_DATABASE_PREFIX = "mw_codex_test_";
const ADMIN_APPLICATION_NAME = "mw_codex_disposable_admin";
const DATABASE_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;
const TEST_ADMIN_OPT_IN_VALUE = "CREATE_DROP_RESERVED_DATABASES";
const DEFAULT_TIMEOUTS = Object.freeze({
  adminAttempts: 2,
  adminEndMs: 1000,
  adminOperationMs: 3000,
  connectionCloseMs: 1000,
  retryDelayMs: 25,
  setupMs: 8000,
});

function requireEnvironmentValue(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `Disposable PostgreSQL tests require the dedicated ${name} setting`,
    );
  }

  return value;
}

function getTestAdminConfig() {
  if (process.env.NODE_ENV !== "test") {
    throw new Error(
      "Disposable PostgreSQL databases are restricted to NODE_ENV=test",
    );
  }

  if (process.env.MW_TEST_POSTGRES_ADMIN_OPT_IN !== TEST_ADMIN_OPT_IN_VALUE) {
    throw new Error(
      "Disposable PostgreSQL database DDL requires explicit test-admin opt-in",
    );
  }

  const database = requireEnvironmentValue("MW_TEST_POSTGRES_ADMIN_DATABASE");
  const host = requireEnvironmentValue("MW_TEST_POSTGRES_ADMIN_HOST");
  const port = Number(requireEnvironmentValue("MW_TEST_POSTGRES_ADMIN_PORT"));
  const user = requireEnvironmentValue("MW_TEST_POSTGRES_ADMIN_USER");

  if (database !== "postgres") {
    throw new Error(
      "MW_TEST_POSTGRES_ADMIN_DATABASE must name the postgres maintenance database",
    );
  }

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("MW_TEST_POSTGRES_ADMIN_PORT must be a valid TCP port");
  }

  return {
    host,
    port,
    user,
    password: process.env.MW_TEST_POSTGRES_ADMIN_PASSWORD || undefined,
    database,
  };
}

function normalizeTimeout(value, fallback, label, maximum = 10000) {
  const normalized = value == null ? fallback : Number(value);

  if (!Number.isInteger(normalized) || normalized < 1 || normalized > maximum) {
    throw new Error(`${label} must be an integer from 1 to ${maximum}`);
  }

  return normalized;
}

function normalizeTimeouts(overrides = {}) {
  return {
    adminAttempts: normalizeTimeout(
      overrides.adminAttempts,
      DEFAULT_TIMEOUTS.adminAttempts,
      "Admin attempts",
      5,
    ),
    adminEndMs: normalizeTimeout(
      overrides.adminEndMs,
      DEFAULT_TIMEOUTS.adminEndMs,
      "Admin end timeout",
    ),
    adminOperationMs: normalizeTimeout(
      overrides.adminOperationMs,
      DEFAULT_TIMEOUTS.adminOperationMs,
      "Admin operation timeout",
    ),
    connectionCloseMs: normalizeTimeout(
      overrides.connectionCloseMs,
      DEFAULT_TIMEOUTS.connectionCloseMs,
      "Connection close timeout",
    ),
    retryDelayMs: normalizeTimeout(
      overrides.retryDelayMs,
      DEFAULT_TIMEOUTS.retryDelayMs,
      "Retry delay",
      1000,
    ),
    setupMs: normalizeTimeout(
      overrides.setupMs,
      DEFAULT_TIMEOUTS.setupMs,
      "Setup timeout",
      30000,
    ),
  };
}

function buildDatabaseName(label = "database") {
  const normalizedLabel = String(label)
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
  const safeLabel = normalizedLabel || "database";
  const suffix = `${Date.now()}_${process.pid}_${randomUUID().slice(0, 8)}`;
  const databaseName =
    `${RESERVED_DATABASE_PREFIX}${safeLabel}_${suffix}`.slice(0, 63);

  assertReservedDatabaseName(databaseName, "database-name generation");
  return databaseName;
}

function assertReservedDatabaseName(databaseName, operation) {
  if (
    typeof databaseName !== "string" ||
    !databaseName.startsWith(RESERVED_DATABASE_PREFIX) ||
    databaseName.length <= RESERVED_DATABASE_PREFIX.length ||
    databaseName.length > 63 ||
    !DATABASE_NAME_PATTERN.test(databaseName)
  ) {
    throw new Error(
      `Refusing ${operation}: database name is outside the reserved test prefix`,
    );
  }
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function withTimeout(operation, milliseconds, label) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`${label} exceeded ${milliseconds}ms`)),
      milliseconds,
    );
  });

  try {
    return await Promise.race([Promise.resolve().then(operation), timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}

function forceDestroyClient(client) {
  client?.once?.("error", () => {});
  client?.connection?.stream?.destroy();
}

async function createDisposablePostgresDatabase({
  databaseLabel = "database",
  setup = null,
  testHooks = {},
  timeouts: timeoutOverrides = {},
} = {}) {
  const adminConfig = getTestAdminConfig();
  const timeouts = normalizeTimeouts(timeoutOverrides);
  const databaseName = buildDatabaseName(databaseLabel);
  const managedConnections = new Set();
  let acceptingConnections = true;
  let cleanupComplete = false;
  let cleanupPromise = null;
  let databaseCreated = false;

  function createAdminClient() {
    return new Client({
      ...adminConfig,
      application_name: ADMIN_APPLICATION_NAME,
      connectionTimeoutMillis: timeouts.adminOperationMs,
      query_timeout: timeouts.adminOperationMs,
    });
  }

  async function runAdminOperation(
    adminClient,
    operationName,
    operation,
    { attempts = timeouts.adminAttempts } = {},
  ) {
    let lastError;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await withTimeout(
          async () => {
            if (typeof testHooks.beforeAdminOperation === "function") {
              await testHooks.beforeAdminOperation({
                adminClient,
                attempt,
                operationName,
              });
            }
            return operation();
          },
          timeouts.adminOperationMs,
          `Disposable PostgreSQL ${operationName}`,
        );
      } catch (error) {
        lastError = error;
        if (attempt < attempts) {
          await wait(timeouts.retryDelayMs);
        }
      }
    }

    throw new Error(
      `Disposable PostgreSQL ${operationName} failed after ${attempts} attempt(s)`,
      { cause: lastError },
    );
  }

  async function closeManagedConnections() {
    const failures = [];

    await Promise.all(
      [...managedConnections].reverse().map(async (connection) => {
        try {
          await withTimeout(
            () => connection.close(),
            timeouts.connectionCloseMs,
            "Disposable PostgreSQL registered connection close",
          );
          managedConnections.delete(connection);
        } catch (error) {
          failures.push(error);
        }
      }),
    );

    return failures;
  }

  async function endAdminClient(adminClient, purpose) {
    try {
      await withTimeout(
        () =>
          typeof testHooks.endAdminClient === "function"
            ? testHooks.endAdminClient({ adminClient, purpose })
            : adminClient.end(),
        timeouts.adminEndMs,
        "Disposable PostgreSQL admin connection end",
      );
    } catch (_error) {
      forceDestroyClient(adminClient);
    }
  }

  async function withAdminClient(purpose, callback) {
    const adminClient = createAdminClient();

    try {
      try {
        await withTimeout(
          () => adminClient.connect(),
          timeouts.adminOperationMs,
          `Disposable PostgreSQL ${purpose} admin connection`,
        );
      } catch (connectionError) {
        forceDestroyClient(adminClient);
        throw connectionError;
      }

      await runAdminOperation(
        adminClient,
        "admin timeout configuration",
        () =>
          adminClient.query(
            `SET statement_timeout = '${timeouts.adminOperationMs}ms'`,
          ),
        { attempts: 1 },
      );
      await runAdminOperation(
        adminClient,
        "admin lock-timeout configuration",
        () => adminClient.query("SET lock_timeout = '3s'"),
        { attempts: 1 },
      );

      if (typeof testHooks.onAdminClientConnected === "function") {
        const processIdResult = await withTimeout(
          () => adminClient.query("SELECT pg_backend_pid() AS process_id"),
          timeouts.adminOperationMs,
          "Disposable PostgreSQL admin backend identity",
        );
        await withTimeout(
          () =>
            testHooks.onAdminClientConnected({
              processId: Number(processIdResult.rows[0].process_id),
              purpose,
            }),
          timeouts.adminOperationMs,
          "Disposable PostgreSQL admin connection hook",
        );
      }

      return await callback(adminClient);
    } finally {
      await endAdminClient(adminClient, purpose);
    }
  }

  async function removeDatabase() {
    if (!databaseCreated) return;

    await withAdminClient("cleanup", async (adminClient) => {
      await runAdminOperation(
        adminClient,
        "connection termination",
        async () => {
          assertReservedDatabaseName(databaseName, "connection termination");
          return adminClient.query(
            `
              SELECT pg_terminate_backend(pid)
              FROM pg_stat_activity
              WHERE datname = $1 AND pid <> pg_backend_pid()
            `,
            [databaseName],
          );
        },
      );

      await runAdminOperation(adminClient, "database drop", async () => {
        assertReservedDatabaseName(databaseName, "database drop");
        return adminClient.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
      });

      databaseCreated = false;
    });
  }

  async function performCleanup() {
    acceptingConnections = false;
    const connectionCloseFailures = await closeManagedConnections();
    managedConnections.clear();

    await removeDatabase();
    cleanupComplete = true;

    return { connectionCloseFailures };
  }

  function close() {
    if (cleanupComplete) {
      return Promise.resolve({ connectionCloseFailures: [] });
    }

    if (!cleanupPromise) {
      cleanupPromise = performCleanup().finally(() => {
        cleanupPromise = null;
      });
    }

    return cleanupPromise;
  }

  try {
    await withAdminClient("provision", async (adminClient) => {
      try {
        await runAdminOperation(
          adminClient,
          "database creation",
          async () => {
            assertReservedDatabaseName(databaseName, "database creation");
            return adminClient.query(`CREATE DATABASE "${databaseName}"`);
          },
          { attempts: 1 },
        );
        databaseCreated = true;
      } catch (creationError) {
        try {
          const existenceResult = await runAdminOperation(
            adminClient,
            "database creation verification",
            () =>
              adminClient.query(
                "SELECT 1 FROM pg_database WHERE datname = $1",
                [databaseName],
              ),
            { attempts: 1 },
          );
          databaseCreated = existenceResult.rowCount > 0;
        } catch (_verificationError) {
          databaseCreated = true;
        }
        throw creationError;
      }

      for (const [setting, value] of [
        ["statement_timeout", "5s"],
        ["lock_timeout", "3s"],
        ["idle_in_transaction_session_timeout", "5s"],
      ]) {
        await runAdminOperation(
          adminClient,
          `database ${setting} configuration`,
          async () => {
            assertReservedDatabaseName(
              databaseName,
              `database ${setting} configuration`,
            );
            return adminClient.query(
              `ALTER DATABASE "${databaseName}" SET ${setting} = '${value}'`,
            );
          },
          { attempts: 1 },
        );
      }
    });

    const sequelize = new Sequelize(
      databaseName,
      adminConfig.user,
      adminConfig.password,
      {
        host: adminConfig.host,
        port: adminConfig.port,
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
      applicationDatabaseEnvironment: {
        DB_HOST: adminConfig.host,
        DB_PORT: String(adminConfig.port),
        DB_USER: adminConfig.user,
        DB_PASSWORD: adminConfig.password,
        DB_NAME: databaseName,
      },
      databaseName,
      sequelize,
      queryInterface: sequelize.getQueryInterface(),
      registerConnection(connection) {
        if (!acceptingConnections || cleanupComplete) {
          throw new Error("Cannot register a connection after cleanup starts");
        }
        if (!connection || typeof connection.close !== "function") {
          throw new Error(
            "Registered disposable database connections require close()",
          );
        }
        managedConnections.add(connection);
        return connection;
      },
      close,
    };

    if (setup) {
      await withTimeout(
        () => setup(disposableDatabase),
        timeouts.setupMs,
        "Disposable PostgreSQL setup",
      );
    }

    return disposableDatabase;
  } catch (error) {
    let cleanupError = null;

    for (let attempt = 1; attempt <= 2 && !cleanupComplete; attempt += 1) {
      try {
        await close();
      } catch (currentCleanupError) {
        cleanupError = currentCleanupError;
      }
    }

    if (cleanupError && !cleanupComplete) {
      error.cleanupError = cleanupError;
      error.databaseName = databaseName;
      error.retryCleanup = close;
    }
    throw error;
  }
}

module.exports = {
  ADMIN_APPLICATION_NAME,
  RESERVED_DATABASE_PREFIX,
  TEST_ADMIN_OPT_IN_VALUE,
  assertReservedDatabaseName,
  createDisposablePostgresDatabase,
};
