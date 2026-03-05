"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import HeaderBackground from "@/components/HeaderBackground";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/contexts/auth";

export default function CustomerHeader({ mode = "default" }) {
  const { authState, login, logout } = useAuth();
  const router = useRouter();
  const { isAuthenticated } = authState;
  const userDisplay =
    authState.user?.fullName || authState.user?.email || "User";
  const initials =
    userDisplay
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U";

  if (mode === "booking") {
    return (
      <HeaderBackground className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b border-white/10 px-4 lg:px-8 bg-black/95 backdrop-blur">
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-bold text-white"
        >
          <Image
            src="/logo-texxt.png"
            height={34}
            width={190}
            alt="Milkywayy"
          />
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm text-white/60">
          <a href="/#services" className="hover:text-white transition-colors">
            Services
          </a>
          <a href="/#our-work" className="hover:text-white transition-colors">
            Our Work
          </a>
          <a href="/#contact" className="hover:text-white transition-colors">
            Contact
          </a>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            className="h-10 border border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white rounded-xl px-6"
            onClick={() => router.push("/booking")}
          >
            Book Now
          </Button>
          <Button
            variant="ghost"
            className="h-10 border border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white rounded-xl px-6"
            onClick={
              isAuthenticated ? () => router.push("/dashboard/bookings") : login
            }
          >
            Dashboard
          </Button>
        </div>
      </HeaderBackground>
    );
  }

  return (
    <HeaderBackground className="fixed top-0 left-0 right-0 z-50 flex py-4 items-center justify-between border-b border-white/10 px-4 lg:px-8">
      <Link
        href="/"
        className="flex items-center gap-2 text-xl font-bold text-white"
      >
        <Image src="/logo-texxt.png" height={40} width={200} alt="Milkywayy" />
      </Link>

      {isAuthenticated
        ? <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-3 rounded-xl border border-white/20 bg-white/5 px-3 py-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-xs font-semibold text-white">
                {initials}
              </div>
              <div className="leading-tight">
                <p className="text-[11px] uppercase tracking-wide text-white/60">
                  Welcome
                </p>
                <p className="text-sm font-semibold text-white max-w-[210px] truncate">
                  {userDisplay}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="border border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
              onClick={() => router.push("/dashboard/bookings")}
            >
              Dashboard
            </Button>
            <Button
              variant="ghost"
              className="border border-white/20 bg-transparent text-white hover:bg-red-500/20 hover:text-white"
              onClick={logout}
            >
              Logout
            </Button>
          </div>
        : <Button
            variant="ghost"
            className="border border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
            onClick={login}
          >
            Dashboard
          </Button>}
    </HeaderBackground>
  );
}
