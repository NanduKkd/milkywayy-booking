"use client";

import { CheckCircle2, Download, Link2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import ServiceDeliveryModal from "@/components/customer-delivery/ServiceDeliveryModal";
import { Button } from "@/components/ui/button";
import { completeDeliveredBooking } from "@/lib/actions/bookings";
import {
  DELIVERY_FILE_STATUS,
  isCustomerDeliveryFileVisible,
} from "@/lib/helpers/bookingWorkflow";
import { projectDeliveryServiceGroups } from "@/lib/services/deliveryServiceGroups";
import CreatePropertyShareDialog from "./CreatePropertyShareDialog";

const canCompleteBooking = (booking, files) =>
  Boolean(booking.deliveryFinishedAt) &&
  !booking.completedAt &&
  Number(booking.pendingReplacementCount || 0) === 0 &&
  files.length > 0 &&
  files.every((file) =>
    [DELIVERY_FILE_STATUS.UNDER_REVIEW, DELIVERY_FILE_STATUS.ACCEPTED].includes(
      file.status,
    ),
  );

const propertyTitle = (booking) =>
  [
    booking.propertyDetails?.unit,
    booking.propertyDetails?.building,
    booking.propertyDetails?.community,
  ]
    .filter(Boolean)
    .join(", ") || "Property Shoot";

const groupSummary = (group) => {
  if (group.status === DELIVERY_FILE_STATUS.CHANGES_REQUESTED) {
    return `${group.label || group.type}: replacement pending`;
  }
  if (group.status === DELIVERY_FILE_STATUS.ACCEPTED) {
    return `${group.label || group.type}: delivered`;
  }
  return `${group.label || group.type}: ready for review`;
};

export default function FileList({
  bookings,
  propertySharing = { eligibleProperties: [], shares: [] },
}) {
  const router = useRouter();
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [loadingBookingId, setLoadingBookingId] = useState(null);
  const [createShareProperty, setCreateShareProperty] = useState(null);

  const visibleBookings = (bookings || [])
    .map((booking) => {
      const allFiles = booking.deliveryFiles || [];
      const deliveryFiles = allFiles.filter(isCustomerDeliveryFileVisible);
      return {
        ...booking,
        pendingReplacementCount:
          booking.pendingReplacementCount ??
          allFiles.filter(
            (file) =>
              !file.deletedAt &&
              file.status === DELIVERY_FILE_STATUS.CHANGES_REQUESTED,
          ).length,
        deliveryFiles,
        serviceGroups:
          booking.serviceGroups || projectDeliveryServiceGroups(allFiles),
      };
    })
    .filter(
      (booking) =>
        booking.deliveryFiles.length > 0 ||
        booking.serviceGroups.some(
          (group) => group.status === DELIVERY_FILE_STATUS.CHANGES_REQUESTED,
        ),
    );

  const completeBooking = async (bookingId) => {
    setLoadingBookingId(bookingId);
    try {
      const result = await completeDeliveredBooking(bookingId);
      if (!result.success) throw new Error(result.message);
      toast.success("Project marked as completed.");
      router.refresh();
    } catch (error) {
      toast.error(error.message || "Unable to complete project");
    } finally {
      setLoadingBookingId(null);
    }
  };

  if (visibleBookings.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#101114]/80 p-6 text-sm text-muted-foreground">
        No files available yet.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {visibleBookings.map((booking) => {
          const shareableProperty = propertySharing.eligibleProperties.find(
            (property) => property.id === booking.id,
          );
          const existingShare = propertySharing.shares.some(
            (share) =>
              share.kind === "SINGLE_PROPERTY" &&
              share.properties.some(
                (property) => property.bookingId === booking.id,
              ),
          );
          return (
            <section
              key={booking.id}
              data-testid={`delivered-project-${booking.id}`}
              className="rounded-[18px] border border-white/10 bg-[#131315] p-5 sm:p-6"
            >
              <div
                data-testid={`delivered-project-header-${booking.id}`}
                className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
              >
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-extrabold text-white sm:text-xl">
                    {propertyTitle(booking)}
                  </h2>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold">
                    {booking.serviceGroups.map((group) => (
                      <span
                        key={group.type}
                        className={
                          group.status === DELIVERY_FILE_STATUS.ACCEPTED
                            ? "text-emerald-300"
                            : group.status ===
                                DELIVERY_FILE_STATUS.CHANGES_REQUESTED
                              ? "text-amber-200"
                              : "text-sky-200"
                        }
                      >
                        {groupSummary(group)}
                      </span>
                    ))}
                  </div>
                  {!booking.deliveryFinishedAt ? (
                    <p className="mt-2 text-xs text-amber-200">
                      More files may still be added by the team.
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => setSelectedBooking(booking)}
                  >
                    <Download className="h-4 w-4" />
                    Download Files
                  </Button>
                  {shareableProperty && !existingShare ? (
                    <Button
                      type="button"
                      className="rounded-xl bg-white text-black hover:bg-zinc-200"
                      onClick={() => setCreateShareProperty(shareableProperty)}
                    >
                      <Link2 className="h-4 w-4" />
                      Create Share Link
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
                <span className="text-sm text-zinc-400">
                  {booking.deliveryFiles.length}{" "}
                  {booking.deliveryFiles.length === 1 ? "file" : "files"} across{" "}
                  {booking.serviceGroups.length}{" "}
                  {booking.serviceGroups.length === 1 ? "service" : "services"}
                </span>
                {booking.completedAt ? (
                  <span className="inline-flex items-center gap-2 text-sm text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" />
                    Project completed
                  </span>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    disabled={
                      !canCompleteBooking(booking, booking.deliveryFiles) ||
                      loadingBookingId === booking.id
                    }
                    onClick={() => completeBooking(booking.id)}
                  >
                    {loadingBookingId === booking.id
                      ? "Completing..."
                      : booking.deliveryFinishedAt
                        ? Number(booking.pendingReplacementCount || 0) > 0
                          ? "Changes Pending"
                          : "Mark Complete"
                        : "Delivery In Progress"}
                  </Button>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <ServiceDeliveryModal
        booking={selectedBooking}
        open={Boolean(selectedBooking)}
        onOpenChange={(open) => {
          if (!open) setSelectedBooking(null);
        }}
      />
      {createShareProperty ? (
        <CreatePropertyShareDialog
          property={createShareProperty}
          savedContacts={propertySharing.savedContacts || []}
          onClose={() => setCreateShareProperty(null)}
        />
      ) : null}
    </>
  );
}
