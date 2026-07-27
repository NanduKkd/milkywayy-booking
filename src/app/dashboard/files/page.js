import { getBookings } from "@/lib/actions/bookings";
import { auth } from "@/lib/helpers/auth";
import {
  DELIVERY_FILE_STATUS,
  isCustomerDeliveryFileVisible,
  isCustomerFileVisible,
} from "@/lib/helpers/bookingWorkflow";
import { projectDeliveryServiceGroups } from "@/lib/services/deliveryServiceGroups";
import { getPropertySharingDashboard } from "@/lib/services/propertySharing";
import PropertySharingManager from "./PropertySharingManager";

export default async function FilesPage() {
  const session = await auth();

  if (!session) {
    return null;
  }

  const [res, propertySharing] = await Promise.all([
    getBookings(session.id),
    getPropertySharingDashboard(session.id),
  ]);
  const bookings = res.success ? res.data : [];
  const bookingsWithFiles = bookings
    .map((b) => {
      const booking = b.toJSON();
      const deliveryFiles = Array.isArray(booking.deliveryFiles)
        ? booking.deliveryFiles
        : [];
      const safeDeliveryFiles = deliveryFiles.map(
        ({ versions: _versions, fileRevisions: _revisions, ...file }) => file,
      );
      const pendingReplacementCount = safeDeliveryFiles.filter(
        (file) =>
          !file.deletedAt &&
          file.status === DELIVERY_FILE_STATUS.CHANGES_REQUESTED,
      ).length;

      return {
        ...booking,
        pendingReplacementCount,
        deliveryFiles: safeDeliveryFiles
          .filter(isCustomerDeliveryFileVisible)
          .map((file) => file),
        serviceGroups: projectDeliveryServiceGroups(safeDeliveryFiles),
      };
    })
    .filter(
      (booking) =>
        isCustomerFileVisible(booking) ||
        booking.serviceGroups.some(
          (group) => group.status === DELIVERY_FILE_STATUS.CHANGES_REQUESTED,
        ),
    );

  return (
    <div>
      <PropertySharingManager
        initialData={propertySharing}
        bookings={bookingsWithFiles}
      />
    </div>
  );
}
