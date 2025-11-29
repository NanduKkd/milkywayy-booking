import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { verifyStripeSession } from "@/lib/actions/bookings";

export default async function BookingSuccessPage({ searchParams }) {
  const { session_id } = await searchParams;

  if (session_id) {
    await verifyStripeSession(session_id);
  }

  return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center text-white p-4">
      <div className="max-w-md w-full bg-[#181818] border border-zinc-800 rounded-2xl p-8 text-center space-y-6">
        <div className="flex justify-center">
          <CheckCircle className="w-20 h-20 text-green-500" />
        </div>
        <h1 className="text-3xl font-bold">Payment Successful!</h1>
        <p className="text-gray-400">
          Your booking has been confirmed. We have sent a confirmation email to
          your registered address.
        </p>
        <div className="pt-4">
          <Link
            href="/booking"
            className="inline-block bg-white text-black font-semibold px-6 py-3 rounded-xl hover:bg-gray-200 transition-colors"
          >
            Book Another Property
          </Link>
        </div>
      </div>
    </div>
  );
}
