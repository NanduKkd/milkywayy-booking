"use client";

import { Bot, ShieldCheck } from "lucide-react";
import { useEffect, useEffectEvent, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/contexts/auth";

export default function AuthorizeLoginGate({ resumePath, cancelPath }) {
  const hasOpenedRef = useRef(false);
  const { login } = useAuth();

  const startLogin = useEffectEvent(() => {
    login({
      nextPath: resumePath,
      cancelPath,
    });
  });

  useEffect(() => {
    if (hasOpenedRef.current) {
      return;
    }

    hasOpenedRef.current = true;
    startLogin();
  }, [startLogin]);

  return (
    <section className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center px-6 py-16">
      <div className="w-full rounded-[2rem] border border-border bg-card/80 p-8 shadow-[0_32px_120px_rgba(0,0,0,0.2)] backdrop-blur-sm md:p-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          <Bot size={14} />
          Connect ChatGPT
        </div>
        <h1 className="mt-5 font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Sign in to continue to Milkywayy authorization
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
          Sign in with your Milkywayy customer account to review the requested
          access and complete the ChatGPT connection.
        </p>
        <div className="mt-8 rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-sm text-emerald-100">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldCheck size={16} />
            Secure account check
          </div>
          <p className="mt-2 leading-6 text-emerald-100/90">
            You will return to the same validated authorization request after
            login. Milkywayy does not share your website session cookie or any
            client secret with ChatGPT.
          </p>
        </div>
        <div className="mt-8">
          <Button
            type="button"
            onClick={startLogin}
            className="min-w-[220px] rounded-2xl px-6"
          >
            Sign In to Continue
          </Button>
        </div>
      </div>
    </section>
  );
}
