import { getBookings } from "@/lib/actions/bookings";
import { auth } from "@/lib/helpers/auth";
import BookingList from "./BookingList";
import { redirect } from "next/navigation";

export default async function BookingsPage() {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  const bookings = await getBookings(session.id);
  const plainBookings = bookings.map((b) => b.toJSON());

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
          My Bookings
        </h1>
        <BookingList bookings={plainBookings} />
      </div>
    </div>
  );
}
