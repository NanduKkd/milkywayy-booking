import { NextResponse } from "next/server";
import { USER_ROLES } from "@/lib/config/app.config";
import models from "@/lib/db/models";
import { auth } from "@/lib/helpers/auth";
import {
  OAUTH_AUDIT_EVENTS,
  OAUTH_AUDIT_OUTCOMES,
  OAUTH_AUDIT_PERSISTENCE,
  recordOAuthAuditEvent,
} from "@/lib/oauth/audit";
import { revokeOAuthConsent } from "@/lib/oauth/consent";

function buildTextResponse(message, status) {
  return new Response(message, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
    status,
  });
}

function buildConnectionsUrl(request) {
  return new URL("/dashboard/connections?revoked=1", request.url);
}

export async function POST(request) {
  const session = await auth();

  if (!session || session.role !== USER_ROLES.CUSTOMER) {
    return buildTextResponse("Customer authentication required.", 403);
  }

  const formData = await request.formData();
  const clientPublicId = String(formData.get("client_id") ?? "").trim();

  if (!clientPublicId) {
    return buildTextResponse("client_id is required.", 400);
  }

  const client = await models.OAuthClient.findOne({
    where: {
      clientId: clientPublicId,
    },
  });

  if (client) {
    const revokeResult = await revokeOAuthConsent({
      clientId: client.id,
      userId: Number(session.id),
    });

    await recordOAuthAuditEvent({
      clientId: client.id,
      eventType: OAUTH_AUDIT_EVENTS.consentRevoked,
      metadata: {
        activeConsentId: revokeResult.activeConsentId,
        clientPublicId,
        revokedAccessTokenCount: revokeResult.revokedAccessTokenCount,
        revokedConsent: revokeResult.revokedConsent,
        revokedRefreshTokenCount: revokeResult.revokedRefreshTokenCount,
      },
      outcome: OAUTH_AUDIT_OUTCOMES.success,
      persistence: OAUTH_AUDIT_PERSISTENCE.failOpen,
      reasonCode: "customer_revoked_connection",
      userId: Number(session.id),
    });
  }

  return NextResponse.redirect(buildConnectionsUrl(request));
}
