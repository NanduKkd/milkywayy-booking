import {
  logSecurityError,
  redactSensitiveString,
  sanitizeLogPayload,
} from "../security";

describe("security logging helpers", () => {
  const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    errorSpy.mockRestore();
  });

  it("redacts embedded bearer credentials and form-style secrets", () => {
    expect(
      redactSensitiveString(
        "Authorization: Bearer raw-token client_secret=super-secret",
      ),
    ).toBe("Authorization: Bearer [REDACTED] client_secret=[REDACTED]");
  });

  it("sanitizes nested log payloads and error objects", () => {
    const error = new Error(
      "Authorization: Bearer oauth-token code=secret-code cookie=session.jwt",
    );
    error.code = "invalid_token";
    error.reasonCode = "access_token_invalid";
    error.clientSecret = "super-secret";

    expect(
      sanitizeLogPayload({
        accessToken: "raw-token",
        nested: {
          authorizationHeader: "Bearer oauth-token",
          cookie: "session.jwt",
        },
        error,
      }),
    ).toEqual({
      accessToken: "[REDACTED]",
      error: {
        clientSecret: "[REDACTED]",
        code: "invalid_token",
        message:
          "Authorization: Bearer [REDACTED] code=[REDACTED] cookie=[REDACTED]",
        name: "Error",
        reasonCode: "access_token_invalid",
      },
      nested: {
        authorizationHeader: "[REDACTED]",
        cookie: "[REDACTED]",
      },
    });
  });

  it("logs only sanitized payloads", () => {
    const error = new Error("client_secret=super-secret");
    error.headers = {
      authorization: "Bearer oauth-token",
    };

    logSecurityError("OAuth token exchange failed.", error, {
      route: "/oauth/token",
      request: {
        client_secret: "super-secret",
      },
    });

    expect(errorSpy).toHaveBeenCalledWith("OAuth token exchange failed.", {
      error: {
        headers: {
          authorization: "[REDACTED]",
        },
        message: "client_secret=[REDACTED]",
        name: "Error",
      },
      request: {
        client_secret: "[REDACTED]",
      },
      route: "/oauth/token",
    });
  });
});
