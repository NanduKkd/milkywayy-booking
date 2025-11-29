"use client";

import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Button,
} from "@heroui/react";
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
    <Navbar maxWidth="full" isBordered>
      <NavbarBrand>
        <Link href="/admin" className="font-bold text-inherit">
          ADMIN PANEL
        </Link>
      </NavbarBrand>
      <NavbarContent justify="end">
        <NavbarItem>
          <Button color="danger" variant="flat" onPress={handleLogout}>
            Log Out
          </Button>
        </NavbarItem>
      </NavbarContent>
    </Navbar>
  );
}
