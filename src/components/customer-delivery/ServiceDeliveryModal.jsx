"use client";

import { Copy, Download, FileArchive, RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
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
import { requestDeliveryServiceRevision } from "@/lib/actions/bookings";
import {
  DELIVERY_FILE_STATUS,
  MAX_FILE_REVISIONS,
} from "@/lib/helpers/bookingWorkflow";
import { projectDeliveryServiceGroups } from "@/lib/services/deliveryServiceGroups";

const downloadHref = (file) =>
  `/api/files/download?fileId=${encodeURIComponent(file.id)}&name=${encodeURIComponent(fileName(file))}`;

const zipDownloadHref = (bookingId, type) =>
  `/api/files/download-zip?bookingId=${encodeURIComponent(bookingId)}&type=${encodeURIComponent(type)}`;

const fileName = (file) => {
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
      ) ||
      file?.label ||
      "Deliverable"
    );
  } catch {
    return file?.label || "Deliverable";
  }
};

const formatDeadline = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dubai",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

export const getServiceGroupStatusLabel = (group) => {
  if (group.status === DELIVERY_FILE_STATUS.CHANGES_REQUESTED) {
    return "Replacement pending";
  }
  if (group.status === DELIVERY_FILE_STATUS.ACCEPTED) return "Approved";
  return "Ready for review";
};

const groupCanRequestRevision = (group) =>
  group.status === DELIVERY_FILE_STATUS.UNDER_REVIEW &&
  Number(group.revisionCount || 0) < MAX_FILE_REVISIONS &&
  (!group.reviewDeadlineAt ||
    new Date(group.reviewDeadlineAt).getTime() > Date.now());

/**
 * Authenticated delivery UI for a single booking. The input deliberately uses
 * the existing service-group projection: consumers never create a client-side
 * grouping identity or relax the exact-type review/download rules.
 */
export default function ServiceDeliveryModal({ booking, open, onOpenChange }) {
  const router = useRouter();
  const [revisionGroup, setRevisionGroup] = useState(null);
  const [revisionNote, setRevisionNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copyingId, setCopyingId] = useState(null);

  const groups = useMemo(() => {
    const source = Array.isArray(booking?.serviceGroups)
      ? booking.serviceGroups
      : projectDeliveryServiceGroups(booking?.deliveryFiles || []);
    return source.map((group) => ({ ...group, bookingId: booking?.id }));
  }, [booking]);

  const close = () => {
    setRevisionGroup(null);
    setRevisionNote("");
    onOpenChange?.(false);
  };
  const selectedGroup = revisionGroup;
  const copyLink = async (file) => {
    if (!file?.currentVersion?.url) return;
    try {
      setCopyingId(file.id);
      await navigator.clipboard.writeText(file.currentVersion.url);
      toast.success("Link copied.");
    } catch {
      toast.error("Unable to copy link");
    } finally {
      window.setTimeout(() => setCopyingId(null), 900);
    }
  };

  const submitRevision = async () => {
    if (!selectedGroup || !revisionNote.trim()) return;
    setIsSubmitting(true);
    try {
      const result = await requestDeliveryServiceRevision(
        selectedGroup.bookingId,
        selectedGroup.type,
        revisionNote.trim(),
      );
      if (!result.success) throw new Error(result.message);
      toast.success("Revision request submitted.");
      setRevisionGroup(null);
      setRevisionNote("");
      router.refresh();
    } catch (error) {
      toast.error(error.message || "Unable to request revision");
    } finally {
      setIsSubmitting(false);
    }
  };

  const propertyTitle = [
    booking?.propertyDetails?.unit,
    booking?.propertyDetails?.building,
    booking?.propertyDetails?.community,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#111113] p-0 text-white sm:max-w-2xl">
        <DialogHeader className="border-b border-white/10 px-5 py-5 pr-12 sm:px-6">
          <DialogTitle className="text-xl">Download files</DialogTitle>
          <DialogDescription className="text-zinc-400">
            {propertyTitle || "Your property"}
            {booking?.deliveryFinishedAt
              ? " · Delivery complete"
              : " · Delivery in progress"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 px-5 py-5 sm:px-6">
          {groups.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-zinc-400">
              No downloadable files are available yet.
            </div>
          ) : (
            groups.map((group) => {
              const isMultiFile =
                Number(group.memberCount || group.files.length) > 1;
              const canDownload = [
                DELIVERY_FILE_STATUS.UNDER_REVIEW,
                DELIVERY_FILE_STATUS.ACCEPTED,
              ].includes(group.status);
              const canRequest = groupCanRequestRevision(group);
              const limitReached =
                Number(group.revisionCount || 0) >= MAX_FILE_REVISIONS;
              const deadlineClosed =
                group.reviewDeadlineAt &&
                new Date(group.reviewDeadlineAt).getTime() <= Date.now();
              const deadline = formatDeadline(group.reviewDeadlineAt);

              return (
                <section
                  key={group.type}
                  data-testid={`service-delivery-group-${booking?.id}-${group.type}`}
                  className="rounded-2xl border border-white/10 bg-[#1a1a1d] p-4 sm:p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-zinc-100">
                          {group.label || group.type}
                        </h3>
                        <span
                          className={[
                            "rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
                            group.status === DELIVERY_FILE_STATUS.ACCEPTED
                              ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
                              : group.status ===
                                  DELIVERY_FILE_STATUS.CHANGES_REQUESTED
                                ? "border-amber-300/25 bg-amber-300/10 text-amber-200"
                                : "border-sky-300/25 bg-sky-300/10 text-sky-200",
                          ].join(" ")}
                        >
                          {getServiceGroupStatusLabel(group)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-zinc-400">
                        {group.memberCount}{" "}
                        {group.memberCount === 1 ? "file" : "files"}
                        {" · "}Revision {group.revisionCount || 0}/
                        {MAX_FILE_REVISIONS}
                      </p>
                      {deadline &&
                      group.status !== DELIVERY_FILE_STATUS.ACCEPTED ? (
                        <p className="mt-2 text-xs text-zinc-500">
                          Review by {deadline} Dubai time
                        </p>
                      ) : null}
                      {group.status ===
                      DELIVERY_FILE_STATUS.CHANGES_REQUESTED ? (
                        <p className="mt-2 text-sm text-amber-200">
                          A replacement is pending for this service.
                        </p>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      {isMultiFile && canDownload ? (
                        <Button
                          asChild
                          size="sm"
                          className="rounded-full bg-white text-black hover:bg-zinc-200"
                        >
                          <a
                            href={zipDownloadHref(booking.id, group.type)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <FileArchive className="h-3.5 w-3.5" />
                            Download ZIP
                          </a>
                        </Button>
                      ) : null}
                      {group.status === DELIVERY_FILE_STATUS.UNDER_REVIEW ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-full"
                          disabled={!canRequest}
                          onClick={() => setRevisionGroup(group)}
                        >
                          <RefreshCcw className="h-3.5 w-3.5" />
                          {limitReached
                            ? "Revision limit reached"
                            : deadlineClosed
                              ? "Review closed"
                              : "Request review"}
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {!isMultiFile && group.files.length === 1 ? (
                    <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="min-w-0 truncate text-sm text-zinc-300">
                        {fileName(group.files[0])}
                      </p>
                      {canDownload ? (
                        <div className="flex shrink-0 gap-2">
                          {group.files[0].deliveryMode === "copy_link" ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="rounded-full"
                              onClick={() => copyLink(group.files[0])}
                            >
                              <Copy className="h-3.5 w-3.5" />
                              {copyingId === group.files[0].id
                                ? "Copied"
                                : "Copy link"}
                            </Button>
                          ) : (
                            <Button
                              asChild
                              size="sm"
                              className="rounded-full bg-white text-black hover:bg-zinc-200"
                            >
                              <a
                                href={downloadHref(group.files[0])}
                                download={fileName(group.files[0])}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Download className="h-3.5 w-3.5" />
                                Download
                              </a>
                            </Button>
                          )}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </section>
              );
            })
          )}
        </div>

        <DialogFooter className="border-t border-white/10 px-5 py-4 sm:px-6">
          <Button
            type="button"
            variant="ghost"
            className="rounded-full"
            onClick={close}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>

      <Dialog
        open={Boolean(selectedGroup)}
        onOpenChange={(nextOpen) => !nextOpen && setRevisionGroup(null)}
      >
        <DialogContent className="border-white/10 bg-[#181818] text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Request review</DialogTitle>
            <DialogDescription>
              Describe the changes needed for every current{" "}
              {selectedGroup?.label || selectedGroup?.type} file.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-3">
            <label
              htmlFor="service-revision-note"
              className="text-sm font-medium"
            >
              Revision details
            </label>
            <Textarea
              id="service-revision-note"
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
            <Button
              type="button"
              variant="ghost"
              onClick={() => setRevisionGroup(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!revisionNote.trim() || isSubmitting}
              onClick={submitRevision}
            >
              {isSubmitting ? "Submitting..." : "Submit revision"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
