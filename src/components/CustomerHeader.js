"use client";

import { Button } from "@/components/ui/button";
import Image from 'next/image';
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/contexts/auth";

export default function CustomerHeader() {
  const { authState, login, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = authState;

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const isDashboardPage = pathname.startsWith("/dashboard");

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b border-white/10 bg-transparent px-4 backdrop-blur-md lg:px-8">
      <div className="flex items-center">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-white">
          <Image src="/logo-texxt.png" height="40" width="200" alt="Milkywayy" />
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {isAuthenticated ? (
          <>
            <Button
              asChild
              variant="ghost"
              className="border border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Link href={isDashboardPage ? "/booking" : "/dashboard/bookings"}>
                {isDashboardPage ? "Book Now" : "Dashboard"}
              </Link>
            </Button>
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="border border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              Logout
            </Button>
          </>
        ) : (
          <Button
            onClick={login}
            variant="ghost"
            className="border border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            Login
          </Button>
        )}
      </div>
    </nav>
  );
}
