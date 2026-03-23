"use client";

import Image from "next/image";
import MediaRenderer from "@/components/portfolio/MediaRenderer";
import { OUR_WORK_TYPES } from "@/lib/config/app.config";
import { cn } from "@/lib/utils";

export default function WorkPreviewCard({
  item,
  index = 0,
  onOpen,
  aspectClass = "aspect-[3/2]",
  className = "",
  sizes = "(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw",
  isTouch = false,
  animationDelayStep = 0.03,
}) {
  const isPreviewable =
    item.type === OUR_WORK_TYPES.IMAGE ||
    item.type === OUR_WORK_TYPES.THREE_SIXTY;
  const CardTag = isPreviewable ? "button" : "div";

  const openPreview = () => {
    if (!isPreviewable) return;
    onOpen?.(item);
  };

  return (
    <CardTag
      {...(isPreviewable
        ? {
            type: "button",
            onClick: openPreview,
          }
        : {})}
      data-testid={`work-preview-card-${item.id}`}
      data-preview-enabled={isPreviewable}
      className={cn(
        "group relative bg-card rounded-xl overflow-hidden fade-in text-left",
        isPreviewable && "cursor-pointer hover-lift",
        aspectClass,
        className,
      )}
      style={{ animationDelay: `${index * animationDelayStep}s` }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-secondary via-muted/50 to-secondary" />

      <div className="relative h-full w-full">
        {item.type === OUR_WORK_TYPES.THREE_SIXTY && item.thumbnail
          ? <Image
              src={item.thumbnail}
              alt={item.title}
              fill
              sizes={sizes}
              className="object-cover"
          />
          : <div
              className={
                item.type === OUR_WORK_TYPES.IMAGE && !isTouch
                  ? "photography-grayscale h-full w-full"
                  : "h-full w-full"
              }
            >
              <MediaRenderer
                type={item.type}
                url={item.mediaContent}
                title={item.title}
                enableImageCarousel={false}
              />
            </div>}
      </div>

      {item.type === OUR_WORK_TYPES.THREE_SIXTY && (
        <div className="absolute top-3 right-3 z-10">
          <div className="px-2 py-1 bg-accent/90 rounded-full text-xs font-medium text-accent-foreground">
            360°
          </div>
        </div>
      )}

      {isPreviewable && (
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
          <p className="font-bold text-md">{item.title}</p>
          <p className="text-xs text-muted-foreground">
            {item.subtitle || "Dubai"}
          </p>
        </div>
      )}
    </CardTag>
  );
}
