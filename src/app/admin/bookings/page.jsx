"use client";
import { RefreshCcw, Trash2 } from "lucide-react";
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
  DELIVERY_FILE_TYPE,
  getWorkflowStatus,
  hasTeamArrivedNotificationBeenSent,
  isBookingDispatched,
} from "@/lib/helpers/bookingWorkflow";
import {
  buildInvoiceDownloadUrl,
  formatInvoiceNumber,
} from "@/lib/helpers/invoice-format";
import {
  MAX_BOOKING_UPLOAD_BYTES,
  uploadBookingFile,
} from "@/lib/uploads/multipart";

const getDeliveryFiles = (booking) =>
  (booking?.deliveryFiles || []).filter((file) => !file.deletedAt);

const getFileName = (file) => {
  if (file?.currentVersion?.originalFilename) {
    return file.currentVersion.originalFilename;
  }
  try {
    const pathname = new URL(file?.currentVersion?.url || "").pathname;
    return (
      decodeURIComponent(pathname.split("/").filter(Boolean).pop()) ||
      file?.label ||
      "Deliverable"
    );
  } catch {
    return file?.label || "Deliverable";
  }
};

const hasUploadedDeliverables = (booking) =>
  getDeliveryFiles(booking).some(
    (file) =>
      file.currentVersion?.url &&
      !["PRIVATE", "CHANGES_REQUESTED"].includes(file.status),
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

const hasSentMediaTrigger = (booking, type) => {
  const notifications = booking?.deliveryNotificationMetadata || {};
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
    [BOOKING_WORKFLOW_STATUS.FILES_UPLOADED]: "Files In Review",
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
  const [deliverableType, setDeliverableType] = useState(
    DELIVERY_FILE_TYPE.PHOTOGRAPHY,
  );
  const [externalUrl, setExternalUrl] = useState("");
  const [replacementFileId, setReplacementFileId] = useState(null);
  const [uploadItems, setUploadItems] = useState([]);
  const fileInputRef = useRef(null);
  const uploadAbortRef = useRef(null);
  const selectedTransaction = selectedBooking?.transaction;
  const selectedInvoiceNumber = selectedTransaction?.id
    ? formatInvoiceNumber(selectedTransaction)
    : null;
  const selectedInvoiceDownloadUrl =
    selectedTransaction?.invoiceUrl && selectedInvoiceNumber
      ? buildInvoiceDownloadUrl(
          selectedTransaction.invoiceUrl,
          selectedInvoiceNumber,
          selectedTransaction.id,
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
    return null;
  };

  const handleUpload = async () => {
    const is360 = deliverableType === DELIVERY_FILE_TYPE.TOUR_360;
    const hasExternalUrl = Boolean(externalUrl.trim());
    if ((files.length === 0 && !hasExternalUrl) || !selectedBooking) return;
    const invalidFile = files.find(
      (file) => file.size <= 0 || file.size > MAX_BOOKING_UPLOAD_BYTES,
    );
    if (invalidFile) {
      alert(`${invalidFile.name} must be smaller than or equal to 2 GiB.`);
      return;
    }
    setUploading(true);
    setUploadItems(
      files.map((file) => ({
        name: file.name,
        status: "Preparing",
        progress: 0,
      })),
    );
    const controller = new AbortController();
    uploadAbortRef.current = controller;
    let workingBooking = selectedBooking;
    let completedCount = 0;
    const applyUploadResult = (data, targetReplacementFileId = null) => {
      const createdFiles = data.deliveryFiles || [];
      const nextDeliveryFiles = targetReplacementFileId
        ? getDeliveryFiles(workingBooking).map((file) =>
            file.id === targetReplacementFileId ? createdFiles[0] : file,
          )
        : [...getDeliveryFiles(workingBooking), ...createdFiles];
      workingBooking = {
        ...workingBooking,
        ...(data.booking || {}),
        filesUrl: data.filesUrl || data.url,
        deliveryFiles: nextDeliveryFiles,
      };
      setSelectedBooking(workingBooking);
      setBookings((previous) =>
        previous.map((booking) =>
          booking.id === workingBooking.id ? workingBooking : booking,
        ),
      );
    };
    try {
      if (hasExternalUrl) {
        const formData = new FormData();
        formData.append("bookingId", selectedBooking.id);
        formData.append("deliverableType", deliverableType);
        formData.append("externalUrl", externalUrl.trim());
        if (replacementFileId) {
          formData.append("replacementFileId", replacementFileId);
        }
        const response = await fetch("/api/admin/upload", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok)
          throw new Error(data.error || "URL registration failed");
        applyUploadResult(data, replacementFileId);
        setExternalUrl("");
        completedCount += 1;
      }

      for (const [index, file] of files.entries()) {
        const data = await uploadBookingFile({
          bookingId: selectedBooking.id,
          replacementFileId,
          deliverableType,
          file,
          signal: controller.signal,
          onState: (changes) =>
            setUploadItems((items) =>
              items.map((item, itemIndex) =>
                itemIndex === index ? { ...item, ...changes } : item,
              ),
            ),
        });
        applyUploadResult(data, replacementFileId);
        setFiles((pendingFiles) =>
          pendingFiles.filter((pendingFile) => pendingFile !== file),
        );
        completedCount += 1;
      }

      alert(
        replacementFileId
          ? "Replacement uploaded successfully"
          : is360 && hasExternalUrl
            ? "360 link uploaded successfully"
            : `${completedCount} file(s) uploaded successfully`,
      );
      setFiles([]);
      setExternalUrl("");
      setReplacementFileId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error(error);
      if (error.name !== "AbortError") {
        alert(`Upload failed: ${error.message || "Unknown error"}`);
      }
    } finally {
      setUploading(false);
      uploadAbortRef.current = null;
    }
  };

  const updateSelectedBooking = (changes) => {
    const updatedBooking = {
      ...selectedBooking,
      ...changes,
    };
    setSelectedBooking(updatedBooking);
    setBookings((prev) =>
      prev.map((booking) =>
        booking.id === selectedBooking.id ? updatedBooking : booking,
      ),
    );
  };

  const handleDeleteDeliverable = async (fileId) => {
    if (!selectedBooking?.id) return;
    if (!window.confirm("Delete this file from the booking?")) return;

    const actionKey = `delete:${fileId}`;
    setDeliverableAction(actionKey);
    try {
      const response = await fetch(
        `/api/admin/bookings/${selectedBooking.id}/deliverables`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to delete file");
      }
      updateSelectedBooking({
        filesUrl: data.filesUrl,
        deliveryFiles: getDeliveryFiles(selectedBooking).filter(
          (file) => file.id !== fileId,
        ),
        deliveryFinishedAt: null,
      });
    } catch (error) {
      console.error(error);
      alert(error.message || "Failed to delete file");
    } finally {
      setDeliverableAction(null);
    }
  };

  const handleFinishDelivery = async () => {
    if (!selectedBooking?.id) return;

    setDeliverableAction("finish");
    try {
      const response = await fetch(
        `/api/admin/bookings/${selectedBooking.id}/deliverables`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "finish_delivery" }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to finish delivery");
      }
      updateSelectedBooking(data.booking || {});
      alert("Delivery marked as finished.");
    } catch (error) {
      console.error(error);
      alert(error.message || "Failed to finish delivery");
    } finally {
      setDeliverableAction(null);
    }
  };

  const handlePublishStagedFiles = async () => {
    if (!selectedBooking?.id) return;
    setDeliverableAction("publish");
    try {
      const response = await fetch(
        `/api/admin/bookings/${selectedBooking.id}/deliverables`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "publish_private" }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to publish staged files");
      }
      const publishedIds = new Set(data.booking?.publishedFileIds || []);
      updateSelectedBooking({
        ...(data.booking || {}),
        deliveryFiles: getDeliveryFiles(selectedBooking).map((file) =>
          publishedIds.has(file.id)
            ? { ...file, status: "UNDER_REVIEW" }
            : file,
        ),
      });
      alert("Staged files published for customer review.");
    } catch (error) {
      console.error(error);
      alert(error.message || "Failed to publish staged files");
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
        (type === "team_on_the_way" ||
          type === "team_arrived" ||
          type === "single_service_media_ready" ||
          type === "partial_media_upload" ||
          type === "full_media_upload") &&
        data?.notificationMetadata
      ) {
        const updatedBooking = {
          ...selectedBooking,
          deliveryNotificationMetadata: data.notificationMetadata,
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

      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!uploading) setIsOpen(open);
        }}
      >
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
                    disabled={workflowUpdating}
                  >
                    {workflowUpdating
                      ? "Updating..."
                      : getWorkflowAction(selectedBooking).label}
                  </Button>
                ) : null}
              </div>

              <BookingWorkflowTracker booking={selectedBooking} />

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
                      selectedBooking.completedAt ||
                      isBookingDispatched(selectedBooking)
                    }
                    onClick={() => handleSendNotification("team_on_the_way")}
                  >
                    {notifyingType === "team_on_the_way"
                      ? "Sending..."
                      : isBookingDispatched(selectedBooking)
                        ? "Team On The Way Sent"
                        : "Send Team On The Way"}
                  </Button>
                  <Button
                    variant="outline"
                    className="border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                    disabled={
                      notifyingType !== null ||
                      selectedBooking.cancelledAt ||
                      selectedBooking.status === "COMPLETED" ||
                      selectedBooking.completedAt ||
                      hasTeamArrivedNotificationBeenSent(selectedBooking)
                    }
                    onClick={() => handleSendNotification("team_arrived")}
                  >
                    {notifyingType === "team_arrived"
                      ? "Sending..."
                      : hasTeamArrivedNotificationBeenSent(selectedBooking)
                        ? "Team Arrived Sent"
                        : "Send Team Arrived"}
                  </Button>
                  {isSingleServiceBooking(selectedBooking) ? (
                    <Button
                      variant="outline"
                      className="border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                      disabled={
                        notifyingType !== null ||
                        selectedBooking.cancelledAt ||
                        !hasUploadedDeliverables(selectedBooking) ||
                        hasSentMediaTrigger(
                          selectedBooking,
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
                              selectedBooking,
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
                          !hasUploadedDeliverables(selectedBooking) ||
                          hasSentMediaTrigger(
                            selectedBooking,
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
                                selectedBooking,
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
                          !selectedBooking.deliveryFinishedAt ||
                          !hasUploadedDeliverables(selectedBooking) ||
                          hasSentMediaTrigger(
                            selectedBooking,
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
                                selectedBooking,
                                "full_media_upload",
                              )
                            ? "All Media Sent"
                            : "Send All Media Delivered"}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {([
                BOOKING_WORKFLOW_STATUS.EDITING,
                BOOKING_WORKFLOW_STATUS.FILES_UPLOADED,
              ].includes(getWorkflowStatus(selectedBooking)) ||
                getDeliveryFiles(selectedBooking).length > 0) && (
                <div className="border-t border-zinc-800 pt-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-zinc-300">
                        Deliverables
                      </h3>
                      <p className="mt-1 text-xs text-zinc-500">
                        Each physical file has its own two-request allowance.
                      </p>
                    </div>
                    {getDeliveryFiles(selectedBooking).some(
                      (file) => file.status === "PRIVATE",
                    ) && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={deliverableAction !== null}
                        onClick={handlePublishStagedFiles}
                      >
                        {deliverableAction === "publish"
                          ? "Publishing..."
                          : "Publish Staged Files"}
                      </Button>
                    )}
                    {getWorkflowStatus(selectedBooking) ===
                      BOOKING_WORKFLOW_STATUS.FILES_UPLOADED &&
                      !selectedBooking.deliveryFinishedAt && (
                        <Button
                          type="button"
                          className="bg-green-600 text-white hover:bg-green-700"
                          disabled={
                            deliverableAction !== null ||
                            getDeliveryFiles(selectedBooking).length === 0 ||
                            getDeliveryFiles(selectedBooking).some((file) =>
                              ["PRIVATE", "CHANGES_REQUESTED"].includes(
                                file.status,
                              ),
                            )
                          }
                          onClick={handleFinishDelivery}
                        >
                          {deliverableAction === "finish"
                            ? "Finishing..."
                            : "Mark Delivery Finished"}
                        </Button>
                      )}
                    {selectedBooking.deliveryFinishedAt && (
                      <Badge className="bg-emerald-600">
                        Delivery Finished
                      </Badge>
                    )}
                  </div>

                  {getDeliveryFiles(selectedBooking).length > 0 ? (
                    <div className="mb-5 space-y-3">
                      {getDeliveryFiles(selectedBooking).map((file) => {
                        const activeRevision = (file.fileRevisions || []).find(
                          (revision) => !revision.resolvedAt,
                        );
                        const versions = file.versions || [];
                        return (
                          <div
                            key={file.id}
                            className="rounded-lg border border-white/10 bg-black/20 p-3"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <Link
                                  href={file.currentVersion?.url || "#"}
                                  target="_blank"
                                  className="block truncate text-sm font-medium text-blue-300 hover:underline"
                                >
                                  {getFileName(file)}
                                </Link>
                                <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-500">
                                  <span>{file.label || file.type}</span>
                                  <span>
                                    Revision {file.revisionCount || 0}/2
                                  </span>
                                  <span
                                    className={
                                      file.status === "CHANGES_REQUESTED"
                                        ? "text-amber-300"
                                        : file.status === "ACCEPTED"
                                          ? "text-emerald-300"
                                          : "text-blue-300"
                                    }
                                  >
                                    {file.status.replaceAll("_", " ")}
                                  </span>
                                  <span>Version {versions.length || 1}</span>
                                </div>
                                {activeRevision && (
                                  <div className="mt-2 rounded border border-amber-500/20 bg-amber-500/5 p-2 text-xs">
                                    <p className="font-medium text-amber-200">
                                      Requested changes
                                    </p>
                                    <p className="mt-1 whitespace-pre-wrap text-zinc-400">
                                      {activeRevision.note}
                                    </p>
                                  </div>
                                )}
                              </div>
                              <div className="flex shrink-0 gap-2">
                                {file.status === "CHANGES_REQUESTED" && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setReplacementFileId(file.id);
                                      setDeliverableType(file.type);
                                      setFiles([]);
                                      setExternalUrl("");
                                      if (fileInputRef.current) {
                                        fileInputRef.current.value = "";
                                      }
                                    }}
                                  >
                                    <RefreshCcw className="mr-2 h-4 w-4" />
                                    Replace File
                                  </Button>
                                )}
                                {!selectedBooking.completedAt && (
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    aria-label={`Delete ${getFileName(file)}`}
                                    className="text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
                                    disabled={deliverableAction !== null}
                                    onClick={() =>
                                      handleDeleteDeliverable(file.id)
                                    }
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mb-4 text-sm text-zinc-500">
                      No files uploaded yet.
                    </p>
                  )}

                  {[
                    BOOKING_WORKFLOW_STATUS.EDITING,
                    BOOKING_WORKFLOW_STATUS.FILES_UPLOADED,
                  ].includes(getWorkflowStatus(selectedBooking)) && (
                    <div className="rounded-lg border border-zinc-800 p-3">
                      {replacementFileId && (
                        <div className="mb-3 flex items-center justify-between rounded bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                          <span>
                            Uploading replacement for{" "}
                            {getFileName(
                              getDeliveryFiles(selectedBooking).find(
                                (file) => file.id === replacementFileId,
                              ),
                            )}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setReplacementFileId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                      <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-3">
                        <div>
                          <label
                            htmlFor="deliverable-type"
                            className="mb-1 block text-xs text-zinc-400"
                          >
                            Deliverable Type
                          </label>
                          <select
                            id="deliverable-type"
                            value={deliverableType}
                            disabled={Boolean(replacementFileId) || uploading}
                            onChange={(event) =>
                              setDeliverableType(event.target.value)
                            }
                            className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-300"
                          >
                            {Object.values(DELIVERY_FILE_TYPE).map((type) => (
                              <option key={type}>{type}</option>
                            ))}
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label
                            htmlFor="deliverable-external-link"
                            className="mb-1 block text-xs text-zinc-400"
                          >
                            S3 File URL / External Link
                          </label>
                          <Input
                            id="deliverable-external-link"
                            type="url"
                            value={externalUrl}
                            onChange={(event) =>
                              setExternalUrl(event.target.value)
                            }
                            placeholder="https://bucket.s3.region.amazonaws.com/file"
                            disabled={uploading}
                            className="border-zinc-700 bg-zinc-900 text-zinc-300"
                          />
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <Input
                          ref={fileInputRef}
                          type="file"
                          multiple={!replacementFileId}
                          disabled={uploading}
                          onChange={(event) => {
                            const selected = Array.from(
                              event.target.files || [],
                            );
                            const oversized = selected.find(
                              (file) => file.size > MAX_BOOKING_UPLOAD_BYTES,
                            );
                            if (oversized) {
                              alert(
                                `${oversized.name} exceeds the 2 GiB limit.`,
                              );
                              event.target.value = "";
                              setFiles([]);
                              return;
                            }
                            setFiles(selected);
                            setUploadItems([]);
                          }}
                          className="max-w-xs border-zinc-700 bg-zinc-900 text-zinc-300"
                        />
                        {files.length > 0 && (
                          <span className="text-xs text-zinc-400">
                            {files.length} file(s) selected
                          </span>
                        )}
                        <Button
                          type="button"
                          onClick={handleUpload}
                          disabled={
                            uploading ||
                            (files.length === 0 && !externalUrl.trim()) ||
                            (Boolean(replacementFileId) &&
                              files.length + (externalUrl.trim() ? 1 : 0) !== 1)
                          }
                          className="bg-blue-600 text-white hover:bg-blue-700"
                        >
                          {uploading
                            ? "Uploading..."
                            : replacementFileId
                              ? "Upload Replacement"
                              : "Upload Files"}
                        </Button>
                        {uploading && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => uploadAbortRef.current?.abort()}
                          >
                            Cancel Upload
                          </Button>
                        )}
                      </div>
                      {uploadItems.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {uploadItems.map((item, index) => (
                            <div
                              key={`${item.name}-${index}`}
                              className="rounded border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-xs"
                            >
                              <div className="flex justify-between gap-3">
                                <span className="truncate text-zinc-300">
                                  {item.name}
                                </span>
                                <span className="shrink-0 text-zinc-400">
                                  {item.status}
                                  {typeof item.progress === "number"
                                    ? ` ${item.progress}%`
                                    : ""}
                                </span>
                              </div>
                              {typeof item.progress === "number" && (
                                <div className="mt-2 h-1.5 overflow-hidden rounded bg-zinc-800">
                                  <div
                                    className="h-full bg-blue-500 transition-[width]"
                                    style={{ width: `${item.progress}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="shrink-0 border-t border-zinc-800 px-6 py-4">
            <Button
              variant="ghost"
              onClick={() => setIsOpen(false)}
              disabled={uploading}
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
