"use client";

import { AuthProvider } from "@/lib/contexts/auth";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children, user }) {
  return (
    <AuthProvider initialUser={user}>
      {children}
      <Toaster />
    </AuthProvider>
  );
}
