import { getBookings } from "@/lib/actions/bookings";
import { auth } from "@/lib/helpers/auth";
import BookingList from "./BookingList";
import { redirect } from "next/navigation";

export default async function BookingsPage() {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  const res = await getBookings(session.id);
  const bookings = res.success ? res.data : [];
  const plainBookings = bookings.map((b) => b.toJSON());

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <BookingList bookings={plainBookings} />
      </div>
    </div>
  );
}
