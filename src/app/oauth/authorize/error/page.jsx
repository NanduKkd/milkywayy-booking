import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { OAUTH_AUTHORIZE_ERROR_CODES } from "@/lib/oauth/authorizationResumePaths";
import { OAUTH_AUTHORIZE_PATH } from "@/lib/oauth/interaction";

const ERROR_CONTENT = Object.freeze({
  [OAUTH_AUTHORIZE_ERROR_CODES.interactionExpired]: {
    title: "Authorization expired",
    message:
      "This OAuth connection request expired before it could be completed. Start the connection again from ChatGPT.",
  },
  [OAUTH_AUTHORIZE_ERROR_CODES.invalidResume]: {
    title: "Authorization could not be resumed",
    message:
      "The saved authorization request is invalid or no longer available. Start the connection again from ChatGPT.",
  },
  [OAUTH_AUTHORIZE_ERROR_CODES.loginCancelled]: {
    title: "Sign-in was cancelled",
    message:
      "Milkywayy did not complete the authorization because the sign-in flow was cancelled.",
  },
});

function getErrorContent(errorCode) {
  return (
    ERROR_CONTENT[errorCode] || {
      title: "Authorization unavailable",
      message:
        "Milkywayy could not complete this OAuth request safely. Start the connection again from ChatGPT.",
    }
  );
}

export default async function OAuthAuthorizeErrorPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const errorCode = String(resolvedSearchParams?.error ?? "").trim();
  const content = getErrorContent(errorCode);

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center px-6 py-16">
      <section className="w-full rounded-[2rem] border border-border bg-card/80 p-8 shadow-[0_32px_120px_rgba(0,0,0,0.2)] backdrop-blur-sm md:p-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-amber-200">
          <AlertTriangle size={14} />
          OAuth Authorization
        </div>
        <h1 className="mt-5 font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          {content.title}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
          {content.message}
        </p>
        <div className="mt-8">
          <Button asChild className="rounded-2xl px-6">
            <Link href={OAUTH_AUTHORIZE_PATH}>Back to Authorization</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
