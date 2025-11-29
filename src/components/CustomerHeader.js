"use client";

import { Navbar, NavbarBrand, NavbarContent, NavbarItem, Button } from "@heroui/react";
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
    <Navbar
      maxWidth="xl"
      className="fixed top-0 left-0 right-0 bg-transparent top-0 z-50 backdrop-blur-md border-b border-white/10"
      isBordered={false}
    >
      <NavbarBrand>
        <Link href="/" className="font-bold text-white flex gap-2 items-center text-xl">
          <Image src="/logo-texxt.png" height="40" width="200" alt="Milkywayy" />
        </Link>
      </NavbarBrand>

      <NavbarContent justify="end">
        {isAuthenticated ? (
          <>
            <NavbarItem>
              <Button
                as={Link}
                href={isDashboardPage ? "/booking" : "/dashboard/bookings"}
                variant="ghost"
                className="border-white/20 bg-transparent text-white"
              >
                {isDashboardPage ? "Book Now" : "Dashboard"}
              </Button>
            </NavbarItem>
            <NavbarItem>
              <Button
                onPress={handleLogout}
                variant="ghost"
                className="border-white/20 bg-transparent text-white"
              >
                Logout
              </Button>
            </NavbarItem>
          </>
        ) : (
          <NavbarItem>
            <Button
              onPress={login}
              variant="ghost"
              className="border-white/20 bg-transparent text-white"
            >
              Login
            </Button>
          </NavbarItem>
        )}
      </NavbarContent>
    </Navbar>
  );
}
