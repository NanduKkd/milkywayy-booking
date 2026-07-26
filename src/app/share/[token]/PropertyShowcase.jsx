"use client";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Globe2,
  Images,
  Play,
  X,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
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

function MediaThumbnail({ active, failed, media, onClick, property, token }) {
  const label =
    media.kind === "TOUR"
      ? "View 360° tour"
      : `View property media ${property.media.indexOf(media) + 1}`;
  return (
    <button
      type="button"
      className={`thumb ${styles.thumbnail} ${active ? styles.activeThumbnail : ""}`}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
    >
      {failed ? (
        <span className={styles.thumbnailFallback}>Unavailable</span>
      ) : media.kind === "TOUR" ? (
        <span className={styles.tourThumb}>
          <Globe2 aria-hidden="true" /> 360° view
        </span>
      ) : media.mimeType.startsWith("video/") ? (
        <span className={styles.videoThumb}>
          <Play aria-hidden="true" /> Video
        </span>
      ) : (
        <Image
          alt=""
          fill
          loading="lazy"
          sizes="(max-width: 600px) 25vw, 140px"
          unoptimized
          src={mediaUrl(token, property.id, media.id)}
        />
      )}
    </button>
  );
}

export default function PropertyShowcase({ property, token }) {
  const [activeMediaId, setActiveMediaId] = useState(property.media[0]?.id);
  const [failedMedia, setFailedMedia] = useState(() => new Set());
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const imageMedia = property.media.filter((media) =>
    media.mimeType.startsWith("image/"),
  );
  const activeIndex = Math.max(
    0,
    property.media.findIndex((media) => media.id === activeMediaId),
  );
  const activeMedia = property.media[activeIndex];

  const selectRelative = useCallback(
    (offset) => {
      if (property.media.length === 0) return;
      const next =
        (activeIndex + offset + property.media.length) % property.media.length;
      setActiveMediaId(property.media[next].id);
    },
    [activeIndex, property.media],
  );

  const markFailed = (mediaId) => {
    setFailedMedia((current) => new Set([...current, mediaId]));
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setLightboxOpen(false);
      } else if (!lightboxOpen && event.key === "ArrowLeft") {
        selectRelative(-1);
      } else if (!lightboxOpen && event.key === "ArrowRight") {
        selectRelative(1);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [lightboxOpen, selectRelative]);

  const copyPageLink = async () => {
    try {
      await navigator.clipboard?.writeText(window.location.href);
    } catch {
      // The public page remains usable when the browser denies clipboard access.
    }
    setCopyStatus("Link copied");
  };

  const selectPhoto = (media) => {
    setActiveMediaId(media.id);
    setLightboxOpen(false);
  };

  return (
    <article className={`desk ${styles.showcase}`}>
      <header className={styles.showcaseHeader}>
        <span className={styles.brand}>MILKYWAYY</span>
        <button
          type="button"
          className={styles.copyButton}
          onClick={copyPageLink}
        >
          <Copy aria-hidden="true" /> <span>Copy link</span>
        </button>
      </header>

      <div className={`desk-grid ${styles.showcaseGrid}`}>
        <div className={styles.mediaColumn}>
          <div className={`sp-hero ${styles.spHero}`}>
            {activeMedia && !failedMedia.has(activeMedia.id) ? (
              activeMedia.kind === "TOUR" && activeMedia.embedUrl ? (
                <iframe
                  key={activeMedia.id}
                  src={activeMedia.embedUrl}
                  title={`${property.title} — 360° tour`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={() => markFailed(activeMedia.id)}
                />
              ) : activeMedia.mimeType.startsWith("video/") ? (
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
                <button
                  type="button"
                  className={styles.heroPhotoButton}
                  aria-label="Open all property photos"
                  onClick={() => setLightboxOpen(true)}
                >
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
                </button>
              )
            ) : (
              <output className={styles.mediaFallback}>
                This media could not be displayed.
              </output>
            )}
            {property.media.length > 1 ? (
              <>
                <button
                  type="button"
                  aria-label="Previous property media"
                  className={`${styles.galleryArrow} ${styles.previousArrow}`}
                  onClick={() => selectRelative(-1)}
                >
                  <ChevronLeft aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Next property media"
                  className={`${styles.galleryArrow} ${styles.nextArrow}`}
                  onClick={() => selectRelative(1)}
                >
                  <ChevronRight aria-hidden="true" />
                </button>
              </>
            ) : null}
            <span className={`h-count ${styles.heroCount}`}>
              {property.media.length ? activeIndex + 1 : 0} /{" "}
              {property.media.length}
            </span>
          </div>

          {property.media.length > 0 ? (
            <div className={`sp-thumbs ${styles.thumbnails}`}>
              {property.media.slice(0, 4).map((media) => (
                <MediaThumbnail
                  active={media.id === activeMedia?.id}
                  failed={failedMedia.has(media.id)}
                  key={media.id}
                  media={media}
                  onClick={() => setActiveMediaId(media.id)}
                  property={property}
                  token={token}
                />
              ))}
              {imageMedia.length > 0 && property.media.length > 4 ? (
                <button
                  type="button"
                  className={`thumb ${styles.thumbnail} ${styles.moreMedia}`}
                  onClick={() => setLightboxOpen(true)}
                >
                  <Images aria-hidden="true" /> All photos
                </button>
              ) : null}
            </div>
          ) : null}

          {property.media.some((media) => media.kind !== "IMAGE") ? (
            <section
              className={styles.mediaActions}
              aria-label="Property media"
            >
              {property.media
                .filter((media) => media.kind !== "IMAGE")
                .map((media) => (
                  <button
                    type="button"
                    className={styles.mediaAction}
                    key={media.id}
                    onClick={() => setActiveMediaId(media.id)}
                  >
                    {media.kind === "TOUR" ? (
                      <Globe2 aria-hidden="true" />
                    ) : (
                      <Play aria-hidden="true" />
                    )}
                    <span>
                      <b>
                        {media.kind === "TOUR"
                          ? "360° virtual tour"
                          : "Video walkthrough"}
                      </b>
                      <small>{media.label}</small>
                    </span>
                  </button>
                ))}
            </section>
          ) : null}
        </div>

        <div className={`sp-body ${styles.spBody}`}>
          <div className={styles.listingType}>{property.listingTypeLabel}</div>
          <div className={`sp-price ${styles.price}`}>
            {property.displayPrice}
          </div>
          <h1 className={`sp-title ${styles.title}`}>{property.title}</h1>
          {property.location ? (
            <p className={styles.location}>{property.location}</p>
          ) : null}
          <div className={`sp-chips ${styles.chips}`}>
            {property.propertyTypeLabel ? (
              <span className={`chip ${styles.chip}`}>
                {property.propertyTypeLabel}
              </span>
            ) : null}
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
            {property.builtUpAreaSqft ? (
              <span className={`chip ${styles.chip}`}>
                {property.builtUpAreaSqft.toLocaleString("en-AE")} sqft BUA
              </span>
            ) : null}
            {property.plotAreaSqft ? (
              <span className={`chip ${styles.chip}`}>
                {property.plotAreaSqft.toLocaleString("en-AE")} sqft plot
              </span>
            ) : null}
            {property.maidRoom ? (
              <span className={`chip ${styles.chip}`}>Maid&apos;s room</span>
            ) : null}
            <span className={`chip ${styles.chip}`}>{property.furnishing}</span>
          </div>
          {property.pricePerSqft ? (
            <p className={styles.pricePerSqft}>
              AED{" "}
              {property.pricePerSqft.toLocaleString("en-AE", {
                maximumFractionDigits: 2,
              })}{" "}
              per ft²
            </p>
          ) : null}

          {property.highlights.length > 0 ? (
            <section className={`sp-hl ${styles.highlights}`}>
              <h2 className={`sp-hl-title ${styles.highlightTitle}`}>
                Highlights
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

          {property.description ? (
            <section className={styles.about}>
              <h2>About this property</h2>
              <p className={`sp-desc ${styles.description}`}>
                {property.description}
              </p>
            </section>
          ) : null}

          <ContactCard contact={property.contact} />
        </div>
      </div>
      <footer className={`sp-footer ${styles.showcaseFooter}`}>
        Media &amp; page by <b>MILKYWAYY</b> · milkywayy.com
      </footer>

      <output className={styles.copyStatus} aria-live="polite">
        {copyStatus}
      </output>

      {lightboxOpen ? (
        <div
          aria-label="All property photos"
          aria-modal="true"
          className={styles.lightbox}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setLightboxOpen(false);
          }}
          role="dialog"
        >
          <div className={styles.lightboxContent}>
            <div className={styles.lightboxHeader}>
              <strong>All photos · {imageMedia.length}</strong>
              <button
                type="button"
                className={styles.closeLightbox}
                onClick={() => setLightboxOpen(false)}
              >
                <X aria-hidden="true" /> Close
              </button>
            </div>
            <div className={styles.lightboxGrid}>
              {imageMedia.map((media, index) => (
                <button
                  type="button"
                  className={styles.lightboxPhoto}
                  key={media.id}
                  onClick={() => selectPhoto(media)}
                >
                  <Image
                    alt={`${property.title} — photo ${index + 1}`}
                    fill
                    sizes="(max-width: 600px) 50vw, 280px"
                    unoptimized
                    src={mediaUrl(token, property.id, media.id)}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}
