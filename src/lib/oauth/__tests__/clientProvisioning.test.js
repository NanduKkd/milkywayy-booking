import bcrypt from "bcrypt";
import models from "../../db/models/index.js";
import {
  findOAuthClientByClientId,
  hashOAuthClientSecret,
  OAUTH_CLIENT_SECRET_HASH_ROUNDS,
  OAUTH_CLIENT_TOKEN_ENDPOINT_AUTH_METHODS,
  provisionOAuthClient,
  rotateOAuthClientSecret,
  setOAuthClientEnabledState,
  verifyOAuthClientSecret,
} from "../clientProvisioning";
import { generateOAuthSecret } from "../secrets.js";

jest.mock("bcrypt", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock("../secrets.js", () => ({
  generateOAuthSecret: jest.fn(),
}));

jest.mock("../../db/models/index.js", () => ({
  __esModule: true,
  default: {
    OAuthClient: {
      create: jest.fn(),
      findOne: jest.fn(),
    },
  },
}));

jest.mock("../../config/oauth.js", () => ({
  oauthConfig: {
    allowedScopes: ["customer:read"],
    callbackUris: [
      "https://chatgpt.com/aip/oauth/callback-test",
      "https://chat.openai.com/aip/oauth/callback-test",
    ],
    clientSecretHashPepper: "test-client-secret-pepper",
  },
}));

describe("OAuth client provisioning", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    bcrypt.hash.mockResolvedValue("hashed-client-secret");
    bcrypt.compare.mockResolvedValue(true);
    generateOAuthSecret
      .mockReturnValueOnce("generated-client-id")
      .mockReturnValueOnce("generated-client-secret");
    models.OAuthClient.create.mockImplementation(async (values) => values);
    models.OAuthClient.findOne.mockResolvedValue(null);
  });

  it("hashes client secrets with the configured pepper and bcrypt cost", async () => {
    await expect(hashOAuthClientSecret("plain-secret")).resolves.toBe(
      "hashed-client-secret",
    );

    expect(bcrypt.hash).toHaveBeenCalledWith(
      "test-client-secret-pepper:plain-secret",
      OAUTH_CLIENT_SECRET_HASH_ROUNDS,
    );
  });

  it("provisions a client with validated callbacks, scopes, and auth methods", async () => {
    const provisioned = await provisionOAuthClient({
      name: " Milkywayy GPT ",
      redirectUris: [
        "https://chatgpt.com/aip/oauth/callback-test",
        "https://chat.openai.com/aip/oauth/callback-test",
        "https://chatgpt.com/aip/oauth/callback-test",
      ],
      allowedScopes: ["customer:read", "customer:read"],
      tokenEndpointAuthMethods: [
        "client_secret_basic",
        "client_secret_post",
        "client_secret_basic",
      ],
    });

    expect(models.OAuthClient.create).toHaveBeenCalledWith({
      clientId: "generated-client-id",
      clientSecretHash: "hashed-client-secret",
      name: "Milkywayy GPT",
      redirectUris: [
        "https://chatgpt.com/aip/oauth/callback-test",
        "https://chat.openai.com/aip/oauth/callback-test",
      ],
      allowedScopes: ["customer:read"],
      tokenEndpointAuthMethods: ["client_secret_basic", "client_secret_post"],
      isEnabled: true,
    });
    expect(provisioned.clientId).toBe("generated-client-id");
    expect(provisioned.clientSecret).toBe("generated-client-secret");
    expect(provisioned.client.clientSecretHash).toBe("hashed-client-secret");
  });

  it("defaults to the configured scope and both supported auth methods", async () => {
    await provisionOAuthClient({
      name: "Milkywayy GPT",
      redirectUris: ["https://chatgpt.com/aip/oauth/callback-test"],
    });

    expect(models.OAuthClient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        allowedScopes: ["customer:read"],
        tokenEndpointAuthMethods: OAUTH_CLIENT_TOKEN_ENDPOINT_AUTH_METHODS,
      }),
    );
  });

  it("rejects redirect URIs outside the approved callback allowlist", async () => {
    await expect(
      provisionOAuthClient({
        name: "Milkywayy GPT",
        redirectUris: ["https://example.com/oauth/callback"],
      }),
    ).rejects.toThrow(
      "OAuth redirect URI is not in the approved callback allowlist: https://example.com/oauth/callback",
    );
  });

  it("rejects unsupported scopes and auth methods", async () => {
    await expect(
      provisionOAuthClient({
        name: "Milkywayy GPT",
        redirectUris: ["https://chatgpt.com/aip/oauth/callback-test"],
        allowedScopes: ["customer:write"],
      }),
    ).rejects.toThrow("Unsupported OAuth scope: customer:write");

    await expect(
      provisionOAuthClient({
        name: "Milkywayy GPT",
        redirectUris: ["https://chatgpt.com/aip/oauth/callback-test"],
        tokenEndpointAuthMethods: ["private_key_jwt"],
      }),
    ).rejects.toThrow(
      "Unsupported OAuth token endpoint auth method: private_key_jwt",
    );
  });

  it("verifies client secrets with the same peppered input", async () => {
    await expect(
      verifyOAuthClientSecret("plain-secret", "stored-hash"),
    ).resolves.toBe(true);

    expect(bcrypt.compare).toHaveBeenCalledWith(
      "test-client-secret-pepper:plain-secret",
      "stored-hash",
    );
  });

  it("loads an existing client by client ID", async () => {
    const existingClient = { clientId: "existing-client" };
    models.OAuthClient.findOne.mockResolvedValue(existingClient);

    await expect(findOAuthClientByClientId(" existing-client ")).resolves.toBe(
      existingClient,
    );

    expect(models.OAuthClient.findOne).toHaveBeenCalledWith({
      where: {
        clientId: "existing-client",
      },
    });
  });

  it("rejects rotation and state changes for unknown clients", async () => {
    await expect(rotateOAuthClientSecret("missing-client")).rejects.toThrow(
      "OAuth client not found for client ID: missing-client",
    );

    await expect(
      setOAuthClientEnabledState("missing-client", false),
    ).rejects.toThrow("OAuth client not found for client ID: missing-client");
  });

  it("rotates a stored client secret and returns the plaintext once", async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    const existingClient = {
      clientId: "existing-client",
      isEnabled: true,
      update,
    };

    models.OAuthClient.findOne.mockResolvedValue(existingClient);
    generateOAuthSecret.mockReset();
    generateOAuthSecret.mockReturnValue("rotated-client-secret");

    const result = await rotateOAuthClientSecret("existing-client");

    expect(update).toHaveBeenCalledWith({
      clientSecretHash: "hashed-client-secret",
    });
    expect(result.client).toBe(existingClient);
    expect(result.clientSecret).toBe("rotated-client-secret");
  });

  it("updates the enabled state only when it changes", async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    const disabledClient = {
      clientId: "existing-client",
      isEnabled: false,
      update,
    };

    models.OAuthClient.findOne.mockResolvedValue(disabledClient);

    const enabledClient = await setOAuthClientEnabledState(
      "existing-client",
      true,
    );

    expect(update).toHaveBeenCalledWith({
      isEnabled: true,
    });
    expect(enabledClient).toBe(disabledClient);

    update.mockClear();
    disabledClient.isEnabled = true;

    await setOAuthClientEnabledState("existing-client", true);
    expect(update).not.toHaveBeenCalled();
  });
});
