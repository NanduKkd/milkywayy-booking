import { redirect } from "next/navigation";
import { getBookings } from "@/lib/actions/bookings";
import { auth } from "@/lib/helpers/auth";
import { getPropertySharingDashboard } from "@/lib/services/propertySharing";
import BookingList from "./BookingList";

export default async function BookingsPage() {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  const [res, propertySharing] = await Promise.all([
    getBookings(session.id),
    getPropertySharingDashboard(session.id),
  ]);
  const bookings = res.success ? res.data : [];
  const plainBookings = bookings.map((booking) => booking.toJSON());

  return (
    <div className="text-white">
      <div className="w-full">
        <BookingList
          bookings={plainBookings}
          propertySharing={propertySharing}
        />
      </div>
    </div>
  );
}
