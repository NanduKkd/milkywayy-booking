"use client";
import { RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import BookingWorkflowTracker from "@/components/BookingWorkflowTracker";
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
import { updateBookingWorkflow } from "@/lib/actions/bookings";
import {
  BOOKING_WORKFLOW_STATUS,
  getWorkflowStatus,
} from "@/lib/helpers/bookingWorkflow";
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
    return [
      {
        label: "Files",
        type: "Files",
        url: filesUrl,
        deliveryMode: "download",
      },
    ];
  }
  return [];
};

const getArchivedDeliverables = (filesUrl) => {
  const payload = parseFilesPayload(filesUrl);
  return Array.isArray(payload?.archivedDeliverables)
    ? payload.archivedDeliverables
    : [];
};

const getDeliverableUrls = (item) => {
  if (Array.isArray(item?.urls) && item.urls.length > 0) {
    return item.urls.filter(Boolean);
  }
  return item?.url ? [item.url] : [];
};

const getDeliverableId = (item, index) =>
  String(item?.id || item?.type || item?.label || `deliverable-${index}`);

const getFileName = (url, index) => {
  try {
    const pathname = new URL(url).pathname;
    return (
      decodeURIComponent(pathname.split("/").filter(Boolean).pop()) ||
      `File ${index + 1}`
    );
  } catch {
    return `File ${index + 1}`;
  }
};

const parseFilesPayload = (filesUrl) => {
  if (!filesUrl) return null;
  try {
    const parsed = JSON.parse(filesUrl);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
};

const hasUploadedDeliverables = (filesUrl) =>
  parseDeliverables(filesUrl).some(
    (item) => item?.url || (Array.isArray(item?.urls) && item.urls.length > 0),
  );

const getBookingServices = (booking) =>
  Array.from(
    new Set(
      (Array.isArray(booking?.shootDetails?.services)
        ? booking.shootDetails.services
        : []
      ).filter(Boolean),
    ),
  );

const isSingleServiceBooking = (booking) =>
  getBookingServices(booking).length <= 1;

const hasSentMediaTrigger = (filesUrl, type) => {
  const payload = parseFilesPayload(filesUrl);
  const notifications = payload?.notifications || {};
  if (type === "single_service_media_ready") {
    return Boolean(notifications.singleServiceMediaReadySentAt);
  }
  if (type === "partial_media_upload") {
    return Boolean(notifications.partialMediaUploadSentAt);
  }
  if (type === "full_media_upload") {
    return Boolean(notifications.fullMediaUploadSentAt);
  }
  return false;
};

const getWorkflowLabel = (booking) =>
  ({
    [BOOKING_WORKFLOW_STATUS.SHOOT_BOOKED]: "Shoot Booked",
    [BOOKING_WORKFLOW_STATUS.SHOOT_DONE]: "Shoot Done",
    [BOOKING_WORKFLOW_STATUS.EDITING]: "Editing",
    [BOOKING_WORKFLOW_STATUS.FILES_UPLOADED]: "Files Uploaded",
    [BOOKING_WORKFLOW_STATUS.PROJECT_COMPLETED]: "Project Completed",
  })[getWorkflowStatus(booking)] || "Shoot Booked";

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deliverableAction, setDeliverableAction] = useState(null);
  const [workflowUpdating, setWorkflowUpdating] = useState(false);
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

  const handleWorkflowUpdate = async (nextStatus) => {
    if (!selectedBooking) return;
    if (selectedBooking.cancelledAt) {
      alert("Cannot update a cancelled booking");
      return;
    }

    setWorkflowUpdating(true);
    try {
      const res = await updateBookingWorkflow(selectedBooking.id, nextStatus);
      if (res.success) {
        const updatedBooking = {
          ...selectedBooking,
          ...(res.data || {}),
          workflowStatus: nextStatus,
        };
        setSelectedBooking(updatedBooking);
        setBookings((prev) =>
          prev.map((b) => (b.id === selectedBooking.id ? updatedBooking : b)),
        );
        alert(
          nextStatus === BOOKING_WORKFLOW_STATUS.SHOOT_DONE
            ? "Shoot marked as done"
            : nextStatus === BOOKING_WORKFLOW_STATUS.EDITING
              ? "Editing started"
              : "Files marked as uploaded",
        );
      } else {
        alert(`Failed: ${res.message || "Unknown error"}`);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to update booking workflow");
    } finally {
      setWorkflowUpdating(false);
    }
  };

  const getWorkflowAction = (booking) => {
    if (booking?.status === "DRAFT") return null;
    const current = getWorkflowStatus(booking);
    if (current === BOOKING_WORKFLOW_STATUS.SHOOT_BOOKED) {
      return {
        next: BOOKING_WORKFLOW_STATUS.SHOOT_DONE,
        label: "Mark Shoot Done",
      };
    }
    if (current === BOOKING_WORKFLOW_STATUS.SHOOT_DONE) {
      return {
        next: BOOKING_WORKFLOW_STATUS.EDITING,
        label: "Start Editing",
      };
    }
    if (current === BOOKING_WORKFLOW_STATUS.EDITING) {
      return {
        next: BOOKING_WORKFLOW_STATUS.FILES_UPLOADED,
        label: "Mark Files Uploaded",
      };
    }
    return null;
  };

  const handleUpload = async () => {
    const is360 =
      deliverableType.toLowerCase().includes("360") ||
      deliverableType.toLowerCase().includes("tour");
    const hasExternalUrl = Boolean(externalUrl.trim());
    if ((files.length === 0 && !hasExternalUrl) || !selectedBooking) return;
    setUploading(true);
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("file", file);
    });
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
        const updatedBooking = {
          ...selectedBooking,
          filesUrl: data.filesUrl || data.url,
        };
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

  const updateSelectedBookingFiles = (filesUrl) => {
    const updatedBooking = {
      ...selectedBooking,
      filesUrl,
    };
    setSelectedBooking(updatedBooking);
    setBookings((prev) =>
      prev.map((booking) =>
        booking.id === selectedBooking.id ? updatedBooking : booking,
      ),
    );
  };

  const handleDeleteDeliverable = async ({ source, deliverableId, url }) => {
    if (!selectedBooking?.id) return;
    if (!window.confirm("Delete this file from the booking?")) return;

    const actionKey = `${source}:${deliverableId}:${url}`;
    setDeliverableAction(actionKey);
    try {
      const response = await fetch(
        `/api/admin/bookings/${selectedBooking.id}/deliverables`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source, deliverableId, url }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to delete file");
      }
      updateSelectedBookingFiles(data.filesUrl);
    } catch (error) {
      console.error(error);
      alert(error.message || "Failed to delete file");
    } finally {
      setDeliverableAction(null);
    }
  };

  const handleRestorePreviousDeliverables = async () => {
    if (!selectedBooking?.id) return;

    setDeliverableAction("restore");
    try {
      const response = await fetch(
        `/api/admin/bookings/${selectedBooking.id}/deliverables`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "restore_archived" }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to use previous files");
      }
      updateSelectedBookingFiles(data.filesUrl);
      alert(
        'Previous files restored. You can now click "Mark Files Uploaded".',
      );
    } catch (error) {
      console.error(error);
      alert(error.message || "Failed to use previous files");
    } finally {
      setDeliverableAction(null);
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

      if (
        (type === "single_service_media_ready" ||
          type === "partial_media_upload" ||
          type === "full_media_upload") &&
        data?.filesUrl
      ) {
        const updatedBooking = {
          ...selectedBooking,
          filesUrl: data.filesUrl,
        };
        setSelectedBooking(updatedBooking);
        setBookings((prev) =>
          prev.map((b) => (b.id === selectedBooking.id ? updatedBooking : b)),
        );
      }

      alert(
        type === "team_on_the_way"
          ? "Team on the way notification sent."
          : type === "team_arrived"
            ? "Team arrived notification sent."
            : type === "single_service_media_ready"
              ? "Single service media ready notification sent."
              : type === "partial_media_upload"
                ? "Partial media upload notification sent."
                : "Full media upload notification sent.",
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
                    ) : getWorkflowStatus(booking) ===
                      BOOKING_WORKFLOW_STATUS.PROJECT_COMPLETED ? (
                      <Badge className="bg-green-500/15 text-green-500 hover:bg-green-500/25 border-green-500/20">
                        Project Completed
                      </Badge>
                    ) : booking.status === "DRAFT" ? (
                      <Badge className="bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border-amber-500/20">
                        Awaiting Payment
                      </Badge>
                    ) : (
                      <Badge className="bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 border-blue-500/20">
                        {getWorkflowLabel(booking)}
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
        <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden border-zinc-800 bg-[#181818] p-0 text-white sm:max-w-2xl">
          <DialogHeader className="shrink-0 border-b border-zinc-800 px-6 py-5 pr-12">
            <DialogTitle>Booking Details #{selectedBooking?.id}</DialogTitle>
            <DialogDescription className="hidden">
              Admin details for booking #{selectedBooking?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
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
                    Delivery Workflow
                  </h3>
                  <p className="text-sm text-zinc-400">
                    {selectedBooking.cancelledAt
                      ? "This booking has been cancelled."
                      : getWorkflowStatus(selectedBooking) ===
                          BOOKING_WORKFLOW_STATUS.PROJECT_COMPLETED
                        ? "The project is completed."
                        : `Current stage: ${getWorkflowLabel(selectedBooking)}`}
                  </p>
                </div>
                {selectedBooking.cancelledAt ? (
                  <Badge variant="destructive">Cancelled</Badge>
                ) : getWorkflowStatus(selectedBooking) ===
                  BOOKING_WORKFLOW_STATUS.PROJECT_COMPLETED ? (
                  <Badge className="bg-green-500 hover:bg-green-600">
                    Project Completed
                  </Badge>
                ) : getWorkflowAction(selectedBooking) ? (
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() =>
                      handleWorkflowUpdate(
                        getWorkflowAction(selectedBooking).next,
                      )
                    }
                    disabled={
                      workflowUpdating ||
                      (getWorkflowAction(selectedBooking).next ===
                        BOOKING_WORKFLOW_STATUS.FILES_UPLOADED &&
                        !hasUploadedDeliverables(selectedBooking.filesUrl))
                    }
                  >
                    {workflowUpdating
                      ? "Updating..."
                      : getWorkflowAction(selectedBooking).label}
                  </Button>
                ) : null}
              </div>

              <BookingWorkflowTracker booking={selectedBooking} />

              {selectedBooking.revisions?.length > 0 && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                  <h3 className="font-semibold text-amber-200">
                    Revision Requests
                  </h3>
                  <div className="mt-3 space-y-3">
                    {selectedBooking.revisions.map((revision) => (
                      <div key={revision.id} className="text-sm">
                        <p className="font-medium text-zinc-200">
                          Revision {revision.revisionNumber}{" "}
                          {revision.resolvedAt ? "(resolved)" : "(active)"}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-zinc-400">
                          {revision.note}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                  {isSingleServiceBooking(selectedBooking) ? (
                    <Button
                      variant="outline"
                      className="border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                      disabled={
                        notifyingType !== null ||
                        selectedBooking.cancelledAt ||
                        !hasUploadedDeliverables(selectedBooking.filesUrl) ||
                        hasSentMediaTrigger(
                          selectedBooking.filesUrl,
                          "single_service_media_ready",
                        )
                      }
                      onClick={() =>
                        handleSendNotification("single_service_media_ready")
                      }
                    >
                      {notifyingType === "single_service_media_ready"
                        ? "Sending..."
                        : hasSentMediaTrigger(
                              selectedBooking.filesUrl,
                              "single_service_media_ready",
                            )
                          ? "Single Service Sent"
                          : "Send Single Service Ready"}
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        className="border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                        disabled={
                          notifyingType !== null ||
                          selectedBooking.cancelledAt ||
                          !hasUploadedDeliverables(selectedBooking.filesUrl) ||
                          hasSentMediaTrigger(
                            selectedBooking.filesUrl,
                            "partial_media_upload",
                          )
                        }
                        onClick={() =>
                          handleSendNotification("partial_media_upload")
                        }
                      >
                        {notifyingType === "partial_media_upload"
                          ? "Sending..."
                          : hasSentMediaTrigger(
                                selectedBooking.filesUrl,
                                "partial_media_upload",
                              )
                            ? "Photos Ready Sent"
                            : "Send Photos Ready"}
                      </Button>
                      <Button
                        variant="outline"
                        className="border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                        disabled={
                          notifyingType !== null ||
                          selectedBooking.cancelledAt ||
                          !hasUploadedDeliverables(selectedBooking.filesUrl) ||
                          hasSentMediaTrigger(
                            selectedBooking.filesUrl,
                            "full_media_upload",
                          )
                        }
                        onClick={() =>
                          handleSendNotification("full_media_upload")
                        }
                      >
                        {notifyingType === "full_media_upload"
                          ? "Sending..."
                          : hasSentMediaTrigger(
                                selectedBooking.filesUrl,
                                "full_media_upload",
                              )
                            ? "All Media Sent"
                            : "Send All Media Delivered"}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {(getWorkflowStatus(selectedBooking) ===
                BOOKING_WORKFLOW_STATUS.EDITING ||
                parseDeliverables(selectedBooking.filesUrl).length > 0 ||
                getArchivedDeliverables(selectedBooking.filesUrl).length >
                  0) && (
                <div className="border-t border-zinc-800 pt-4">
                  <h3 className="mb-3 font-semibold text-zinc-300">
                    Deliverables
                  </h3>
                  {parseDeliverables(selectedBooking.filesUrl).length > 0 ? (
                    <div className="mb-4 rounded-lg border border-blue-900/50 bg-blue-900/20 p-3">
                      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-blue-300">
                        Current Files
                      </p>
                      <div className="space-y-4">
                        {parseDeliverables(selectedBooking.filesUrl).map(
                          (item, itemIndex) => {
                            const deliverableId = getDeliverableId(
                              item,
                              itemIndex,
                            );
                            const itemUrls = getDeliverableUrls(item);

                            return (
                              <div key={deliverableId}>
                                <div className="mb-2 flex items-center gap-2">
                                  <span className="text-sm font-medium text-zinc-200">
                                    {item.label || item.type || "Files"}
                                  </span>
                                  <span className="text-xs text-zinc-500">
                                    {itemUrls.length}{" "}
                                    {itemUrls.length === 1 ? "file" : "files"}
                                  </span>
                                  {item.deliveryMode === "copy_link" ? (
                                    <span className="rounded bg-amber-500/10 px-2 py-0.5 text-xs text-amber-300">
                                      Copy Link
                                    </span>
                                  ) : null}
                                </div>
                                <div className="space-y-1.5">
                                  {itemUrls.map((url, urlIndex) => {
                                    const actionKey = `current:${deliverableId}:${url}`;
                                    return (
                                      <div
                                        key={url}
                                        className="flex items-center gap-2 rounded-md border border-white/5 bg-black/20 px-3 py-2"
                                      >
                                        <Link
                                          href={url}
                                          target="_blank"
                                          className="min-w-0 flex-1 truncate text-sm text-blue-400 hover:text-blue-300 hover:underline"
                                          title={url}
                                        >
                                          {getFileName(url, urlIndex)}
                                        </Link>
                                        {getWorkflowStatus(selectedBooking) ===
                                          BOOKING_WORKFLOW_STATUS.EDITING && (
                                          <>
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              aria-label={`Delete ${getFileName(url, urlIndex)}`}
                                              className="h-8 w-8 shrink-0 text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
                                              disabled={
                                                deliverableAction !== null
                                              }
                                              onClick={() =>
                                                handleDeleteDeliverable({
                                                  source: "current",
                                                  deliverableId,
                                                  url,
                                                })
                                              }
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                            {deliverableAction === actionKey ? (
                                              <span className="sr-only">
                                                Deleting
                                              </span>
                                            ) : null}
                                          </>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          },
                        )}
                      </div>
                    </div>
                  ) : getWorkflowStatus(selectedBooking) ===
                    BOOKING_WORKFLOW_STATUS.EDITING ? (
                    <p className="mb-4 text-sm text-zinc-500">
                      No current files uploaded.
                    </p>
                  ) : null}

                  {getArchivedDeliverables(selectedBooking.filesUrl).length >
                    0 && (
                    <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-amber-300">
                            Previous Version
                          </p>
                          <p className="mt-1 text-xs text-zinc-400">
                            These files are hidden from the customer during the
                            revision.
                          </p>
                        </div>
                        {getWorkflowStatus(selectedBooking) ===
                          BOOKING_WORKFLOW_STATUS.EDITING && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="border-amber-500/40 text-amber-200 hover:bg-amber-500/10"
                            disabled={deliverableAction !== null}
                            onClick={handleRestorePreviousDeliverables}
                          >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            {deliverableAction === "restore"
                              ? "Restoring..."
                              : "Use Previous Files"}
                          </Button>
                        )}
                      </div>
                      <div className="space-y-4">
                        {getArchivedDeliverables(selectedBooking.filesUrl).map(
                          (item, itemIndex) => {
                            const deliverableId = getDeliverableId(
                              item,
                              itemIndex,
                            );
                            const itemUrls = getDeliverableUrls(item);

                            return (
                              <div key={deliverableId}>
                                <p className="mb-2 text-sm font-medium text-zinc-200">
                                  {item.label || item.type || "Files"}{" "}
                                  <span className="font-normal text-zinc-500">
                                    ({itemUrls.length})
                                  </span>
                                </p>
                                <div className="space-y-1.5">
                                  {itemUrls.map((url, urlIndex) => (
                                    <div
                                      key={url}
                                      className="flex items-center gap-2 rounded-md border border-white/5 bg-black/20 px-3 py-2"
                                    >
                                      <Link
                                        href={url}
                                        target="_blank"
                                        className="min-w-0 flex-1 truncate text-sm text-amber-200 hover:text-amber-100 hover:underline"
                                        title={url}
                                      >
                                        {getFileName(url, urlIndex)}
                                      </Link>
                                      {getWorkflowStatus(selectedBooking) ===
                                        BOOKING_WORKFLOW_STATUS.EDITING && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          aria-label={`Delete previous ${getFileName(url, urlIndex)}`}
                                          className="h-8 w-8 shrink-0 text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
                                          disabled={deliverableAction !== null}
                                          onClick={() =>
                                            handleDeleteDeliverable({
                                              source: "archived",
                                              deliverableId,
                                              url,
                                            })
                                          }
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          },
                        )}
                      </div>
                    </div>
                  )}

                  {getWorkflowStatus(selectedBooking) ===
                    BOOKING_WORKFLOW_STATUS.EDITING && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                        <div className="md:col-span-1">
                          <label
                            htmlFor="deliverable-type"
                            className="text-xs text-zinc-400 block mb-1"
                          >
                            Deliverable Type
                          </label>
                          <select
                            id="deliverable-type"
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
                          <label
                            htmlFor="deliverable-file-count"
                            className="text-xs text-zinc-400 block mb-1"
                          >
                            File Count
                          </label>
                          <Input
                            id="deliverable-file-count"
                            type="number"
                            min={1}
                            value={fileCount}
                            onChange={(e) => setFileCount(e.target.value)}
                            placeholder="e.g. 30"
                            className="bg-zinc-900 border-zinc-700 text-zinc-300"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label
                            htmlFor="deliverable-external-link"
                            className="text-xs text-zinc-400 block mb-1"
                          >
                            External Link (use for 360)
                          </label>
                          <Input
                            id="deliverable-external-link"
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
                          onChange={(e) =>
                            setFiles(Array.from(e.target.files || []))
                          }
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
                            uploading ||
                            (files.length === 0 && !externalUrl.trim())
                          }
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {uploading ? "Uploading..." : "Upload Deliverable"}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="shrink-0 border-t border-zinc-800 px-6 py-4">
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
