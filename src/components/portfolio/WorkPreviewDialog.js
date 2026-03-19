"use client";

import { Play, X } from "lucide-react";
import Image from "next/image";
import MediaRenderer from "@/components/portfolio/MediaRenderer";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { OUR_WORK_TYPES } from "@/lib/config/app.config";

export default function WorkPreviewDialog({
  item,
  open,
  onClose,
  showInteractive360 = false,
  onShowInteractive360,
}) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose?.()}>
      <DialogContent className="sm:max-w-4xl bg-card border-border p-0 overflow-hidden">
        <DialogTitle className="sr-only">
          {item?.title || "Work Preview"}
        </DialogTitle>

        {item && (
          <div className="relative">
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-background/80 hover:bg-background transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div
              className={`${
                item.type === OUR_WORK_TYPES.SHORT_VIDEO
                  ? "aspect-[9/16] max-h-[80vh] mx-auto"
                  : "aspect-video"
              } bg-secondary`}
            >
              {item.type === OUR_WORK_TYPES.THREE_SIXTY &&
              item.thumbnail &&
              !showInteractive360
                ? <button
                    type="button"
                    onClick={onShowInteractive360}
                    className="h-full w-full relative"
                  >
                    <Image
                      src={item.thumbnail}
                      alt={item.title}
                      fill
                      sizes="92vw"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="h-16 w-16 rounded-full border border-white/40 bg-black/30 flex items-center justify-center">
                        <Play className="h-8 w-8 text-white" />
                      </span>
                    </div>
                  </button>
                : <MediaRenderer
                    type={item.type}
                    url={item.mediaContent}
                    title={item.title}
                    className="h-full w-full"
                    enableImageCarousel
                  />}
            </div>

            <div className="p-6">
              <h3 className="font-heading text-xl font-bold mb-1">
                {item.title}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {item.subtitle || "Dubai"}
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
