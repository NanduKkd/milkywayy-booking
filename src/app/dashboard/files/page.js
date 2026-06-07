import { redirect } from "next/navigation";
import { getBookings } from "@/lib/actions/bookings";
import { auth } from "@/lib/helpers/auth";
import {
  DELIVERY_FILE_STATUS,
  isCustomerDeliveryFileVisible,
  isCustomerFileVisible,
} from "@/lib/helpers/bookingWorkflow";
import FileList from "./FileList";

export default async function FilesPage() {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  const res = await getBookings(session.id);
  const bookings = res.success ? res.data : [];
  const bookingsWithFiles = bookings
    .map((b) => {
      const booking = b.toJSON();
      const deliveryFiles = Array.isArray(booking.deliveryFiles)
        ? booking.deliveryFiles
        : [];
      const pendingReplacementCount = deliveryFiles.filter(
        (file) =>
          !file.deletedAt &&
          file.status === DELIVERY_FILE_STATUS.CHANGES_REQUESTED,
      ).length;

      return {
        ...booking,
        pendingReplacementCount,
        deliveryFiles: deliveryFiles
          .filter(isCustomerDeliveryFileVisible)
          .map(
            ({ versions: _versions, fileRevisions: _revisions, ...file }) =>
              file,
          ),
      };
    })
    .filter((b) => isCustomerFileVisible(b));

  return (
    <div>
      <div className="max-w-6xl mx-auto">
        <FileList bookings={bookingsWithFiles} />
      </div>
    </div>
  );
}
