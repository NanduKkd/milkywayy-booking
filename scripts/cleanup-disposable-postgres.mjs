import { Client } from "pg";

const prefix = "mw_codex_test_";

function required(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required test-only setting: ${name}`);
  }

  return value;
}

if (process.env.NODE_ENV !== "test") {
  throw new Error(
    "Disposable PostgreSQL cleanup is restricted to NODE_ENV=test",
  );
}

if (
  process.env.MW_TEST_POSTGRES_ADMIN_OPT_IN !== "CREATE_DROP_RESERVED_DATABASES"
) {
  throw new Error(
    "Disposable PostgreSQL cleanup requires explicit test-admin opt-in",
  );
}

const client = new Client({
  host: required("MW_TEST_POSTGRES_ADMIN_HOST"),
  port: Number(required("MW_TEST_POSTGRES_ADMIN_PORT")),
  user: required("MW_TEST_POSTGRES_ADMIN_USER"),
  password: process.env.MW_TEST_POSTGRES_ADMIN_PASSWORD || undefined,
  database: required("MW_TEST_POSTGRES_ADMIN_DATABASE"),
  connectionTimeoutMillis: 3_000,
  query_timeout: 3_000,
  application_name: "mw_codex_disposable_cleanup",
});

try {
  await client.connect();
  await client.query("SET statement_timeout = '3s'");
  await client.query("SET lock_timeout = '3s'");

  const { rows } = await client.query(
    "SELECT datname FROM pg_database WHERE datname LIKE $1 ORDER BY datname",
    [`${prefix}%`],
  );

  for (const { datname } of rows) {
    if (!datname.startsWith(prefix)) {
      throw new Error(
        "Refusing to clean a database outside the reserved prefix",
      );
    }

    await client.query(
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",
      [datname],
    );
    await client.query(`DROP DATABASE IF EXISTS ${JSON.stringify(datname)}`);
  }

  console.log(
    `Disposable PostgreSQL cleanup removed ${rows.length} reserved database(s).`,
  );
} finally {
  await client.end().catch(() => {});
}
