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
            <div key={booking.id} className="space-y-3">
              <section
                data-testid={`delivered-project-${booking.id}`}
                className="overflow-hidden rounded-[18px] border border-white/10 bg-[#131315]"
              >
                <div className="grid lg:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.95fr)]">
                  <div
                    aria-hidden="true"
                    className="relative flex min-h-56 items-center justify-center overflow-hidden bg-[radial-gradient(120%_90%_at_75%_10%,#31405a_0%,transparent_54%),linear-gradient(160deg,#273650_0%,#121721_75%)] sm:min-h-72"
                  >
                    <div className="grid h-28 w-48 place-items-center rounded-2xl border-[3px] border-[#667797]/50 bg-[#314361]/45 text-center text-[10px] font-extrabold tracking-[0.18em] text-[#9caccc]/70 sm:h-36 sm:w-60">
                      PHOTO READY
                    </div>
                    <span className="absolute bottom-3 right-3 rounded-full bg-black/45 px-3 py-1.5 text-[10px] font-bold text-zinc-100 backdrop-blur">
                      {booking.deliveryFiles.length} delivered file
                      {booking.deliveryFiles.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div
                    data-testid={`delivered-project-header-${booking.id}`}
                    className="flex min-w-0 flex-col p-5 sm:p-6"
                  >
                    <div>
                      <h2 className="truncate text-lg font-extrabold text-white sm:text-xl">
                        {propertyTitle(booking)}
                      </h2>
                      <div className="mt-1 flex flex-wrap gap-x-2 text-sm text-zinc-400">
                        <span>
                          {booking.propertyDetails?.community ||
                            "Property shoot"}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {booking.completedAt
                            ? `Delivered ${new Intl.DateTimeFormat("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              }).format(new Date(booking.completedAt))}`
                            : "Delivered files ready"}
                        </span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {booking.serviceGroups.map((group) => (
                          <span
                            key={group.type}
                            className={
                              group.status === DELIVERY_FILE_STATUS.ACCEPTED
                                ? "rounded-full border border-emerald-400/35 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-bold text-emerald-300"
                                : group.status ===
                                    DELIVERY_FILE_STATUS.CHANGES_REQUESTED
                                  ? "rounded-full border border-amber-300/35 bg-amber-300/10 px-2.5 py-1 text-[11px] font-bold text-amber-200"
                                  : "rounded-full border border-sky-300/35 bg-sky-300/10 px-2.5 py-1 text-[11px] font-bold text-sky-200"
                            }
                          >
                            {groupSummary(group)}
                          </span>
                        ))}
                      </div>
                      {!booking.deliveryFinishedAt ? (
                        <p className="mt-3 text-xs text-amber-200">
                          More files may still be added by the team.
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-6 flex flex-wrap gap-2 lg:mt-auto">
                      {shareableProperty && !existingShare ? (
                        <Button
                          type="button"
                          className="min-h-12 flex-1 rounded-xl bg-white text-black hover:bg-zinc-200"
                          onClick={() =>
                            setCreateShareProperty(shareableProperty)
                          }
                        >
                          <Link2 className="h-4 w-4" />
                          Create Share Link
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-12 flex-1 rounded-xl"
                        onClick={() => setSelectedBooking(booking)}
                      >
                        <Download className="h-4 w-4" />
                        Download Files
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-3.5 sm:px-6">
                  <span className="text-sm text-zinc-400">
                    {booking.deliveryFiles.length}{" "}
                    {booking.deliveryFiles.length === 1 ? "file" : "files"}{" "}
                    across {booking.serviceGroups.length}{" "}
                    {booking.serviceGroups.length === 1
                      ? "service"
                      : "services"}
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
            </div>
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
