"use client";

import { LogOut, Menu, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AdminSidebarNav from "@/components/admin/AdminSidebarNav";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/contexts/auth";

export default function AdminHeader() {
  const { authState, logout } = useAuth();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const user = authState?.user;
  const displayName = user?.fullName || user?.email || "Super Admin";
  const supportingLabel = user?.email || user?.role || "Authenticated session";
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "SA";

  const handleLogout = async () => {
    await logout();
    router.push("/admin/login");
  };

  return (
    <>
      <nav className="sticky top-0 z-40 px-4 pt-4 lg:px-6">
        <div className="admin-panel-subtle flex h-16 w-full items-center justify-between rounded-[1.65rem] px-4 backdrop-blur-sm lg:px-5">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Open navigation"
              className="admin-panel-muted h-10 w-10 rounded-2xl border-white/10 text-[hsl(var(--admin-foreground))] hover:bg-[hsl(var(--admin-surface-soft)/0.7)] lg:hidden"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>
            <Link
              href="/admin"
              className="text-sm font-semibold tracking-[0.18em] text-[hsl(var(--admin-foreground))]"
            >
              MILKYWAYY ADMIN
            </Link>
          </div>
          <div className="flex items-center justify-end gap-3">
            <div className="hidden min-w-0 items-center gap-3 px-3 py-2 sm:flex">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[hsl(var(--admin-highlight)/0.24)] bg-[hsl(var(--admin-highlight)/0.12)] text-sm font-semibold text-[hsl(var(--admin-foreground))]">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="admin-kicker text-[0.62rem]">Signed In</p>
                <p className="truncate text-sm font-semibold text-[hsl(var(--admin-foreground))]">
                  {displayName}
                </p>
                <p className="truncate text-xs text-[hsl(var(--admin-muted))]">
                  {supportingLabel}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="rounded-2xl border border-[hsl(var(--admin-danger)/0.24)] bg-[hsl(var(--admin-danger)/0.1)] px-4 text-[hsl(var(--admin-danger))] hover:bg-[hsl(var(--admin-danger)/0.16)] hover:text-[hsl(var(--admin-foreground))]"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Log Out
            </Button>
          </div>
        </div>
      </nav>

      <Dialog open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <DialogContent className="admin-dialog left-0 top-0 h-svh w-[min(24rem,calc(100vw-1rem))] max-w-none translate-x-0 translate-y-0 gap-0 rounded-none rounded-r-[1.8rem] border-l-0 p-0 data-[state=closed]:slide-out-to-left-[100%] data-[state=closed]:slide-out-to-top-0 data-[state=open]:slide-in-from-left-[100%] data-[state=open]:slide-in-from-top-0 sm:rounded-r-[1.8rem]">
          <DialogHeader className="border-b border-white/8 px-5 py-5 pr-12 text-left">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-3">
                <p className="admin-kicker">Admin Portal</p>
                <div className="admin-panel-muted inline-flex max-w-full items-center gap-3 rounded-2xl px-3 py-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[hsl(var(--admin-highlight)/0.24)] bg-[hsl(var(--admin-highlight)/0.12)] text-sm font-semibold text-[hsl(var(--admin-foreground))]">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[hsl(var(--admin-foreground))]">
                      {displayName}
                    </p>
                    <p className="truncate text-xs text-[hsl(var(--admin-muted))]">
                      {supportingLabel}
                    </p>
                  </div>
                </div>
              </div>
              <div className="admin-panel-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-[hsl(var(--admin-highlight))]">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <DialogTitle className="text-xl tracking-[-0.03em] text-[hsl(var(--admin-foreground))]">
              Navigation
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-[hsl(var(--admin-muted))]">
              Current Super Admin routes grouped for quick access.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto px-5 py-5">
            <AdminSidebarNav
              mobile
              onNavigate={() => setMobileNavOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
