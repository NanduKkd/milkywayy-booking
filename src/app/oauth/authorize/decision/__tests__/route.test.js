import { POST } from "../route";

const mockAuth = jest.fn();
const mockFindOAuthClient = jest.fn();
const mockRecordOAuthAuditEvent = jest.fn();
const mockVerifyAuthorizationDecisionToken = jest.fn();
const mockIssueAuthorizationCode = jest.fn();
const mockGrantOAuthConsent = jest.fn();
const mockRedirect = jest.fn((url, init) => ({
  status: typeof init === "number" ? init : (init?.status ?? 307),
  url: String(url),
}));

if (typeof global.Response === "undefined") {
  global.Response = class MockResponse {
    constructor(body, init = {}) {
      this.body = body;
      this.headers = init.headers || {};
      this.status = init.status || 200;
    }

    async text() {
      return this.body;
    }
  };
}

jest.mock("next/server", () => ({
  NextResponse: {
    redirect: (...args) => mockRedirect(...args),
  },
}));

jest.mock("@/lib/helpers/auth", () => ({
  auth: (...args) => mockAuth(...args),
}));

jest.mock("@/lib/db/models", () => ({
  __esModule: true,
  default: {
    OAuthClient: {
      findByPk: (...args) => mockFindOAuthClient(...args),
    },
  },
}));

jest.mock("@/lib/oauth/authorizationDecision", () => ({
  buildOAuthCallbackRedirect: (interaction, parameters) => {
    const url = new URL(interaction.redirectUri);
    for (const [key, value] of Object.entries(parameters)) {
      url.searchParams.set(key, value);
    }
    return url.toString();
  },
  verifyAuthorizationDecisionToken: (...args) =>
    mockVerifyAuthorizationDecisionToken(...args),
}));

jest.mock("@/lib/oauth/authorizationResume", () => ({
  OAUTH_AUTHORIZE_ERROR_CODES: {
    interactionExpired: "interaction_expired",
    invalidResume: "invalid_resume",
  },
  buildAuthorizationErrorPath: (errorCode) =>
    `/oauth/authorize/error?error=${errorCode}`,
}));

jest.mock("@/lib/oauth/authorizationCodes", () => ({
  issueAuthorizationCode: (...args) => mockIssueAuthorizationCode(...args),
}));

jest.mock("@/lib/oauth/consent", () => ({
  grantOAuthConsent: (...args) => mockGrantOAuthConsent(...args),
}));

jest.mock("@/lib/oauth/audit", () => ({
  OAUTH_AUDIT_EVENTS: {
    authorizationApproved: "oauth.authorization.approved",
    authorizationDenied: "oauth.authorization.denied",
  },
  OAUTH_AUDIT_OUTCOMES: {
    success: "success",
  },
  OAUTH_AUDIT_PERSISTENCE: {
    failOpen: "fail_open",
  },
  recordOAuthAuditEvent: (...args) => mockRecordOAuthAuditEvent(...args),
}));

function createRequest(formEntries) {
  const formData = new FormData();

  for (const [key, value] of formEntries) {
    formData.set(key, value);
  }

  return {
    formData: async () => formData,
  };
}

function expectSeeOtherRedirect(response, url) {
  expect(response.status).toBe(303);
  expect(response.url).toBe(url);
  const [redirectUrl, redirectStatus] = mockRedirect.mock.calls.at(-1);
  expect(String(redirectUrl)).toBe(url);
  expect(redirectStatus).toBe(303);
}

describe("oauth authorize decision route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRecordOAuthAuditEvent.mockResolvedValue(null);
    mockGrantOAuthConsent.mockResolvedValue({ id: 11 });
    mockFindOAuthClient.mockResolvedValue({
      id: 7,
      isEnabled: true,
    });
    mockVerifyAuthorizationDecisionToken.mockResolvedValue({
      csrfToken: "csrf-token",
      interaction: {
        clientId: "client-123",
        redirectUri: "https://chatgpt.com/aip/oauth/callback-test",
        responseType: "code",
        scope: "customer:read",
        scopes: ["customer:read"],
        state: "opaque-state",
      },
      oauthClientId: 7,
      userId: 42,
    });
  });

  it("rejects requests without valid CSRF proof", async () => {
    const response = await POST(
      createRequest([
        ["intent", "approve"],
        ["csrfToken", "wrong-token"],
        ["decisionToken", "decision-token"],
      ]),
    );

    expect(response.status).toBe(403);
    await expect(response.text()).resolves.toBe("Invalid CSRF token.");
    expect(mockVerifyAuthorizationDecisionToken).toHaveBeenCalledWith(
      "decision-token",
    );
  });

  it.each([
    [
      "invalid decision tokens",
      new Error("invalid token"),
      "http://localhost:3000/oauth/authorize/error?error=invalid_resume",
    ],
    [
      "expired decision tokens",
      Object.assign(new Error("expired token"), { code: "ERR_JWT_EXPIRED" }),
      "http://localhost:3000/oauth/authorize/error?error=interaction_expired",
    ],
  ])("redirects %s through a 303 response", async (_, error, expectedUrl) => {
    mockVerifyAuthorizationDecisionToken.mockRejectedValueOnce(error);

    const response = await POST(
      createRequest([
        ["intent", "approve"],
        ["csrfToken", "csrf-token"],
        ["decisionToken", "decision-token"],
      ]),
    );

    expectSeeOtherRedirect(response, expectedUrl);
    expect(mockAuth).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated sessions back to the authorization request with 303", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await POST(
      createRequest([
        ["intent", "approve"],
        ["csrfToken", "csrf-token"],
        ["decisionToken", "decision-token"],
      ]),
    );

    expectSeeOtherRedirect(
      response,
      "http://localhost:3000/oauth/authorize?client_id=client-123&redirect_uri=https%3A%2F%2Fchatgpt.com%2Faip%2Foauth%2Fcallback-test&response_type=code&scope=customer%3Aread&state=opaque-state",
    );
    expect(mockFindOAuthClient).not.toHaveBeenCalled();
  });

  it("redirects denied authorization requests back to the callback with access_denied", async () => {
    mockAuth.mockResolvedValue({
      id: 42,
    });

    const response = await POST(
      createRequest([
        ["intent", "deny"],
        ["csrfToken", "csrf-token"],
        ["decisionToken", "decision-token"],
      ]),
    );

    expectSeeOtherRedirect(
      response,
      "https://chatgpt.com/aip/oauth/callback-test?error=access_denied&state=opaque-state",
    );
    expect(mockIssueAuthorizationCode).not.toHaveBeenCalled();
    expect(mockRecordOAuthAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "oauth.authorization.denied",
        metadata: {
          scopeCount: 1,
        },
        outcome: "success",
        persistence: "fail_open",
        reasonCode: "customer_denied",
        userId: 42,
      }),
    );
  });

  it("issues a hashed authorization code and redirects approved requests", async () => {
    mockAuth.mockResolvedValue({
      id: 42,
    });
    mockIssueAuthorizationCode.mockResolvedValue({
      authorizationCode: "raw-code",
    });

    const response = await POST(
      createRequest([
        ["intent", "approve"],
        ["csrfToken", "csrf-token"],
        ["decisionToken", "decision-token"],
      ]),
    );

    expectSeeOtherRedirect(
      response,
      "https://chatgpt.com/aip/oauth/callback-test?code=raw-code&state=opaque-state",
    );
    expect(mockGrantOAuthConsent).toHaveBeenCalledWith({
      clientId: 7,
      scopes: ["customer:read"],
      userId: 42,
    });
    expect(mockIssueAuthorizationCode).toHaveBeenCalledWith({
      clientId: 7,
      correlationId: expect.any(String),
      redirectUri: "https://chatgpt.com/aip/oauth/callback-test",
      scopes: ["customer:read"],
      userId: 42,
    });
    expect(mockRecordOAuthAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 7,
        correlationId: expect.any(String),
        eventType: "oauth.authorization.approved",
        metadata: {
          scopeCount: 1,
        },
        outcome: "success",
        persistence: "fail_open",
        reasonCode: "authorization_approved",
        userId: 42,
      }),
    );
  });
});
