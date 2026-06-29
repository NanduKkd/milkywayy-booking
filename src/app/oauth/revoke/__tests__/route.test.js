import { POST } from "../route";

const mockAuth = jest.fn();
const mockFindOAuthClient = jest.fn();
const mockRecordOAuthAuditEvent = jest.fn();
const mockRevokeOAuthConsent = jest.fn();
const mockRedirect = jest.fn((url) => ({
  status: 307,
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
      findOne: (...args) => mockFindOAuthClient(...args),
    },
  },
}));

jest.mock("@/lib/oauth/consent", () => ({
  revokeOAuthConsent: (...args) => mockRevokeOAuthConsent(...args),
}));

jest.mock("@/lib/oauth/audit", () => ({
  OAUTH_AUDIT_EVENTS: {
    consentRevoked: "oauth.consent.revoked",
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
    url: "https://milkywayy.com/oauth/revoke",
  };
}

describe("oauth revoke route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRecordOAuthAuditEvent.mockResolvedValue(null);
    mockRevokeOAuthConsent.mockResolvedValue({
      revokedAccessTokenCount: 1,
      revokedConsent: true,
      revokedRefreshTokenCount: 1,
    });
  });

  it("rejects non-customer revocation attempts", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await POST(
      createRequest([["client_id", "client-public-123"]]),
    );

    expect(response.status).toBe(403);
    await expect(response.text()).resolves.toBe(
      "Customer authentication required.",
    );
    expect(mockFindOAuthClient).not.toHaveBeenCalled();
  });

  it("revokes the selected client connection for the signed-in customer", async () => {
    mockAuth.mockResolvedValue({
      id: 42,
      role: "CUSTOMER",
    });
    mockFindOAuthClient.mockResolvedValue({
      clientId: "client-public-123",
      id: 7,
    });

    const response = await POST(
      createRequest([["client_id", "client-public-123"]]),
    );

    expect(mockFindOAuthClient).toHaveBeenCalledWith({
      where: {
        clientId: "client-public-123",
      },
    });
    expect(mockRevokeOAuthConsent).toHaveBeenCalledWith({
      clientId: 7,
      userId: 42,
    });
    expect(mockRecordOAuthAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 7,
        eventType: "oauth.consent.revoked",
        metadata: {
          activeConsentId: undefined,
          clientPublicId: "client-public-123",
          revokedAccessTokenCount: 1,
          revokedConsent: true,
          revokedRefreshTokenCount: 1,
        },
        outcome: "success",
        persistence: "fail_open",
        reasonCode: "customer_revoked_connection",
        userId: 42,
      }),
    );
    expect(response.status).toBe(307);
    expect(response.url).toBe(
      "https://milkywayy.com/dashboard/connections?revoked=1",
    );
  });
});
