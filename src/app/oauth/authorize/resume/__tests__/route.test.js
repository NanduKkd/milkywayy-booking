import { GET } from "../route";

const mockVerifyAuthorizationResumeToken = jest.fn();
const mockRedirect = jest.fn((url) => ({
  status: 307,
  url: String(url),
}));

jest.mock("next/server", () => ({
  NextResponse: {
    redirect: (...args) => mockRedirect(...args),
  },
}));

jest.mock("@/lib/oauth/authorizationResume", () => ({
  OAUTH_AUTHORIZE_ERROR_CODES: {
    interactionExpired: "interaction_expired",
    invalidResume: "invalid_resume",
  },
  buildAuthorizationErrorPath: (errorCode) =>
    `/oauth/authorize/error?error=${errorCode}`,
  verifyAuthorizationResumeToken: (...args) =>
    mockVerifyAuthorizationResumeToken(...args),
}));

describe("oauth authorize resume route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirects a valid resume token back to the authorize page", async () => {
    mockVerifyAuthorizationResumeToken.mockResolvedValue({
      clientId: "client-123",
      redirectUri: "https://chatgpt.com/aip/oauth/callback-test",
      responseType: "code",
      scope: "customer:read",
      state: "opaque-state",
    });

    const response = await GET({
      url: "https://milkywayy.local/oauth/authorize/resume?resume=resume-token",
    });

    expect(response.status).toBe(307);
    expect(response.url).toBe(
      "http://localhost:3000/oauth/authorize?client_id=client-123&redirect_uri=https%3A%2F%2Fchatgpt.com%2Faip%2Foauth%2Fcallback-test&response_type=code&scope=customer%3Aread&state=opaque-state",
    );
  });

  it("redirects expired resume tokens to the local expiry page", async () => {
    const error = new Error("expired");
    error.code = "ERR_JWT_EXPIRED";
    mockVerifyAuthorizationResumeToken.mockRejectedValue(error);

    const response = await GET({
      url: "https://milkywayy.local/oauth/authorize/resume?resume=resume-token",
    });

    expect(response.status).toBe(307);
    expect(response.url).toBe(
      "http://localhost:3000/oauth/authorize/error?error=interaction_expired",
    );
  });
});
