"use client";

import { LogOut, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import AdminSidebarNav from "@/components/admin/AdminSidebarNav";
import {
  ADMIN_NAV_GROUPS,
  ADMIN_NAV_ITEMS,
} from "@/components/admin/adminNavConfig";
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
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const user = authState?.user;
  const displayName = user?.fullName || user?.email || "Super Admin";
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "SA";
  const currentItem = ADMIN_NAV_ITEMS.find((item) =>
    item.href === "/admin"
      ? pathname === "/admin"
      : pathname?.startsWith(item.href),
  );
  const currentGroup = ADMIN_NAV_GROUPS.find((group) =>
    group.items.some((item) => item.href === currentItem?.href),
  );

  const handleLogout = async () => {
    await logout();
    router.push("/admin/login");
  };

  return (
    <>
      <nav className="sticky top-0 z-40 flex h-[52px] items-center justify-between border-b border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface))] px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Open navigation"
            className="h-8 w-8 rounded-lg border border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700 lg:hidden"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <Link
            href="/admin"
            className="text-xs font-black tracking-[0.15em] text-white lg:hidden"
          >
            MILKYWAYY
          </Link>
          <div className="hidden items-center gap-2 lg:flex">
            <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">
              {currentGroup?.label || "Admin"}
            </span>
            <span className="text-xs text-zinc-700">/</span>
            <span className="text-[10px] font-medium text-zinc-400">
              {currentItem?.label || "Workspace"}
            </span>
          </div>
        </div>
        <div className="flex min-w-0 items-center justify-end gap-3">
          <div className="hidden min-w-0 text-right sm:block">
            <p className="truncate text-xs font-semibold leading-none text-white">
              {displayName}
            </p>
            <p className="mt-1 truncate text-[10px] text-zinc-500">
              {user?.role || "Super Admin"}
            </p>
          </div>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zinc-600 bg-zinc-700 text-[10px] font-bold text-zinc-300">
            {initials}
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Log out"
            title="Log out"
            className="h-8 w-8 rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-red-400 lg:hidden"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </nav>

      <Dialog open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <DialogContent className="admin-dialog left-0 top-0 h-svh w-[min(20rem,calc(100vw-1rem))] max-w-none translate-x-0 translate-y-0 gap-0 rounded-none rounded-r-xl border-l-0 p-0 data-[state=closed]:slide-out-to-left-[100%] data-[state=closed]:slide-out-to-top-0 data-[state=open]:slide-in-from-left-[100%] data-[state=open]:slide-in-from-top-0 sm:rounded-r-xl">
          <DialogHeader className="border-b border-zinc-800 px-5 py-4 pr-12 text-left">
            <p className="text-[9px] uppercase tracking-[0.18em] text-zinc-600">
              Admin Portal
            </p>
            <DialogTitle className="text-sm font-black tracking-[0.15em] text-white">
              MILKYWAYY
            </DialogTitle>
            <DialogDescription className="sr-only">
              Admin navigation
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto py-2">
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
