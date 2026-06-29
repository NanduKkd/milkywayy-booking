import {
  clearAuthorizationCsrfCookie,
  issueAuthorizationCsrfToken,
  readAuthorizationCsrfCookie,
  setAuthorizationCsrfCookie,
  verifyAuthorizationCsrfToken,
} from "../authorizationCsrf";

describe("authorization CSRF helpers", () => {
  it("issues opaque CSRF tokens", () => {
    const first = issueAuthorizationCsrfToken();
    const second = issueAuthorizationCsrfToken();

    expect(first).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(first.length).toBeGreaterThanOrEqual(43);
    expect(second).not.toBe(first);
  });

  it("stores, reads, and clears the authorization CSRF cookie", () => {
    const set = jest.fn();
    const del = jest.fn();
    const cookieStore = {
      delete: del,
      get: jest.fn().mockReturnValue({
        value: " csrf-token ",
      }),
      set,
    };

    setAuthorizationCsrfCookie(cookieStore, "csrf-token");

    expect(set).toHaveBeenCalledWith(
      "oauth-authorize-csrf",
      "csrf-token",
      expect.objectContaining({
        httpOnly: true,
        path: "/oauth/authorize",
        sameSite: "lax",
        secure: false,
      }),
    );
    expect(readAuthorizationCsrfCookie(cookieStore)).toBe("csrf-token");

    clearAuthorizationCsrfCookie(cookieStore);

    expect(del).toHaveBeenCalledWith("oauth-authorize-csrf");
  });

  it("verifies only exact CSRF token matches", () => {
    expect(
      verifyAuthorizationCsrfToken({
        cookieToken: " same-token ",
        formToken: "same-token",
      }),
    ).toBe(true);
    expect(
      verifyAuthorizationCsrfToken({
        cookieToken: "same-token",
        formToken: "other-token",
      }),
    ).toBe(false);
    expect(
      verifyAuthorizationCsrfToken({
        cookieToken: "short",
        formToken: "longer",
      }),
    ).toBe(false);
    expect(
      verifyAuthorizationCsrfToken({
        cookieToken: "",
        formToken: "same-token",
      }),
    ).toBe(false);
  });
});
