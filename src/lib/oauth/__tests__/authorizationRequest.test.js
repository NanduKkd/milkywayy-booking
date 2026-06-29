import OAuthClient from "@/lib/db/models/oauthclient";
import {
  normalizeAuthorizationRequestScope,
  OAUTH_AUTHORIZATION_REQUEST_ERROR_CODES,
  OAuthAuthorizationRequestError,
  validateAuthorizationRequest,
} from "../authorizationRequest";

describe("authorizationRequest validator", () => {
  const validClient = OAuthClient.build({
    id: 7,
    clientId: "gpt-client",
    clientSecretHash: "secret-hash",
    name: "Milkywayy GPT",
    redirectUris: [
      "https://chatgpt.com/aip/oauth/callback-test",
      "https://chat.openai.com/aip/oauth/callback-test",
    ],
    allowedScopes: ["customer:read"],
    tokenEndpointAuthMethods: ["client_secret_post"],
    isEnabled: true,
  });

  it("validates a complete authorization request", async () => {
    await expect(
      validateAuthorizationRequest(
        new URLSearchParams({
          client_id: "gpt-client",
          redirect_uri: "https://chatgpt.com/aip/oauth/callback-test",
          response_type: "code",
          scope: "customer:read",
          state: "opaque-state",
        }),
        {
          loadClient: jest.fn().mockResolvedValue(validClient),
        },
      ),
    ).resolves.toEqual({
      client: validClient,
      clientId: "gpt-client",
      redirectUri: "https://chatgpt.com/aip/oauth/callback-test",
      responseType: "code",
      scope: "customer:read",
      scopes: ["customer:read"],
      state: "opaque-state",
    });
  });

  it("rejects missing or duplicate required parameters", async () => {
    const duplicateState = new URLSearchParams({
      client_id: "gpt-client",
      redirect_uri: "https://chatgpt.com/aip/oauth/callback-test",
      response_type: "code",
      scope: "customer:read",
      state: "state-a",
    });
    duplicateState.append("state", "state-b");

    await expect(
      validateAuthorizationRequest(duplicateState, {
        loadClient: jest.fn(),
      }),
    ).rejects.toMatchObject({
      code: OAUTH_AUTHORIZATION_REQUEST_ERROR_CODES.invalidRequest,
      reasonCode: "state_invalid",
    });

    const blankDuplicateState = new URLSearchParams({
      client_id: "gpt-client",
      redirect_uri: "https://chatgpt.com/aip/oauth/callback-test",
      response_type: "code",
      scope: "customer:read",
      state: "opaque-state",
    });
    blankDuplicateState.append("state", "   ");

    await expect(
      validateAuthorizationRequest(blankDuplicateState, {
        loadClient: jest.fn(),
      }),
    ).rejects.toMatchObject({
      code: OAUTH_AUTHORIZATION_REQUEST_ERROR_CODES.invalidRequest,
      reasonCode: "state_invalid",
    });

    await expect(
      validateAuthorizationRequest(
        {
          client_id: "gpt-client",
          redirect_uri: "https://chatgpt.com/aip/oauth/callback-test",
          response_type: "code",
          scope: "customer:read",
        },
        {
          loadClient: jest.fn(),
        },
      ),
    ).rejects.toMatchObject({
      code: OAUTH_AUTHORIZATION_REQUEST_ERROR_CODES.invalidRequest,
      reasonCode: "state_invalid",
    });
  });

  it("rejects unsupported response types", async () => {
    await expect(
      validateAuthorizationRequest(
        {
          client_id: "gpt-client",
          redirect_uri: "https://chatgpt.com/aip/oauth/callback-test",
          response_type: "token",
          scope: "customer:read",
          state: "opaque-state",
        },
        {
          loadClient: jest.fn(),
        },
      ),
    ).rejects.toMatchObject({
      code: OAUTH_AUTHORIZATION_REQUEST_ERROR_CODES.unsupportedResponseType,
      reasonCode: "response_type_unsupported",
    });
  });

  it("rejects unknown or disabled clients without redirecting externally", async () => {
    await expect(
      validateAuthorizationRequest(
        {
          client_id: "missing-client",
          redirect_uri: "https://chatgpt.com/aip/oauth/callback-test",
          response_type: "code",
          scope: "customer:read",
          state: "opaque-state",
        },
        {
          loadClient: jest.fn().mockResolvedValue(null),
        },
      ),
    ).rejects.toMatchObject({
      code: OAUTH_AUTHORIZATION_REQUEST_ERROR_CODES.unauthorizedClient,
      reasonCode: "client_unavailable",
    });

    await expect(
      validateAuthorizationRequest(
        {
          client_id: "disabled-client",
          redirect_uri: "https://chatgpt.com/aip/oauth/callback-test",
          response_type: "code",
          scope: "customer:read",
          state: "opaque-state",
        },
        {
          loadClient: jest.fn().mockResolvedValue(
            OAuthClient.build({
              clientId: "disabled-client",
              clientSecretHash: "secret-hash",
              name: "Disabled client",
              redirectUris: ["https://chatgpt.com/aip/oauth/callback-test"],
              allowedScopes: ["customer:read"],
              isEnabled: false,
            }),
          ),
        },
      ),
    ).rejects.toMatchObject({
      code: OAUTH_AUTHORIZATION_REQUEST_ERROR_CODES.unauthorizedClient,
      reasonCode: "client_unavailable",
    });
  });

  it("requires exact registered redirect-uri matches", async () => {
    await expect(
      validateAuthorizationRequest(
        {
          client_id: "gpt-client",
          redirect_uri: "https://chatgpt.com/aip/oauth/callback-test/",
          response_type: "code",
          scope: "customer:read",
          state: "opaque-state",
        },
        {
          loadClient: jest.fn().mockResolvedValue(validClient),
        },
      ),
    ).rejects.toMatchObject({
      code: OAUTH_AUTHORIZATION_REQUEST_ERROR_CODES.invalidRequest,
      reasonCode: "redirect_uri_unregistered",
    });

    await expect(
      validateAuthorizationRequest(
        {
          client_id: "gpt-client",
          redirect_uri:
            "https://chatgpt.com@evil.example.com/aip/oauth/callback-test",
          response_type: "code",
          scope: "customer:read",
          state: "opaque-state",
        },
        {
          loadClient: jest.fn().mockResolvedValue(validClient),
        },
      ),
    ).rejects.toMatchObject({
      code: OAUTH_AUTHORIZATION_REQUEST_ERROR_CODES.invalidRequest,
      reasonCode: "redirect_uri_invalid",
    });
  });

  it("rejects redirect uris outside server configuration", async () => {
    await expect(
      validateAuthorizationRequest(
        {
          client_id: "gpt-client",
          redirect_uri: "https://chatgpt.com/aip/oauth/callback",
          response_type: "code",
          scope: "customer:read",
          state: "opaque-state",
        },
        {
          loadClient: jest.fn().mockResolvedValue(
            OAuthClient.build({
              clientId: "gpt-client",
              clientSecretHash: "secret-hash",
              name: "Milkywayy GPT",
              redirectUris: ["https://chatgpt.com/aip/oauth/callback"],
              allowedScopes: ["customer:read"],
              isEnabled: true,
            }),
          ),
        },
      ),
    ).rejects.toMatchObject({
      code: OAUTH_AUTHORIZATION_REQUEST_ERROR_CODES.invalidRequest,
      reasonCode: "redirect_uri_not_allowed",
    });
  });

  it("rejects unknown or unapproved scopes", async () => {
    await expect(
      validateAuthorizationRequest(
        {
          client_id: "gpt-client",
          redirect_uri: "https://chatgpt.com/aip/oauth/callback-test",
          response_type: "code",
          scope: "customer:write",
          state: "opaque-state",
        },
        {
          loadClient: jest.fn().mockResolvedValue(validClient),
        },
      ),
    ).rejects.toMatchObject({
      code: OAUTH_AUTHORIZATION_REQUEST_ERROR_CODES.invalidScope,
      reasonCode: "scope_unsupported",
    });

    await expect(
      validateAuthorizationRequest(
        {
          client_id: "gpt-client",
          redirect_uri: "https://chatgpt.com/aip/oauth/callback-test",
          response_type: "code",
          scope: "customer:read customer:read",
          state: "opaque-state",
        },
        {
          loadClient: jest.fn().mockResolvedValue(validClient),
        },
      ),
    ).resolves.toMatchObject({
      scopes: ["customer:read"],
    });
  });

  it("rejects scopes not allowed for the client", async () => {
    await expect(
      validateAuthorizationRequest(
        {
          client_id: "gpt-client",
          redirect_uri: "https://chatgpt.com/aip/oauth/callback-test",
          response_type: "code",
          scope: "customer:read",
          state: "opaque-state",
        },
        {
          loadClient: jest.fn().mockResolvedValue(
            OAuthClient.build({
              clientId: "gpt-client",
              clientSecretHash: "secret-hash",
              name: "Milkywayy GPT",
              redirectUris: ["https://chatgpt.com/aip/oauth/callback-test"],
              allowedScopes: [],
              isEnabled: true,
            }),
          ),
        },
      ),
    ).rejects.toMatchObject({
      code: OAUTH_AUTHORIZATION_REQUEST_ERROR_CODES.invalidScope,
      reasonCode: "scope_not_allowed_for_client",
    });
  });

  it("normalizes scope strings and rejects empty scope values", () => {
    expect(
      normalizeAuthorizationRequestScope("customer:read customer:read"),
    ).toEqual(["customer:read"]);

    expect(() => normalizeAuthorizationRequestScope("")).toThrow(
      OAuthAuthorizationRequestError,
    );
  });
});
