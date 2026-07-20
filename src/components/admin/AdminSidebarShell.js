"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import AdminSidebarNav from "@/components/admin/AdminSidebarNav";
import { useAuth } from "@/lib/contexts/auth";

export default function AdminSidebarShell() {
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/admin/login");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[hsl(var(--admin-border))] px-5 py-4">
        <p className="text-[9px] uppercase tracking-[0.18em] text-[hsl(var(--admin-muted))]">
          Admin Portal
        </p>
        <p className="mt-0.5 text-sm font-black tracking-[0.15em] text-white">
          MILKYWAYY
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto py-2">
        <AdminSidebarNav />
      </div>
      <div className="border-t border-[hsl(var(--admin-border))] p-4">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 text-xs font-medium text-[hsl(var(--admin-muted))] transition-colors hover:text-red-400"
        >
          <LogOut size={13} />
          Log Out
        </button>
      </div>
    </div>
  );
}
