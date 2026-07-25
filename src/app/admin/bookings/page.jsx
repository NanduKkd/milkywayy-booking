"use client";

import { ChevronLeft, ChevronRight, RefreshCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  AdminBadge,
  AdminEmptyState,
  AdminFilterChip,
  AdminFilterRow,
  AdminInlineMessage,
  AdminPage,
  AdminPageHeader,
  AdminTablePanel,
} from "@/components/admin/AdminPrimitives";
import BookingWorkflowTracker from "@/components/BookingWorkflowTracker";
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
  NEW_DELIVERY_FILE_TYPES,
} from "@/lib/helpers/bookingWorkflow";
import {
  buildInvoiceDownloadUrl,
  formatInvoiceNumber,
} from "@/lib/helpers/invoice-format";
import {
  MAX_BOOKING_UPLOAD_BYTES,
  uploadBookingFile,
} from "@/lib/uploads/multipart";

const BOOKING_FILTERS = [
  { id: "ALL", label: "All" },
  { id: "PENDING", label: "Pending" },
  { id: "COMPLETED", label: "Completed" },
  { id: "CANCELLED", label: "Cancelled" },
];
const BOOKING_PAGE_SIZE = 10;

const DETAIL_PANEL_CLASS =
  "admin-panel-subtle rounded-xl border border-[hsl(var(--admin-border)/0.76)] p-4";

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

const getPropertyLabel = (booking) =>
  [
    booking?.propertyDetails?.unit,
    booking?.propertyDetails?.building,
    booking?.propertyDetails?.community,
  ]
    .filter(Boolean)
    .join(", ") || "Property details pending";

const isCancelledBooking = (booking) =>
  Boolean(booking?.cancelledAt || booking?.status === "CANCELLED");

const isCompletedBooking = (booking) =>
  !isCancelledBooking(booking) &&
  (getWorkflowStatus(booking) === BOOKING_WORKFLOW_STATUS.PROJECT_COMPLETED ||
    booking?.status === "COMPLETED" ||
    Boolean(booking?.completedAt));

const hasReplacementPending = (booking) =>
  getDeliveryFiles(booking).some((file) => file.status === "CHANGES_REQUESTED");

const matchesBookingFilter = (booking, filterId) => {
  if (filterId === "COMPLETED") {
    return isCompletedBooking(booking);
  }
  if (filterId === "CANCELLED") {
    return isCancelledBooking(booking);
  }
  if (filterId === "PENDING") {
    return (
      !isCancelledBooking(booking) &&
      !isCompletedBooking(booking) &&
      (booking?.status === "DRAFT" ||
        getWorkflowStatus(booking) === BOOKING_WORKFLOW_STATUS.SHOOT_BOOKED)
    );
  }
  return true;
};

const getBookingStatusMeta = (booking) => {
  if (isCancelledBooking(booking)) {
    return { label: "Cancelled", tone: "danger" };
  }
  if (isCompletedBooking(booking)) {
    return { label: "Project Completed", tone: "success" };
  }
  if (hasReplacementPending(booking)) {
    return { label: "Replacement Pending", tone: "warning" };
  }
  if (booking?.status === "DRAFT") {
    return { label: "Awaiting Payment", tone: "warning" };
  }
  return { label: getWorkflowLabel(booking), tone: "info" };
};

const getFilterCounts = (bookings) =>
  BOOKING_FILTERS.reduce((counts, filter) => {
    counts[filter.id] = bookings.filter((booking) =>
      matchesBookingFilter(booking, filter.id),
    ).length;
    return counts;
  }, {});

const getDeliverableStatusTone = (status) => {
  if (status === "CHANGES_REQUESTED") return "warning";
  if (status === "ACCEPTED") return "success";
  if (status === "UNDER_REVIEW") return "info";
  if (status === "PRIVATE") return "neutral";
  return "neutral";
};

const fetchAdminBookings = async () => {
  const response = await fetch("/api/admin/bookings");
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Failed to fetch bookings");
  }
  if (!Array.isArray(data)) {
    throw new Error("Failed to fetch bookings");
  }

  return data;
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
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
  const replacementUploaderRef = useRef(null);
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
  const bookingCounts = getFilterCounts(bookings);
  const filteredBookings = bookings.filter((booking) =>
    matchesBookingFilter(booking, activeFilter),
  );
  const totalPages = Math.max(
    Math.ceil(filteredBookings.length / BOOKING_PAGE_SIZE),
    1,
  );
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * BOOKING_PAGE_SIZE;
  const paginatedBookings = filteredBookings.slice(
    pageStart,
    pageStart + BOOKING_PAGE_SIZE,
  );
  const visibleRange = filteredBookings.length
    ? `${pageStart + 1}-${pageStart + paginatedBookings.length} of ${filteredBookings.length}`
    : "0 visible";

  useEffect(() => {
    let cancelled = false;

    const loadBookings = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const data = await fetchAdminBookings();
        if (!cancelled) {
          setBookings(data);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setBookings([]);
          setLoadError(error.message || "Failed to fetch bookings");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadBookings();

    return () => {
      cancelled = true;
      uploadAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!replacementFileId) return;

    replacementUploaderRef.current?.scrollIntoView?.({
      behavior: "smooth",
      block: "center",
    });
    fileInputRef.current?.focus();
  }, [replacementFileId]);

  const handleRefreshBookings = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await fetchAdminBookings();
      setBookings(data);

      if (selectedBooking?.id) {
        const nextSelectedBooking = data.find(
          (booking) => booking.id === selectedBooking.id,
        );
        setSelectedBooking(nextSelectedBooking || null);
        if (!nextSelectedBooking) {
          setIsOpen(false);
        }
      }
    } catch (error) {
      console.error(error);
      setBookings([]);
      setLoadError(error.message || "Failed to fetch bookings");
    } finally {
      setIsLoading(false);
    }
  };

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
    } catch (error) {
      console.error(error);
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
        if (!response.ok) {
          throw new Error(data.error || "URL registration failed");
        }
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
      setDeliverableType(DELIVERY_FILE_TYPE.PHOTOGRAPHY);
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
      const response = await fetch("/api/notifications/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          bookingId: selectedBooking.id,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
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
    <AdminPage>
      <AdminPageHeader
        eyebrow="Operations"
        title="Bookings"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <AdminBadge tone={loadError ? "danger" : "neutral"}>
              {loadError
                ? "Sync failed"
                : isLoading
                  ? "Refreshing"
                  : visibleRange}
            </AdminBadge>
            <Button
              type="button"
              variant="outline"
              onClick={handleRefreshBookings}
              disabled={isLoading}
              className="border-[hsl(var(--admin-border)/0.88)] bg-transparent text-[hsl(var(--admin-foreground))] hover:bg-white/[0.05] hover:text-[hsl(var(--admin-foreground))]"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        }
      />

      <AdminTablePanel>
        <div className="border-b border-white/8 px-4 py-3">
          <AdminFilterRow>
            {BOOKING_FILTERS.map((filter) => (
              <AdminFilterChip
                key={filter.id}
                active={activeFilter === filter.id}
                onClick={() => {
                  setActiveFilter(filter.id);
                  setPage(1);
                }}
                aria-pressed={activeFilter === filter.id}
              >
                <span>{filter.label}</span>
                <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[0.72rem] text-[hsl(var(--admin-foreground))]">
                  {bookingCounts[filter.id] || 0}
                </span>
              </AdminFilterChip>
            ))}
          </AdminFilterRow>
        </div>

        {loadError ? (
          <div className="space-y-4 px-5 py-6 sm:px-6">
            <AdminInlineMessage
              tone="danger"
              title="Bookings could not be loaded"
              description={loadError}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleRefreshBookings}
              className="border-[hsl(var(--admin-border)/0.88)] bg-transparent text-[hsl(var(--admin-foreground))] hover:bg-white/[0.05] hover:text-[hsl(var(--admin-foreground))]"
            >
              Try Again
            </Button>
          </div>
        ) : isLoading ? (
          <div className="px-5 py-6 sm:px-6">
            <AdminInlineMessage
              loading
              title="Loading bookings"
              description="Fetching the latest live queue and preserving the current admin workflows."
            />
          </div>
        ) : filteredBookings.length === 0 ? (
          <AdminEmptyState
            title={`No ${activeFilter.toLowerCase()} bookings found`}
            description="Change the status filter or refresh the queue to review a different set of bookings."
          />
        ) : (
          <>
            <Table className="min-w-[940px]">
              <TableHeader className="bg-white/[0.03] [&_tr]:border-white/8">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[0.72rem] uppercase tracking-[0.18em] text-[hsl(var(--admin-muted))]">
                    Booking
                  </TableHead>
                  <TableHead className="text-[0.72rem] uppercase tracking-[0.18em] text-[hsl(var(--admin-muted))]">
                    Customer
                  </TableHead>
                  <TableHead className="text-[0.72rem] uppercase tracking-[0.18em] text-[hsl(var(--admin-muted))]">
                    Services
                  </TableHead>
                  <TableHead className="text-[0.72rem] uppercase tracking-[0.18em] text-[hsl(var(--admin-muted))]">
                    Schedule
                  </TableHead>
                  <TableHead className="text-[0.72rem] uppercase tracking-[0.18em] text-[hsl(var(--admin-muted))]">
                    Total
                  </TableHead>
                  <TableHead className="text-[0.72rem] uppercase tracking-[0.18em] text-[hsl(var(--admin-muted))]">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="[&_tr:last-child]:border-white/8">
                {paginatedBookings.map((booking) => {
                  const bookingStatus = getBookingStatusMeta(booking);

                  return (
                    <TableRow
                      key={booking.id}
                      className="cursor-pointer border-white/8 text-[hsl(var(--admin-foreground))] hover:bg-white/[0.03]"
                      onClick={() => handleRowClick(booking)}
                    >
                      <TableCell className="space-y-0.5 py-3">
                        <p className="text-sm font-semibold">#{booking.id}</p>
                        <p className="text-sm text-[hsl(var(--admin-foreground))]">
                          {getPropertyLabel(booking)}
                        </p>
                        <p className="text-xs text-[hsl(var(--admin-muted))]">
                          {booking.propertyDetails?.type ||
                            "Property type pending"}
                        </p>
                      </TableCell>
                      <TableCell className="space-y-0.5 py-3">
                        <p className="text-sm font-medium">
                          {booking.user?.fullName || "Customer not assigned"}
                        </p>
                        <p className="text-xs text-[hsl(var(--admin-muted))]">
                          {booking.user?.email || "No email provided"}
                        </p>
                        <p className="text-xs text-[hsl(var(--admin-muted))]">
                          {booking.user?.phone || "No phone provided"}
                        </p>
                      </TableCell>
                      <TableCell className="py-3 text-sm text-[hsl(var(--admin-muted))]">
                        {getBookingServices(booking).join(", ") ||
                          "No services specified"}
                      </TableCell>
                      <TableCell className="space-y-0.5 py-3">
                        <p className="text-sm">
                          {booking.date || "Date pending"}
                        </p>
                        <p className="text-xs text-[hsl(var(--admin-muted))]">
                          {booking.slot
                            ? `Slot: ${booking.slot}`
                            : "Slot pending"}
                        </p>
                      </TableCell>
                      <TableCell className="py-3 text-sm font-medium">
                        AED {booking.total ?? 0}
                      </TableCell>
                      <TableCell className="py-3">
                        <AdminBadge tone={bookingStatus.tone}>
                          {bookingStatus.label}
                        </AdminBadge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between border-t border-white/8 px-4 py-3">
              <p className="text-xs text-[hsl(var(--admin-muted))]">
                Page {currentPage} of {totalPages} · {filteredBookings.length}{" "}
                bookings
              </p>
              <div className="flex gap-1">
                <Button
                  aria-label="Previous bookings page"
                  disabled={currentPage === 1}
                  onClick={() => setPage((value) => Math.max(value - 1, 1))}
                  size="icon"
                  type="button"
                  variant="outline"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  aria-label="Next bookings page"
                  disabled={currentPage === totalPages}
                  onClick={() =>
                    setPage((value) => Math.min(value + 1, totalPages))
                  }
                  size="icon"
                  type="button"
                  variant="outline"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </AdminTablePanel>

      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!uploading) setIsOpen(open);
        }}
      >
        <DialogContent className="admin-dialog flex max-h-[90vh] flex-col gap-0 overflow-hidden border-[hsl(var(--admin-border-strong)/0.92)] p-0 text-[hsl(var(--admin-foreground))] sm:max-w-5xl">
          <DialogHeader className="shrink-0 border-b border-[hsl(var(--admin-border)/0.82)] px-5 py-4 pr-12">
            <DialogTitle className="text-base tracking-[-0.02em] text-[hsl(var(--admin-foreground))]">
              Booking #{selectedBooking?.id}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Booking workflow and operational actions
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
              <div className="grid gap-4 xl:grid-cols-2">
                <div className={DETAIL_PANEL_CLASS}>
                  <p className="admin-kicker mb-3">Customer</p>
                  <div className="space-y-1.5">
                    <p className="text-base font-semibold">
                      {selectedBooking.user?.fullName ||
                        "Customer not assigned"}
                    </p>
                    <p className="text-sm text-[hsl(var(--admin-muted))]">
                      {selectedBooking.user?.email || "No email provided"}
                    </p>
                    <p className="text-sm text-[hsl(var(--admin-muted))]">
                      {selectedBooking.user?.phone || "No phone provided"}
                    </p>
                  </div>
                </div>
                <div className={DETAIL_PANEL_CLASS}>
                  <p className="admin-kicker mb-3">Schedule</p>
                  <div className="space-y-1.5">
                    <p className="text-base font-semibold">
                      {selectedBooking.date || "Date pending"}
                    </p>
                    <p className="text-sm text-[hsl(var(--admin-muted))]">
                      {selectedBooking.slot
                        ? `Slot: ${selectedBooking.slot}`
                        : "Slot pending"}
                    </p>
                    <p className="text-sm text-[hsl(var(--admin-muted))]">
                      {getPropertyLabel(selectedBooking)}
                    </p>
                  </div>
                </div>
                <div className={DETAIL_PANEL_CLASS}>
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="admin-kicker mb-2">Transaction</p>
                      <p className="text-base font-semibold">
                        AED {selectedBooking.transaction?.amount ?? 0}
                      </p>
                    </div>
                    <AdminBadge tone="neutral">
                      {selectedBooking.transaction?.status || "No payment"}
                    </AdminBadge>
                  </div>
                  {selectedInvoiceDownloadUrl ? (
                    <Button
                      asChild
                      variant="outline"
                      className="border-[hsl(var(--admin-border)/0.88)] bg-transparent text-[hsl(var(--admin-foreground))] hover:bg-white/[0.05] hover:text-[hsl(var(--admin-foreground))]"
                    >
                      <Link href={selectedInvoiceDownloadUrl} target="_blank">
                        Download Invoice
                      </Link>
                    </Button>
                  ) : (
                    <p className="text-sm text-[hsl(var(--admin-muted))]">
                      No invoice available for this booking yet.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                <div className={DETAIL_PANEL_CLASS}>
                  <p className="admin-kicker mb-3">Services</p>
                  <p className="text-sm leading-6 text-[hsl(var(--admin-muted))]">
                    {selectedBooking.shootDetails?.services?.join(", ") ||
                      "No services specified."}
                  </p>
                </div>
                <div className={DETAIL_PANEL_CLASS}>
                  <p className="admin-kicker mb-3">Property Details</p>
                  <div className="space-y-2 text-sm text-[hsl(var(--admin-muted))]">
                    <p>
                      <span className="font-medium text-[hsl(var(--admin-foreground))]">
                        Type:
                      </span>{" "}
                      {selectedBooking.propertyDetails?.type || "Not provided"}
                    </p>
                    <p>
                      <span className="font-medium text-[hsl(var(--admin-foreground))]">
                        Size:
                      </span>{" "}
                      {selectedBooking.propertyDetails?.size || "Not provided"}
                    </p>
                    <p>
                      <span className="font-medium text-[hsl(var(--admin-foreground))]">
                        Address:
                      </span>{" "}
                      {getPropertyLabel(selectedBooking)}
                    </p>
                  </div>
                </div>
              </div>

              <section className={DETAIL_PANEL_CLASS}>
                <div className="admin-toolbar gap-4">
                  <div className="space-y-2">
                    <p className="admin-kicker">Delivery Workflow</p>
                    <p className="text-sm text-[hsl(var(--admin-muted))]">
                      {selectedBooking.cancelledAt
                        ? "This booking has been cancelled."
                        : getWorkflowStatus(selectedBooking) ===
                            BOOKING_WORKFLOW_STATUS.PROJECT_COMPLETED
                          ? "The project is completed."
                          : `Current stage: ${getWorkflowLabel(selectedBooking)}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <AdminBadge
                      tone={getBookingStatusMeta(selectedBooking).tone}
                    >
                      {getBookingStatusMeta(selectedBooking).label}
                    </AdminBadge>
                    {getWorkflowAction(selectedBooking) ? (
                      <Button
                        type="button"
                        onClick={() =>
                          handleWorkflowUpdate(
                            getWorkflowAction(selectedBooking).next,
                          )
                        }
                        disabled={workflowUpdating}
                        className="bg-[hsl(var(--admin-success))] text-slate-950 hover:bg-[hsl(var(--admin-success)/0.88)]"
                      >
                        {workflowUpdating
                          ? "Updating..."
                          : getWorkflowAction(selectedBooking).label}
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-5">
                  <BookingWorkflowTracker booking={selectedBooking} />
                </div>
              </section>

              <section className={DETAIL_PANEL_CLASS}>
                <div className="space-y-2">
                  <p className="admin-kicker">Manual WhatsApp Triggers</p>
                  <p className="text-sm text-[hsl(var(--admin-muted))]">
                    Send operational updates manually from admin without
                    changing the current notification integrations.
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="border-[hsl(var(--admin-border)/0.88)] bg-transparent text-[hsl(var(--admin-foreground))] hover:bg-white/[0.05] hover:text-[hsl(var(--admin-foreground))]"
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
                    className="border-[hsl(var(--admin-border)/0.88)] bg-transparent text-[hsl(var(--admin-foreground))] hover:bg-white/[0.05] hover:text-[hsl(var(--admin-foreground))]"
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
                      className="border-[hsl(var(--admin-border)/0.88)] bg-transparent text-[hsl(var(--admin-foreground))] hover:bg-white/[0.05] hover:text-[hsl(var(--admin-foreground))]"
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
                        className="border-[hsl(var(--admin-border)/0.88)] bg-transparent text-[hsl(var(--admin-foreground))] hover:bg-white/[0.05] hover:text-[hsl(var(--admin-foreground))]"
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
                        className="border-[hsl(var(--admin-border)/0.88)] bg-transparent text-[hsl(var(--admin-foreground))] hover:bg-white/[0.05] hover:text-[hsl(var(--admin-foreground))]"
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
              </section>

              {([
                BOOKING_WORKFLOW_STATUS.EDITING,
                BOOKING_WORKFLOW_STATUS.FILES_UPLOADED,
              ].includes(getWorkflowStatus(selectedBooking)) ||
                getDeliveryFiles(selectedBooking).length > 0) && (
                <section className={DETAIL_PANEL_CLASS}>
                  <div className="admin-toolbar gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <div>
                          <p className="admin-kicker">Delivery Assets</p>
                          <h3 className="mt-1 text-base font-semibold text-[hsl(var(--admin-foreground))]">
                            Deliverables
                          </h3>
                        </div>
                        {selectedBooking.deliveryFinishedAt ? (
                          <AdminBadge tone="success">
                            Delivery Finished
                          </AdminBadge>
                        ) : null}
                      </div>
                      <p className="text-sm text-[hsl(var(--admin-muted))]">
                        Each physical file keeps its current two-request
                        revision allowance and existing publish/delete actions.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {getDeliveryFiles(selectedBooking).some(
                        (file) => file.status === "PRIVATE",
                      ) ? (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={deliverableAction !== null}
                          onClick={handlePublishStagedFiles}
                          className="border-[hsl(var(--admin-border)/0.88)] bg-transparent text-[hsl(var(--admin-foreground))] hover:bg-white/[0.05] hover:text-[hsl(var(--admin-foreground))]"
                        >
                          {deliverableAction === "publish"
                            ? "Publishing..."
                            : "Publish Staged Files"}
                        </Button>
                      ) : null}

                      {getWorkflowStatus(selectedBooking) ===
                        BOOKING_WORKFLOW_STATUS.FILES_UPLOADED &&
                      !selectedBooking.deliveryFinishedAt ? (
                        <Button
                          type="button"
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
                          className="bg-[hsl(var(--admin-success))] text-slate-950 hover:bg-[hsl(var(--admin-success)/0.88)]"
                        >
                          {deliverableAction === "finish"
                            ? "Finishing..."
                            : "Mark Delivery Finished"}
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {getDeliveryFiles(selectedBooking).length > 0 ? (
                    <div className="mt-5 space-y-3">
                      {getDeliveryFiles(selectedBooking).map((file) => {
                        const activeRevision = (file.fileRevisions || []).find(
                          (revision) => !revision.resolvedAt,
                        );
                        const versions = file.versions || [];

                        return (
                          <div
                            key={file.id}
                            className="admin-panel-muted rounded-xl border border-white/8 p-4"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0 space-y-2">
                                <Link
                                  href={file.currentVersion?.url || "#"}
                                  target="_blank"
                                  className="block truncate text-sm font-semibold text-[hsl(var(--admin-foreground))] underline-offset-4 hover:underline"
                                >
                                  {getFileName(file)}
                                </Link>
                                <div className="flex flex-wrap gap-2">
                                  <AdminBadge tone="neutral">
                                    {file.label || file.type}
                                  </AdminBadge>
                                  <AdminBadge
                                    tone={getDeliverableStatusTone(file.status)}
                                  >
                                    {file.status.replaceAll("_", " ")}
                                  </AdminBadge>
                                  <AdminBadge tone="neutral">
                                    Revision {file.revisionCount || 0}/2
                                  </AdminBadge>
                                  <AdminBadge tone="neutral">
                                    Version {versions.length || 1}
                                  </AdminBadge>
                                </div>

                                {activeRevision ? (
                                  <div className="rounded-lg border border-[hsl(var(--admin-warning)/0.28)] bg-[hsl(var(--admin-warning)/0.1)] px-3 py-2.5 text-sm">
                                    <p className="font-medium text-[hsl(var(--admin-warning))]">
                                      Requested changes
                                    </p>
                                    <p className="mt-1 whitespace-pre-wrap text-[hsl(var(--admin-muted))]">
                                      {activeRevision.note}
                                    </p>
                                  </div>
                                ) : null}
                              </div>

                              <div className="flex shrink-0 gap-2">
                                {file.status === "CHANGES_REQUESTED" ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setReplacementFileId(file.id);
                                      setDeliverableType(file.type);
                                      setFiles([]);
                                      setExternalUrl("");
                                      setUploadItems([]);
                                      if (fileInputRef.current) {
                                        fileInputRef.current.value = "";
                                      }
                                    }}
                                    className="border-[hsl(var(--admin-border)/0.88)] bg-transparent text-[hsl(var(--admin-foreground))] hover:bg-white/[0.05] hover:text-[hsl(var(--admin-foreground))]"
                                  >
                                    <RefreshCcw className="mr-2 h-4 w-4" />
                                    Replace File
                                  </Button>
                                ) : null}

                                {!selectedBooking.completedAt ? (
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    aria-label={`Delete ${getFileName(file)}`}
                                    className="text-[hsl(var(--admin-muted))] hover:bg-[hsl(var(--admin-danger)/0.1)] hover:text-[hsl(var(--admin-danger))]"
                                    disabled={deliverableAction !== null}
                                    onClick={() =>
                                      handleDeleteDeliverable(file.id)
                                    }
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-5">
                      <AdminEmptyState
                        title="No files uploaded yet"
                        description="Uploads and external links will appear here once the delivery workflow reaches the file stage."
                      />
                    </div>
                  )}

                  {[
                    BOOKING_WORKFLOW_STATUS.EDITING,
                    BOOKING_WORKFLOW_STATUS.FILES_UPLOADED,
                  ].includes(getWorkflowStatus(selectedBooking)) ? (
                    <div
                      ref={replacementUploaderRef}
                      className="admin-panel-muted mt-5 rounded-xl border border-white/8 p-4"
                    >
                      {replacementFileId ? (
                        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-[hsl(var(--admin-warning)/0.26)] bg-[hsl(var(--admin-warning)/0.1)] px-3 py-2 text-xs text-[hsl(var(--admin-warning))]">
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
                            onClick={() => {
                              setReplacementFileId(null);
                              setDeliverableType(
                                DELIVERY_FILE_TYPE.PHOTOGRAPHY,
                              );
                            }}
                            className="text-[hsl(var(--admin-warning))] hover:bg-transparent hover:text-[hsl(var(--admin-warning))]"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : null}

                      <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-3">
                        <div>
                          <label
                            htmlFor="deliverable-type"
                            className="mb-1.5 block text-xs uppercase tracking-[0.16em] text-[hsl(var(--admin-muted))]"
                          >
                            Deliverable Type
                          </label>
                          {replacementFileId ? (
                            <div
                              id="deliverable-type"
                              data-testid="replacement-deliverable-type"
                              className="admin-input flex h-9 w-full items-center rounded-lg px-3 text-sm"
                            >
                              {deliverableType}
                            </div>
                          ) : (
                            <select
                              id="deliverable-type"
                              value={deliverableType}
                              disabled={uploading}
                              onChange={(event) =>
                                setDeliverableType(event.target.value)
                              }
                              className="admin-input h-9 w-full rounded-lg px-3 text-sm"
                            >
                              {NEW_DELIVERY_FILE_TYPES.map((type) => (
                                <option key={type}>{type}</option>
                              ))}
                            </select>
                          )}
                        </div>
                        <div className="md:col-span-2">
                          <label
                            htmlFor="deliverable-external-link"
                            className="mb-1.5 block text-xs uppercase tracking-[0.16em] text-[hsl(var(--admin-muted))]"
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
                            className="admin-input h-9 rounded-lg"
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <label htmlFor="deliverable-file" className="sr-only">
                          Delivery file
                        </label>
                        <Input
                          ref={fileInputRef}
                          id="deliverable-file"
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
                          className="admin-input max-w-xs text-sm"
                        />
                        {files.length > 0 ? (
                          <span className="text-xs text-[hsl(var(--admin-muted))]">
                            {files.length} file(s) selected
                          </span>
                        ) : null}
                        <Button
                          type="button"
                          onClick={handleUpload}
                          disabled={
                            uploading ||
                            (files.length === 0 && !externalUrl.trim()) ||
                            (Boolean(replacementFileId) &&
                              files.length + (externalUrl.trim() ? 1 : 0) !== 1)
                          }
                          className="bg-[hsl(var(--admin-highlight))] text-slate-950 hover:bg-[hsl(var(--admin-highlight)/0.88)]"
                        >
                          {uploading
                            ? "Uploading..."
                            : replacementFileId
                              ? "Upload Replacement"
                              : "Upload Files"}
                        </Button>
                        {uploading ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => uploadAbortRef.current?.abort()}
                            className="border-[hsl(var(--admin-border)/0.88)] bg-transparent text-[hsl(var(--admin-foreground))] hover:bg-white/[0.05] hover:text-[hsl(var(--admin-foreground))]"
                          >
                            Cancel Upload
                          </Button>
                        ) : null}
                      </div>

                      {uploadItems.length > 0 ? (
                        <div className="mt-4 space-y-2">
                          {uploadItems.map((item, index) => (
                            <div
                              key={`${item.name}-${index}`}
                              className="rounded-lg border border-white/8 bg-black/20 px-3 py-2.5 text-xs"
                            >
                              <div className="flex justify-between gap-3">
                                <span className="truncate text-[hsl(var(--admin-foreground))]">
                                  {item.name}
                                </span>
                                <span className="shrink-0 text-[hsl(var(--admin-muted))]">
                                  {item.status}
                                  {typeof item.progress === "number"
                                    ? ` ${item.progress}%`
                                    : ""}
                                </span>
                              </div>
                              {typeof item.progress === "number" ? (
                                <div className="mt-2 h-1.5 overflow-hidden rounded bg-white/10">
                                  <div
                                    className="h-full bg-[hsl(var(--admin-highlight))] transition-[width]"
                                    style={{ width: `${item.progress}%` }}
                                  />
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </section>
              )}
            </div>
          )}

          <DialogFooter className="shrink-0 border-t border-[hsl(var(--admin-border)/0.82)] px-5 py-4 sm:px-6">
            <Button
              variant="ghost"
              onClick={() => setIsOpen(false)}
              disabled={uploading}
              className="text-[hsl(var(--admin-danger))] hover:bg-[hsl(var(--admin-danger)/0.1)] hover:text-[hsl(var(--admin-danger))]"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
