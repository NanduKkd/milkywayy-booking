/** @jest-environment node */

const { randomUUID } = require("node:crypto");
const { Client } = require("pg");
const { Sequelize } = require("sequelize");

const createUserMigration = require("../../db/migrations/20251129095448-create-user.js");
const addCustomerAccountFieldsMigration = require("../../db/migrations/20260316000000-add-customer-account-fields.js");
const addCustomerAuthOtpControlsMigration = require("../../db/migrations/20260629000000-add-customer-auth-otp-controls.js");
const createOAuthPersistenceMigration = require("../../db/migrations/20260629010000-create-oauth-persistence.js");

const DEFAULT_REDIRECT_URI = "https://chatgpt.com/aip/oauth/callback-test";
const TEST_SCOPES = ["customer:read"];
const MIGRATIONS = [
  createUserMigration,
  addCustomerAccountFieldsMigration,
  addCustomerAuthOtpControlsMigration,
  createOAuthPersistenceMigration,
];

jest.setTimeout(30000);

describe("oauth protocol postgres integration", () => {
  const originalDbEnv = {
    DB_NAME: process.env.DB_NAME,
  };

  let adminClient;
  let sequelize;
  let models;
  let issueAuthorizationCode;
  let exchangeAuthorizationCode;
  let exchangeRefreshToken;
  let resolveOAuthAccessToken;
  let validateAuthorizationRequest;
  let grantOAuthConsent;
  let revokeOAuthConsent;
  let cleanupOAuthArtifacts;
  let hashOAuthSecret;
  let hashOAuthClientSecret;
  let tokenRoutePost;
  let databaseName;
  let userSequence = 0;
  let clientSequence = 0;
  let infoSpy;
  let warnSpy;
  let errorSpy;

  function getAdminConfig() {
    return {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || undefined,
      database: "postgres",
    };
  }

  async function applyMigrations(queryInterface) {
    for (const migration of MIGRATIONS) {
      await migration.up(queryInterface, Sequelize);
    }
  }

  async function truncateOAuthTables() {
    await sequelize.query(`
      TRUNCATE TABLE
        oauth_audit_events,
        oauth_consents,
        oauth_refresh_tokens,
        oauth_access_tokens,
        oauth_authorization_codes,
        oauth_rate_limits,
        oauth_clients,
        users
      RESTART IDENTITY CASCADE
    `);
  }

  async function createUser(overrides = {}) {
    userSequence += 1;

    return models.User.create({
      email: `oauth-user-${userSequence}@example.com`,
      fullName: `OAuth Test User ${userSequence}`,
      phone: `+1555000${String(userSequence).padStart(4, "0")}`,
      role: "CUSTOMER",
      ...overrides,
    });
  }

  async function createClient(overrides = {}) {
    clientSequence += 1;

    return models.OAuthClient.create({
      allowedScopes: TEST_SCOPES,
      clientId: `oauth-client-${clientSequence}-${randomUUID()}`,
      clientSecretHash: `secret-hash-${randomUUID()}`,
      isEnabled: true,
      name: `Milkywayy GPT ${clientSequence}`,
      redirectUris: [DEFAULT_REDIRECT_URI],
      tokenEndpointAuthMethods: ["client_secret_post", "client_secret_basic"],
      ...overrides,
    });
  }

  function buildAuthorizationCodeRequest(authorizationCode) {
    return new URLSearchParams({
      code: authorizationCode,
      grant_type: "authorization_code",
      redirect_uri: DEFAULT_REDIRECT_URI,
    });
  }

  function buildRefreshTokenRequest(refreshToken) {
    return new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });
  }

  function buildTokenRouteRequest(body) {
    return new Request("https://milkywayy.com/oauth/token", {
      body: body.toString(),
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });
  }

  async function issueCodeForClient({
    client,
    now,
    scopes = TEST_SCOPES,
    user,
  }) {
    return issueAuthorizationCode({
      clientId: client.id,
      correlationId: randomUUID(),
      now,
      redirectUri: DEFAULT_REDIRECT_URI,
      scopes,
      userId: user.id,
    });
  }

  beforeAll(async () => {
    databaseName = `mw_oauth_protocol_${Date.now()}_${process.pid}`;
    adminClient = new Client(getAdminConfig());
    await adminClient.connect();
    await adminClient.query(`CREATE DATABASE "${databaseName}"`);

    process.env.DB_NAME = databaseName;
    jest.resetModules();

    sequelize = require("../../db/db").sequelize;
    models = require("../../db/models").default;
    require("../../db/relations");
    ({ issueAuthorizationCode } = require("../authorizationCodes"));
    ({ exchangeAuthorizationCode, exchangeRefreshToken } =
      require("../tokenExchange"));
    ({ resolveOAuthAccessToken } = require("../accessTokens"));
    ({ validateAuthorizationRequest } = require("../authorizationRequest"));
    ({ grantOAuthConsent, revokeOAuthConsent } = require("../consent"));
    ({ cleanupOAuthArtifacts } = require("../cleanup"));
    ({ hashOAuthSecret } = require("../secrets"));
    ({ hashOAuthClientSecret } = require("../clientProvisioning"));
    ({ POST: tokenRoutePost } = require("@/app/oauth/token/route"));

    await sequelize.authenticate();
    await applyMigrations(sequelize.getQueryInterface());

    infoSpy = jest.spyOn(console, "info").mockImplementation(() => {});
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(async () => {
    infoSpy?.mockRestore();
    warnSpy?.mockRestore();
    errorSpy?.mockRestore();

    if (sequelize) {
      await sequelize.close();
    }

    process.env.DB_NAME = originalDbEnv.DB_NAME;
    jest.resetModules();

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

  beforeEach(async () => {
    jest.clearAllMocks();
    await truncateOAuthTables();
  });

  it("redeems a persisted authorization code only once under concurrent exchange requests", async () => {
    const user = await createUser();
    const client = await createClient();
    const issuedAt = new Date("2026-06-29T10:00:00.000Z");
    const exchangedAt = new Date("2026-06-29T10:01:00.000Z");
    const { authorizationCode } = await issueCodeForClient({
      client,
      now: issuedAt,
      user,
    });

    const results = await Promise.allSettled([
      exchangeAuthorizationCode({
        client,
        correlationId: randomUUID(),
        now: exchangedAt,
        parameters: buildAuthorizationCodeRequest(authorizationCode),
      }),
      exchangeAuthorizationCode({
        client,
        correlationId: randomUUID(),
        now: exchangedAt,
        parameters: buildAuthorizationCodeRequest(authorizationCode),
      }),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(fulfilled[0].value).toEqual(
      expect.objectContaining({
        access_token: expect.any(String),
        refresh_token: expect.any(String),
        scope: "customer:read",
        token_type: "bearer",
      }),
    );
    expect(rejected[0].reason).toMatchObject({
      code: "invalid_grant",
      reasonCode: "code_replayed",
    });

    const authorizationCodeRecord = await models.OAuthAuthorizationCode.findOne(
      {
        where: {
          codeHash: hashOAuthSecret(authorizationCode),
        },
      },
    );
    const accessTokens = await models.OAuthAccessToken.findAll();
    const refreshTokens = await models.OAuthRefreshToken.findAll();
    const auditEvents = await models.OAuthAuditEvent.findAll({
      order: [["id", "ASC"]],
    });

    expect(authorizationCodeRecord.consumedAt).toEqual(exchangedAt);
    expect(accessTokens).toHaveLength(1);
    expect(refreshTokens).toHaveLength(1);
    expect(auditEvents.map((event) => event.eventType)).toEqual(
      expect.arrayContaining([
        "oauth.authorization_code.issued",
        "oauth.authorization_code.consumed",
        "oauth.token.issued",
      ]),
    );
  });

  it("rejects expired authorization codes and refresh tokens using persisted state", async () => {
    const user = await createUser();
    const client = await createClient();
    const issuedAt = new Date("2026-06-29T11:00:00.000Z");
    const expiredExchangeTime = new Date("2026-06-29T11:03:00.000Z");
    const { authorizationCode } = await issueCodeForClient({
      client,
      now: issuedAt,
      user,
    });

    await expect(
      exchangeAuthorizationCode({
        client,
        correlationId: randomUUID(),
        now: expiredExchangeTime,
        parameters: buildAuthorizationCodeRequest(authorizationCode),
      }),
    ).rejects.toMatchObject({
      code: "invalid_grant",
      reasonCode: "code_expired",
    });

    const expiredRefreshToken = `expired-refresh-${randomUUID()}`;
    await models.OAuthRefreshToken.create({
      clientId: client.id,
      consumedAt: null,
      expiresAt: new Date("2026-06-29T11:10:00.000Z"),
      familyId: randomUUID(),
      parentTokenId: null,
      revokedAt: null,
      scopes: TEST_SCOPES,
      tokenHash: hashOAuthSecret(expiredRefreshToken),
      userId: user.id,
    });

    await expect(
      exchangeRefreshToken({
        client,
        correlationId: randomUUID(),
        now: new Date("2026-06-29T11:10:01.000Z"),
        parameters: buildRefreshTokenRequest(expiredRefreshToken),
      }),
    ).rejects.toMatchObject({
      code: "invalid_grant",
      reasonCode: "refresh_token_expired",
    });
  });

  it("rotates refresh tokens and revokes the family after concurrent replay", async () => {
    const user = await createUser();
    const client = await createClient();
    const issuedAt = new Date("2026-06-29T12:00:00.000Z");
    const firstExchange = await issueCodeForClient({
      client,
      now: issuedAt,
      user,
    });
    const initialTokenResponse = await exchangeAuthorizationCode({
      client,
      correlationId: randomUUID(),
      now: new Date("2026-06-29T12:01:00.000Z"),
      parameters: buildAuthorizationCodeRequest(
        firstExchange.authorizationCode,
      ),
    });

    const concurrentRefreshAt = new Date("2026-06-29T12:05:00.000Z");
    const refreshResults = await Promise.allSettled([
      exchangeRefreshToken({
        client,
        correlationId: randomUUID(),
        now: concurrentRefreshAt,
        parameters: buildRefreshTokenRequest(
          initialTokenResponse.refresh_token,
        ),
      }),
      exchangeRefreshToken({
        client,
        correlationId: randomUUID(),
        now: concurrentRefreshAt,
        parameters: buildRefreshTokenRequest(
          initialTokenResponse.refresh_token,
        ),
      }),
    ]);

    const fulfilled = refreshResults.filter(
      (result) => result.status === "fulfilled",
    );
    const rejected = refreshResults.filter(
      (result) => result.status === "rejected",
    );

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toMatchObject({
      code: "invalid_grant",
      reasonCode: "refresh_token_replayed",
    });

    const successfulRefresh = fulfilled[0].value;
    const refreshTokenRows = await models.OAuthRefreshToken.findAll({
      order: [["id", "ASC"]],
    });
    const accessTokenRows = await models.OAuthAccessToken.findAll({
      order: [["id", "ASC"]],
    });
    const familyId = refreshTokenRows[0].familyId;

    expect(refreshTokenRows).toHaveLength(2);
    expect(accessTokenRows).toHaveLength(2);
    expect(refreshTokenRows.every((row) => row.familyId === familyId)).toBe(
      true,
    );
    expect(
      accessTokenRows.every((row) => row.refreshFamilyId === familyId),
    ).toBe(true);
    expect(refreshTokenRows[1].parentTokenId).toBe(refreshTokenRows[0].id);
    expect(refreshTokenRows.every((row) => row.revokedAt instanceof Date)).toBe(
      true,
    );
    expect(accessTokenRows.every((row) => row.revokedAt instanceof Date)).toBe(
      true,
    );

    await expect(
      exchangeRefreshToken({
        client,
        correlationId: randomUUID(),
        now: new Date("2026-06-29T12:06:00.000Z"),
        parameters: buildRefreshTokenRequest(successfulRefresh.refresh_token),
      }),
    ).rejects.toMatchObject({
      code: "invalid_grant",
      reasonCode: "refresh_token_revoked",
    });

    const replacementRefreshTokenRow = await models.OAuthRefreshToken.findOne({
      where: {
        tokenHash: hashOAuthSecret(successfulRefresh.refresh_token),
      },
    });

    expect(replacementRefreshTokenRow.revokedAt).toBeInstanceOf(Date);
    await expect(
      resolveOAuthAccessToken(successfulRefresh.access_token, {
        now: new Date("2026-06-29T12:06:00.000Z"),
      }),
    ).rejects.toMatchObject({
      reasonCode: "access_token_revoked",
    });
  });

  it("revokes persisted consent and active tokens together", async () => {
    const user = await createUser();
    const client = await createClient();
    const grantedAt = new Date("2026-06-29T13:00:00.000Z");
    await grantOAuthConsent({
      clientId: client.id,
      now: grantedAt,
      scopes: TEST_SCOPES,
      userId: user.id,
    });

    const { authorizationCode } = await issueCodeForClient({
      client,
      now: grantedAt,
      user,
    });
    const tokenResponse = await exchangeAuthorizationCode({
      client,
      correlationId: randomUUID(),
      now: new Date("2026-06-29T13:01:00.000Z"),
      parameters: buildAuthorizationCodeRequest(authorizationCode),
    });

    const revokedAt = new Date("2026-06-29T13:10:00.000Z");
    const revocation = await revokeOAuthConsent({
      clientId: client.id,
      now: revokedAt,
      userId: user.id,
    });
    const consent = await models.OAuthConsent.findOne();
    const accessTokens = await models.OAuthAccessToken.findAll();
    const refreshTokens = await models.OAuthRefreshToken.findAll();

    expect(revocation).toMatchObject({
      revokedAccessTokenCount: 1,
      revokedConsent: true,
      revokedRefreshTokenCount: 1,
    });
    expect(consent.revokedAt).toEqual(revokedAt);
    expect(accessTokens[0].revokedAt).toEqual(revokedAt);
    expect(refreshTokens[0].revokedAt).toEqual(revokedAt);

    await expect(
      resolveOAuthAccessToken(tokenResponse.access_token, {
        now: new Date("2026-06-29T13:11:00.000Z"),
      }),
    ).rejects.toMatchObject({
      reasonCode: "access_token_revoked",
    });

    await expect(
      exchangeRefreshToken({
        client,
        correlationId: randomUUID(),
        now: new Date("2026-06-29T13:11:00.000Z"),
        parameters: buildRefreshTokenRequest(tokenResponse.refresh_token),
      }),
    ).rejects.toMatchObject({
      code: "invalid_grant",
      reasonCode: "refresh_token_revoked",
    });
  });

  it("blocks new authorization and token operations for disabled clients while active access tokens still expire normally", async () => {
    const user = await createUser();
    const clientSecret = "chatgpt-client-secret";
    const client = await createClient({
      clientSecretHash: await hashOAuthClientSecret(clientSecret),
    });
    const initialIssueTime = new Date("2026-06-29T13:30:00.000Z");
    const existingGrant = await issueCodeForClient({
      client,
      now: initialIssueTime,
      user,
    });
    const existingTokenResponse = await exchangeAuthorizationCode({
      client,
      correlationId: randomUUID(),
      now: new Date("2026-06-29T13:31:00.000Z"),
      parameters: buildAuthorizationCodeRequest(
        existingGrant.authorizationCode,
      ),
    });
    const pendingGrant = await issueCodeForClient({
      client,
      now: new Date("2026-06-29T13:32:00.000Z"),
      user,
    });

    await client.update({ isEnabled: false });

    await expect(
      validateAuthorizationRequest(
        new URLSearchParams({
          client_id: client.clientId,
          redirect_uri: DEFAULT_REDIRECT_URI,
          response_type: "code",
          scope: TEST_SCOPES.join(" "),
          state: "disabled-client-state",
        }),
      ),
    ).rejects.toMatchObject({
      code: "unauthorized_client",
      reasonCode: "client_unavailable",
    });

    const codeExchangeResponse = await tokenRoutePost(
      buildTokenRouteRequest(
        new URLSearchParams({
          client_id: client.clientId,
          client_secret: clientSecret,
          code: pendingGrant.authorizationCode,
          grant_type: "authorization_code",
          redirect_uri: DEFAULT_REDIRECT_URI,
        }),
      ),
    );

    expect(codeExchangeResponse.status).toBe(401);
    await expect(codeExchangeResponse.json()).resolves.toEqual({
      error: "invalid_client",
    });

    const refreshResponse = await tokenRoutePost(
      buildTokenRouteRequest(
        new URLSearchParams({
          client_id: client.clientId,
          client_secret: clientSecret,
          grant_type: "refresh_token",
          refresh_token: existingTokenResponse.refresh_token,
        }),
      ),
    );

    expect(refreshResponse.status).toBe(401);
    await expect(refreshResponse.json()).resolves.toEqual({
      error: "invalid_client",
    });

    await expect(
      resolveOAuthAccessToken(existingTokenResponse.access_token, {
        now: new Date("2026-06-29T13:40:00.000Z"),
      }),
    ).resolves.toEqual({
      accessTokenId: expect.any(Number),
      clientId: client.id,
      customerId: user.id,
      scopes: TEST_SCOPES,
    });
  });

  it("cleans up expired and revoked artifacts without deleting active OAuth state", async () => {
    const user = await createUser();
    const client = await createClient();
    const cleanupNow = new Date("2026-06-29T14:00:00.000Z");

    await issueCodeForClient({
      client,
      now: new Date("2026-06-29T13:00:00.000Z"),
      user,
    });

    const activeCode = await issueCodeForClient({
      client,
      now: cleanupNow,
      user,
    });
    await exchangeAuthorizationCode({
      client,
      correlationId: randomUUID(),
      now: cleanupNow,
      parameters: buildAuthorizationCodeRequest(activeCode.authorizationCode),
    });

    await models.OAuthAccessToken.create({
      clientId: client.id,
      expiresAt: new Date("2026-06-29T13:59:00.000Z"),
      refreshFamilyId: randomUUID(),
      revokedAt: null,
      scopes: TEST_SCOPES,
      tokenHash: hashOAuthSecret(`expired-access-${randomUUID()}`),
      userId: user.id,
    });
    await models.OAuthAccessToken.create({
      clientId: client.id,
      expiresAt: new Date("2026-06-29T15:00:00.000Z"),
      refreshFamilyId: randomUUID(),
      revokedAt: new Date("2026-06-29T13:30:00.000Z"),
      scopes: TEST_SCOPES,
      tokenHash: hashOAuthSecret(`revoked-access-${randomUUID()}`),
      userId: user.id,
    });
    await models.OAuthRefreshToken.create({
      clientId: client.id,
      consumedAt: null,
      expiresAt: new Date("2026-06-29T13:59:00.000Z"),
      familyId: randomUUID(),
      parentTokenId: null,
      revokedAt: null,
      scopes: TEST_SCOPES,
      tokenHash: hashOAuthSecret(`expired-refresh-${randomUUID()}`),
      userId: user.id,
    });
    await models.OAuthRefreshToken.create({
      clientId: client.id,
      consumedAt: null,
      expiresAt: new Date("2026-06-29T15:00:00.000Z"),
      familyId: randomUUID(),
      parentTokenId: null,
      revokedAt: new Date("2026-06-29T13:30:00.000Z"),
      scopes: TEST_SCOPES,
      tokenHash: hashOAuthSecret(`revoked-refresh-${randomUUID()}`),
      userId: user.id,
    });
    await models.OAuthRateLimit.create({
      bucketType: "oauth.token",
      expiresAt: new Date("2026-06-29T13:59:00.000Z"),
      keyHash: hashOAuthSecret(`expired-bucket-${randomUUID()}`),
      requestCount: 3,
      windowStart: new Date("2026-06-29T13:50:00.000Z"),
    });
    await models.OAuthRateLimit.create({
      bucketType: "oauth.token",
      expiresAt: new Date("2026-06-29T15:00:00.000Z"),
      keyHash: hashOAuthSecret(`active-bucket-${randomUUID()}`),
      requestCount: 1,
      windowStart: new Date("2026-06-29T14:00:00.000Z"),
    });
    await models.OAuthAuditEvent.create({
      clientId: client.id,
      correlationId: randomUUID(),
      createdAt: new Date("2026-06-29T13:00:00.000Z"),
      eventType: "oauth.test.expired",
      expiresAt: new Date("2026-06-29T13:59:00.000Z"),
      metadata: {},
      outcome: "success",
      reasonCode: "expired",
      userId: user.id,
    });
    await models.OAuthAuditEvent.create({
      clientId: client.id,
      correlationId: randomUUID(),
      createdAt: cleanupNow,
      eventType: "oauth.test.active",
      expiresAt: new Date("2026-06-29T15:00:00.000Z"),
      metadata: {},
      outcome: "success",
      reasonCode: "active",
      userId: user.id,
    });

    const cleanupResult = await cleanupOAuthArtifacts({
      batchSize: 50,
      maxBatchesPerTable: 2,
      now: cleanupNow,
    });

    expect(cleanupResult.totalDeleted).toBe(7);
    expect(cleanupResult.operations.authorizationCodes.deletedCount).toBe(1);
    expect(cleanupResult.operations.accessTokens.deletedCount).toBe(2);
    expect(cleanupResult.operations.refreshTokens.deletedCount).toBe(2);
    expect(cleanupResult.operations.rateLimits.deletedCount).toBe(1);
    expect(cleanupResult.operations.auditEvents.deletedCount).toBe(1);

    expect(await models.OAuthAuthorizationCode.count()).toBe(1);
    expect(await models.OAuthAccessToken.count()).toBe(1);
    expect(await models.OAuthRefreshToken.count()).toBe(1);
    expect(await models.OAuthRateLimit.count()).toBe(1);
    expect(
      await models.OAuthAuditEvent.count({
        where: {
          eventType: "oauth.test.active",
        },
      }),
    ).toBe(1);
    expect(
      await models.OAuthAuditEvent.count({
        where: {
          eventType: "oauth.test.expired",
        },
      }),
    ).toBe(0);
  });

  it("enforces persisted uniqueness for token hashes and active consents", async () => {
    const user = await createUser();
    const client = await createClient();
    const duplicateTokenHash = hashOAuthSecret("duplicate-access-token");
    const now = new Date("2026-06-29T15:00:00.000Z");

    await models.OAuthAccessToken.create({
      clientId: client.id,
      expiresAt: new Date("2026-06-29T16:00:00.000Z"),
      refreshFamilyId: randomUUID(),
      revokedAt: null,
      scopes: TEST_SCOPES,
      tokenHash: duplicateTokenHash,
      userId: user.id,
    });

    await expect(
      models.OAuthAccessToken.create({
        clientId: client.id,
        expiresAt: new Date("2026-06-29T16:05:00.000Z"),
        refreshFamilyId: randomUUID(),
        revokedAt: null,
        scopes: TEST_SCOPES,
        tokenHash: duplicateTokenHash,
        userId: user.id,
      }),
    ).rejects.toMatchObject({
      name: "SequelizeUniqueConstraintError",
    });

    const firstConsent = await models.OAuthConsent.create({
      clientId: client.id,
      grantedAt: now,
      revokedAt: null,
      scopes: TEST_SCOPES,
      userId: user.id,
    });

    await expect(
      models.OAuthConsent.create({
        clientId: client.id,
        grantedAt: new Date("2026-06-29T15:01:00.000Z"),
        revokedAt: null,
        scopes: TEST_SCOPES,
        userId: user.id,
      }),
    ).rejects.toMatchObject({
      name: "SequelizeUniqueConstraintError",
    });

    await firstConsent.update({
      revokedAt: new Date("2026-06-29T15:02:00.000Z"),
    });

    const replacementConsent = await models.OAuthConsent.create({
      clientId: client.id,
      grantedAt: new Date("2026-06-29T15:03:00.000Z"),
      revokedAt: null,
      scopes: TEST_SCOPES,
      userId: user.id,
    });

    expect(replacementConsent.id).toBeDefined();
  });
});
