/** @jest-environment node */

const { Client } = require("pg");

const {
  ADMIN_APPLICATION_NAME,
  RESERVED_DATABASE_PREFIX,
  TEST_ADMIN_OPT_IN_VALUE,
  assertReservedDatabaseName,
  createDisposablePostgresDatabase,
} = require("../disposablePostgres");

jest.setTimeout(30000);

describe("disposable PostgreSQL harness safety", () => {
  let verifierClient;

  function getVerifierConfig(database = "postgres") {
    return {
      host: process.env.MW_TEST_POSTGRES_ADMIN_HOST,
      port: Number(process.env.MW_TEST_POSTGRES_ADMIN_PORT),
      user: process.env.MW_TEST_POSTGRES_ADMIN_USER,
      password: process.env.MW_TEST_POSTGRES_ADMIN_PASSWORD || undefined,
      database,
      connectionTimeoutMillis: 1000,
      query_timeout: 1000,
    };
  }

  async function databaseExists(databaseName) {
    const result = await verifierClient.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [databaseName],
    );
    return result.rowCount === 1;
  }

  async function databasesWithPrefix(prefix) {
    const result = await verifierClient.query(
      "SELECT datname FROM pg_database WHERE datname LIKE $1 ORDER BY datname",
      [`${prefix}%`],
    );
    return result.rows.map(({ datname }) => datname);
  }

  async function adminSessionCount() {
    const result = await verifierClient.query(
      `
        SELECT COUNT(*)::integer AS count
        FROM pg_stat_activity
        WHERE application_name = $1
      `,
      [ADMIN_APPLICATION_NAME],
    );
    return result.rows[0].count;
  }

  function breakAdminClient(adminClient) {
    adminClient.once("error", () => {});
    adminClient.connection.stream.destroy();
  }

  beforeAll(async () => {
    expect(process.env.MW_TEST_POSTGRES_ADMIN_OPT_IN).toBe(
      TEST_ADMIN_OPT_IN_VALUE,
    );
    verifierClient = new Client(getVerifierConfig());
    await verifierClient.connect();
  });

  afterAll(async () => {
    await verifierClient?.end();
  });

  it("fails closed without dedicated test-admin opt-in and rejects non-reserved names", async () => {
    const originalOptIn = process.env.MW_TEST_POSTGRES_ADMIN_OPT_IN;
    const originalDedicatedHost = process.env.MW_TEST_POSTGRES_ADMIN_HOST;
    const originalApplicationHost = process.env.DB_HOST;
    delete process.env.MW_TEST_POSTGRES_ADMIN_OPT_IN;

    try {
      await expect(
        createDisposablePostgresDatabase({ databaseLabel: "no_opt_in" }),
      ).rejects.toThrow("explicit test-admin opt-in");
    } finally {
      process.env.MW_TEST_POSTGRES_ADMIN_OPT_IN = originalOptIn;
    }

    delete process.env.MW_TEST_POSTGRES_ADMIN_HOST;
    process.env.DB_HOST = originalDedicatedHost;
    try {
      await expect(
        createDisposablePostgresDatabase({
          databaseLabel: "application_fallback",
        }),
      ).rejects.toThrow("dedicated MW_TEST_POSTGRES_ADMIN_HOST setting");
    } finally {
      process.env.MW_TEST_POSTGRES_ADMIN_HOST = originalDedicatedHost;
      if (originalApplicationHost == null) {
        delete process.env.DB_HOST;
      } else {
        process.env.DB_HOST = originalApplicationHost;
      }
    }

    expect(() =>
      assertReservedDatabaseName(
        "mw_debug_1782734963801_14814",
        "database drop",
      ),
    ).toThrow("outside the reserved test prefix");
  });

  it("bounds active, stalled, and throwing registered connection cleanup", async () => {
    const database = await createDisposablePostgresDatabase({
      databaseLabel: "connection_cleanup",
      timeouts: {
        adminEndMs: 100,
        adminOperationMs: 1000,
        connectionCloseMs: 50,
        retryDelayMs: 10,
      },
    });
    try {
      const activeClient = new Client(getVerifierConfig(database.databaseName));
      await activeClient.connect();
      await activeClient.query("BEGIN");
      database.registerConnection({ close: () => activeClient.end() });
      database.registerConnection({ close: () => new Promise(() => {}) });
      database.registerConnection({
        close: () => {
          throw new Error("synthetic close failure");
        },
      });

      const startedAt = Date.now();
      const result = await database.close();

      expect(Date.now() - startedAt).toBeLessThan(1000);
      expect(result.connectionCloseFailures).toHaveLength(2);
      expect(await databaseExists(database.databaseName)).toBe(false);
    } finally {
      await database.close();
    }
  });

  it("retains cleanup state and removes the database when a failed drop is retried", async () => {
    let allowDrop = false;
    const cleanupProcessIds = [];
    const database = await createDisposablePostgresDatabase({
      databaseLabel: "drop_retry",
      testHooks: {
        beforeAdminOperation: ({ adminClient, operationName }) => {
          if (operationName === "database drop" && !allowDrop) {
            breakAdminClient(adminClient);
            throw new Error("synthetic drop failure");
          }
        },
        onAdminClientConnected: ({ processId, purpose }) => {
          if (purpose === "cleanup") cleanupProcessIds.push(processId);
        },
      },
      timeouts: {
        adminEndMs: 100,
        adminOperationMs: 1000,
        connectionCloseMs: 100,
        retryDelayMs: 10,
      },
    });

    try {
      expect(await adminSessionCount()).toBe(0);
      await expect(database.close()).rejects.toThrow(
        "database drop failed after 2 attempt(s)",
      );
      expect(await adminSessionCount()).toBe(0);
      expect(await databaseExists(database.databaseName)).toBe(true);

      allowDrop = true;
      await database.close();
      expect(await adminSessionCount()).toBe(0);
      expect(await databaseExists(database.databaseName)).toBe(false);
      expect(cleanupProcessIds).toHaveLength(2);
      expect(new Set(cleanupProcessIds).size).toBe(2);
    } finally {
      allowDrop = true;
      await database.close();
    }
  });

  it("bounds a stalled admin connection end after removing the database", async () => {
    const database = await createDisposablePostgresDatabase({
      databaseLabel: "stalled_admin_end",
      testHooks: {
        endAdminClient: () => new Promise(() => {}),
      },
      timeouts: {
        adminEndMs: 50,
        adminOperationMs: 1000,
        connectionCloseMs: 100,
      },
    });

    const startedAt = Date.now();
    await database.close();

    expect(Date.now() - startedAt).toBeLessThan(1000);
    expect(await databaseExists(database.databaseName)).toBe(false);
  });

  it("removes a partially configured database after setup throws", async () => {
    const label = `partial_setup_${process.pid}`;
    const databasePrefix = `${RESERVED_DATABASE_PREFIX}${label}`;

    await expect(
      createDisposablePostgresDatabase({
        databaseLabel: label,
        setup: async () => {
          throw new Error("synthetic setup failure");
        },
      }),
    ).rejects.toThrow("synthetic setup failure");

    expect(await databasesWithPrefix(databasePrefix)).toEqual([]);
  });

  it("ends failed setup cleanup sessions and retries removal with a fresh client", async () => {
    let allowDrop = false;
    const cleanupProcessIds = [];
    let setupError;

    try {
      await createDisposablePostgresDatabase({
        databaseLabel: "setup_drop_retry",
        setup: async () => {
          throw new Error("synthetic setup failure before cleanup retry");
        },
        testHooks: {
          beforeAdminOperation: ({ adminClient, operationName }) => {
            if (operationName === "database drop" && !allowDrop) {
              breakAdminClient(adminClient);
              throw new Error("synthetic setup cleanup drop failure");
            }
          },
          onAdminClientConnected: ({ processId, purpose }) => {
            if (purpose === "cleanup") cleanupProcessIds.push(processId);
          },
        },
        timeouts: {
          adminEndMs: 100,
          adminOperationMs: 1000,
          connectionCloseMs: 100,
          retryDelayMs: 10,
        },
      });
    } catch (error) {
      setupError = error;
    }

    expect(setupError).toHaveProperty(
      "message",
      "synthetic setup failure before cleanup retry",
    );
    expect(setupError?.databaseName).toMatch(
      new RegExp(`^${RESERVED_DATABASE_PREFIX}`),
    );
    expect(setupError?.retryCleanup).toEqual(expect.any(Function));
    expect(await adminSessionCount()).toBe(0);
    expect(await databaseExists(setupError.databaseName)).toBe(true);
    expect(cleanupProcessIds).toHaveLength(2);
    expect(new Set(cleanupProcessIds).size).toBe(2);

    try {
      allowDrop = true;
      await setupError.retryCleanup();
      expect(await adminSessionCount()).toBe(0);
      expect(await databaseExists(setupError.databaseName)).toBe(false);
      expect(cleanupProcessIds).toHaveLength(3);
      expect(new Set(cleanupProcessIds).size).toBe(3);
    } finally {
      allowDrop = true;
      await setupError?.retryCleanup?.();
    }
  });

  it("bounds stalled setup and removes its partially configured database", async () => {
    const label = `stalled_setup_${process.pid}`;
    const databasePrefix = `${RESERVED_DATABASE_PREFIX}${label}`;

    await expect(
      createDisposablePostgresDatabase({
        databaseLabel: label,
        setup: () => new Promise(() => {}),
        timeouts: { setupMs: 50 },
      }),
    ).rejects.toThrow("Disposable PostgreSQL setup exceeded 50ms");

    expect(await databasesWithPrefix(databasePrefix)).toEqual([]);
  });
});
