"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminLogin } from "@/lib/actions/auth";
import { signInSchema } from "@/lib/schema/auth.schema";

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signInSchema),
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError("");

    try {
      const res = await adminLogin(data);
      if (!res.success) {
        throw new Error(res.message);
      }

      router.push("/admin");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-shell flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="relative w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/8 bg-white/[0.02] shadow-[0_40px_120px_hsl(220_45%_2%_/_0.46)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--admin-highlight)/0.14),transparent_34%),radial-gradient(circle_at_bottom_right,hsl(var(--admin-highlight-soft)/0.1),transparent_28%)]" />
        <div className="relative grid min-h-[720px] lg:grid-cols-[1.05fr_0.95fr]">
          <section className="flex flex-col justify-between border-b border-white/8 p-6 sm:p-8 lg:border-b-0 lg:border-r lg:p-10">
            <div className="space-y-8">
              <div className="admin-panel-muted inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[hsl(var(--admin-muted))]">
                <ShieldCheck className="h-4 w-4 text-[hsl(var(--admin-highlight))]" />
                Super Admin Access
              </div>
              <div className="space-y-4">
                <p className="admin-kicker">Milkywayy Admin</p>
                <h1 className="admin-title max-w-xl">
                  Sign in to manage bookings, finances, operations, and content.
                </h1>
                <p className="admin-copy max-w-lg">
                  This keeps the current admin email and password flow, now
                  aligned with the shared dark shell used across the refreshed
                  control surface.
                </p>
              </div>
            </div>

            <div className="grid gap-4 pt-10 sm:grid-cols-2">
              <div className="admin-panel rounded-[1.6rem] p-5">
                <p className="admin-kicker mb-3">Protected Surface</p>
                <p className="text-base font-semibold text-[hsl(var(--admin-foreground))]">
                  Existing authentication logic stays authoritative.
                </p>
                <p className="mt-2 text-sm leading-6 text-[hsl(var(--admin-muted))]">
                  Only the presentation is refreshed here. Session handling,
                  admin role checks, and post-login routing continue unchanged.
                </p>
              </div>
              <div className="admin-panel-subtle rounded-[1.6rem] p-5">
                <p className="admin-kicker mb-3">Operational Note</p>
                <p className="text-base font-semibold text-[hsl(var(--admin-foreground))]">
                  Use the same credentials as the live admin routes.
                </p>
                <p className="mt-2 text-sm leading-6 text-[hsl(var(--admin-muted))]">
                  Access is limited to non-customer accounts already provisioned
                  in Milkywayy.
                </p>
              </div>
            </div>
          </section>

          <section className="flex items-center p-4 sm:p-6 lg:p-8">
            <Card className="admin-panel w-full rounded-[1.9rem] border-white/10 text-[hsl(var(--admin-foreground))] shadow-none">
              <CardHeader className="space-y-4 border-b border-white/8 p-6 sm:p-7">
                <div className="admin-panel-muted flex h-12 w-12 items-center justify-center rounded-2xl text-[hsl(var(--admin-highlight))]">
                  <LockKeyhole className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-3xl font-semibold tracking-[-0.04em]">
                    Admin Login
                  </CardTitle>
                  <CardDescription className="text-sm leading-6 text-[hsl(var(--admin-muted))]">
                    Enter your credentials to access the current Super Admin
                    panel.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-6 sm:p-7">
                {error ? (
                  <div className="mb-5 rounded-2xl border border-[hsl(var(--admin-danger)/0.28)] bg-[hsl(var(--admin-danger)/0.12)] px-4 py-3 text-sm text-[hsl(var(--admin-danger))]">
                    {error}
                  </div>
                ) : null}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--admin-muted))]"
                    >
                      Email
                    </Label>
                    <Input
                      id="email"
                      {...register("email")}
                      placeholder="admin@example.com"
                      className={`admin-input h-12 rounded-2xl border-white/10 px-4 ${
                        errors.email
                          ? "border-[hsl(var(--admin-danger)/0.7)]"
                          : ""
                      }`}
                    />
                    {errors.email ? (
                      <p className="text-xs text-[hsl(var(--admin-danger))]">
                        {errors.email.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="password"
                      className="text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--admin-muted))]"
                    >
                      Password
                    </Label>
                    <Input
                      id="password"
                      {...register("password")}
                      placeholder="********"
                      type="password"
                      className={`admin-input h-12 rounded-2xl border-white/10 px-4 ${
                        errors.password
                          ? "border-[hsl(var(--admin-danger)/0.7)]"
                          : ""
                      }`}
                    />
                    {errors.password ? (
                      <p className="text-xs text-[hsl(var(--admin-danger))]">
                        {errors.password.message}
                      </p>
                    ) : null}
                  </div>

                  <Button
                    type="submit"
                    className="h-12 w-full rounded-2xl border border-[hsl(var(--admin-highlight)/0.2)] bg-[hsl(var(--admin-foreground))] text-[hsl(var(--admin-background-deep))] hover:bg-[hsl(var(--admin-highlight-soft))]"
                    disabled={isLoading}
                  >
                    {isLoading ? "Logging in..." : "Login"}
                  </Button>
                </form>

                <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-[hsl(var(--admin-muted))]">
                  Access remains restricted to operator accounts. Customer
                  accounts cannot authenticate through this route.
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
