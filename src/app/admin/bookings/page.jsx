"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { completeBooking } from "@/lib/actions/bookings";
import {
  buildInvoiceDownloadUrl,
  formatInvoiceNumber,
} from "@/lib/helpers/invoice-format";

const parseDeliverables = (filesUrl) => {
  if (!filesUrl) return [];
  try {
    const parsed = JSON.parse(filesUrl);
    if (Array.isArray(parsed?.deliverables)) return parsed.deliverables;
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Legacy plain URL fallback
    return [{ label: "Files", type: "Files", url: filesUrl, deliveryMode: "download" }];
  }
  return [];
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [notifyingType, setNotifyingType] = useState(null);
  const [files, setFiles] = useState([]);
  const [deliverableType, setDeliverableType] = useState("Photography");
  const [fileCount, setFileCount] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const fileInputRef = useRef(null);
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
        alert(`Failed: ${res.message || "Unknown error"}`);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to complete booking");
    } finally {
      setCompleting(false);
    }
  };

  const handleUpload = async () => {
    const is360 =
      deliverableType.toLowerCase().includes("360") ||
      deliverableType.toLowerCase().includes("tour");
    const hasExternalUrl = Boolean(externalUrl.trim());
    if ((files.length === 0 && !hasExternalUrl) || !selectedBooking) return;
    setUploading(true);
    const formData = new FormData();
    files.forEach((file) => formData.append("file", file));
    formData.append("bookingId", selectedBooking.id);
    formData.append("deliverableType", deliverableType);
    if (fileCount) formData.append("fileCount", fileCount);
    if (hasExternalUrl) formData.append("externalUrl", externalUrl.trim());

    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        // Update local state
        const updatedBooking = { ...selectedBooking, filesUrl: data.filesUrl || data.url };
        setSelectedBooking(updatedBooking);
        setBookings((prev) =>
          prev.map((b) => (b.id === selectedBooking.id ? updatedBooking : b)),
        );
        alert(
          is360
            ? "360 link uploaded successfully"
            : `${data.urls?.length || files.length || 1} file(s) uploaded successfully`,
        );
      } else {
        alert(`Upload failed: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error(error);
      alert("Upload failed");
    } finally {
      setUploading(false);
      setFiles([]);
      setFileCount("");
      setExternalUrl("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSendNotification = async (type) => {
    if (!selectedBooking?.id) return;
    setNotifyingType(type);
    try {
      const res = await fetch("/api/notifications/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          bookingId: selectedBooking.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to send notification");
      }

      alert(
        type === "team_on_the_way"
          ? "Team on the way notification sent."
          : "Team arrived notification sent.",
      );
    } catch (error) {
      console.error(error);
      alert(error.message || "Failed to send notification");
    } finally {
      setNotifyingType(null);
    }
  };

  return (
    <div className="space-y-6 text-white">
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Operations
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Bookings</h1>
      </div>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#181818]">
        <Table>
          <TableHeader className="bg-zinc-900/80">
            <TableRow className="border-white/10 hover:bg-zinc-900/80">
              <TableHead className="text-muted-foreground">ID</TableHead>
              <TableHead className="text-muted-foreground">PROPERTY</TableHead>
              <TableHead className="text-muted-foreground">DATE</TableHead>
              <TableHead className="text-muted-foreground">AMOUNT</TableHead>
              <TableHead className="text-muted-foreground">STATUS</TableHead>
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
                  <TableCell className="text-zinc-300">
                    {booking.date}
                  </TableCell>
                  <TableCell className="text-zinc-300">
                    AED {booking.total}
                  </TableCell>
                  <TableCell>
                    {booking.cancelledAt ? (
                      <Badge className="bg-red-500/15 text-red-500 hover:bg-red-500/25 border-red-500/20">
                        Cancelled
                      </Badge>
                    ) : booking.status === "COMPLETED" ||
                      booking.completedAt ? (
                      <Badge className="bg-green-500/15 text-green-500 hover:bg-green-500/25 border-green-500/20">
                        Completed
                      </Badge>
                    ) : booking.status === "CONFIRMED" ? (
                      <Badge className="bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 border-blue-500/20">
                        Confirmed
                      </Badge>
                    ) : booking.status === "DRAFT" ? (
                      <Badge className="bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border-amber-500/20">
                        Awaiting Payment
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-500/15 text-yellow-500 hover:bg-yellow-500/25 border-yellow-500/20">
                        {booking.transaction?.status || "Pending"}
                      </Badge>
                    )}
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
            <DialogDescription className="hidden">
              Admin details for booking #{selectedBooking?.id}
            </DialogDescription>
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
                  <p className="text-zinc-500 text-sm mb-1">Date & Slot</p>
                  <p className="font-medium">{selectedBooking.date}</p>
                  <p className="text-sm text-zinc-400">
                    Slot: {selectedBooking.slot}
                  </p>
                </div>
              </div>

              <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
                <h3 className="font-semibold mb-3 text-zinc-300">Services</h3>
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
                  <div>
                    <p className="text-zinc-500 text-sm">Status</p>
                    <p className="capitalize font-medium">
                      {selectedBooking.transaction?.status}
                    </p>
                  </div>
                  {selectedInvoiceDownloadUrl ? (
                    <Button asChild variant="secondary" size="sm">
                      <Link href={selectedInvoiceDownloadUrl} target="_blank">
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
                  <Badge variant="destructive">Cancelled</Badge>
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

              <div className="border-t border-zinc-800 pt-4">
                <h3 className="font-semibold text-zinc-300 mb-1">
                  Manual WhatsApp Triggers
                </h3>
                <p className="text-sm text-zinc-400 mb-3">
                  Send operational updates manually from admin.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                    disabled={
                      notifyingType !== null ||
                      selectedBooking.cancelledAt ||
                      selectedBooking.status === "COMPLETED" ||
                      selectedBooking.completedAt
                    }
                    onClick={() => handleSendNotification("team_on_the_way")}
                  >
                    {notifyingType === "team_on_the_way"
                      ? "Sending..."
                      : "Send Team On The Way"}
                  </Button>
                  <Button
                    variant="outline"
                    className="border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                    disabled={
                      notifyingType !== null ||
                      selectedBooking.cancelledAt ||
                      selectedBooking.status === "COMPLETED" ||
                      selectedBooking.completedAt
                    }
                    onClick={() => handleSendNotification("team_arrived")}
                  >
                    {notifyingType === "team_arrived"
                      ? "Sending..."
                      : "Send Team Arrived"}
                  </Button>
                </div>
              </div>

              {(selectedBooking.status === "COMPLETED" ||
                selectedBooking.completedAt) && (
                <div className="border-t border-zinc-800 pt-4">
                  <h3 className="font-semibold mb-3 text-zinc-300">Files</h3>
                  {parseDeliverables(selectedBooking.filesUrl).length > 0 && (
                    <div className="mb-4 p-3 bg-blue-900/20 border border-blue-900/50 rounded-lg space-y-2">
                      <p className="text-xs text-blue-300 mb-1">
                        Current Deliverables
                      </p>
                      {parseDeliverables(selectedBooking.filesUrl).map((item, i) => (
                        <div key={`${item.type || item.label}-${i}`} className="text-sm text-zinc-300">
                          {(() => {
                            const itemUrls = Array.isArray(item.urls) && item.urls.length > 0
                              ? item.urls
                              : item.url
                                ? [item.url]
                                : [];
                            const primaryUrl = itemUrls[0];

                            return (
                              <>
                          <span className="font-medium">{item.label || item.type || "Files"}:</span>{" "}
                          <Link
                            href={primaryUrl}
                            target="_blank"
                            className="text-blue-400 hover:text-blue-300 hover:underline break-all"
                          >
                            {primaryUrl}
                          </Link>
                          {item.count ? (
                            <span className="text-zinc-400"> ({item.count} files)</span>
                          ) : null}
                          {itemUrls.length > 1 ? (
                            <span className="text-zinc-400"> (+{itemUrls.length - 1} more)</span>
                          ) : null}
                          {item.deliveryMode === "copy_link" ? (
                            <span className="ml-2 text-amber-300 text-xs">Copy Link</span>
                          ) : null}
                              </>
                            );
                          })()}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <div className="md:col-span-1">
                      <label className="text-xs text-zinc-400 block mb-1">
                        Deliverable Type
                      </label>
                      <select
                        value={deliverableType}
                        onChange={(e) => setDeliverableType(e.target.value)}
                        className="w-full h-10 rounded-md bg-zinc-900 border border-zinc-700 text-zinc-300 px-3 text-sm"
                      >
                        <option>Photography</option>
                        <option>Videography</option>
                        <option>360 Virtual Tour</option>
                      </select>
                    </div>
                    <div className="md:col-span-1">
                      <label className="text-xs text-zinc-400 block mb-1">
                        File Count
                      </label>
                      <Input
                        type="number"
                        min={1}
                        value={fileCount}
                        onChange={(e) => setFileCount(e.target.value)}
                        placeholder="e.g. 30"
                        className="bg-zinc-900 border-zinc-700 text-zinc-300"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs text-zinc-400 block mb-1">
                        External Link (use for 360)
                      </label>
                      <Input
                        type="url"
                        value={externalUrl}
                        onChange={(e) => setExternalUrl(e.target.value)}
                        placeholder="https://..."
                        className="bg-zinc-900 border-zinc-700 text-zinc-300"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 items-center mt-3">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={(e) => setFiles(Array.from(e.target.files || []))}
                      className="max-w-xs bg-zinc-900 border-zinc-700 text-zinc-300"
                    />
                    {files.length > 0 ? (
                      <span className="text-xs text-zinc-400">
                        {files.length} file(s) selected
                      </span>
                    ) : null}
                    <Button
                      onClick={handleUpload}
                      disabled={
                        uploading || (files.length === 0 && !externalUrl.trim())
                      }
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {uploading ? "Uploading..." : "Upload Deliverable"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="border-t border-zinc-800 pt-4">
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
    </div>
  );
}
