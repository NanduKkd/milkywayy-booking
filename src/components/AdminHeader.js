"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/contexts/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminHeader() {
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/admin/login");
  };

  return (
    <nav className="flex h-16 w-full items-center justify-between border-b px-4 lg:px-6 bg-background">
      <div className="flex items-center">
        <Link href="/admin" className="font-bold text-inherit">
          ADMIN PANEL
        </Link>
      </div>
      <div className="flex items-center justify-end">
        <Button variant="ghost" className="text-red-600 hover:text-red-600 hover:bg-red-50" onClick={handleLogout}>
          Log Out
        </Button>
      </div>
    </nav>
  );
}
