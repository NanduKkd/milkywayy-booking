const mockCreateAuditEvent = jest.fn();

jest.mock("@/lib/db/models", () => ({
  __esModule: true,
  default: {
    OAuthAuditEvent: {
      create: (...args) => mockCreateAuditEvent(...args),
    },
  },
}));

import {
  OAUTH_AUDIT_EVENTS,
  OAUTH_AUDIT_OUTCOMES,
  OAUTH_AUDIT_PERSISTENCE,
  recordOAuthAuditEvent,
  sanitizeOAuthAuditMetadata,
} from "../audit";

describe("oauth audit service", () => {
  const infoSpy = jest.spyOn(console, "info").mockImplementation(() => {});
  const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateAuditEvent.mockResolvedValue({ id: 1 });
  });

  afterAll(() => {
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("persists safe metadata and emits paired audit and metric logs", async () => {
    await recordOAuthAuditEvent({
      clientId: 7,
      correlationId: "corr-1",
      eventType: OAUTH_AUDIT_EVENTS.authorizationDenied,
      metadata: {
        clientSecret: "super-secret",
        nested: {
          scopeCount: 1,
        },
      },
      now: new Date("2026-06-29T12:00:00.000Z"),
      outcome: OAUTH_AUDIT_OUTCOMES.success,
      persistence: OAUTH_AUDIT_PERSISTENCE.failOpen,
      reasonCode: "customer_denied",
      userId: 42,
    });

    expect(mockCreateAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 7,
        correlationId: "corr-1",
        eventType: "oauth.authorization.denied",
        expiresAt: new Date("2026-07-29T12:00:00.000Z"),
        metadata: {
          clientSecret: "[REDACTED]",
          nested: {
            scopeCount: 1,
          },
        },
        outcome: "success",
        reasonCode: "customer_denied",
        userId: 42,
      }),
      {
        transaction: undefined,
      },
    );
    expect(infoSpy).toHaveBeenCalledWith(
      "[OAUTH_AUDIT]",
      expect.objectContaining({
        correlationId: "corr-1",
        eventType: "oauth.authorization.denied",
        metric: {
          classification: "user_denial",
          name: "oauth.authorization.denied",
        },
      }),
    );
    expect(infoSpy).toHaveBeenCalledWith(
      "[OAUTH_METRIC]",
      expect.objectContaining({
        correlationId: "corr-1",
        eventType: "oauth.authorization.denied",
        metric: {
          classification: "user_denial",
          name: "oauth.authorization.denied",
        },
      }),
    );
  });

  it("uses warn-level logging for suspicious failures", async () => {
    await recordOAuthAuditEvent({
      correlationId: "corr-2",
      eventType: OAUTH_AUDIT_EVENTS.refreshReplayDetected,
      metadata: {
        refreshToken: "raw-refresh-token",
      },
      outcome: OAUTH_AUDIT_OUTCOMES.failure,
      persistence: OAUTH_AUDIT_PERSISTENCE.failOpen,
      reasonCode: "refresh_token_replayed",
    });

    expect(warnSpy).toHaveBeenCalledWith(
      "[OAUTH_AUDIT]",
      expect.objectContaining({
        correlationId: "corr-2",
        metric: {
          classification: "security_failure",
          name: "oauth.refresh_token.replay_detected",
        },
      }),
    );
  });

  it("can fail open when audit persistence is unavailable", async () => {
    mockCreateAuditEvent.mockRejectedValue(new Error("insert failed"));

    await expect(
      recordOAuthAuditEvent({
        correlationId: "corr-3",
        eventType: OAUTH_AUDIT_EVENTS.consentRevoked,
        persistence: OAUTH_AUDIT_PERSISTENCE.failOpen,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        auditEvent: null,
        correlationId: "corr-3",
      }),
    );
    expect(errorSpy).toHaveBeenCalledWith(
      "[OAUTH_AUDIT_PERSIST_FAILURE]",
      expect.objectContaining({
        correlationId: "corr-3",
        eventType: "oauth.consent.revoked",
        persistence: "fail_open",
      }),
    );
  });

  it("sanitizes bounded metadata objects recursively", () => {
    expect(
      sanitizeOAuthAuditMetadata({
        keep: "value",
        refresh_token: "raw-token",
        nested: {
          cookie: "jwt-cookie",
        },
      }),
    ).toEqual({
      keep: "value",
      nested: {
        cookie: "[REDACTED]",
      },
      refresh_token: "[REDACTED]",
    });
  });
});
