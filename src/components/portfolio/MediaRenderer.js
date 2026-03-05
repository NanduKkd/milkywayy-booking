"use client";

import Image from "next/image";
import { InstagramEmbed, YouTubeEmbed } from "react-social-media-embed";
import { OUR_WORK_TYPES } from "@/lib/config/app.config";
import ImageCarousel from "./ImageCarousel";

const normalizeUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  return `https://${trimmed}`;
};

const extractYouTubeId = (rawUrl) => {
  const normalized = normalizeUrl(rawUrl);
  if (!normalized) return null;
  try {
    const url = new URL(normalized);
    const host = url.hostname.replace("www.", "");

    if (host === "youtu.be") {
      return url.pathname.split("/").filter(Boolean)[0] || null;
    }

    if (host.includes("youtube.com")) {
      if (url.searchParams.get("v")) return url.searchParams.get("v");

      const parts = url.pathname.split("/").filter(Boolean);
      const embedIdx = parts.indexOf("embed");
      if (embedIdx !== -1 && parts[embedIdx + 1]) return parts[embedIdx + 1];

      const shortsIdx = parts.indexOf("shorts");
      if (shortsIdx !== -1 && parts[shortsIdx + 1]) return parts[shortsIdx + 1];

      const liveIdx = parts.indexOf("live");
      if (liveIdx !== -1 && parts[liveIdx + 1]) return parts[liveIdx + 1];
    }
  } catch (_error) {
    return null;
  }
  return null;
};

export default function MediaRenderer({ type, url, title, className = "" }) {
  switch (type) {
    case OUR_WORK_TYPES.IMAGE:
      if (Array.isArray(url)) {
        return <ImageCarousel images={url} title={title} className={className} />;
      }
      return (
        <div className={`relative w-full h-full overflow-hidden ${className}`}>
          <Image
            src={url}
            alt={title}
            fill
            className="object-cover transition-transform"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      );

    case OUR_WORK_TYPES.VIDEO:
      return (
        <div className={`relative bg-black ${className} w-full aspect-[4/3]`}>
          <YouTubeEmbed
            url={url}
            height="100%"
            width="100%"
            placeholder={"Hey There"}
            youTubeProps={{className: "w-full aspect-4/3"}}
          />
        </div>
      );

    case OUR_WORK_TYPES.SHORT_VIDEO:
      return (
        <div className="-mb-3 w-fit mx-auto">
          <InstagramEmbed
            url={url}
            width={'fit-content'}
            height='fit-content'
            placeholder={
              <div className="bg-muted animate-pulse" />
            }
          />
        </div>
      );

    case OUR_WORK_TYPES.THREE_SIXTY:
      const youtubeId = extractYouTubeId(url);
      const iframeSrc = youtubeId
        ? `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1`
        : normalizeUrl(url) || url;
      return (
        <div className={`relative w-full h-full my-auto bg-black ${className}`}>
          <iframe
            src={iframeSrc}
            title={title}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            loading="lazy"
          />
        </div>
      );

    default:
      return (
        <div
          className={`flex items-center justify-center bg-secondary text-muted-foreground ${className}`}
        >
          Unsupported Media Type
        </div>
      );
  }
}
