import { render, screen } from "@testing-library/react";
import OAuthAuthorizePage from "../page";

const mockAuth = jest.fn();
const mockRecordOAuthAuditEvent = jest.fn();
const mockCookies = jest.fn();
const mockValidateAuthorizationRequest = jest.fn();
const mockIssueAuthorizationDecisionToken = jest.fn();
const mockIssueAuthorizationResumeToken = jest.fn();
const mockLoadActiveOAuthConsent = jest.fn();

jest.mock("next/headers", () => ({
  cookies: (...args) => mockCookies(...args),
}));

jest.mock("@/lib/helpers/auth", () => ({
  auth: (...args) => mockAuth(...args),
}));

jest.mock("@/lib/oauth/consent", () => ({
  hasActiveConsentForScopes: ({ consent, scopes }) =>
    Array.isArray(scopes) &&
    scopes.every(
      (scope) =>
        Array.isArray(consent?.scopes) && consent.scopes.includes(scope),
    ),
  loadActiveOAuthConsent: (...args) => mockLoadActiveOAuthConsent(...args),
}));

jest.mock("@/lib/oauth/authorizationDecision", () => ({
  issueAuthorizationDecisionToken: (...args) =>
    mockIssueAuthorizationDecisionToken(...args),
}));

jest.mock("@/lib/oauth/authorizationResume", () => ({
  OAUTH_AUTHORIZE_ERROR_CODES: {
    loginCancelled: "login_cancelled",
  },
  buildAuthorizationErrorPath: (errorCode) =>
    `/oauth/authorize/error?error=${errorCode}`,
  buildAuthorizationResumePath: (resumeToken) =>
    `/oauth/authorize/resume?resume=${resumeToken}`,
  issueAuthorizationResumeToken: (...args) =>
    mockIssueAuthorizationResumeToken(...args),
}));

jest.mock("@/lib/oauth/authorizationRequest", () => ({
  validateAuthorizationRequest: (...args) =>
    mockValidateAuthorizationRequest(...args),
}));

jest.mock("@/lib/oauth/audit", () => ({
  OAUTH_AUDIT_EVENTS: {
    authorizationInvalidClient: "oauth.authorization.invalid_client",
    authorizationInvalidRedirect: "oauth.authorization.invalid_redirect",
  },
  OAUTH_AUDIT_OUTCOMES: {
    failure: "failure",
  },
  OAUTH_AUDIT_PERSISTENCE: {
    failOpen: "fail_open",
  },
  recordOAuthAuditEvent: (...args) => mockRecordOAuthAuditEvent(...args),
}));

jest.mock("../AuthorizeLoginGate", () => ({
  __esModule: true,
  default: function MockAuthorizeLoginGate({ cancelPath, resumePath }) {
    return (
      <div
        data-cancel-path={cancelPath}
        data-resume-path={resumePath}
        data-testid="authorize-login-gate"
      />
    );
  },
}));

describe("OAuth authorize page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRecordOAuthAuditEvent.mockResolvedValue(null);
    mockCookies.mockResolvedValue({
      delete: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
    });
    mockLoadActiveOAuthConsent.mockResolvedValue(null);
  });

  it("renders the shared login gate for anonymous users", async () => {
    mockValidateAuthorizationRequest.mockResolvedValue({
      client: {
        id: 7,
        name: "ChatGPT",
      },
      clientId: "client-123",
      redirectUri: "https://chatgpt.com/aip/oauth/callback-test",
      responseType: "code",
      scope: "customer:read",
      scopes: ["customer:read"],
      state: "opaque-state",
    });
    mockAuth.mockResolvedValue(null);
    mockIssueAuthorizationResumeToken.mockResolvedValue("resume-token");

    const page = await OAuthAuthorizePage({
      searchParams: Promise.resolve({
        client_id: "client-123",
      }),
    });

    render(page);

    expect(screen.getByTestId("authorize-login-gate")).toHaveAttribute(
      "data-resume-path",
      "/oauth/authorize/resume?resume=resume-token",
    );
    expect(screen.getByTestId("authorize-login-gate")).toHaveAttribute(
      "data-cancel-path",
      "/oauth/authorize/error?error=login_cancelled",
    );
    expect(mockIssueAuthorizationResumeToken).toHaveBeenCalledWith({
      interaction: {
        clientId: "client-123",
        redirectUri: "https://chatgpt.com/aip/oauth/callback-test",
        responseType: "code",
        scope: "customer:read",
        state: "opaque-state",
      },
    });
    expect(mockIssueAuthorizationDecisionToken).not.toHaveBeenCalled();
  });

  it("renders the consent screen for authenticated customers", async () => {
    const cookieStore = {
      delete: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
    };
    mockCookies.mockResolvedValue(cookieStore);
    mockValidateAuthorizationRequest.mockResolvedValue({
      client: {
        id: 7,
        name: "ChatGPT",
      },
      clientId: "client-123",
      redirectUri: "https://chatgpt.com/aip/oauth/callback-test",
      responseType: "code",
      scope: "customer:read",
      scopes: ["customer:read"],
      state: "opaque-state",
    });
    mockAuth.mockResolvedValue({
      fullName: "Jane Customer",
      id: 42,
      role: "CUSTOMER",
    });
    mockIssueAuthorizationDecisionToken.mockResolvedValue("decision-token");

    const page = await OAuthAuthorizePage({
      searchParams: Promise.resolve({
        client_id: "client-123",
      }),
    });

    render(page);

    expect(
      screen.getByRole("heading", {
        name: "Allow ChatGPT to access your Milkywayy account?",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "View your account, bookings, invoices, and delivery-file metadata.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("decision-token")).toBeInTheDocument();
    expect(cookieStore.set).toHaveBeenCalledWith(
      "oauth-authorize-csrf",
      expect.any(String),
      expect.objectContaining({
        httpOnly: true,
        path: "/oauth/authorize",
        sameSite: "lax",
      }),
    );
  });

  it("switches to reconnect copy when the customer already granted the same scopes", async () => {
    mockValidateAuthorizationRequest.mockResolvedValue({
      client: {
        id: 7,
        name: "ChatGPT",
      },
      clientId: "client-123",
      redirectUri: "https://chatgpt.com/aip/oauth/callback-test",
      responseType: "code",
      scope: "customer:read",
      scopes: ["customer:read"],
      state: "opaque-state",
    });
    mockAuth.mockResolvedValue({
      fullName: "Jane Customer",
      id: 42,
      role: "CUSTOMER",
    });
    mockIssueAuthorizationDecisionToken.mockResolvedValue("decision-token");
    mockLoadActiveOAuthConsent.mockResolvedValue({
      scopes: ["customer:read"],
    });

    const page = await OAuthAuthorizePage({
      searchParams: Promise.resolve({
        client_id: "client-123",
      }),
    });

    render(page);

    expect(
      screen.getByRole("heading", {
        name: "Reconnect ChatGPT",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Reconnect ChatGPT" }),
    ).toBeInTheDocument();
  });

  it("renders a safe local error when validation fails", async () => {
    const error = new Error(
      "redirect_uri must exactly match a registered callback.",
    );
    error.reasonCode = "redirect_uri_unregistered";
    mockValidateAuthorizationRequest.mockRejectedValue(error);

    const page = await OAuthAuthorizePage({
      searchParams: Promise.resolve({
        client_id: "client-123",
      }),
    });

    render(page);

    expect(
      screen.getByRole("heading", {
        name: "Invalid authorization request",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "redirect_uri must exactly match a registered callback.",
      ),
    ).toBeInTheDocument();
    expect(mockAuth).not.toHaveBeenCalled();
    expect(mockRecordOAuthAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "oauth.authorization.invalid_redirect",
        metadata: expect.objectContaining({
          clientPublicId: "client-123",
          redirectUriOrigin: null,
        }),
        outcome: "failure",
        persistence: "fail_open",
        reasonCode: "redirect_uri_unregistered",
      }),
    );
  });
});
