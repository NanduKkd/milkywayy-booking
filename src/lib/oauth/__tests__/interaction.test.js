import {
  buildAuthorizationRequestPath,
  buildAuthorizationRequestSearchParams,
  normalizeOAuthInteraction,
  OAUTH_AUTHORIZE_PATH,
} from "../interaction";

describe("oauth interaction helpers", () => {
  const validInteraction = {
    clientId: "gpt-client",
    redirectUri: "https://chatgpt.com/aip/oauth/callback-test",
    responseType: "code",
    scope: "customer:read customer:read",
    state: "opaque-state",
  };

  it("normalizes a valid OAuth interaction and deduplicates scopes", () => {
    expect(normalizeOAuthInteraction(validInteraction)).toEqual({
      clientId: "gpt-client",
      redirectUri: "https://chatgpt.com/aip/oauth/callback-test",
      responseType: "code",
      scope: "customer:read",
      scopes: ["customer:read"],
      state: "opaque-state",
    });
  });

  it("rejects invalid interaction shapes and unsafe redirect URIs", () => {
    expect(() => normalizeOAuthInteraction(null)).toThrow(
      "OAuth interaction must be an object.",
    );
    expect(() =>
      normalizeOAuthInteraction({
        ...validInteraction,
        clientId: "   ",
      }),
    ).toThrow("OAuth interaction client ID is required.");
    expect(() =>
      normalizeOAuthInteraction({
        ...validInteraction,
        state: "   ",
      }),
    ).toThrow("OAuth interaction state is required.");
    expect(() =>
      normalizeOAuthInteraction({
        ...validInteraction,
        responseType: "token",
      }),
    ).toThrow("OAuth interaction response type must be code.");
    expect(() =>
      normalizeOAuthInteraction({
        ...validInteraction,
        scope: "unknown:scope",
      }),
    ).toThrow("Unsupported OAuth interaction scope: unknown:scope.");
    expect(() =>
      normalizeOAuthInteraction({
        ...validInteraction,
        redirectUri: "/oauth/callback",
      }),
    ).toThrow("OAuth interaction redirect URI must be absolute.");
    expect(() =>
      normalizeOAuthInteraction({
        ...validInteraction,
        redirectUri: "https://chatgpt.com/aip/oauth/callback-test#frag",
      }),
    ).toThrow("OAuth interaction redirect URI must not include a fragment.");
  });

  it("builds authorization request search params and path from a normalized interaction", () => {
    const searchParams =
      buildAuthorizationRequestSearchParams(validInteraction);

    expect(searchParams.toString()).toBe(
      "client_id=gpt-client&redirect_uri=https%3A%2F%2Fchatgpt.com%2Faip%2Foauth%2Fcallback-test&response_type=code&scope=customer%3Aread&state=opaque-state",
    );
    expect(buildAuthorizationRequestPath(validInteraction)).toBe(
      `${OAUTH_AUTHORIZE_PATH}?${searchParams.toString()}`,
    );
  });
});
