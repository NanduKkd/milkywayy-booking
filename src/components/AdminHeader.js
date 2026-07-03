"use client";

import { Menu } from "lucide-react";
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
  const { logout } = useAuth();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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
          <div className="flex items-center justify-end">
            <Button
              variant="ghost"
              className="rounded-2xl border border-[hsl(var(--admin-danger)/0.24)] bg-[hsl(var(--admin-danger)/0.1)] px-4 text-[hsl(var(--admin-danger))] hover:bg-[hsl(var(--admin-danger)/0.16)] hover:text-[hsl(var(--admin-foreground))]"
              onClick={handleLogout}
            >
              Log Out
            </Button>
          </div>
        </div>
      </nav>

      <Dialog open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <DialogContent className="admin-dialog left-0 top-0 h-svh w-[min(24rem,calc(100vw-1rem))] max-w-none translate-x-0 translate-y-0 gap-0 rounded-none rounded-r-[1.8rem] border-l-0 p-0 data-[state=closed]:slide-out-to-left-[100%] data-[state=closed]:slide-out-to-top-0 data-[state=open]:slide-in-from-left-[100%] data-[state=open]:slide-in-from-top-0 sm:rounded-r-[1.8rem]">
          <DialogHeader className="border-b border-white/8 px-5 py-5 pr-12 text-left">
            <p className="admin-kicker">Admin Portal</p>
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
