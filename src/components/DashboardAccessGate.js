"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/contexts/auth";

export default function DashboardAccessGate({ nextPath, openOnMount = true }) {
  const router = useRouter();
  const { authState, login } = useAuth();
  const hasOpenedRef = useRef(false);

  useEffect(() => {
    if (!openOnMount || authState.isAuthenticated || hasOpenedRef.current) {
      return;
    }

    hasOpenedRef.current = true;
    login();
  }, [authState.isAuthenticated, login, openOnMount]);

  useEffect(() => {
    if (authState.isAuthenticated) {
      router.replace(nextPath);
    }
  }, [authState.isAuthenticated, nextPath, router]);

  return (
    <section className="mt-8 rounded-3xl border border-border bg-card/70 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.18)] backdrop-blur-sm md:mt-10">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          Authentication Required
        </p>
        <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight text-foreground">
          Sign in to access your dashboard
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground md:text-base">
          Sign in with your phone number to continue to your bookings, files,
          and invoices.
        </p>
        <div className="mt-8 flex justify-center">
          <Button
            type="button"
            onClick={login}
            className="min-w-[180px] rounded-2xl px-6"
          >
            Sign In
          </Button>
        </div>
      </div>
    </section>
  );
}
