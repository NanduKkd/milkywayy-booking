import { POST } from "../route";

const mockAuth = jest.fn();
const mockCookies = jest.fn();
const mockFindOAuthClient = jest.fn();
const mockCreateAuthorizationCode = jest.fn();
const mockVerifyAuthorizationDecisionToken = jest.fn();
const mockGenerateAuthorizationCode = jest.fn();
const mockHashOAuthSecret = jest.fn();
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

jest.mock("next/headers", () => ({
  cookies: (...args) => mockCookies(...args),
}));

jest.mock("@/lib/helpers/auth", () => ({
  auth: (...args) => mockAuth(...args),
}));

jest.mock("@/lib/db/models", () => ({
  __esModule: true,
  default: {
    OAuthAuthorizationCode: {
      create: (...args) => mockCreateAuthorizationCode(...args),
    },
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

jest.mock("@/lib/oauth/secrets", () => ({
  generateAuthorizationCode: (...args) =>
    mockGenerateAuthorizationCode(...args),
  hashOAuthSecret: (...args) => mockHashOAuthSecret(...args),
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

describe("oauth authorize decision route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCookies.mockResolvedValue({
      delete: jest.fn(),
      get: jest.fn((name) =>
        name === "oauth-authorize-csrf" ? { value: "csrf-token" } : undefined,
      ),
    });
    mockFindOAuthClient.mockResolvedValue({
      id: 7,
      isEnabled: true,
    });
    mockVerifyAuthorizationDecisionToken.mockResolvedValue({
      interaction: {
        redirectUri: "https://chatgpt.com/aip/oauth/callback-test",
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
    expect(mockVerifyAuthorizationDecisionToken).not.toHaveBeenCalled();
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

    expect(response.status).toBe(307);
    expect(response.url).toBe(
      "https://chatgpt.com/aip/oauth/callback-test?error=access_denied&state=opaque-state",
    );
    expect(mockCreateAuthorizationCode).not.toHaveBeenCalled();
  });

  it("issues a hashed authorization code and redirects approved requests", async () => {
    mockAuth.mockResolvedValue({
      id: 42,
    });
    mockGenerateAuthorizationCode.mockReturnValue("raw-code");
    mockHashOAuthSecret.mockReturnValue("hashed-code");

    const response = await POST(
      createRequest([
        ["intent", "approve"],
        ["csrfToken", "csrf-token"],
        ["decisionToken", "decision-token"],
      ]),
    );

    expect(response.status).toBe(307);
    expect(mockCreateAuthorizationCode).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 7,
        codeHash: "hashed-code",
        redirectUri: "https://chatgpt.com/aip/oauth/callback-test",
        scopes: ["customer:read"],
        userId: 42,
      }),
    );
    expect(response.url).toBe(
      "https://chatgpt.com/aip/oauth/callback-test?code=raw-code&state=opaque-state",
    );
  });
});
