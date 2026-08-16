"use client";

import { XCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { cancelBookingBySessionId } from "@/lib/actions/bookings";
import { useAuth } from "@/lib/contexts/auth";

export default function BookingCancelPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { authState } = useAuth();
  const [cancelResult, setCancelResult] = useState(null);

  useEffect(() => {
    // Debug session state
    console.log("Cancel page - Auth state:", authState);
    console.log("Cancel page - Session ID:", sessionId);

    if (sessionId) {
      cancelBookingBySessionId(sessionId)
        .then((res) => {
          console.log("Cancel result:", res);
          setCancelResult(res);
          if (!res.success)
            console.error("Failed to cancel booking:", res.message);
        })
        .catch((err) => {
          console.error("Failed to cancel booking:", err);
          setCancelResult({ success: false, message: err.message });
        });
    }
  }, [sessionId, authState]);

  return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center text-white p-4">
      <div className="max-w-md w-full bg-[#181818] border border-zinc-800 rounded-2xl p-8 text-center space-y-6">
        <div className="flex justify-center">
          <XCircle className="w-20 h-20 text-red-500" />
        </div>
        <h1 className="text-3xl font-bold">Payment Cancelled</h1>
        <p className="text-gray-400">
          Your payment was cancelled. No charges were made.
        </p>

        {/* Debug Information */}
        {process.env.NODE_ENV === "development" && (
          <div className="text-xs text-gray-500 text-left space-y-1">
            <p>
              <strong>Debug Info:</strong>
            </p>
            <p>Session ID: {sessionId}</p>
            <p>Authenticated: {authState.isAuthenticated ? "Yes" : "No"}</p>
            <p>
              User:{" "}
              {authState.user?.fullName || authState.user?.phone || "None"}
            </p>
            <p>
              Cancel Result:{" "}
              {cancelResult
                ? cancelResult.success
                  ? "Success"
                  : "Failed"
                : "Pending"}
            </p>
          </div>
        )}

        <div className="pt-4">
          <Link
            href="/booking"
            className="inline-block bg-zinc-800 text-white font-semibold px-6 py-3 rounded-xl hover:bg-zinc-700 transition-colors"
          >
            Return to Booking
          </Link>
        </div>

        <div className="pt-2">
          <Link
            href="/session-test"
            className="inline-block text-zinc-400 text-sm hover:text-zinc-300 transition-colors"
          >
            Test Session Persistence
          </Link>
        </div>
      </div>
    </div>
  );
}
