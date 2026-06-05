"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import BookingWorkflowTracker from "@/components/BookingWorkflowTracker";
import DateSlotPicker from "@/components/DateSlotPicker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  cancelBooking,
  completeDeliveredBooking,
  requestBookingRevision,
  rescheduleBookingByCode,
} from "@/lib/actions/bookings";
import {
  getBookingArrivalWindowFromDetails,
  getBookingLoadBreakdown,
  getDynamicTwilightSlotLabel,
  isNightServiceSelected,
} from "@/lib/helpers/bookingUtils";
import {
  BOOKING_WORKFLOW_STATUS,
  getWorkflowStatus,
  MAX_BOOKING_REVISIONS,
} from "@/lib/helpers/bookingWorkflow";
import {
  buildInvoiceDownloadUrl,
  formatBookingReference,
  formatInvoiceNumber,
} from "@/lib/helpers/invoice-format";

const RESCHEDULE_CUTOFF_HOURS = 6;
const PARTIAL_REFUND_CUTOFF_HOURS = 3;

export default function BookingList({ bookings }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(null);
  const [rescheduleSlot, setRescheduleSlot] = useState(null);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [selectedRescheduleBooking, setSelectedRescheduleBooking] =
    useState(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [selectedCancelBooking, setSelectedCancelBooking] = useState(null);
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [selectedRevisionBooking, setSelectedRevisionBooking] = useState(null);
  const [revisionNote, setRevisionNote] = useState("");
  const [reviewActionLoading, setReviewActionLoading] = useState(null);
  const selectedTransaction = selectedBooking?.transaction;
  const selectedInvoiceNumber = selectedTransaction?.id
    ? formatInvoiceNumber(selectedTransaction)
    : null;
  const selectedInvoiceDownloadUrl =
    selectedTransaction?.invoiceUrl && selectedInvoiceNumber
      ? buildInvoiceDownloadUrl(
          selectedTransaction.invoiceUrl,
          selectedInvoiceNumber,
        )
      : null;

  const getBookingDateTime = (booking) => {
    if (!booking?.date) return null;
    const startTime = getBookingStartTime(booking);
    if (!startTime || !String(startTime).includes(":")) return null;

    const [y, m, d] = String(booking.date).split("-").map(Number);
    const [hh, mm] = String(startTime).split(":").map(Number);
    if (![y, m, d, hh, mm].every(Number.isFinite)) return null;
    return new Date(y, m - 1, d, hh, mm, 0, 0);
  };

  const getBookingStartTime = (booking) =>
    booking?.startTime ||
    (booking?.slot === 1
      ? "09:00"
      : booking?.slot === 2
        ? "13:00"
        : booking?.slot === 3
          ? "17:00"
          : null);

  const getBookingServices = (booking) =>
    Array.isArray(booking?.shootDetails?.services)
      ? booking.shootDetails.services
      : [];

  const getBookingVideographySubService = (booking) =>
    booking?.shootDetails?.videographySubService || "";

  const getBookingLoad = (booking) =>
    getBookingLoadBreakdown({
      propertyType: booking?.propertyDetails?.type || "",
      propertySize: booking?.propertyDetails?.size || "",
      services: getBookingServices(booking),
      videographySubService: getBookingVideographySubService(booking),
    });

  const getBookingSlotLabel = (booking) => {
    if (!booking) return "Scheduled";
    if (getRescheduleIsNightService(booking)) {
      return getDynamicTwilightSlotLabel(getBookingLoad(booking).totalLoad);
    }

    const startTime = getBookingStartTime(booking);
    if (!startTime) return "Scheduled";
    if (startTime < "13:00") return "Morning";
    if (startTime < "17:00") return "Afternoon";
    return "Evening";
  };

  const getBookingArrivalWindow = (booking) =>
    getBookingArrivalWindowFromDetails({
      startTime: getBookingStartTime(booking),
      propertyType: booking?.propertyDetails?.type || "",
      propertySize: booking?.propertyDetails?.size || "",
      services: getBookingServices(booking),
      videographySubService: getBookingVideographySubService(booking),
    });

  const getBookingDisplayStartTime = (booking) =>
    getBookingArrivalWindow(booking).split(" - ")[0] ||
    getBookingStartTime(booking);

  const getHoursUntilBooking = (booking) => {
    const dt = getBookingDateTime(booking);
    if (!dt) return null;
    return (dt.getTime() - Date.now()) / (1000 * 60 * 60);
  };

  const getActionPolicy = (booking) => {
    const hoursLeft = getHoursUntilBooking(booking);
    return {
      hoursLeft,
      canReschedule:
        typeof hoursLeft === "number"
          ? hoursLeft >= RESCHEDULE_CUTOFF_HOURS
          : true,
      isPast: typeof hoursLeft === "number" ? hoursLeft < 0 : false,
      partialRefundEligible:
        typeof hoursLeft === "number" &&
        hoursLeft >= 0 &&
        hoursLeft <= PARTIAL_REFUND_CUTOFF_HOURS,
    };
  };

  const handleCancelConfirm = async () => {
    if (!selectedCancelBooking) return;
    setLoadingId(selectedCancelBooking.id);
    try {
      const res = await cancelBooking(selectedCancelBooking.id);
      if (!res.success) throw new Error(res.message);
      const refundType = res.data?.refundType;
      const refundAmount = Number(res.data?.refundAmount || 0);
      if (refundType === "partial" && refundAmount > 0) {
        toast.success(
          `Booking cancelled. Partial refund AED ${refundAmount} initiated.`,
        );
      } else if (refundType === "full" && refundAmount > 0) {
        toast.success(
          `Booking cancelled. Full refund AED ${refundAmount} initiated.`,
        );
      } else {
        toast.success("Booking cancelled successfully.");
      }
      setCancelOpen(false);
      setSelectedCancelBooking(null);
      router.refresh();
    } catch (error) {
      alert(error.message || "Failed to cancel booking");
    } finally {
      setLoadingId(null);
    }
  };

  const handleReschedule = (booking) => {
    const policy = getActionPolicy(booking);
    if (!policy.canReschedule) {
      toast.error(
        `Reschedule is allowed only up to ${RESCHEDULE_CUTOFF_HOURS} hours before shoot time.`,
      );
      return;
    }
    setSelectedRescheduleBooking(booking);
    setRescheduleDate(booking.date);
    setRescheduleSlot(
      booking.startTime ||
        (booking.slot === 1
          ? "09:00"
          : booking.slot === 2
            ? "13:00"
            : booking.slot === 3
              ? "17:00"
              : ""),
    );
    setRescheduleOpen(true);
  };

  const handleRescheduleConfirm = async () => {
    if (!rescheduleDate || !rescheduleSlot) {
      toast.error("Please select both date and time");
      return;
    }

    setRescheduleLoading(true);
    try {
      const bookingCode = formatBookingReference(selectedRescheduleBooking);
      const res = await rescheduleBookingByCode(bookingCode, {
        date: rescheduleDate,
        startTime: rescheduleSlot,
      });

      if (res.success) {
        toast.success("Booking rescheduled successfully!");
        setRescheduleOpen(false);
        router.refresh();
      } else {
        toast.error(res.message || "Failed to reschedule booking");
      }
    } catch (_error) {
      toast.error("Failed to reschedule booking");
    } finally {
      setRescheduleLoading(false);
    }
  };

  const handleBookingClick = (booking) => {
    setSelectedBooking(booking);
    setIsOpen(true);
  };

  const handleCompleteDelivery = async (booking) => {
    setReviewActionLoading(`complete-${booking.id}`);
    try {
      const res = await completeDeliveredBooking(booking.id);
      if (!res.success) throw new Error(res.message);
      toast.success("Project marked as completed.");
      setIsOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error.message || "Unable to complete project");
    } finally {
      setReviewActionLoading(null);
    }
  };

  const openRevisionDialog = (booking) => {
    setIsOpen(false);
    setSelectedRevisionBooking(booking);
    setRevisionNote("");
    setRevisionOpen(true);
  };

  const handleRequestRevision = async () => {
    if (!selectedRevisionBooking || !revisionNote.trim()) return;
    setReviewActionLoading(`revision-${selectedRevisionBooking.id}`);
    try {
      const res = await requestBookingRevision(
        selectedRevisionBooking.id,
        revisionNote,
      );
      if (!res.success) throw new Error(res.message);
      toast.success("Revision request submitted.");
      setRevisionOpen(false);
      setIsOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error.message || "Unable to request revision");
    } finally {
      setReviewActionLoading(null);
    }
  };

  const formatReviewDeadline = (value) => {
    if (!value) return "";
    const deadline = new Date(value);
    if (Number.isNaN(deadline.getTime())) return "";
    const dateLabel = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Dubai",
      month: "long",
      day: "numeric",
    }).format(deadline);
    return `${dateLabel} at midnight (Dubai time)`;
  };

  const renderReviewActions = (booking) => {
    if (getWorkflowStatus(booking) !== BOOKING_WORKFLOW_STATUS.FILES_UPLOADED) {
      return null;
    }
    const revisionLimitReached =
      Number(booking.revisionCount || 0) >= MAX_BOOKING_REVISIONS;

    return (
      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <p className="text-sm font-medium text-zinc-200">
          Your files are ready for review
        </p>
        {booking.reviewDeadlineAt && (
          <p className="mt-1 text-xs text-muted-foreground">
            Complete or request changes by{" "}
            {formatReviewDeadline(booking.reviewDeadlineAt)}. The project will
            complete automatically after this deadline.
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              handleCompleteDelivery(booking);
            }}
            disabled={reviewActionLoading === `complete-${booking.id}`}
          >
            {reviewActionLoading === `complete-${booking.id}`
              ? "Completing..."
              : "Mark Complete"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(event) => {
              event.stopPropagation();
              openRevisionDialog(booking);
            }}
            disabled={revisionLimitReached}
          >
            {revisionLimitReached
              ? "Revision Limit Reached"
              : `Request Revision (${booking.revisionCount || 0}/${MAX_BOOKING_REVISIONS})`}
          </Button>
        </div>
      </div>
    );
  };

  const getStatusChip = (booking) => {
    if (booking.cancelledAt) {
      return (
        <span className="text-white text-sm font-medium  px-2 py-1 rounded">
          Cancelled
        </span>
      );
    } else if (
      booking.completedAt ||
      getWorkflowStatus(booking) === BOOKING_WORKFLOW_STATUS.PROJECT_COMPLETED
    ) {
      return (
        <span className="text-white text-sm font-medium  px-2 py-1 rounded">
          Completed
        </span>
      );
    } else {
      const workflowLabel = {
        [BOOKING_WORKFLOW_STATUS.SHOOT_BOOKED]: "Shoot Booked",
        [BOOKING_WORKFLOW_STATUS.SHOOT_DONE]: "Shoot Done",
        [BOOKING_WORKFLOW_STATUS.EDITING]: "Editing",
        [BOOKING_WORKFLOW_STATUS.FILES_UPLOADED]: "Files Uploaded",
      }[getWorkflowStatus(booking)];
      return (
        <span className="rounded bg-white/10 px-2 py-1 text-sm font-medium text-white">
          {workflowLabel || "Shoot Booked"}
        </span>
      );
    }
  };

  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date);
    } catch (_error) {
      return dateStr;
    }
  };

  const formatTime = (booking) => {
    const displayStartTime = getBookingDisplayStartTime(booking);
    if (displayStartTime) {
      const [h, m] = String(displayStartTime).split(":").map(Number);
      if (Number.isFinite(h) && Number.isFinite(m)) {
        const dt = new Date();
        dt.setHours(h, m, 0, 0);
        return new Intl.DateTimeFormat("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }).format(dt);
      }
      return displayStartTime;
    }

    if (booking?.slot === 1) return "10:00 AM";
    if (booking?.slot === 2) return "1:00 PM";
    if (booking?.slot === 3) return "4:00 PM";
    return "Scheduled";
  };

  const getServiceDetails = (booking) => {
    const services = Array.isArray(booking?.shootDetails?.services)
      ? booking.shootDetails.services
      : [];
    const videographySubService =
      booking?.shootDetails?.videographySubService || "";
    if (services.length === 0) return ["No services specified."];
    const videographySelections = String(videographySubService)
      .split("|")
      .map((v) => v.trim())
      .filter(Boolean);

    return services.flatMap((service) => {
      if (service === "Videography" && videographySelections.length > 0) {
        return videographySelections.map(
          (selection) => `${service} (${selection})`,
        );
      }
      return service;
    });
  };

  const getRescheduleDuration = (booking) => {
    const duration = Number(booking?.duration || 1);
    if (!Number.isFinite(duration)) return 1;
    return Math.min(Math.max(duration, 1), 2);
  };

  const getRescheduleIsNightService = (booking) => {
    const services = Array.isArray(booking?.shootDetails?.services)
      ? booking.shootDetails.services
      : [];
    const subService = booking?.shootDetails?.videographySubService || "";
    return isNightServiceSelected(services, subService);
  };

  if (!bookings || bookings.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-card/70 py-12 text-center">
        <p className="text-muted-foreground">No bookings found.</p>
      </div>
    );
  }

  const sortedBookings = [...bookings].sort(
    (a, b) =>
      new Date(b.createdAt || 0).getTime() -
      new Date(a.createdAt || 0).getTime(),
  );

  return (
    <div className="space-y-4">
      {sortedBookings.map((booking) => (
        // biome-ignore lint/a11y/useSemanticElements: The card contains nested action buttons.
        <div
          key={booking.id}
          role="button"
          tabIndex={0}
          aria-label={`View booking ${formatBookingReference(booking)}`}
          className={`group cursor-pointer rounded-2xl border border-border bg-card p-6 transition-colors hover:bg-card/90 ${getWorkflowStatus(booking) === BOOKING_WORKFLOW_STATUS.PROJECT_COMPLETED ? "opacity-75" : ""}`}
          onClick={() => handleBookingClick(booking)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              handleBookingClick(booking);
            }
          }}
        >
          <div className="flex justify-between items-start mb-4">
            <div className="space-y-1">
              <h3 className="font-heading text-lg leading-tight font-bold text-foreground">
                {[
                  booking.propertyDetails?.unit,
                  booking.propertyDetails?.building,
                  booking.propertyDetails?.community,
                ]
                  .filter(Boolean)
                  .join(", ") || "Property Shoot"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {booking.shootDetails?.services?.join(" + ") ||
                  "Standard Shoot"}
              </p>
            </div>
            <div className="text-right">
              <div className="leading-tight font-semibold text-foreground text-lg">
                {formatDate(booking.date)}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {booking.cancelledAt
                  ? "Cancelled"
                  : booking.completedAt
                    ? "Completed"
                    : formatTime(booking)}
              </div>
            </div>
          </div>

          <BookingWorkflowTracker booking={booking} className="my-5" />

          {renderReviewActions(booking)}

          {!booking.cancelledAt &&
            !booking.completedAt &&
            !getActionPolicy(booking).isPast && (
              <div className="flex gap-3 mt-2">
                {getActionPolicy(booking).canReschedule && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReschedule(booking);
                    }}
                    className="rounded-xl border border-border px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    Reschedule
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCancelBooking(booking);
                    setCancelOpen(true);
                  }}
                  disabled={loadingId === booking.id}
                  className="rounded-xl border border-border px-4 py-1.5 text-sm font-medium text-red-500 transition-colors hover:bg-destructive/10 disabled:opacity-50"
                >
                  {loadingId === booking.id
                    ? "Cancelling..."
                    : getActionPolicy(booking).partialRefundEligible
                      ? "Cancel (Partial Refund)"
                      : "Cancel"}
                </button>
              </div>
            )}
        </div>
      ))}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden border-white/10 bg-[#181818] p-0 text-white sm:max-w-2xl">
          <DialogHeader className="shrink-0 border-b border-white/10 px-6 py-5 pr-12">
            <DialogTitle>Booking Details #{selectedBooking?.id}</DialogTitle>
            <DialogDescription className="hidden">
              Details for booking #{selectedBooking?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="mb-1 text-sm text-muted-foreground">
                    Date & Slot
                  </p>
                  <p className="font-medium">{selectedBooking.date}</p>
                  <p className="text-sm text-muted-foreground">
                    Slot: {getBookingSlotLabel(selectedBooking)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Arrival: {getBookingArrivalWindow(selectedBooking)}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-sm text-muted-foreground">Status</p>
                  {getStatusChip(selectedBooking)}
                </div>
              </div>

              <BookingWorkflowTracker booking={selectedBooking} />

              {renderReviewActions(selectedBooking)}

              <div className="rounded-lg border border-white/10 bg-zinc-900/50 p-4">
                <h3 className="mb-3 font-semibold text-zinc-200">Services</h3>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {getServiceDetails(selectedBooking).map((serviceDetail) => (
                    <p key={serviceDetail}>- {serviceDetail}</p>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-zinc-900/50 p-4">
                <h3 className="mb-3 font-semibold text-zinc-200">
                  Property Details
                </h3>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>
                    <span className="font-medium text-zinc-300">Type:</span>{" "}
                    {selectedBooking.propertyDetails?.type}
                  </p>
                  <p>
                    <span className="font-medium text-zinc-300">Size:</span>{" "}
                    {selectedBooking.propertyDetails?.size}
                  </p>
                  <p>
                    <span className="font-medium text-zinc-300">Address:</span>{" "}
                    {[
                      selectedBooking.propertyDetails?.unit,
                      selectedBooking.propertyDetails?.building,
                      selectedBooking.propertyDetails?.community,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-zinc-900/50 p-4">
                <h3 className="mb-3 font-semibold text-zinc-200">
                  Transaction
                </h3>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="font-medium">
                      AED {selectedBooking.transaction?.amount}
                    </p>
                  </div>
                  {selectedInvoiceDownloadUrl ? (
                    <Button asChild variant="secondary" size="sm">
                      <Link href={selectedInvoiceDownloadUrl} target="_blank">
                        Download Invoice
                      </Link>
                    </Button>
                  ) : (
                    <span className="text-xs italic text-muted-foreground">
                      No invoice available
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="shrink-0 border-t border-white/10 px-6 py-4">
            <Button
              variant="ghost"
              onClick={() => setIsOpen(false)}
              className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden border-white/10 bg-[#181818] p-0 text-white sm:max-w-2xl">
          <DialogHeader className="shrink-0 border-b border-white/10 px-6 py-5 pr-12">
            <DialogTitle>Reschedule Booking</DialogTitle>
            <DialogDescription>
              Select a new date and time for your booking
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
            <div className="rounded-lg border border-white/10 bg-zinc-900/50 p-4">
              <h3 className="mb-3 font-semibold text-zinc-200">
                Current Booking
              </h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium text-zinc-300">
                    Booking Code:
                  </span>{" "}
                  <span className="font-mono text-[#f59e0b]">
                    {formatBookingReference(selectedRescheduleBooking)}
                  </span>
                </p>
                <p>
                  <span className="font-medium text-zinc-300">Property:</span>{" "}
                  {selectedRescheduleBooking?.propertyDetails?.unit}{" "}
                  {selectedRescheduleBooking?.propertyDetails?.building}
                </p>
                <p>
                  <span className="font-medium text-zinc-300">
                    Current Date:
                  </span>{" "}
                  {selectedRescheduleBooking?.date}
                </p>
                <p>
                  <span className="font-medium text-zinc-300">
                    Current Slot:
                  </span>{" "}
                  {getBookingSlotLabel(selectedRescheduleBooking)}
                </p>
                <p>
                  <span className="font-medium text-zinc-300">
                    Current Time:
                  </span>{" "}
                  {getBookingDisplayStartTime(selectedRescheduleBooking)}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-zinc-900/50 p-4">
              <h3 className="mb-3 font-semibold text-zinc-200">
                Select New Date & Time
              </h3>
              <DateSlotPicker
                date={rescheduleDate}
                slot={rescheduleSlot}
                onDateChange={setRescheduleDate}
                onSlotChange={setRescheduleSlot}
                minDate={new Date()}
                error={null}
                duration={getRescheduleDuration(selectedRescheduleBooking)}
                isNightService={getRescheduleIsNightService(
                  selectedRescheduleBooking,
                )}
                allowEvening={getRescheduleIsNightService(
                  selectedRescheduleBooking,
                )}
                blockedSlotsMap={{}}
                propertyType={
                  selectedRescheduleBooking?.propertyDetails?.type || ""
                }
                propertySize={
                  selectedRescheduleBooking?.propertyDetails?.size || ""
                }
                services={getBookingServices(selectedRescheduleBooking)}
                videographySubService={getBookingVideographySubService(
                  selectedRescheduleBooking,
                )}
              />
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t border-white/10 px-6 py-4">
            <Button
              variant="ghost"
              onClick={() => setRescheduleOpen(false)}
              className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRescheduleConfirm}
              disabled={!rescheduleDate || !rescheduleSlot || rescheduleLoading}
              className="bg-zinc-600 text-white hover:bg-zinc-500"
            >
              {rescheduleLoading ? "Updating..." : "Confirm Reschedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="border-white/10 bg-[#181818] text-white sm:max-w-lg">
          <DialogHeader className="border-b border-white/10 pb-4">
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Please confirm you want to cancel this booking.
            </DialogDescription>
          </DialogHeader>
          {selectedCancelBooking && (
            <div className="space-y-3 py-4 text-sm text-zinc-300">
              <div>
                <span className="text-muted-foreground">Booking Code:</span>{" "}
                <span className="font-mono">
                  {formatBookingReference(selectedCancelBooking)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Date:</span>{" "}
                {selectedCancelBooking.date}
              </div>
              {getActionPolicy(selectedCancelBooking).partialRefundEligible && (
                <div className="rounded-lg border border-yellow-600/40 bg-yellow-500/10 p-3 text-yellow-200">
                  This booking is within 3 hours of shoot time. Only partial
                  refund will be processed.
                </div>
              )}
            </div>
          )}
          <DialogFooter className="border-t border-white/10 pt-4">
            <Button
              variant="ghost"
              onClick={() => setCancelOpen(false)}
              className="text-zinc-300 hover:text-white hover:bg-zinc-700/40"
            >
              Keep Booking
            </Button>
            <Button
              onClick={handleCancelConfirm}
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={loadingId === selectedCancelBooking?.id}
            >
              {loadingId === selectedCancelBooking?.id
                ? "Cancelling..."
                : "Confirm Cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={revisionOpen} onOpenChange={setRevisionOpen}>
        <DialogContent className="border-white/10 bg-[#181818] text-white sm:max-w-lg">
          <DialogHeader className="border-b border-white/10 pb-4">
            <DialogTitle>Request Revision</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Describe the exact changes needed. You can request up to two
              revisions per booking.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <label htmlFor="revision-note" className="text-sm font-medium">
              Revision details
            </label>
            <Textarea
              id="revision-note"
              value={revisionNote}
              onChange={(event) => setRevisionNote(event.target.value)}
              placeholder="Describe what should be changed..."
              rows={5}
            />
            <p className="text-xs text-muted-foreground">
              Revision {(selectedRevisionBooking?.revisionCount || 0) + 1} of{" "}
              {MAX_BOOKING_REVISIONS}
            </p>
          </div>
          <DialogFooter className="border-t border-white/10 pt-4">
            <Button variant="ghost" onClick={() => setRevisionOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRequestRevision}
              disabled={
                !revisionNote.trim() ||
                reviewActionLoading ===
                  `revision-${selectedRevisionBooking?.id}`
              }
            >
              {reviewActionLoading === `revision-${selectedRevisionBooking?.id}`
                ? "Submitting..."
                : "Submit Revision"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
