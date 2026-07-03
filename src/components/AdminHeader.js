"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/contexts/auth";

export default function AdminHeader() {
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/admin/login");
  };

  return (
    <nav className="sticky top-0 z-40 px-4 pt-4 lg:px-6">
      <div className="admin-panel-subtle flex h-16 w-full items-center justify-between rounded-[1.65rem] px-4 backdrop-blur-sm lg:px-5">
        <div className="flex items-center gap-3">
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
  );
}
