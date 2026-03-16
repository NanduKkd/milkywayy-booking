"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cancelBooking, rescheduleBookingByCode } from "@/lib/actions/bookings";
import { isNightServiceSelected } from "@/lib/helpers/bookingUtils";
import { toast } from "sonner";
import DateSlotPicker from "@/components/DateSlotPicker";

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
  const [selectedRescheduleBooking, setSelectedRescheduleBooking] = useState(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [selectedCancelBooking, setSelectedCancelBooking] = useState(null);

  const getBookingDateTime = (booking) => {
    if (!booking?.date) return null;
    const startTime =
      booking.startTime ||
      (booking.slot === 1
        ? "09:00"
        : booking.slot === 2
          ? "13:00"
          : booking.slot === 3
            ? "17:00"
            : null);
    if (!startTime || !String(startTime).includes(":")) return null;

    const [y, m, d] = String(booking.date).split("-").map(Number);
    const [hh, mm] = String(startTime).split(":").map(Number);
    if (![y, m, d, hh, mm].every(Number.isFinite)) return null;
    return new Date(y, m - 1, d, hh, mm, 0, 0);
  };

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
        typeof hoursLeft === "number" ? hoursLeft >= RESCHEDULE_CUTOFF_HOURS : true,
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
        toast.success(`Booking cancelled. Partial refund AED ${refundAmount} initiated.`);
      } else if (refundType === "full" && refundAmount > 0) {
        toast.success(`Booking cancelled. Full refund AED ${refundAmount} initiated.`);
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
      const bookingCode = selectedRescheduleBooking.bookingCode || `MWY-${String(selectedRescheduleBooking.id).padStart(6, '0')}`;
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
    } catch (error) {
      toast.error("Failed to reschedule booking");
    } finally {
      setRescheduleLoading(false);
    }
  };

  const handleBookingClick = (booking) => {
    setSelectedBooking(booking);
    setIsOpen(true);
  };

  const getStatusChip = (booking) => {
    if (booking.cancelledAt) {
      return (
        <span className="text-white text-sm font-medium  px-2 py-1 rounded">Cancelled</span>
      );
    } else if (booking.completedAt) {
      return (
        <span className="text-white text-sm font-medium  px-2 py-1 rounded">Completed</span>
      );
    } else if (booking.status === "CONFIRMED") {
      return (
        <span className="text-white text-sm font-medium px-2 py-1 rounded">Confirmed</span>
      );
    } else {
      return (
        <span className="text-white text-sm font-medium  px-2 py-1 rounded">Draft</span>
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
    } catch (e) {
      return dateStr;
    }
  };

  const formatTime = (booking) => {
    if (booking?.startTime) {
      const [h, m] = String(booking.startTime).split(":").map(Number);
      if (Number.isFinite(h) && Number.isFinite(m)) {
        const dt = new Date();
        dt.setHours(h, m, 0, 0);
        return new Intl.DateTimeFormat("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }).format(dt);
      }
      return booking.startTime;
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
    const videographySubService = booking?.shootDetails?.videographySubService || "";
    if (services.length === 0) return ["No services specified."];
    const videographySelections = String(videographySubService)
      .split("|")
      .map((v) => v.trim())
      .filter(Boolean);

    return services.flatMap((service) => {
      if (service === "Videography" && videographySelections.length > 0) {
        return videographySelections.map((selection) => `${service} (${selection})`);
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
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
  );

  return (
    <div className="space-y-4">
      {sortedBookings.map((booking) => (
        <div
          key={booking.id}
          className={`group cursor-pointer rounded-2xl border border-border bg-card p-6 transition-colors hover:bg-card/90 ${booking.completedAt ? "opacity-60" : ""}`}
          onClick={() => handleBookingClick(booking)}
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

          {!booking.cancelledAt && !booking.completedAt && !getActionPolicy(booking).isPast && (
            <div className="flex gap-3 mt-2">
              {getActionPolicy(booking).canReschedule && (
                <button
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
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#181818] text-white sm:max-w-2xl">
          <DialogHeader className="border-b border-white/10 pb-4">
            <DialogTitle>Booking Details #{selectedBooking?.id}</DialogTitle>
            <DialogDescription className="hidden">
              Details for booking #{selectedBooking?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="mb-1 text-sm text-muted-foreground">Date & Slot</p>
                  <p className="font-medium">{selectedBooking.date}</p>
                  <p className="text-sm text-muted-foreground">
                    Slot:{" "}
                    {selectedBooking.slot === 1
                      ? "Morning"
                      : selectedBooking.slot === 2
                        ? "Afternoon"
                        : "Evening"}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-sm text-muted-foreground">Status</p>
                  {getStatusChip(selectedBooking)}
                </div>
              </div>

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
                  {selectedBooking.transaction?.invoiceUrl ? (
                    <Button asChild variant="secondary" size="sm">
                      <Link
                        href={selectedBooking.transaction.invoiceUrl}
                        target="_blank"
                      >
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

          <DialogFooter className="border-t border-white/10 pt-4">
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
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#181818] text-white sm:max-w-2xl">
          <DialogHeader className="border-b border-white/10 pb-4">
            <DialogTitle>Reschedule Booking</DialogTitle>
            <DialogDescription>
              Select a new date and time for your booking
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="rounded-lg border border-white/10 bg-zinc-900/50 p-4">
              <h3 className="mb-3 font-semibold text-zinc-200">Current Booking</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium text-zinc-300">Booking Code:</span>{" "}
                  <span className="font-mono text-[#f59e0b]">
                    {selectedRescheduleBooking?.bookingCode || `MWY-${String(selectedRescheduleBooking?.id).padStart(6, '0')}`}
                  </span>
                </p>
                <p>
                  <span className="font-medium text-zinc-300">Property:</span>{" "}
                  {selectedRescheduleBooking?.propertyDetails?.unit} {selectedRescheduleBooking?.propertyDetails?.building}
                </p>
                <p>
                  <span className="font-medium text-zinc-300">Current Date:</span>{" "}
                  {selectedRescheduleBooking?.date}
                </p>
                <p>
                  <span className="font-medium text-zinc-300">Current Time:</span>{" "}
                  {selectedRescheduleBooking?.startTime ||
                    (selectedRescheduleBooking?.slot === 1
                      ? "09:00"
                      : selectedRescheduleBooking?.slot === 2
                        ? "13:00"
                        : "17:00")}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-zinc-900/50 p-4">
              <h3 className="mb-3 font-semibold text-zinc-200">Select New Date & Time</h3>
              <DateSlotPicker
                date={rescheduleDate}
                slot={rescheduleSlot}
                onDateChange={setRescheduleDate}
                onSlotChange={setRescheduleSlot}
                minDate={new Date()}
                error={null}
                duration={getRescheduleDuration(selectedRescheduleBooking)}
                isNightService={getRescheduleIsNightService(selectedRescheduleBooking)}
                allowEvening={getRescheduleIsNightService(selectedRescheduleBooking)}
                blockedSlotsMap={{}}
              />
            </div>
          </div>

          <DialogFooter className="border-t border-white/10 pt-4">
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
                  {selectedCancelBooking.bookingCode || `MWY-${String(selectedCancelBooking.id).padStart(6, "0")}`}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Date:</span>{" "}
                {selectedCancelBooking.date}
              </div>
              {getActionPolicy(selectedCancelBooking).partialRefundEligible && (
                <div className="rounded-lg border border-yellow-600/40 bg-yellow-500/10 p-3 text-yellow-200">
                  This booking is within 3 hours of shoot time. Only partial refund will be processed.
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
              {loadingId === selectedCancelBooking?.id ? "Cancelling..." : "Confirm Cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
