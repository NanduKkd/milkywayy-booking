"use client";

import { useMemo, useState } from "react";
import {
  Camera,
  CheckCircle2,
  Copy,
  Circle,
  Download,
  FileArchive,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const getDeliverableIcon = (label) => {
  const normalized = String(label || "").toLowerCase();
  if (normalized.includes("photo")) return Camera;
  if (normalized.includes("video")) return Video;
  if (normalized.includes("360")) return FileArchive;
  if (normalized.includes("tour")) return FileArchive;
  return FileArchive;
};

const SERVICE_DELIVERY_CONFIG = {
  Photography: {
    id: "photography",
    label: "Photography",
    minHours: 24,
    maxHours: 30,
    deliveryMode: "download",
  },
  Videography: {
    id: "videography",
    label: "Videography",
    minHours: 48,
    maxHours: 72,
    deliveryMode: "download",
  },
  "360° Tour": {
    id: "360-virtual-tour",
    label: "360° Virtual Tour",
    minHours: 24,
    maxHours: 48,
    deliveryMode: "copy_link",
  },
  "360Â° Tour": {
    id: "360-virtual-tour",
    label: "360° Virtual Tour",
    minHours: 24,
    maxHours: 48,
    deliveryMode: "copy_link",
  },
  "360Ã‚Â° Tour": {
    id: "360-virtual-tour",
    label: "360° Virtual Tour",
    minHours: 24,
    maxHours: 48,
    deliveryMode: "copy_link",
  },
};

const getServiceConfig = (serviceLabel) =>
  SERVICE_DELIVERY_CONFIG[serviceLabel] || {
    id: String(serviceLabel || "deliverable")
      .toLowerCase()
      .replace(/\s+/g, "-"),
    label: serviceLabel || "Deliverable",
    minHours: 24,
    maxHours: 48,
    deliveryMode: "download",
  };

const getElapsedHours = (booking) => {
  const baseDate =
    booking?.completedAt || booking?.updatedAt || booking?.createdAt || booking?.date;
  if (!baseDate) return null;
  const dt = new Date(baseDate);
  if (Number.isNaN(dt.getTime())) return null;
  return (Date.now() - dt.getTime()) / (1000 * 60 * 60);
};

const getPendingText = (cfg, elapsedHours) => {
  if (elapsedHours == null) return `Expected in ${cfg.minHours}-${cfg.maxHours}h`;
  if (elapsedHours < cfg.minHours) return `Expected in ${cfg.minHours}-${cfg.maxHours}h`;
  if (elapsedHours <= cfg.maxHours) {
    const remaining = Math.max(1, Math.ceil(cfg.maxHours - elapsedHours));
    return `Expected in up to ${remaining}h`;
  }
  return "Pending upload";
};

const prettifyDate = (dateValue) => {
  if (!dateValue) return "Recently updated";
  const dt = new Date(dateValue);
  if (Number.isNaN(dt.getTime())) return "Recently updated";
  return dt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const parseFilesUrlPayload = (filesUrl) => {
  if (!filesUrl || typeof filesUrl !== "string") return null;
  const trimmed = filesUrl.trim();
  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) return null;

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed
        .filter(
          (x) =>
            x &&
            typeof x === "object" &&
            (x.url || (Array.isArray(x.urls) && x.urls.length > 0)),
        )
        .map((x, idx) => ({
          id: String(x.id || x.type || `file-${idx}`),
          label: String(x.label || x.name || x.type || "Deliverable"),
          url: String(
            x.url || (Array.isArray(x.urls) && x.urls.length > 0 ? x.urls[0] : ""),
          ),
          urls: Array.isArray(x.urls)
            ? x.urls.map((url) => String(url)).filter(Boolean)
            : x.url
              ? [String(x.url)]
              : [],
          count: Number.isFinite(Number(x.count)) ? Number(x.count) : null,
          uploadedAt: x.uploadedAt || null,
          deliveryMode: x.deliveryMode || "download",
        }));
    }

    if (parsed && typeof parsed === "object") {
      if (Array.isArray(parsed.deliverables)) {
        return parsed.deliverables
          .filter(
            (x) =>
              x &&
              typeof x === "object" &&
              (x.url || (Array.isArray(x.urls) && x.urls.length > 0)),
          )
          .map((x, idx) => ({
            id: String(x.id || x.type || `file-${idx}`),
            label: String(x.label || x.name || x.type || "Deliverable"),
            url: String(
              x.url || (Array.isArray(x.urls) && x.urls.length > 0 ? x.urls[0] : ""),
            ),
            urls: Array.isArray(x.urls)
              ? x.urls.map((url) => String(url)).filter(Boolean)
              : x.url
                ? [String(x.url)]
                : [],
            count: Number.isFinite(Number(x.count)) ? Number(x.count) : null,
            uploadedAt: x.uploadedAt || null,
            deliveryMode: x.deliveryMode || "download",
          }));
      }

      return Object.entries(parsed)
        .filter(([, value]) => value && typeof value === "string")
        .map(([key, value]) => ({
          id: key,
          label: key,
          url: value,
          urls: [value],
          count: null,
          uploadedAt: null,
          deliveryMode: "download",
        }));
    }
  } catch {
    return null;
  }

  return null;
};

const buildDeliverables = (booking) => {
  const services = Array.isArray(booking.shootDetails?.services)
    ? booking.shootDetails.services
    : [];
  const parsed = parseFilesUrlPayload(booking.filesUrl) || [];
  const uploadedByType = new Map();
  parsed.forEach((item, index) => {
    const typeKey = String(item.type || item.label || `item-${index}`)
      .trim()
      .toLowerCase();
    uploadedByType.set(typeKey, item);
  });
  const elapsedHours = getElapsedHours(booking);

  const fromServices = services.map((service, index) => {
    const cfg = getServiceConfig(service);
    const upload = uploadedByType.get(cfg.label.toLowerCase()) || uploadedByType.get(cfg.id);
    const isReady = Boolean(upload?.url);
    return {
      id: cfg.id || `${cfg.label}-${index}`,
      type: cfg.label,
      label: cfg.label,
      url: upload?.url || "",
      urls: Array.isArray(upload?.urls)
        ? upload.urls
        : upload?.url
          ? [upload.url]
          : [],
      count: upload?.count ?? null,
      uploadedAt: upload?.uploadedAt || null,
      deliveryMode: upload?.deliveryMode || cfg.deliveryMode,
      isReady,
      pendingText: isReady ? "" : getPendingText(cfg, elapsedHours),
    };
  });

  const extras = parsed
    .filter((item) => {
      const label = String(item.label || item.type || "").toLowerCase();
      return !fromServices.some((x) => x.label.toLowerCase() === label);
    })
    .map((item, idx) => ({
      id: String(item.id || item.type || `extra-${idx}`),
      type: item.type || item.label || "Deliverable",
      label: item.label || item.type || "Deliverable",
      url: item.url || "",
      urls: Array.isArray(item.urls)
        ? item.urls
        : item.url
          ? [item.url]
          : [],
      count: item.count ?? null,
      uploadedAt: item.uploadedAt || null,
      deliveryMode: item.deliveryMode || "download",
      isReady: Boolean(item.url),
      pendingText: item.url ? "" : "Pending upload",
    }));

  const combined = [...fromServices, ...extras];
  if (combined.length > 0) return combined;

  if (services.length > 0) {
    return services.map((service, idx) => ({
      id: `${service}-${idx}`,
      label: service,
      url: booking.filesUrl,
      urls: booking.filesUrl ? [booking.filesUrl] : [],
      count: null,
      deliveryMode: "download",
      isReady: Boolean(booking.filesUrl),
      pendingText: booking.filesUrl ? "" : "Pending upload",
    }));
  }

  return [
    {
      id: "all",
      label: "All Deliverables",
      url: booking.filesUrl,
      urls: booking.filesUrl ? [booking.filesUrl] : [],
      count: null,
      deliveryMode: "download",
      isReady: Boolean(booking.filesUrl),
      pendingText: booking.filesUrl ? "" : "Pending upload",
    },
  ];
};

export default function FileList({ bookings }) {
  const [activeBooking, setActiveBooking] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copyingId, setCopyingId] = useState("");

  const activeDeliverables = useMemo(() => {
    if (!activeBooking) return [];
    return buildDeliverables(activeBooking);
  }, [activeBooking]);

  const openDownloadModal = (booking) => {
    const deliverables = buildDeliverables(booking);
    setActiveBooking(booking);
    const firstReadyDownload = deliverables.find(
      (d) => d.isReady && d.deliveryMode !== "copy_link",
    );
    setSelectedItems(firstReadyDownload ? [firstReadyDownload.id] : []);
  };

  const closeDownloadModal = () => {
    setActiveBooking(null);
    setSelectedItems([]);
  };

  const toggleDeliverable = (deliverableId) => {
    const item = activeDeliverables.find((d) => d.id === deliverableId);
    if (!item || !item.isReady || item.deliveryMode === "copy_link") return;
    setSelectedItems((prev) => {
      if (prev.includes(deliverableId)) {
        return prev.filter((id) => id !== deliverableId);
      }
      return [...prev, deliverableId];
    });
  };

  const handleCopyLink = async (item) => {
    if (!item?.url) return;
    try {
      setCopyingId(item.id);
      await navigator.clipboard.writeText(item.url);
    } finally {
      setTimeout(() => setCopyingId(""), 900);
    }
  };

  const downloadFromUrl = async (url, fallbackName) => {
    const endpoint = `/api/files/download?url=${encodeURIComponent(url)}&name=${encodeURIComponent(fallbackName || "deliverable")}`;
    const response = await fetch(endpoint, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Download failed for ${fallbackName || url}`);
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = fallbackName || "download";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  };

  const fileNameFromUrl = (url, index) => {
    try {
      const parsed = new URL(url);
      const last = parsed.pathname.split("/").filter(Boolean).pop();
      return last || `deliverable-${index + 1}`;
    } catch {
      return `deliverable-${index + 1}`;
    }
  };

  const handleDownloadSelected = async () => {
    if (!activeBooking || selectedItems.length === 0 || isDownloading) return;

    const selectedUrls = activeDeliverables
      .filter(
        (item) =>
          selectedItems.includes(item.id) &&
          item.isReady &&
          item.deliveryMode !== "copy_link",
      )
      .flatMap((item) =>
        Array.isArray(item.urls) && item.urls.length > 0 ? item.urls : [item.url],
      )
      .filter(Boolean);

    const uniqueUrls = [...new Set(selectedUrls)];
    setIsDownloading(true);
    try {
      const tasks = uniqueUrls.map((url, index) =>
        downloadFromUrl(url, fileNameFromUrl(url, index)),
      );
      await Promise.all(tasks);
      closeDownloadModal();
    } catch (error) {
      console.error("File download failed:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  if (!bookings || bookings.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#101114]/80 p-6 text-sm text-muted-foreground">
        No files available for download.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {bookings.map((booking) => (
          <div
            key={booking.id}
            className="rounded-2xl border border-white/10 bg-[#111316]/85 px-6 py-6 flex flex-col md:flex-row justify-between md:items-center gap-5 shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
          >
            <div className="space-y-1">
              <div className="text-xl mb-1 font-semibold text-white">
                {[
                  booking.propertyDetails?.unit,
                  booking.propertyDetails?.building,
                  booking.propertyDetails?.community,
                ]
                  .filter(Boolean)
                  .join(", ") || "Property Shoot"}
              </div>
              <p className="text-muted-foreground text-sm">
                {(booking.shootDetails?.services || []).join(" + ") ||
                  "Media Deliverables"}
              </p>
              <p className="text-muted-foreground/80 text-sm">
                Last updated{" "}
                {prettifyDate(
                  booking.updatedAt || booking.createdAt || booking.date,
                )}
              </p>
            </div>

            <Button
              type="button"
              onClick={() => openDownloadModal(booking)}
              className="h-10 rounded-2xl px-5 text-sm font-semibold bg-gradient-to-b from-zinc-700 to-zinc-800 border border-white/10 text-white hover:from-zinc-600 hover:to-zinc-700"
            >
              <Download size={16} />
              Download
            </Button>
          </div>
        ))}
      </div>

      <Dialog
        open={Boolean(activeBooking)}
        onOpenChange={(isOpen) => !isOpen && closeDownloadModal()}
      >
        <DialogContent className="border-white/10 bg-[#141518] text-white max-w-[520px] p-0 overflow-hidden">
          <div className="p-6">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-3xl font-semibold tracking-tight">
                Download Files
              </DialogTitle>
              <DialogDescription className="text-base text-muted-foreground">
                {[
                  activeBooking?.propertyDetails?.unit,
                  activeBooking?.propertyDetails?.building,
                  activeBooking?.propertyDetails?.community,
                ]
                  .filter(Boolean)
                  .join(", ") || "Property Shoot"}{" "}
                - Select deliverables to download
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-2">
                Ready for Download
              </p>
              <div className="space-y-2.5 mb-4">
                {activeDeliverables.filter((d) => d.isReady).map((item) => {
                  const isSelected = selectedItems.includes(item.id);
                  const Icon = getDeliverableIcon(item.label);
                  const isCopyMode = item.deliveryMode === "copy_link";
                  const rowClass = cn(
                    "w-full text-left rounded-xl border px-4 py-3 flex items-center justify-between gap-3 transition-all",
                    isSelected
                      ? "border-white/30 bg-white/[0.06]"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]",
                    isCopyMode && "cursor-default",
                  );
                  const rowBody = (
                    <>
                      <div className="flex items-center gap-3 min-w-0">
                        {isCopyMode ? (
                          <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                        ) : isSelected ? (
                          <CheckCircle2 className="h-5 w-5 text-zinc-100 shrink-0" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                        )}
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="font-semibold text-base truncate">{item.label}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.count ? `${item.count} files` : "Ready to download"}
                          </p>
                        </div>
                      </div>
                      {isCopyMode ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 border-white/20 hover:bg-white/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyLink(item);
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          {copyingId === item.id ? "Copied" : "Copy Link"}
                        </Button>
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      )}
                    </>
                  );

                  return (
                    isCopyMode ? (
                      <div key={item.id} className={rowClass}>
                        {rowBody}
                      </div>
                    ) : (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleDeliverable(item.id)}
                        className={rowClass}
                      >
                        {rowBody}
                      </button>
                    )
                  );
                })}
              </div>

              {activeDeliverables.some((d) => !d.isReady) && (
                <>
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-2">
                    Pending Delivery
                  </p>
                  <div className="space-y-2.5">
                    {activeDeliverables
                      .filter((d) => !d.isReady)
                      .map((item) => {
                        const Icon = getDeliverableIcon(item.label);
                        return (
                          <div
                            key={item.id}
                            className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 flex items-center justify-between gap-3 opacity-75"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                              <div className="min-w-0">
                                <p className="font-semibold text-base truncate">{item.label}</p>
                                <p className="text-sm text-muted-foreground">{item.pendingText}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl border-white/15 bg-transparent hover:bg-white/5 hover:text-white"
                onClick={closeDownloadModal}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="h-11 rounded-xl px-5 bg-gradient-to-b from-zinc-700 to-zinc-800 border border-white/10 text-white hover:from-zinc-600 hover:to-zinc-700"
                onClick={handleDownloadSelected}
                disabled={selectedItems.length === 0 || isDownloading}
              >
                <Download size={16} />
                {isDownloading
                  ? "Downloading..."
                  : `Download (${selectedItems.length})`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

