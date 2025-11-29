"use client";

import { useState } from "react";
import { cancelBooking } from "@/lib/actions/bookings";
import { useRouter } from "next/navigation";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
  Link,
  Chip,
} from "@heroui/react";

export default function BookingList({ bookings }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const handleCancel = async (id) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;

    setLoadingId(id);
    try {
      const res = await cancelBooking(id);
      if (!res.success) throw new Error(res.message);
      router.refresh();
    } catch (error) {
      alert(error.message || "Failed to cancel booking");
    } finally {
      setLoadingId(null);
    }
  };

  const handleReschedule = (id) => {
    alert("Reschedule functionality coming soon!");
  };

  const handleBookingClick = (booking) => {
    setSelectedBooking(booking);
    onOpen();
  };

  const getStatusChip = (booking) => {
    if (booking.cancelledAt) {
      return (
        <Chip color="danger" variant="flat" size="sm">
          Cancelled
        </Chip>
      );
    } else if (booking.completedAt) {
      return (
        <Chip color="success" variant="flat" size="sm">
          Completed
        </Chip>
      );
    } else {
      return (
        <Chip color="primary" variant="flat" size="sm">
          Upcoming
        </Chip>
      );
    }
  };

  if (!bookings || bookings.length === 0) {
    return <p className="text-gray-400">No bookings found.</p>;
  }

  return (
    <div className="space-y-4">
      {bookings.map((booking) => (
        <div
          key={booking.id}
          className="bg-gray-900 p-6 rounded-lg border border-gray-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer hover:bg-gray-800 transition-colors"
          onClick={() => handleBookingClick(booking)}
        >
          <div>
            <div className="text-xl font-semibold mb-2 text-white">
              {booking.shootDetails?.services?.join(", ") || "Property Shoot"}
            </div>
            <div className="text-gray-400 space-y-1 text-sm">
              <p>
                <span className="font-medium text-gray-300">Date:</span>{" "}
                {booking.date}
              </p>
              <p>
                <span className="font-medium text-gray-300">Time:</span>{" "}
                {booking.slot === 1
                  ? "Morning"
                  : booking.slot === 2
                    ? "Afternoon"
                    : "Evening"}
              </p>
              <p>
                <span className="font-medium text-gray-300">Address:</span>{" "}
                {[
                  booking.propertyDetails?.unit,
                  booking.propertyDetails?.building,
                  booking.propertyDetails?.community,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              <div className="flex items-center">
                <span className="font-medium text-gray-300 mr-2">Status:</span>{" "}
                {getStatusChip(booking)}
              </div>
            </div>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            {booking.filesUrl && (
              <a
                href={booking.filesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 md:flex-none px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors text-center flex items-center justify-center"
                onClick={(e) => e.stopPropagation()} // Prevent modal from opening when clicking download
              >
                Download Files
              </a>
            )}
            {!booking.cancelledAt && !booking.completedAt && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent modal from opening
                    handleReschedule(booking.id);
                  }}
                  className="flex-1 md:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
                >
                  Reschedule
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent modal from opening
                    handleCancel(booking.id);
                  }}
                  disabled={loadingId === booking.id}
                  className="flex-1 md:flex-none px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingId === booking.id ? "Cancelling..." : "Cancel"}
                </button>
              </>
            )}
          </div>
        </div>
      ))}

      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        size="2xl"
        className="text-white bg-[#181818] border border-zinc-800"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="border-b border-zinc-800">
                Booking Details #{selectedBooking?.id}
              </ModalHeader>
              <ModalBody className="py-6 max-h-[80vh] overflow-y-auto">
                {selectedBooking && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-zinc-500 text-sm mb-1">Date & Slot</p>
                        <p className="font-medium">{selectedBooking.date}</p>
                        <p className="text-sm text-zinc-400">
                          Slot:{" "}
                          {selectedBooking.slot === 1
                            ? "Morning"
                            : selectedBooking.slot === 2
                              ? "Afternoon"
                              : "Evening"}
                        </p>
                      </div>
                      <div>
                        <p className="text-zinc-500 text-sm mb-1">Status</p>
                        {getStatusChip(selectedBooking)}
                      </div>
                    </div>

                    <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
                      <h3 className="font-semibold mb-3 text-zinc-300">
                        Services
                      </h3>
                      <p className="text-sm text-zinc-400">
                        {selectedBooking.shootDetails?.services?.join(", ") ||
                          "No services specified."}
                      </p>
                    </div>

                    <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
                      <h3 className="font-semibold mb-3 text-zinc-300">
                        Property Details
                      </h3>
                      <div className="text-sm text-zinc-400 space-y-1">
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

                    <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
                      <h3 className="font-semibold mb-3 text-zinc-300">
                        Contact Details
                      </h3>
                      <div className="text-sm text-zinc-400 space-y-1">
                        <p>
                          <span className="font-medium text-zinc-300">Name:</span>{" "}
                          {selectedBooking.contactDetails?.name}
                        </p>
                        <p>
                          <span className="font-medium text-zinc-300">Phone:</span>{" "}
                          {selectedBooking.contactDetails?.phone}
                        </p>
                        <p>
                          <span className="font-medium text-zinc-300">Email:</span>{" "}
                          {selectedBooking.contactDetails?.email}
                        </p>
                      </div>
                    </div>

                    <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
                      <h3 className="font-semibold mb-3 text-zinc-300">
                        Transaction
                      </h3>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-zinc-500 text-sm">Amount</p>
                          <p className="font-medium">
                            AED {selectedBooking.transaction?.amount}
                          </p>
                        </div>
                        {selectedBooking.transaction?.invoiceUrl ? (
                          <Button
                            as={Link}
                            href={selectedBooking.transaction.invoiceUrl}
                            target="_blank"
                            color="primary"
                            variant="flat"
                            size="sm"
                          >
                            Download Invoice
                          </Button>
                        ) : (
                          <span className="text-xs text-zinc-500 italic">
                            No invoice available
                          </span>
                        )}
                      </div>
                    </div>

                    {selectedBooking.filesUrl && (
                      <div className="border-t border-zinc-800 pt-4">
                        <h3 className="font-semibold mb-3 text-zinc-300">
                          Uploaded Files
                        </h3>
                        <div className="mb-4 p-3 bg-blue-900/20 border border-blue-900/50 rounded-lg">
                          <Link
                            href={selectedBooking.filesUrl}
                            target="_blank"
                            className="text-blue-400 hover:text-blue-300 hover:underline break-all"
                          >
                            {selectedBooking.filesUrl}
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ModalBody>
              <ModalFooter className="border-t border-zinc-800">
                <Button color="danger" variant="light" onPress={onClose}>
                  Close
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
