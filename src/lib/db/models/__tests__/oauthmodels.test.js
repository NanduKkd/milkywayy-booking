import { Op } from "sequelize";
import "../../relations.js";
import OAuthAccessToken from "../oauthaccesstoken.js";
import OAuthAuditEvent from "../oauthauditevent.js";
import OAuthAuthorizationCode from "../oauthauthorizationcode.js";
import OAuthClient from "../oauthclient.js";
import OAuthConsent from "../oauthconsent.js";
import OAuthRefreshToken from "../oauthrefreshtoken.js";
import User from "../user.js";

describe("OAuth Sequelize models", () => {
  it("matches required client fields and hides the client secret hash in JSON", () => {
    expect(OAuthClient.rawAttributes.clientId.allowNull).toBe(false);
    expect(OAuthClient.rawAttributes.clientId.field).toBe("client_id");
    expect(OAuthClient.rawAttributes.clientSecretHash.field).toBe(
      "client_secret_hash",
    );
    expect(OAuthClient.options.indexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "oauth_clients_client_id_unique",
          unique: true,
          fields: ["client_id"],
        }),
      ]),
    );

    const client = OAuthClient.build({
      clientId: "client_123",
      clientSecretHash: "secret-hash",
      name: "Milkywayy GPT",
    });

    expect(client.toJSON()).toEqual({
      allowedScopes: [],
      clientId: "client_123",
      id: null,
      isEnabled: true,
      name: "Milkywayy GPT",
      redirectUris: [],
      tokenEndpointAuthMethods: [],
    });
  });

  it("defines authorization code constraints, associations, and active scope", () => {
    expect(OAuthAuthorizationCode.rawAttributes.userId.allowNull).toBe(false);
    expect(OAuthAuthorizationCode.rawAttributes.redirectUri.field).toBe(
      "redirect_uri",
    );
    expect(OAuthAuthorizationCode.associations.client.target).toBe(OAuthClient);
    expect(OAuthAuthorizationCode.associations.user.target).toBe(User);

    const now = new Date("2026-06-29T10:00:00.000Z");
    const scope = OAuthAuthorizationCode.scope({
      method: ["active", now],
    })._scope;

    expect(scope.where.consumedAt).toBeNull();
    expect(scope.where.expiresAt[Op.gt]).toBe(now);

    const code = OAuthAuthorizationCode.build({
      codeHash: "hash",
      clientId: 1,
      userId: 2,
      redirectUri: "https://example.com/callback",
      expiresAt: now,
    });

    expect(code.toJSON().codeHash).toBeUndefined();
  });

  it("defines access token active scope and hides the token hash in JSON", () => {
    const now = new Date("2026-06-29T10:00:00.000Z");
    const scope = OAuthAccessToken.scope({
      method: ["active", now],
    })._scope;

    expect(scope.where.revokedAt).toBeNull();
    expect(scope.where.expiresAt[Op.gt]).toBe(now);

    const token = OAuthAccessToken.build({
      tokenHash: "token-hash",
      clientId: 1,
      userId: 2,
      refreshFamilyId: "e6efeb4f-fd74-4e00-9069-b3ff15385745",
      expiresAt: now,
    });

    expect(token.toJSON().tokenHash).toBeUndefined();
  });

  it("defines refresh token family relations and active scope", () => {
    expect(OAuthRefreshToken.rawAttributes.parentTokenId.field).toBe(
      "parent_token_id",
    );
    expect(OAuthRefreshToken.associations.parentToken.target).toBe(
      OAuthRefreshToken,
    );
    expect(OAuthRefreshToken.associations.childTokens.target).toBe(
      OAuthRefreshToken,
    );

    const now = new Date("2026-06-29T10:00:00.000Z");
    const scope = OAuthRefreshToken.scope({
      method: ["active", now],
    })._scope;

    expect(scope.where.consumedAt).toBeNull();
    expect(scope.where.revokedAt).toBeNull();
    expect(scope.where.expiresAt[Op.gt]).toBe(now);
  });

  it("defines consent uniqueness and audit event retention fields", () => {
    expect(OAuthConsent.options.indexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "oauth_consents_client_user_active_unique",
          unique: true,
          fields: ["client_id", "user_id"],
          where: {
            revoked_at: null,
          },
        }),
      ]),
    );

    expect(OAuthAuditEvent.rawAttributes.correlationId.field).toBe(
      "correlation_id",
    );
    expect(OAuthAuditEvent.rawAttributes.createdAt.field).toBe("created_at");
    expect(OAuthAuditEvent.options.timestamps).toBe(false);
    expect(OAuthAuditEvent.associations.client.target).toBe(OAuthClient);
    expect(OAuthAuditEvent.associations.user.target).toBe(User);
  });
});
