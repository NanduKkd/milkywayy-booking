"use client";

import Link from "next/link";
import { XCircle } from "lucide-react";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { cancelBookingBySessionId } from "@/lib/actions/bookings";

export default function BookingCancelPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (sessionId) {
      cancelBookingBySessionId(sessionId)
        .then((res) => {
          if (!res.success)
            console.error("Failed to cancel booking:", res.message);
        })
        .catch((err) => console.error("Failed to cancel booking:", err));
    }
  }, [sessionId]);

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
        <div className="pt-4">
          <Link
            href="/booking"
            className="inline-block bg-zinc-800 text-white font-semibold px-6 py-3 rounded-xl hover:bg-zinc-700 transition-colors"
          >
            Return to Booking
          </Link>
        </div>
      </div>
    </div>
  );
}
