"use client";

import { HeroUIProvider, ToastProvider } from "@heroui/react";
import { AuthProvider } from "@/lib/contexts/auth";

export function Providers({ children, user }) {
  return (
    <HeroUIProvider>
      <ToastProvider />
      <AuthProvider initialUser={user}>{children}</AuthProvider>
    </HeroUIProvider>
  );
}
