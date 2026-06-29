import { ShieldCheck } from "lucide-react";
import { cookies } from "next/headers";
import AuthorizeLoginGate from "@/app/oauth/authorize/AuthorizeLoginGate";
import { Button } from "@/components/ui/button";
import { USER_ROLES } from "@/lib/config/app.config";
import { auth } from "@/lib/helpers/auth";
import {
  clearAuthorizationCsrfCookie,
  issueAuthorizationCsrfToken,
  setAuthorizationCsrfCookie,
} from "@/lib/oauth/authorizationCsrf";
import { issueAuthorizationDecisionToken } from "@/lib/oauth/authorizationDecision";
import { validateAuthorizationRequest } from "@/lib/oauth/authorizationRequest";
import {
  buildAuthorizationErrorPath,
  buildAuthorizationResumePath,
  issueAuthorizationResumeToken,
  OAUTH_AUTHORIZE_ERROR_CODES,
} from "@/lib/oauth/authorizationResume";
import {
  hasActiveConsentForScopes,
  loadActiveOAuthConsent,
} from "@/lib/oauth/consent";
import { getOAuthScopeDetails } from "@/lib/oauth/scopes";

function AuthorizeErrorState({ title, message }) {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center px-6 py-16">
      <section className="w-full rounded-[2rem] border border-border bg-card/80 p-8 shadow-[0_32px_120px_rgba(0,0,0,0.2)] backdrop-blur-sm md:p-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-amber-200">
          <ShieldCheck size={14} />
          OAuth Authorization
        </div>
        <h1 className="mt-5 font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
          {message}
        </p>
      </section>
    </main>
  );
}

export default async function OAuthAuthorizePage({ searchParams }) {
  const resolvedSearchParams = await searchParams;

  let request;

  try {
    request = await validateAuthorizationRequest(resolvedSearchParams);
  } catch (error) {
    return (
      <AuthorizeErrorState
        title="Invalid authorization request"
        message={
          error?.message ||
          "Milkywayy could not validate this OAuth request safely."
        }
      />
    );
  }

  const session = await auth();
  const interaction = {
    clientId: request.clientId,
    redirectUri: request.redirectUri,
    responseType: request.responseType,
    scope: request.scope,
    state: request.state,
  };

  if (!session) {
    const resumeToken = await issueAuthorizationResumeToken({
      interaction,
    });

    return (
      <AuthorizeLoginGate
        resumePath={buildAuthorizationResumePath(resumeToken)}
        cancelPath={buildAuthorizationErrorPath(
          OAUTH_AUTHORIZE_ERROR_CODES.loginCancelled,
        )}
      />
    );
  }

  if (session.role !== USER_ROLES.CUSTOMER) {
    return (
      <AuthorizeErrorState
        title="Customer account required"
        message="Milkywayy OAuth is only available for customer accounts in this release. Sign out and continue with the matching customer account."
      />
    );
  }

  const cookieStore = await cookies();
  clearAuthorizationCsrfCookie(cookieStore);

  const decisionToken = await issueAuthorizationDecisionToken({
    interaction,
    oauthClientId: request.client.id,
    userId: session.id,
  });
  const csrfToken = issueAuthorizationCsrfToken();
  setAuthorizationCsrfCookie(cookieStore, csrfToken);

  const activeConsent = await loadActiveOAuthConsent({
    clientId: request.client.id,
    userId: session.id,
  }).catch(() => null);
  const isReconnect = hasActiveConsentForScopes({
    consent: activeConsent,
    scopes: request.scopes,
  });
  const accountLabel =
    session.fullName ||
    session.companyName ||
    session.email ||
    session.phone ||
    `Customer #${session.id}`;

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-4xl items-center px-6 py-16">
      <section className="w-full rounded-[2rem] border border-border bg-card/80 p-8 shadow-[0_32px_120px_rgba(0,0,0,0.2)] backdrop-blur-sm md:p-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-emerald-100">
          <ShieldCheck size={14} />
          OAuth Authorization
        </div>
        <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              {isReconnect
                ? `Reconnect ${request.client.name}`
                : `Allow ${request.client.name} to access your Milkywayy account?`}
            </h1>
            <p className="mt-4 text-sm leading-7 text-muted-foreground md:text-base">
              {isReconnect
                ? "You have already approved this access level. Reconnect to let ChatGPT continue using your Milkywayy customer data."
                : "ChatGPT is requesting read-only access to the Milkywayy data listed below on your behalf."}
            </p>
          </div>

          <div className="rounded-3xl border border-border/70 bg-background/60 px-5 py-4 text-sm text-muted-foreground">
            <div className="font-semibold text-foreground">Signed in as</div>
            <div className="mt-1 break-words">{accountLabel}</div>
          </div>
        </div>

        <div className="mt-8 grid gap-4">
          {request.scopes.map((scope) => {
            const details = getOAuthScopeDetails(scope);

            return (
              <div
                key={scope}
                className="rounded-3xl border border-border/70 bg-background/60 p-5"
              >
                <div className="font-semibold text-foreground">
                  {details.title}
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {details.description}
                </p>
              </div>
            );
          })}
        </div>

        <form
          method="post"
          action="/oauth/authorize/decision"
          className="mt-8 flex flex-col gap-4 sm:flex-row"
        >
          <input type="hidden" name="csrfToken" value={csrfToken} />
          <input type="hidden" name="decisionToken" value={decisionToken} />
          <Button
            type="submit"
            name="intent"
            value="approve"
            className="rounded-2xl px-6"
          >
            {isReconnect ? "Reconnect ChatGPT" : "Allow Access"}
          </Button>
          <Button
            type="submit"
            name="intent"
            value="deny"
            variant="outline"
            className="rounded-2xl px-6"
          >
            Cancel
          </Button>
        </form>

        <p className="mt-6 text-xs leading-6 text-muted-foreground">
          Milkywayy shares only the approved scope data with this OAuth client.
          Your website session cookie and any client secret remain server-only.
          You can review or revoke this connection from your dashboard at any
          time.
        </p>
        <p className="mt-2 text-xs leading-6 text-muted-foreground">
          By continuing, you will be redirected back to the validated ChatGPT
          callback for this authorization request.
        </p>
      </section>
    </main>
  );
}
