"use client";

import {
  Camera,
  CheckCircle2,
  Copy,
  Download,
  FileArchive,
  Link2,
  RefreshCcw,
  Video,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
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
  completeDeliveredBooking,
  requestDeliveryServiceRevision,
} from "@/lib/actions/bookings";
import {
  DELIVERY_FILE_STATUS,
  isCustomerDeliveryFileVisible,
  MAX_FILE_REVISIONS,
} from "@/lib/helpers/bookingWorkflow";
import { projectDeliveryServiceGroups } from "@/lib/services/deliveryServiceGroups";
import CreatePropertyShareDialog from "./CreatePropertyShareDialog";

const getFileIcon = (type) => {
  const normalized = String(type || "").toLowerCase();
  if (normalized.includes("photo")) return Camera;
  if (normalized.includes("video")) return Video;
  return FileArchive;
};

const getFileName = (file) => {
  if (file?.currentVersion?.originalFilename) {
    return file.currentVersion.originalFilename;
  }
  try {
    return (
      decodeURIComponent(
        new URL(file?.currentVersion?.url || "").pathname
          .split("/")
          .filter(Boolean)
          .pop(),
      ) || file?.label
    );
  } catch {
    return file?.label || "Deliverable";
  }
};

const getDownloadHref = (file) =>
  `/api/files/download?fileId=${encodeURIComponent(file.id)}&name=${encodeURIComponent(getFileName(file))}`;

const getZipDownloadHref = (bookingId, type) =>
  `/api/files/download-zip?bookingId=${encodeURIComponent(bookingId)}&type=${encodeURIComponent(type)}`;

const formatDeadline = (value) => {
  if (!value) return "";
  const deadline = new Date(value);
  if (Number.isNaN(deadline.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dubai",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(deadline);
};

const getStatusLabel = (group) => {
  if (group.status === DELIVERY_FILE_STATUS.CHANGES_REQUESTED) {
    return "Replacement pending";
  }
  if (group.status === DELIVERY_FILE_STATUS.ACCEPTED) return "Accepted";
  return "Ready for review";
};

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

export default function FileList({
  bookings,
  highlightedFileId = null,
  requestedFileAvailable = true,
  requestedFileIdWasProvided = false,
  propertySharing = { eligibleProperties: [], shares: [] },
}) {
  const router = useRouter();
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [revisionNote, setRevisionNote] = useState("");
  const [loadingKey, setLoadingKey] = useState("");
  const [copyingId, setCopyingId] = useState(null);
  const [createShareProperty, setCreateShareProperty] = useState(null);
  const highlightedFileRef = useRef(null);

  const openRevision = (group) => {
    setSelectedGroup(group);
    setRevisionNote("");
  };

  const closeRevision = () => {
    setSelectedGroup(null);
    setRevisionNote("");
  };

  const submitRevision = async () => {
    if (!selectedGroup || !revisionNote.trim()) return;
    const revisionKey = `revision-${selectedGroup.bookingId}-${selectedGroup.type}`;
    setLoadingKey(revisionKey);
    try {
      const result = await requestDeliveryServiceRevision(
        selectedGroup.bookingId,
        selectedGroup.type,
        revisionNote.trim(),
      );
      if (!result.success) throw new Error(result.message);
      toast.success("Revision request submitted.");
      closeRevision();
      router.refresh();
    } catch (error) {
      toast.error(error.message || "Unable to request revision");
    } finally {
      setLoadingKey("");
    }
  };

  const completeBooking = async (bookingId) => {
    setLoadingKey(`complete-${bookingId}`);
    try {
      const result = await completeDeliveredBooking(bookingId);
      if (!result.success) throw new Error(result.message);
      toast.success("Project marked as completed.");
      router.refresh();
    } catch (error) {
      toast.error(error.message || "Unable to complete project");
    } finally {
      setLoadingKey("");
    }
  };

  const copyLink = async (file) => {
    if (!file?.currentVersion?.url) return;
    try {
      setCopyingId(file.id);
      await navigator.clipboard.writeText(file.currentVersion.url);
      toast.success("Link copied.");
    } catch {
      toast.error("Unable to copy link");
    } finally {
      setTimeout(() => setCopyingId(null), 900);
    }
  };

  const visibleBookings = (bookings || [])
    .map((booking) => {
      const allFiles = booking.deliveryFiles || [];
      const serviceGroups = (
        booking.serviceGroups || projectDeliveryServiceGroups(allFiles)
      ).map((group) => ({ ...group, bookingId: booking.id }));
      return {
        ...booking,
        pendingReplacementCount:
          booking.pendingReplacementCount ??
          allFiles.filter(
            (file) =>
              !file.deletedAt &&
              file.status === DELIVERY_FILE_STATUS.CHANGES_REQUESTED,
          ).length,
        deliveryFiles: allFiles.filter(isCustomerDeliveryFileVisible),
        serviceGroups,
      };
    })
    .filter(
      (booking) =>
        booking.deliveryFiles.length > 0 ||
        booking.serviceGroups.some(
          (group) => group.status === DELIVERY_FILE_STATUS.CHANGES_REQUESTED,
        ),
    );
  const showUnavailableLinkNotice =
    requestedFileIdWasProvided && !requestedFileAvailable;
  const assignHighlightedTargetRef = (node) => {
    if (!node || highlightedFileRef.current === node) {
      return;
    }

    highlightedFileRef.current = node;
    highlightedFileRef.current.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  if (visibleBookings.length === 0) {
    return (
      <div className="space-y-4">
        {showUnavailableLinkNotice ? (
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
            The selected file is unavailable in this dashboard. Browse your
            available files below.
          </div>
        ) : null}
        <div className="rounded-xl border border-white/10 bg-[#101114]/80 p-6 text-sm text-muted-foreground">
          No files available yet.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5">
        {showUnavailableLinkNotice ? (
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
            The selected file is unavailable in this dashboard. Browse your
            available files below.
          </div>
        ) : null}
        {visibleBookings.map((booking) => {
          const files = booking.deliveryFiles;
          const unresolvedCount = Number(booking.pendingReplacementCount || 0);
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
              className="rounded-2xl border border-white/10 bg-card p-5 md:p-6"
            >
              <div
                data-testid={`delivered-project-header-${booking.id}`}
                className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"
              >
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    {[
                      booking.propertyDetails?.unit,
                      booking.propertyDetails?.building,
                      booking.propertyDetails?.community,
                    ]
                      .filter(Boolean)
                      .join(", ") || "Property Shoot"}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {files.length} {files.length === 1 ? "file" : "files"}
                    {unresolvedCount > 0
                      ? ` - ${unresolvedCount} awaiting replacement`
                      : ""}
                  </p>
                  {!booking.deliveryFinishedAt && (
                    <p className="mt-1 text-xs text-amber-300">
                      More files may still be added by the team.
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {booking.completedAt ? (
                    <span className="inline-flex items-center gap-2 text-sm text-emerald-300">
                      <CheckCircle2 className="h-4 w-4" />
                      Project completed
                    </span>
                  ) : (
                    <Button
                      type="button"
                      disabled={
                        !canCompleteBooking(booking, files) ||
                        loadingKey === `complete-${booking.id}`
                      }
                      onClick={() => completeBooking(booking.id)}
                    >
                      {loadingKey === `complete-${booking.id}`
                        ? "Completing..."
                        : booking.deliveryFinishedAt
                          ? unresolvedCount > 0
                            ? "Changes Pending"
                            : "Mark Complete"
                          : "Delivery In Progress"}
                    </Button>
                  )}
                  {shareableProperty && !existingShare ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setCreateShareProperty(shareableProperty)}
                    >
                      <Link2 className="h-3.5 w-3.5" />
                      Create Share Link
                    </Button>
                  ) : null}
                </div>
              </div>

              <div
                data-testid={`delivery-service-list-${booking.id}`}
                className="mt-3 space-y-4"
              >
                {booking.serviceGroups.map((group) => {
                  const groupAccepted =
                    group.status === DELIVERY_FILE_STATUS.ACCEPTED;
                  const limitReached =
                    Number(group.revisionCount || 0) >= MAX_FILE_REVISIONS;
                  const deadlineClosed =
                    group.reviewDeadlineAt &&
                    new Date(group.reviewDeadlineAt).getTime() <= Date.now();
                  const canRequest =
                    group.status === DELIVERY_FILE_STATUS.UNDER_REVIEW &&
                    !limitReached &&
                    !deadlineClosed;
                  const canDownloadZip =
                    group.files.length >= 2 &&
                    [
                      DELIVERY_FILE_STATUS.UNDER_REVIEW,
                      DELIVERY_FILE_STATUS.ACCEPTED,
                    ].includes(group.status);
                  const groupLabel = group.label || group.type;
                  const isMultiFileGroup =
                    Number(group.memberCount || group.files.length) > 1;
                  const isHighlightedGroup =
                    isMultiFileGroup &&
                    group.files.some((file) => highlightedFileId === file.id);
                  return (
                    <section
                      key={group.type}
                      ref={
                        isHighlightedGroup ? assignHighlightedTargetRef : null
                      }
                      data-highlighted={isHighlightedGroup ? "true" : "false"}
                      data-testid={`delivery-service-group-${booking.id}-${group.type}`}
                      className={[
                        "rounded-xl border bg-black/10 p-4 transition-colors",
                        isHighlightedGroup
                          ? "border-sky-300/70 bg-sky-400/[0.08] shadow-[0_0_0_1px_rgba(125,211,252,0.35)]"
                          : "border-white/10",
                      ].join(" ")}
                    >
                      <div className="flex flex-col gap-3 pb-1 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-zinc-100">
                            {groupLabel}
                          </h3>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span>
                              {group.memberCount}{" "}
                              {group.memberCount === 1 ? "file" : "files"}
                            </span>
                            <span>
                              Revision {group.revisionCount || 0}/
                              {MAX_FILE_REVISIONS}
                            </span>
                            <span
                              className={
                                groupAccepted ? "text-emerald-300" : ""
                              }
                            >
                              {getStatusLabel(group)}
                            </span>
                            {group.reviewDeadlineAt && !groupAccepted ? (
                              <span>
                                Review by{" "}
                                {formatDeadline(group.reviewDeadlineAt)} Dubai
                                time
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {group.status ===
                          DELIVERY_FILE_STATUS.CHANGES_REQUESTED ? (
                            <p className="text-sm text-amber-300">
                              Replacement pending for this service.
                            </p>
                          ) : !groupAccepted ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={!canRequest}
                              onClick={() => openRevision(group)}
                            >
                              <RefreshCcw className="h-3.5 w-3.5" />
                              {limitReached
                                ? "Revision Limit Reached"
                                : deadlineClosed
                                  ? "Review Closed"
                                  : "Request Revision"}
                            </Button>
                          ) : null}
                          {canDownloadZip ? (
                            <Button
                              asChild
                              type="button"
                              size="sm"
                              variant="outline"
                            >
                              <a
                                href={getZipDownloadHref(
                                  booking.id,
                                  group.type,
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Download className="h-3.5 w-3.5" />
                                Download ZIP
                              </a>
                            </Button>
                          ) : null}
                        </div>
                      </div>
                      {!isMultiFileGroup && group.files.length === 1 ? (
                        <div className="mt-3 border-t border-white/10">
                          {group.files.map((file) => {
                            const Icon = getFileIcon(file.type);
                            const isHighlighted = highlightedFileId === file.id;

                            return (
                              <div
                                key={file.id}
                                ref={
                                  isHighlighted
                                    ? assignHighlightedTargetRef
                                    : null
                                }
                                data-highlighted={
                                  isHighlighted ? "true" : "false"
                                }
                                data-testid={`delivery-file-card-${file.id}`}
                                className={[
                                  "p-4 transition-colors",
                                  isHighlighted
                                    ? "border-sky-300/70 bg-sky-400/[0.08] shadow-[0_0_0_1px_rgba(125,211,252,0.35)]"
                                    : "border-white/10",
                                ].join(" ")}
                              >
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                  <div className="flex min-w-0 items-start gap-3">
                                    <Icon className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                                    <div className="min-w-0">
                                      {isHighlighted ? (
                                        <span className="mb-2 inline-flex items-center rounded-full border border-sky-300/30 bg-sky-300/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200">
                                          Selected file
                                        </span>
                                      ) : null}
                                      <p className="truncate text-sm font-normal text-zinc-200">
                                        {getFileName(file)}
                                      </p>
                                      {isHighlighted ? (
                                        <p className="mt-2 text-xs text-sky-200">
                                          Opened from a shared dashboard link.
                                        </p>
                                      ) : null}
                                    </div>
                                  </div>

                                  <div className="flex shrink-0 flex-wrap gap-2">
                                    {file.deliveryMode === "copy_link" && (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => copyLink(file)}
                                      >
                                        <Copy className="h-3.5 w-3.5" />
                                        {copyingId === file.id
                                          ? "Copied"
                                          : "Copy Link"}
                                      </Button>
                                    )}
                                    {file.deliveryMode !== "copy_link" && (
                                      <Button
                                        asChild
                                        size="sm"
                                        variant="outline"
                                      >
                                        <a
                                          href={getDownloadHref(file)}
                                          download={getFileName(file)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          <Download className="h-3.5 w-3.5" />
                                          Download
                                        </a>
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </section>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <Dialog
        open={Boolean(selectedGroup)}
        onOpenChange={(open) => !open && closeRevision()}
      >
        <DialogContent className="border-white/10 bg-[#181818] text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Service Revision</DialogTitle>
            <DialogDescription>
              Describe the changes needed for every current{" "}
              {selectedGroup?.label || selectedGroup?.type} file.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-3">
            <label htmlFor="file-revision-note" className="text-sm font-medium">
              Revision details
            </label>
            <Textarea
              id="file-revision-note"
              value={revisionNote}
              onChange={(event) => setRevisionNote(event.target.value)}
              placeholder="Describe the exact changes needed..."
              rows={5}
            />
            <p className="text-xs text-muted-foreground">
              Request {Number(selectedGroup?.revisionCount || 0) + 1} of{" "}
              {MAX_FILE_REVISIONS} for this service
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={closeRevision}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={
                !revisionNote.trim() ||
                loadingKey ===
                  `revision-${selectedGroup?.bookingId}-${selectedGroup?.type}`
              }
              onClick={submitRevision}
            >
              {loadingKey ===
              `revision-${selectedGroup?.bookingId}-${selectedGroup?.type}`
                ? "Submitting..."
                : "Submit Revision"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {createShareProperty ? (
        <CreatePropertyShareDialog
          property={createShareProperty}
          onClose={() => setCreateShareProperty(null)}
        />
      ) : null}
    </>
  );
}
