"use client";

import { useState } from "react";
import { cancelBooking } from "@/lib/actions/bookings";
import { useRouter } from "next/navigation";

export default function BookingList({ bookings }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState(null);

  const handleCancel = async (id) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;

    setLoadingId(id);
    try {
      const res = await cancelBooking(id);
      if (!res.success) throw new Error(res.message);
      router.refresh();
    } catch (error) {
      alert(error.message || "Failed to cancel booking");
    } finally {
      setLoadingId(null);
    }
  };

  const handleReschedule = (id) => {
    alert("Reschedule functionality coming soon!");
  };

  if (!bookings || bookings.length === 0) {
    return <p className="text-gray-400">No bookings found.</p>;
  }

  return (
    <div className="space-y-4">
      {bookings.map((booking) => (
        <div
          key={booking.id}
          className="bg-gray-900 p-6 rounded-lg border border-gray-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <div>
            <div className="text-xl font-semibold mb-2 text-white">
              {booking.shootDetails?.services?.join(", ") || "Property Shoot"}
            </div>
            <div className="text-gray-400 space-y-1 text-sm">
              <p>
                <span className="font-medium text-gray-300">Date:</span>{" "}
                {booking.date}
              </p>
              <p>
                <span className="font-medium text-gray-300">Time:</span>{" "}
                {booking.slot === 1
                  ? "Morning"
                  : booking.slot === 2
                    ? "Afternoon"
                    : "Evening"}
              </p>
              <p>
                <span className="font-medium text-gray-300">Address:</span>{" "}
                {[
                  booking.propertyDetails?.unit,
                  booking.propertyDetails?.building,
                  booking.propertyDetails?.community,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              <p>
                <span className="font-medium text-gray-300">Status:</span>{" "}
                {booking.cancelledAt ? (
                  <span className="text-red-500 font-semibold">Cancelled</span>
                ) : booking.completedAt ? (
                  <span className="text-green-500 font-semibold">
                    Completed
                  </span>
                ) : (
                  <span className="text-blue-500 font-semibold">Upcoming</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            {!booking.cancelledAt && !booking.completedAt && (
              <>
                <button
                  onClick={() => handleReschedule(booking.id)}
                  className="flex-1 md:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
                >
                  Reschedule
                </button>
                <button
                  onClick={() => handleCancel(booking.id)}
                  disabled={loadingId === booking.id}
                  className="flex-1 md:flex-none px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingId === booking.id ? "Cancelling..." : "Cancel"}
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
