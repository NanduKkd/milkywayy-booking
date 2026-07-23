import { getBookings } from "@/lib/actions/bookings";
import { auth } from "@/lib/helpers/auth";
import {
  DELIVERY_FILE_STATUS,
  isCustomerDeliveryFileVisible,
  isCustomerFileVisible,
} from "@/lib/helpers/bookingWorkflow";
import { getPropertySharingDashboard } from "@/lib/services/propertySharing";
import FileList from "./FileList";
import PropertySharingManager from "./PropertySharingManager";

function parseRequestedFileId(rawValue) {
  const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;

  if (value === undefined || value === null) {
    return {
      requestedFileId: null,
      requestedFileIdWasProvided: false,
    };
  }

  const normalized = String(value).trim();

  if (!/^\d+$/u.test(normalized)) {
    return {
      requestedFileId: null,
      requestedFileIdWasProvided: true,
    };
  }

  const requestedFileId = Number(normalized);

  if (!Number.isSafeInteger(requestedFileId) || requestedFileId <= 0) {
    return {
      requestedFileId: null,
      requestedFileIdWasProvided: true,
    };
  }

  return {
    requestedFileId,
    requestedFileIdWasProvided: true,
  };
}

export default async function FilesPage({ searchParams }) {
  const session = await auth();
  const resolvedSearchParams = await searchParams;
  const { requestedFileId, requestedFileIdWasProvided } = parseRequestedFileId(
    resolvedSearchParams?.fileId,
  );

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
  const requestedFileAvailable = requestedFileId
    ? bookingsWithFiles.some((booking) =>
        booking.deliveryFiles.some((file) => file.id === requestedFileId),
      )
    : false;

  return (
    <div>
      <div className="max-w-6xl mx-auto">
        <PropertySharingManager initialData={propertySharing} />
        <h2
          id="delivered-files"
          className="mb-4 scroll-mt-24 text-xl font-semibold text-white"
        >
          Delivered files
        </h2>
        <FileList
          bookings={bookingsWithFiles}
          highlightedFileId={requestedFileAvailable ? requestedFileId : null}
          requestedFileAvailable={requestedFileAvailable}
          requestedFileIdWasProvided={requestedFileIdWasProvided}
        />
      </div>
    </div>
  );
}
