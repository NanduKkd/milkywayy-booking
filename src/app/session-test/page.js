"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/contexts/auth";

export default function SessionTestPage() {
  const { authState } = useAuth();
  const [cookieStatus, setCookieStatus] = useState("Checking...");
  const [redirectTest, setRedirectTest] = useState("Not tested");

  useEffect(() => {
    // Check if session cookie exists
    const checkCookie = async () => {
      try {
        const response = await fetch("/api/check-session");
        const data = await response.json();
        setCookieStatus(data.hasSession ? "Session exists" : "No session");
      } catch (_error) {
        setCookieStatus("Error checking session");
      }
    };

    checkCookie();
  }, []);

  const testRedirect = () => {
    setRedirectTest("Testing...");
    // Simulate redirect like Stripe would do
    setTimeout(() => {
      window.location.href = "/booking/cancel?session_id=test_cs_12345";
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center text-foreground p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center space-y-6">
        <h1 className="text-2xl font-bold">Session Persistence Test</h1>

        <div className="space-y-4 text-left">
          <div className="p-3 bg-muted rounded">
            <strong>Client-side Auth State:</strong>
            <p>
              Authenticated: {authState.isAuthenticated ? "✅ Yes" : "❌ No"}
            </p>
            {authState.user && (
              <p>User: {authState.user.fullName || authState.user.phone}</p>
            )}
          </div>

          <div className="p-3 bg-muted rounded">
            <strong>Server-side Session:</strong>
            <p>{cookieStatus}</p>
          </div>

          <div className="p-3 bg-muted rounded">
            <strong>Redirect Test:</strong>
            <p>{redirectTest}</p>
          </div>
        </div>

        <div className="pt-4 space-y-2">
          <button
            type="button"
            onClick={testRedirect}
            className="inline-block bg-orange-500 text-white font-semibold px-6 py-3 rounded-xl hover:bg-orange-600 transition-colors w-full"
          >
            🔄 Test Stripe-like Redirect
          </button>

          <a
            href="/booking"
            className="inline-block bg-primary text-primary-foreground font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity w-full"
          >
            📅 Go to Booking
          </a>

          <a
            href="/booking/cancel?session_id=test_session"
            className="inline-block bg-secondary text-secondary-foreground font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity w-full"
          >
            ❌ Direct to Cancel Page
          </a>
        </div>

        <div className="text-xs text-muted-foreground">
          <p>
            <strong>Test Instructions:</strong>
          </p>
          <p>1. Make sure you're logged in</p>
          <p>2. Click "Test Stripe-like Redirect"</p>
          <p>3. After redirect, check if you're still logged in</p>
        </div>
      </div>
    </div>
  );
}
