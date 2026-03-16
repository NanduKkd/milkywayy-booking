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
    <nav className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-white/10 bg-background/90 px-4 backdrop-blur-sm lg:px-6">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-sm font-semibold tracking-[0.16em] text-foreground">
          MILKYWAYY ADMIN
        </Link>
      </div>
      <div className="flex items-center justify-end">
        <Button
          variant="ghost"
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 text-red-300 hover:bg-red-500/20 hover:text-red-200"
          onClick={handleLogout}
        >
          Log Out
        </Button>
      </div>
    </nav>
  );
}
