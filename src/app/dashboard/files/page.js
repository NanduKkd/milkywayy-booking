import { redirect } from "next/navigation";
import { getBookings } from "@/lib/actions/bookings";
import { auth } from "@/lib/helpers/auth";
import { isCustomerFileVisible } from "@/lib/helpers/bookingWorkflow";
import FileList from "./FileList";

export default async function FilesPage() {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  const res = await getBookings(session.id);
  const bookings = res.success ? res.data : [];
  // Filter for bookings with filesUrl
  const bookingsWithFiles = bookings
    .map((b) => b.toJSON())
    .filter((b) => b.filesUrl && isCustomerFileVisible(b));

  return (
    <div>
      <div className="max-w-6xl mx-auto">
        <FileList bookings={bookingsWithFiles} />
      </div>
    </div>
  );
}
