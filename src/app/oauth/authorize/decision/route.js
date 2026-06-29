import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { oauthConfig } from "@/lib/config/oauth";
import models from "@/lib/db/models";
import { auth } from "@/lib/helpers/auth";
import {
  OAUTH_AUDIT_EVENTS,
  OAUTH_AUDIT_OUTCOMES,
  OAUTH_AUDIT_PERSISTENCE,
  recordOAuthAuditEvent,
} from "@/lib/oauth/audit";
import { issueAuthorizationCode } from "@/lib/oauth/authorizationCodes";
import {
  clearAuthorizationCsrfCookie,
  readAuthorizationCsrfCookie,
  verifyAuthorizationCsrfToken,
} from "@/lib/oauth/authorizationCsrf";
import {
  buildOAuthCallbackRedirect,
  verifyAuthorizationDecisionToken,
} from "@/lib/oauth/authorizationDecision";
import {
  buildAuthorizationErrorPath,
  OAUTH_AUTHORIZE_ERROR_CODES,
} from "@/lib/oauth/authorizationResume";
import { grantOAuthConsent } from "@/lib/oauth/consent";
import { buildAuthorizationRequestPath } from "@/lib/oauth/interaction";

function buildLocalUrl(pathname) {
  return new URL(pathname, oauthConfig.baseUrl);
}

function buildErrorResponse(message, status) {
  return new Response(message, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
    status,
  });
}

export async function POST(request) {
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "").trim();
  const csrfToken = String(formData.get("csrfToken") ?? "").trim();
  const decisionToken = String(formData.get("decisionToken") ?? "").trim();
  const cookieStore = await cookies();
  const cookieToken = readAuthorizationCsrfCookie(cookieStore);

  clearAuthorizationCsrfCookie(cookieStore);

  if (
    !verifyAuthorizationCsrfToken({
      cookieToken,
      formToken: csrfToken,
    })
  ) {
    return buildErrorResponse("Invalid CSRF token.", 403);
  }

  let decision;

  try {
    decision = await verifyAuthorizationDecisionToken(decisionToken);
  } catch (error) {
    const errorCode =
      error?.code === "ERR_JWT_EXPIRED"
        ? OAUTH_AUTHORIZE_ERROR_CODES.interactionExpired
        : OAUTH_AUTHORIZE_ERROR_CODES.invalidResume;

    return NextResponse.redirect(
      buildLocalUrl(buildAuthorizationErrorPath(errorCode)),
    );
  }

  const session = await auth();

  if (!session) {
    return NextResponse.redirect(
      buildLocalUrl(buildAuthorizationRequestPath(decision.interaction)),
    );
  }

  if (Number(session.id) !== decision.userId) {
    return buildErrorResponse("Authorization session mismatch.", 403);
  }

  const client = await models.OAuthClient.findByPk(decision.oauthClientId);
  const correlationId = randomUUID();

  if (!client || client.isEnabled !== true) {
    return buildErrorResponse("OAuth client is unavailable.", 400);
  }

  if (intent === "deny") {
    await recordOAuthAuditEvent({
      clientId: client.id,
      correlationId,
      eventType: OAUTH_AUDIT_EVENTS.authorizationDenied,
      metadata: {
        scopeCount: Array.isArray(decision.interaction.scopes)
          ? decision.interaction.scopes.length
          : 0,
      },
      now: new Date(),
      outcome: OAUTH_AUDIT_OUTCOMES.success,
      persistence: OAUTH_AUDIT_PERSISTENCE.failOpen,
      reasonCode: "customer_denied",
      userId: Number(session.id),
    });

    return NextResponse.redirect(
      buildOAuthCallbackRedirect(decision.interaction, {
        error: "access_denied",
        state: decision.interaction.state,
      }),
    );
  }

  if (intent !== "approve") {
    return buildErrorResponse("Unsupported authorization decision.", 400);
  }

  await grantOAuthConsent({
    clientId: client.id,
    scopes: decision.interaction.scopes,
    userId: Number(session.id),
  });

  const { authorizationCode } = await issueAuthorizationCode({
    clientId: client.id,
    correlationId,
    redirectUri: decision.interaction.redirectUri,
    scopes: decision.interaction.scopes,
    userId: Number(session.id),
  });

  await recordOAuthAuditEvent({
    clientId: client.id,
    correlationId,
    eventType: OAUTH_AUDIT_EVENTS.authorizationApproved,
    metadata: {
      scopeCount: Array.isArray(decision.interaction.scopes)
        ? decision.interaction.scopes.length
        : 0,
    },
    now: new Date(),
    outcome: OAUTH_AUDIT_OUTCOMES.success,
    persistence: OAUTH_AUDIT_PERSISTENCE.failOpen,
    reasonCode: "authorization_approved",
    userId: Number(session.id),
  });

  return NextResponse.redirect(
    buildOAuthCallbackRedirect(decision.interaction, {
      code: authorizationCode,
      state: decision.interaction.state,
    }),
  );
}
