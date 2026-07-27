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
import { useCallback, useEffect, useRef, useState } from "react";
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

function useModalFocus(open, dialogRef) {
  useEffect(() => {
    if (!open || !dialogRef.current) return undefined;

    const dialog = dialogRef.current;
    const previouslyFocused = document.activeElement;
    const siblings = [...(dialog.parentElement?.children || [])].filter(
      (element) => element !== dialog,
    );
    const inertState = siblings.map((element) => [
      element,
      element.hasAttribute("inert"),
    ]);
    siblings.forEach((element) => {
      element.setAttribute("inert", "");
    });

    const focusableSelector =
      'button:not([disabled]), a[href], video[controls], [tabindex]:not([tabindex="-1"])';
    const focusable = [...dialog.querySelectorAll(focusableSelector)];
    (focusable[0] || dialog).focus();

    const trapFocus = (event) => {
      if (event.key !== "Tab") return;
      const candidates = [...dialog.querySelectorAll(focusableSelector)].filter(
        (element) => !element.hasAttribute("disabled"),
      );
      if (candidates.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = candidates[0];
      const last = candidates[candidates.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    dialog.addEventListener("keydown", trapFocus);
    return () => {
      dialog.removeEventListener("keydown", trapFocus);
      inertState.forEach(([element, wasInert]) => {
        if (!wasInert) element.removeAttribute("inert");
      });
      if (
        previouslyFocused instanceof HTMLElement &&
        document.contains(previouslyFocused)
      ) {
        previouslyFocused.focus();
      }
    };
  }, [dialogRef, open]);
}

function MediaThumbnail({
  active,
  failed,
  media,
  onClick,
  photoIndex,
  property,
  token,
}) {
  const label = `View property photo ${photoIndex + 1}`;
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
  const imageMedia = property.media.filter((media) =>
    media.mimeType.startsWith("image/"),
  );
  const videoMedia = property.media.filter((media) =>
    media.mimeType.startsWith("video/"),
  );
  const tourMedia = property.media.filter(
    (media) => media.kind === "TOUR" && media.embedUrl,
  );
  const [activeMediaId, setActiveMediaId] = useState(imageMedia[0]?.id);
  const [failedMedia, setFailedMedia] = useState(() => new Set());
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [videoPickerOpen, setVideoPickerOpen] = useState(false);
  const [videoModalMedia, setVideoModalMedia] = useState(null);
  const [copyStatus, setCopyStatus] = useState("");
  const photoDialogRef = useRef(null);
  const videoPickerDialogRef = useRef(null);
  const videoDialogRef = useRef(null);
  const activeIndex = Math.max(
    0,
    imageMedia.findIndex((media) => media.id === activeMediaId),
  );
  const activeMedia = imageMedia[activeIndex];
  useModalFocus(lightboxOpen, photoDialogRef);
  useModalFocus(videoPickerOpen, videoPickerDialogRef);
  useModalFocus(Boolean(videoModalMedia), videoDialogRef);

  const selectRelative = useCallback(
    (offset) => {
      if (imageMedia.length === 0) return;
      const next =
        (activeIndex + offset + imageMedia.length) % imageMedia.length;
      setActiveMediaId(imageMedia[next].id);
    },
    [activeIndex, imageMedia],
  );

  const markFailed = (mediaId) => {
    setFailedMedia((current) => new Set([...current, mediaId]));
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setLightboxOpen(false);
        setVideoPickerOpen(false);
        setVideoModalMedia(null);
      } else if (
        !lightboxOpen &&
        !videoPickerOpen &&
        !videoModalMedia &&
        event.key === "ArrowLeft"
      ) {
        selectRelative(-1);
      } else if (
        !lightboxOpen &&
        !videoPickerOpen &&
        !videoModalMedia &&
        event.key === "ArrowRight"
      ) {
        selectRelative(1);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [lightboxOpen, selectRelative, videoModalMedia, videoPickerOpen]);

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
        <div className={`media-column ${styles.mediaColumn}`}>
          <div className={`sp-hero ${styles.spHero}`}>
            {activeMedia && !failedMedia.has(activeMedia.id) ? (
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
            ) : (
              <output className={styles.mediaFallback}>
                This media could not be displayed.
              </output>
            )}
            {imageMedia.length > 1 ? (
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
              {imageMedia.length ? activeIndex + 1 : 0} / {imageMedia.length}
            </span>
          </div>

          {imageMedia.length > 0 ? (
            <div className={`sp-thumbs ${styles.thumbnails}`}>
              {(imageMedia.length > 4
                ? imageMedia.slice(0, 3)
                : imageMedia
              ).map((media, photoIndex) => (
                <MediaThumbnail
                  active={media.id === activeMedia?.id}
                  failed={failedMedia.has(media.id)}
                  key={media.id}
                  media={media}
                  onClick={() => setActiveMediaId(media.id)}
                  photoIndex={photoIndex}
                  property={property}
                  token={token}
                />
              ))}
              {imageMedia.length > 4 ? (
                <button
                  type="button"
                  className={`thumb ${styles.thumbnail} ${styles.moreMedia}`}
                  onClick={() => setLightboxOpen(true)}
                >
                  <Images aria-hidden="true" /> + {imageMedia.length - 3} More
                  Photos
                </button>
              ) : null}
            </div>
          ) : null}

          {videoMedia.length > 0 || tourMedia.length > 0 ? (
            <section
              className={styles.mediaActions}
              aria-label="Property media"
            >
              {videoMedia.length > 0 ? (
                <button
                  type="button"
                  className={styles.mediaAction}
                  onClick={() => {
                    if (videoMedia.length === 1) {
                      setVideoModalMedia(videoMedia[0]);
                    } else {
                      setVideoPickerOpen(true);
                    }
                  }}
                >
                  <Play aria-hidden="true" />
                  <span>
                    <b>Video walkthrough</b>
                    <small>
                      {videoMedia.length === 1
                        ? videoMedia[0].label
                        : `${videoMedia.length} videos`}
                    </small>
                  </span>
                </button>
              ) : null}
              {tourMedia.map((media) => (
                <a
                  className={styles.mediaAction}
                  href={media.embedUrl}
                  key={media.id}
                  rel="noreferrer"
                  target="_blank"
                >
                  <Globe2 aria-hidden="true" />
                  <span>
                    <b>360° virtual tour</b>
                    <small>{media.label}</small>
                  </span>
                </a>
              ))}
            </section>
          ) : null}

          <ContactCard contact={property.contact} />
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
          ref={photoDialogRef}
          role="dialog"
          tabIndex={-1}
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

      {videoPickerOpen ? (
        <div
          aria-label="Choose a video walkthrough"
          aria-modal="true"
          className={styles.lightbox}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setVideoPickerOpen(false);
          }}
          ref={videoPickerDialogRef}
          role="dialog"
          tabIndex={-1}
        >
          <div
            className={`${styles.lightboxContent} ${styles.videoPickerContent}`}
          >
            <div className={styles.lightboxHeader}>
              <strong>Choose a video walkthrough</strong>
              <button
                type="button"
                className={styles.closeLightbox}
                onClick={() => setVideoPickerOpen(false)}
              >
                <X aria-hidden="true" /> Close
              </button>
            </div>
            <div className={styles.videoPickerList}>
              {videoMedia.map((media, index) => (
                <button
                  type="button"
                  className={styles.mediaAction}
                  key={media.id}
                  onClick={() => {
                    setVideoPickerOpen(false);
                    setVideoModalMedia(media);
                  }}
                >
                  <Play aria-hidden="true" />
                  <span>
                    <b>{media.label || `Video ${index + 1}`}</b>
                    <small>Open walkthrough</small>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {videoModalMedia ? (
        <div
          aria-label="Video walkthrough"
          aria-modal="true"
          className={styles.lightbox}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setVideoModalMedia(null);
          }}
          ref={videoDialogRef}
          role="dialog"
          tabIndex={-1}
        >
          <div
            className={`${styles.lightboxContent} ${styles.videoModalContent}`}
          >
            <div className={styles.lightboxHeader}>
              <strong>Video walkthrough</strong>
              <button
                type="button"
                className={styles.closeLightbox}
                onClick={() => setVideoModalMedia(null)}
              >
                <X aria-hidden="true" /> Close
              </button>
            </div>
            <div className={styles.videoModalPlayer}>
              {/* biome-ignore lint/a11y/useMediaCaption: The delivery model does not persist a separate captions asset. */}
              <video
                aria-label={`${property.title} — video walkthrough`}
                controls
                playsInline
                preload="metadata"
                onError={() => markFailed(videoModalMedia.id)}
                src={mediaUrl(token, property.id, videoModalMedia.id)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}
