"use client";
import { useState, useEffect } from "react";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { completeBooking } from "@/lib/actions/bookings";

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [file, setFile] = useState(null);

  useEffect(() => {
    fetch("/api/admin/bookings")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setBookings(data);
        } else {
          console.error("Failed to fetch bookings", data);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const handleRowClick = (booking) => {
    setSelectedBooking(booking);
    setIsOpen(true);
  };

  const handleComplete = async () => {
    if (!selectedBooking) return;
    if (selectedBooking.cancelledAt) {
      alert("Cannot complete a cancelled booking");
      return;
    }
    if (!confirm("Are you sure you want to mark this booking as completed?"))
      return;

    setCompleting(true);
    try {
      const res = await completeBooking(selectedBooking.id);
      if (res.success) {
        const updatedBooking = {
          ...selectedBooking,
          status: "COMPLETED",
          completedAt: new Date().toISOString(),
        };
        setSelectedBooking(updatedBooking);
        setBookings((prev) =>
          prev.map((b) => (b.id === selectedBooking.id ? updatedBooking : b)),
        );
        alert("Booking marked as completed");
      } else {
        alert("Failed: " + (res.message || "Unknown error"));
      }
    } catch (e) {
      console.error(e);
      alert("Failed to complete booking");
    } finally {
      setCompleting(false);
    }
  };

  const handleUpload = async () => {
    if (!file || !selectedBooking) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("bookingId", selectedBooking.id);

    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        // Update local state
        const updatedBooking = { ...selectedBooking, filesUrl: data.url };
        setSelectedBooking(updatedBooking);
        setBookings((prev) =>
          prev.map((b) => (b.id === selectedBooking.id ? updatedBooking : b)),
        );
        alert("File uploaded successfully");
      } else {
        alert("Upload failed: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error(error);
      alert("Upload failed");
    } finally {
      setUploading(false);
      setFile(null);
    }
  };

  return (
    <div className="p-8 bg-[#121212] min-h-screen text-white">
      <h1 className="text-2xl font-bold mb-6">Bookings</h1>
      <div className="rounded-md border border-zinc-800 bg-[#181818]">
        <Table>
          <TableHeader className="bg-zinc-900">
            <TableRow className="border-zinc-800 hover:bg-zinc-900">
              <TableHead className="text-zinc-400">ID</TableHead>
              <TableHead className="text-zinc-400">PROPERTY</TableHead>
              <TableHead className="text-zinc-400">DATE</TableHead>
              <TableHead className="text-zinc-400">AMOUNT</TableHead>
              <TableHead className="text-zinc-400">STATUS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-zinc-500">
                  No bookings found
                </TableCell>
              </TableRow>
            ) : (
              bookings.map((booking) => (
                <TableRow
                  key={booking.id}
                  className="cursor-pointer hover:bg-zinc-800 border-zinc-800"
                  onClick={() => handleRowClick(booking)}
                >
                  <TableCell className="text-zinc-300">{booking.id}</TableCell>
                  <TableCell className="text-zinc-300">
                    <p>
                      {[
                        booking.propertyDetails?.unit,
                        booking.propertyDetails?.building,
                        booking.propertyDetails?.community,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {booking.propertyDetails?.type}
                    </p>
                  </TableCell>
                  <TableCell className="text-zinc-300">{booking.date}</TableCell>
                  <TableCell className="text-zinc-300">AED {booking.total}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        booking.transaction?.status === "success"
                          ? "success"
                          : "secondary"
                      }
                      className={
                        booking.transaction?.status === "success"
                          ? "bg-green-500/15 text-green-500 hover:bg-green-500/25 border-green-500/20"
                          : "bg-yellow-500/15 text-yellow-500 hover:bg-yellow-500/25 border-yellow-500/20"
                      }
                    >
                      {booking.transaction?.status || "Pending"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-2xl bg-[#181818] border-zinc-800 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-zinc-800 pb-4">
            <DialogTitle>Booking Details #{selectedBooking?.id}</DialogTitle>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-zinc-500 text-sm mb-1">User</p>
                  <p className="font-medium">
                    {selectedBooking.user?.fullName}
                  </p>
                  <p className="text-sm text-zinc-400">
                    {selectedBooking.user?.email}
                  </p>
                  <p className="text-sm text-zinc-400">
                    {selectedBooking.user?.phone}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-500 text-sm mb-1">
                    Date & Slot
                  </p>
                  <p className="font-medium">{selectedBooking.date}</p>
                  <p className="text-sm text-zinc-400">
                    Slot: {selectedBooking.slot}
                  </p>
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
                    <span className="font-medium text-zinc-300">
                      Address:
                    </span>{" "}
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
                  <div>
                    <p className="text-zinc-500 text-sm">Status</p>
                    <p className="capitalize font-medium">
                      {selectedBooking.transaction?.status}
                    </p>
                  </div>
                  {selectedBooking.transaction?.invoiceUrl ? (
                    <Button
                      asChild
                      variant="secondary"
                      size="sm"
                    >
                      <Link href={selectedBooking.transaction.invoiceUrl} target="_blank">
                        Download Invoice
                      </Link>
                    </Button>
                  ) : (
                    <span className="text-xs text-zinc-500 italic">
                      No invoice available
                    </span>
                  )}
                </div>
              </div>

              <div className="border-t border-zinc-800 pt-4 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-zinc-300 mb-1">
                    Booking Status
                  </h3>
                  <p className="text-sm text-zinc-400">
                    {selectedBooking.cancelledAt
                      ? "This booking has been cancelled."
                      : selectedBooking.status === "COMPLETED" ||
                        selectedBooking.completedAt
                        ? "This booking is completed."
                        : "Mark booking as completed when service is done."}
                  </p>
                </div>
                {selectedBooking.cancelledAt ? (
                  <Badge variant="destructive">
                    Cancelled
                  </Badge>
                ) : selectedBooking.status === "COMPLETED" ||
                  selectedBooking.completedAt ? (
                  <Badge className="bg-green-500 hover:bg-green-600">
                    Completed
                  </Badge>
                ) : (
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={handleComplete}
                    disabled={completing}
                  >
                    {completing ? "Updating..." : "Mark as Completed"}
                  </Button>
                )}
              </div>

              {(selectedBooking.status === "COMPLETED" ||
                selectedBooking.completedAt) && (
                  <div className="border-t border-zinc-800 pt-4">
                    <h3 className="font-semibold mb-3 text-zinc-300">
                      Files
                    </h3>
                    {selectedBooking.filesUrl && (
                      <div className="mb-4 p-3 bg-blue-900/20 border border-blue-900/50 rounded-lg">
                        <p className="text-xs text-blue-300 mb-1">
                          Current File:
                        </p>
                        <Link
                          href={selectedBooking.filesUrl}
                          target="_blank"
                          className="text-blue-400 hover:text-blue-300 hover:underline break-all"
                        >
                          {selectedBooking.filesUrl}
                        </Link>
                      </div>
                    )}
                    <div className="flex gap-3 items-center">
                      <Input
                        type="file"
                        onChange={(e) => setFile(e.target.files[0])}
                        className="max-w-xs bg-zinc-900 border-zinc-700 text-zinc-300"
                      />
                      <Button
                        onClick={handleUpload}
                        disabled={uploading || !file}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {uploading ? "Uploading..." : "Upload to S3"}
                      </Button>
                    </div>
                  </div>
                )}
            </div>
          )}

          <DialogFooter className="border-t border-zinc-800 pt-4">
            <Button variant="ghost" onClick={() => setIsOpen(false)} className="text-red-500 hover:text-red-400 hover:bg-red-500/10">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
