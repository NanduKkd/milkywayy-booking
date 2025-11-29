"use client";

import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Button,
  User,
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
} from "@heroui/react";
import { useAuth } from "@/lib/contexts/auth";
import { useRouter } from "next/navigation";

export default function UserMenu() {
  const { authState, login, logout } = useAuth();
  const router = useRouter();
  const { user, isAuthenticated } = authState;

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  if (!isAuthenticated) {
    return (
      <Button color="primary" variant="flat" onPress={login}>
        Login
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-4 text-white">
      <Dropdown placement="bottom-end">
        <DropdownTrigger>
          <User
            as="button"
            avatarProps={{
              isBordered: true,
              src: "", // Add avatar URL if available
              color: "primary",
              size: "sm",
            }}
            className="transition-transform"
            name="" // Hiding name in the trigger to keep it clean, shown in text above or in menu
          />
        </DropdownTrigger>
        <DropdownMenu aria-label="User Actions" variant="flat">
          <DropdownItem key="profile" className="h-14 gap-2">
            <p className="font-semibold">{user?.phone}</p>
          </DropdownItem>

          <DropdownItem key="dashboard" href="/dashboard/bookings">
            My Bookings
          </DropdownItem>
          <DropdownItem key="wallet" href="/dashboard/wallet">
            Wallet
          </DropdownItem>
          <DropdownItem key="logout" color="danger" onPress={handleLogout}>
            Log Out
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
    </div>
  );
}
