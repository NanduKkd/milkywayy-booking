"use client";

import { HeroUIProvider, ToastProvider } from "@heroui/react";
import { AuthProvider } from "@/lib/contexts/auth";

export function Providers({ children }) {
  return (
    <HeroUIProvider>
      <ToastProvider />
      <AuthProvider>
        {children}
      </AuthProvider>
    </HeroUIProvider>
  );
}
