"use client";

import { Check, Globe2, Play, Volume2 } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import styles from "./showcase.module.css";

function mediaUrl(token, propertyId, mediaId) {
  return `/api/public/property-shares/${encodeURIComponent(token)}/properties/${encodeURIComponent(propertyId)}/media/${encodeURIComponent(mediaId)}`;
}

function ContactCard({ contact }) {
  const initials = contact.name
    .split(/\s+/u)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className={`contact-card ${styles.contactCard}`}>
      <div className={`avatar ${styles.avatar}`} aria-hidden="true">
        {initials}
      </div>
      <div className={styles.contactMeta}>
        <div className={styles.contactName}>{contact.name}</div>
        <a className={styles.contactPhone} href={contact.telephoneUrl}>
          {contact.phone}
        </a>
      </div>
      <a
        className={`wa-btn ${styles.whatsappButton}`}
        href={contact.whatsappUrl}
        rel="noreferrer"
        target="_blank"
      >
        WhatsApp
      </a>
    </div>
  );
}

export default function PropertyShowcase({ property, token }) {
  const [activeMediaId, setActiveMediaId] = useState(property.media[0]?.id);
  const [failedMedia, setFailedMedia] = useState(() => new Set());
  const [showAllMedia, setShowAllMedia] = useState(false);
  const activeIndex = Math.max(
    0,
    property.media.findIndex((media) => media.id === activeMediaId),
  );
  const activeMedia = property.media[activeIndex];
  const videoMedia = useMemo(
    () => property.media.find((media) => media.kind === "VIDEO"),
    [property.media],
  );
  const tourMedia = useMemo(
    () => property.media.find((media) => media.kind === "TOUR"),
    [property.media],
  );
  const badge = tourMedia
    ? videoMedia
      ? "360° + Video"
      : "360° View"
    : videoMedia
      ? "Video Available"
      : "Photo Gallery";

  const selectRelative = (offset) => {
    const next =
      (activeIndex + offset + property.media.length) % property.media.length;
    setActiveMediaId(property.media[next].id);
  };

  const markFailed = (mediaId) => {
    setFailedMedia((current) => new Set([...current, mediaId]));
  };

  return (
    <article
      className={`desk ${styles.showcase}`}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") selectRelative(-1);
        if (event.key === "ArrowRight") selectRelative(1);
      }}
    >
      <div className={`desk-grid ${styles.showcaseGrid}`}>
        <div className={styles.mediaColumn}>
          <div className={`sp-hero ${styles.spHero}`}>
            {activeMedia && !failedMedia.has(activeMedia.id) ? (
              activeMedia.mimeType.startsWith("video/") ? (
                // biome-ignore lint/a11y/useMediaCaption: The delivery model does not persist a separate captions asset.
                <video
                  key={activeMedia.id}
                  aria-label={`${property.title} — video ${activeIndex + 1}`}
                  controls
                  playsInline
                  preload="metadata"
                  onError={() => markFailed(activeMedia.id)}
                  src={mediaUrl(token, property.id, activeMedia.id)}
                />
              ) : (
                <Image
                  key={activeMedia.id}
                  alt={`${property.title} — view ${activeIndex + 1}`}
                  fill
                  priority
                  sizes="(max-width: 600px) 100vw, 60vw"
                  unoptimized
                  onError={() => markFailed(activeMedia.id)}
                  src={mediaUrl(token, property.id, activeMedia.id)}
                />
              )
            ) : (
              <output className={styles.mediaFallback}>
                This media could not be displayed.
              </output>
            )}
            <span className={`h-badge ${styles.heroBadge}`}>{badge}</span>
            <span className={`h-count ${styles.heroCount}`}>
              {activeIndex + 1} / {property.media.length}
            </span>
          </div>

          <div className={`sp-thumbs ${styles.thumbnails}`}>
            {(showAllMedia ? property.media : property.media.slice(0, 2)).map(
              (media, index) => (
                <button
                  type="button"
                  key={media.id}
                  className={`thumb ${styles.thumbnail} ${media.id === activeMedia?.id ? styles.activeThumbnail : ""}`}
                  aria-label={`View property media ${index + 1}`}
                  aria-pressed={media.id === activeMedia?.id}
                  onClick={() => setActiveMediaId(media.id)}
                >
                  {media.mimeType.startsWith("video/") ? (
                    <span className={styles.videoThumb}>
                      <Play aria-hidden="true" /> Video
                    </span>
                  ) : (
                    <Image
                      alt=""
                      fill
                      loading="lazy"
                      sizes="(max-width: 600px) 33vw, 140px"
                      unoptimized
                      onError={() => markFailed(media.id)}
                      src={mediaUrl(token, property.id, media.id)}
                    />
                  )}
                  {media.kind === "TOUR" ? (
                    <span className={styles.tourMark}>360°</span>
                  ) : null}
                </button>
              ),
            )}
            {!showAllMedia && property.media.length > 2 ? (
              <button
                type="button"
                className={`thumb ${styles.thumbnail} ${styles.moreMedia}`}
                onClick={() => setShowAllMedia(true)}
              >
                + {property.media.length - 2} photos
              </button>
            ) : null}
          </div>

          {videoMedia || tourMedia ? (
            <div className={`sp-actions ${styles.mediaActions}`}>
              {videoMedia ? (
                <button
                  className={`act ${styles.mediaAction}`}
                  type="button"
                  onClick={() => setActiveMediaId(videoMedia.id)}
                >
                  <Volume2 aria-hidden="true" /> Video walkthrough
                </button>
              ) : null}
              {tourMedia ? (
                <button
                  className={`act ${styles.mediaAction}`}
                  type="button"
                  onClick={() => setActiveMediaId(tourMedia.id)}
                >
                  <Globe2 aria-hidden="true" /> 360° view
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className={`sp-body ${styles.spBody}`}>
          <div className={`sp-price ${styles.price}`}>
            {property.displayPrice}
          </div>
          <h1 className={`sp-title ${styles.title}`}>
            {property.title}
            {property.location ? ` · ${property.location}` : ""}
          </h1>
          <div className={`sp-chips ${styles.chips}`}>
            <span className={`chip ${styles.chip}`}>
              {property.listingTypeLabel}
            </span>
            {property.bedrooms !== null ? (
              <span className={`chip ${styles.chip}`}>
                {property.bedrooms} Bed
              </span>
            ) : null}
            {property.bathrooms !== null ? (
              <span className={`chip ${styles.chip}`}>
                {property.bathrooms} Bath
              </span>
            ) : null}
            {property.sizeSqft ? (
              <span className={`chip ${styles.chip}`}>
                {property.sizeSqft.toLocaleString("en-AE")} sqft
              </span>
            ) : null}
            <span className={`chip ${styles.chip}`}>{property.furnishing}</span>
          </div>

          {property.description ? (
            <p className={`sp-desc ${styles.description}`}>
              {property.description}
            </p>
          ) : null}

          {property.highlights.length > 0 ? (
            <section className={`sp-hl ${styles.highlights}`}>
              <h2 className={`sp-hl-title ${styles.highlightTitle}`}>
                KEY HIGHLIGHTS
              </h2>
              <ul>
                {property.highlights.map((highlight) => (
                  <li key={highlight}>
                    <Check aria-hidden="true" /> {highlight}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <ContactCard contact={property.contact} />
        </div>
      </div>
      <footer className={`sp-footer ${styles.showcaseFooter}`}>
        Media &amp; page by <b>MILKYWAYY</b> · milkywayy.com
      </footer>
    </article>
  );
}
