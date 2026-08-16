"use client";

import { useState } from "react";
import DashboardLoginModal from "@/components/DashboardLoginModal";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/contexts/auth";

export default function LoginTestPage() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const { authState, login, setAuthState } = useAuth();

  const handleLoginSuccess = (userData) => {
    console.log("Login successful:", userData);
    console.log("Setting auth state with:", userData);
    setAuthState({
      user: userData,
      isLoading: false,
      isAuthenticated: true,
    });
    setIsLoginModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-3xl font-bold">Login Flow Test</h1>
          <p className="text-muted-foreground mt-2">
            Test the new phone-based login system
          </p>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Current Auth Status:</h3>
            <p>
              Authenticated: {authState.isAuthenticated ? "✅ Yes" : "❌ No"}
            </p>
            {authState.user && (
              <div className="mt-2 text-sm">
                <p>Name: {authState.user.fullName || "Not set"}</p>
                <p>Phone: {authState.user.phone}</p>
                <p>Email: {authState.user.email || "Not set"}</p>
                <p>Role: {authState.user.role}</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Button
              onClick={() => setIsLoginModalOpen(true)}
              className="w-full"
            >
              Test New Login Flow
            </Button>

            {authState.isAuthenticated && (
              <Button
                variant="outline"
                onClick={() => login()}
                className="w-full"
              >
                Switch User (Test)
              </Button>
            )}
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              <strong>New Login Flow:</strong>
            </p>
            <p>1. Enter phone number (mandatory)</p>
            <p>2. Verify OTP (6 digits)</p>
            <p>3. New users: Enter full name (mandatory) + email (optional)</p>
            <p>4. Existing users: Direct login</p>
          </div>
        </div>
      </div>

      <DashboardLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
}
