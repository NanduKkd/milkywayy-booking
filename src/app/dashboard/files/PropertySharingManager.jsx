"use client";

import {
  Check,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import ServiceDeliveryModal from "@/components/customer-delivery/ServiceDeliveryModal";
import {
  createMasterPropertyShareAction,
  createSinglePropertyShareAction,
  deletePropertyContactAction,
  getPropertySharingDashboardAction,
  savePropertyContactAction,
  savePropertyMediaPreferencesAction,
  savePropertyShareListingAction,
  setPropertyShareEnabledAction,
  updateMasterPropertyShareAction,
} from "@/lib/actions/propertySharing";
import styles from "./PropertySharingManager.module.css";

function formatPrice(listing) {
  if (!listing) return "Listing not configured";
  const price = new Intl.NumberFormat("en-AE", {
    maximumFractionDigits: 2,
  }).format(Number(listing.priceAed));
  return `AED ${price}${listing.listingType === "FOR_RENT_YEARLY" ? " / yr" : ""}`;
}

function initialMasterSelection(data) {
  const master = data.shares.find((share) => share.kind === "MASTER");
  return master ? master.properties.map((property) => property.bookingId) : [];
}

function stopPropagation(event) {
  event.stopPropagation();
}

function mediaSummary(property) {
  const parts = [];
  if (property.imageCount) {
    parts.push(
      `${property.imageCount} photo${property.imageCount === 1 ? "" : "s"}`,
    );
  }
  if (property.hasVideo) {
    const count = Number(property.videoCount || 1);
    parts.push(`${count} video${count === 1 ? "" : "s"}`);
  }
  if (property.hasTour) parts.push("360°");
  return parts.join(" · ") || `${property.mediaCount || 0} media`;
}

function completedLabel(value) {
  if (!value) return "Delivered files ready";
  return `Delivered ${new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value))}`;
}

export function BuyerPreview({ share, onClose }) {
  const [device, setDevice] = useState("desktop");

  return (
    <div className={`overlay ${styles.overlay}`} role="presentation">
      <div
        className={`pv-wrap ${styles.preview}`}
        role="dialog"
        aria-modal="true"
        aria-label="Buyer showcase preview"
      >
        <div className={styles.previewBar}>
          <div className={styles.previewToggle}>
            <button
              type="button"
              className={device === "phone" ? styles.activeToggle : ""}
              onClick={() => setDevice("phone")}
            >
              📱 Phone
            </button>
            <button
              type="button"
              className={device === "desktop" ? styles.activeToggle : ""}
              onClick={() => setDevice("desktop")}
            >
              🖥 Desktop
            </button>
          </div>
          <div className={styles.previewUrl}>{share.publicUrl}</div>
          <button
            type="button"
            className={styles.previewClose}
            onClick={onClose}
          >
            <X /> Close
          </button>
        </div>
        <div className={styles.previewStage}>
          <iframe
            className={
              device === "phone" ? styles.previewPhone : styles.previewDesktop
            }
            src={share.publicUrl}
            title="Actual buyer property showcase"
          />
        </div>
      </div>
    </div>
  );
}

export function ListingForm({
  property,
  savedContacts = [],
  mode,
  busy,
  onClose,
  onSubmit,
  onSaveContact,
  onDeleteContact,
}) {
  const existing = property.listing;
  const [form, setForm] = useState({
    listingTitle: existing?.listingTitle || property.bookingTitle || "",
    priceAed: existing?.priceAed || "",
    listingType: existing?.listingType || "FOR_SALE",
    propertyType: existing?.propertyType || "APARTMENT",
    bathrooms: existing?.bathrooms ?? "",
    maidRoom: existing?.maidRoom || false,
    sizeSqft: existing?.sizeSqft ?? "",
    builtUpAreaSqft: existing?.builtUpAreaSqft ?? "",
    plotAreaSqft: existing?.plotAreaSqft ?? "",
    furnishing: existing?.furnishing || "FURNISHED",
    description: existing?.description || "",
    highlights: existing?.highlights || [],
    contactName: existing?.contactName || "",
    contactPhone: existing?.contactPhone || "",
  });
  const [media, setMedia] = useState(() =>
    (property.media || []).map((item, position) => ({ ...item, position })),
  );
  const [highlight, setHighlight] = useState("");

  const update = (field, value) =>
    setForm((current) => ({ ...current, [field]: value }));

  const addHighlight = () => {
    const value = highlight.replace(/\s+/gu, " ").trim();
    if (!value || form.highlights.length >= 12) return;
    if (
      form.highlights.some(
        (current) => current.toLowerCase() === value.toLowerCase(),
      )
    ) {
      setHighlight("");
      return;
    }
    update("highlights", [...form.highlights, value]);
    setHighlight("");
  };

  const updatePropertyType = (propertyType) => {
    setForm((current) => ({
      ...current,
      propertyType,
      ...(propertyType === "COMMERCIAL"
        ? { bathrooms: "", maidRoom: false }
        : {}),
    }));
  };

  const moveMedia = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= media.length) return;
    setMedia((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((item, position) => ({ ...item, position }));
    });
  };

  const toggleMedia = (deliveryFileId) => {
    setMedia((current) => {
      const visibleCount = current.filter((item) => item.visible).length;
      return current.map((item) => {
        if (item.deliveryFileId !== deliveryFileId) return item;
        if (item.visible && visibleCount <= 1) return item;
        const visible = !item.visible;
        return {
          ...item,
          visible,
          isCover: visible ? item.isCover : false,
        };
      });
    });
  };

  const setCover = (deliveryFileId) =>
    setMedia((current) =>
      current.map((item) => ({
        ...item,
        visible: item.deliveryFileId === deliveryFileId ? true : item.visible,
        isCover:
          item.kind === "IMAGE" && item.deliveryFileId === deliveryFileId,
      })),
    );
  const applicableArea =
    Number(String(form.plotAreaSqft).replaceAll(",", "")) ||
    Number(String(form.builtUpAreaSqft).replaceAll(",", "")) ||
    Number(String(form.sizeSqft).replaceAll(",", "")) ||
    0;
  const pricePerSqft =
    applicableArea > 0 && Number(String(form.priceAed).replaceAll(",", "")) > 0
      ? Number(String(form.priceAed).replaceAll(",", "")) / applicableArea
      : null;

  return (
    <div className={`overlay ${styles.overlay}`} role="presentation">
      <form
        className={`modal ${styles.listingModal}`}
        aria-label={
          mode === "create"
            ? "Create property listing"
            : "Edit property listing"
        }
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit({ listing: form, media });
        }}
      >
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close listing form"
        >
          <X />
        </button>
        <h3>{mode === "create" ? "Create Share Link" : "Edit Listing"}</h3>
        <p className={styles.modalSubtitle}>
          {property.bookingTitle} · Complete the listing details once.
          <br />
          Next time it is one click.
        </p>

        <p className={styles.formSection}>FROM YOUR BOOKING</p>
        <div className={styles.knownRow}>
          <span>
            <b>Location</b> {property.location}
          </span>
          {property.bedrooms !== null ? (
            <span>
              <b>Bedrooms</b> {property.bedrooms}
            </span>
          ) : null}
        </div>

        <p className={styles.formSection}>LISTING DETAILS</p>
        <div className={`f-grid ${styles.formGrid}`}>
          <label className={styles.fullField}>
            <span>LISTING TITLE *</span>
            <input
              required
              maxLength={160}
              value={form.listingTitle}
              onChange={(event) => update("listingTitle", event.target.value)}
            />
          </label>
          <label>
            <span>PRICE (AED) *</span>
            <input
              required
              inputMode="decimal"
              value={form.priceAed}
              onChange={(event) => update("priceAed", event.target.value)}
            />
          </label>
          <label>
            <span>PROPERTY TYPE *</span>
            <select
              value={form.propertyType}
              onChange={(event) => updatePropertyType(event.target.value)}
            >
              <option value="APARTMENT">Apartment</option>
              <option value="PENTHOUSE">Penthouse</option>
              <option value="VILLA">Villa</option>
              <option value="TOWNHOUSE">Townhouse</option>
              <option value="COMMERCIAL">Commercial</option>
            </select>
          </label>
          <label>
            <span>LISTING TYPE *</span>
            <select
              value={form.listingType}
              onChange={(event) => update("listingType", event.target.value)}
            >
              <option value="FOR_SALE">For Sale</option>
              <option value="FOR_RENT_YEARLY">For Rent (yearly)</option>
              <option value="HOLIDAY_HOME">Holiday Home</option>
            </select>
          </label>
          <label>
            <span>BATHROOMS</span>
            <select
              value={form.bathrooms}
              disabled={form.propertyType === "COMMERCIAL"}
              onChange={(event) => update("bathrooms", event.target.value)}
            >
              <option value="">Select</option>
              <option value="1">1</option>
              <option value="1.5">1.5</option>
              <option value="2">2</option>
              <option value="2.5">2.5</option>
              <option value="3">3</option>
              <option value="3.5">3.5</option>
              <option value="4">4</option>
              <option value="4.5">4.5</option>
              <option value="5">5</option>
              <option value="5.5">5.5</option>
              <option value="6">6+</option>
            </select>
          </label>
          <label>
            <span>SIZE (SQFT)</span>
            <input
              inputMode="numeric"
              value={form.sizeSqft}
              onChange={(event) => update("sizeSqft", event.target.value)}
            />
          </label>
          <label>
            <span>BUILT-UP AREA (SQFT)</span>
            <input
              inputMode="numeric"
              value={form.builtUpAreaSqft}
              onChange={(event) =>
                update("builtUpAreaSqft", event.target.value)
              }
            />
          </label>
          <label>
            <span>PLOT AREA (SQFT)</span>
            <input
              inputMode="numeric"
              value={form.plotAreaSqft}
              onChange={(event) => update("plotAreaSqft", event.target.value)}
            />
          </label>
          <label className={styles.checkboxField}>
            <input
              type="checkbox"
              checked={form.maidRoom}
              disabled={form.propertyType === "COMMERCIAL"}
              onChange={(event) => update("maidRoom", event.target.checked)}
            />
            <span>MAID&apos;S ROOM</span>
          </label>
          {pricePerSqft ? (
            <p className={styles.derivedPrice}>
              Derived price: AED{" "}
              {new Intl.NumberFormat("en-AE", {
                maximumFractionDigits: 2,
              }).format(pricePerSqft)}{" "}
              / ft²
            </p>
          ) : null}
          <fieldset
            className={`${styles.fullField} ${styles.segmentField}`}
            aria-label="FURNISHING *"
          >
            <legend className={styles.fieldLabel}>FURNISHING *</legend>
            <div className={styles.segment}>
              <button
                type="button"
                className={
                  form.furnishing === "FURNISHED" ? styles.selectedSegment : ""
                }
                aria-pressed={form.furnishing === "FURNISHED"}
                onClick={() => update("furnishing", "FURNISHED")}
              >
                Furnished
              </button>
              <button
                type="button"
                className={
                  form.furnishing === "UNFURNISHED"
                    ? styles.selectedSegment
                    : ""
                }
                aria-pressed={form.furnishing === "UNFURNISHED"}
                onClick={() => update("furnishing", "UNFURNISHED")}
              >
                Unfurnished
              </button>
            </div>
          </fieldset>
          <label className={styles.fullField}>
            <span>DESCRIPTION</span>
            <textarea
              maxLength={4000}
              value={form.description}
              onChange={(event) => update("description", event.target.value)}
            />
          </label>
          {savedContacts.length > 0 ? (
            <div className={styles.fullField}>
              <span className={styles.fieldLabel}>SAVED CONTACTS</span>
              <div className={styles.contactPills}>
                {savedContacts.map((contact) => (
                  <span key={contact.id}>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          contactName: contact.name,
                          contactPhone: contact.phone,
                        }))
                      }
                    >
                      {contact.name}
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete saved contact ${contact.name}`}
                      onClick={() => onDeleteContact?.(contact.id)}
                    >
                      <Trash2 />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          <label>
            <span>CONTACT NAME *</span>
            <input
              required
              maxLength={100}
              autoComplete="name"
              value={form.contactName}
              onChange={(event) => update("contactName", event.target.value)}
            />
          </label>
          <label>
            <span>CONTACT PHONE *</span>
            <input
              required
              maxLength={40}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={form.contactPhone}
              onChange={(event) => update("contactPhone", event.target.value)}
            />
          </label>
          <div className={styles.fullField}>
            <button
              type="button"
              className={styles.saveContactButton}
              disabled={!form.contactName.trim() || !form.contactPhone.trim()}
              onClick={() =>
                onSaveContact?.({
                  name: form.contactName,
                  phone: form.contactPhone,
                })
              }
            >
              + Save this contact for other properties
            </button>
          </div>
          <div className={styles.fullField}>
            <span className={styles.fieldLabel}>
              KEY HIGHLIGHTS &amp; AMENITIES
            </span>
            <div className={styles.highlightInput}>
              <input
                value={highlight}
                maxLength={80}
                placeholder="e.g. Private balcony — press Add"
                onChange={(event) => setHighlight(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addHighlight();
                  }
                }}
              />
              <button type="button" onClick={addHighlight}>
                Add
              </button>
            </div>
            <div className={styles.highlightChips}>
              {form.highlights.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    update(
                      "highlights",
                      form.highlights.filter((value) => value !== item),
                    )
                  }
                >
                  {item} ×
                </button>
              ))}
            </div>
          </div>
          {media.length > 0 ? (
            <div className={styles.fullField}>
              <span className={styles.fieldLabel}>
                MEDIA ORDER, VISIBILITY &amp; COVER
              </span>
              <p className={styles.mediaHelp}>
                New safe media is added visibly at the end. Replacements keep
                this logical-file order.
              </p>
              <div className={styles.mediaPreferenceList}>
                {media.map((item, index) => (
                  <div
                    key={item.deliveryFileId}
                    className={item.visible ? "" : styles.hiddenMedia}
                  >
                    <GripVertical />
                    <span>
                      <b>{item.label}</b>
                      <small>{item.kind.toLowerCase()}</small>
                    </span>
                    {item.kind === "IMAGE" ? (
                      <button
                        type="button"
                        aria-pressed={item.isCover}
                        onClick={() => setCover(item.deliveryFileId)}
                      >
                        {item.isCover ? "Cover" : "Set cover"}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      aria-label={`${item.visible ? "Hide" : "Show"} ${item.label}`}
                      onClick={() => toggleMedia(item.deliveryFileId)}
                    >
                      {item.visible ? <Eye /> : <EyeOff />}
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${item.label} earlier`}
                      disabled={index === 0}
                      onClick={() => moveMedia(index, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${item.label} later`}
                      disabled={index === media.length - 1}
                      onClick={() => moveMedia(index, 1)}
                    >
                      ↓
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <button type="submit" className={styles.submitButton} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : null}
          {mode === "create" ? "Generate & Copy Link" : "Save Changes"}
        </button>
        <button type="button" className={styles.cancelButton} onClick={onClose}>
          Cancel
        </button>
        <p className={styles.formNote}>
          * Required. Contact details appear on the public property page.
        </p>
      </form>
    </div>
  );
}

export default function PropertySharingManager({ initialData, bookings = [] }) {
  const [data, setData] = useState(initialData);
  const [loadingKey, setLoadingKey] = useState("");
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(null);
  const [previewShare, setPreviewShare] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [showMasterLinks, setShowMasterLinks] = useState(false);
  const [masterSelection, setMasterSelection] = useState(() =>
    initialMasterSelection(initialData),
  );

  const singleShares = useMemo(
    () => data.shares.filter((share) => share.kind === "SINGLE_PROPERTY"),
    [data.shares],
  );
  const masterShare = data.shares.find((share) => share.kind === "MASTER");
  const readyProperties = useMemo(() => {
    const sharedBookingIds = new Set(
      singleShares.flatMap((share) =>
        share.properties.map((property) => property.bookingId),
      ),
    );
    return data.eligibleProperties.filter(
      (property) => !sharedBookingIds.has(property.id),
    );
  }, [data.eligibleProperties, singleShares]);
  const bookingsById = useMemo(
    () => new Map(bookings.map((booking) => [Number(booking.id), booking])),
    [bookings],
  );

  useEffect(() => {
    setData(initialData);
    setMasterSelection(initialMasterSelection(initialData));
  }, [initialData]);

  const reload = async () => {
    const result = await getPropertySharingDashboardAction();
    if (!result.success) throw new Error(result.message);
    setData(result.data);
    return result.data;
  };

  const run = async (key, operation) => {
    setLoadingKey(key);
    try {
      const result = await operation();
      if (!result.success) throw new Error(result.message);
      await reload();
      return result.data;
    } catch (error) {
      toast.error(error.message || "Unable to update property sharing");
      return null;
    } finally {
      setLoadingKey("");
    }
  };

  const copyShare = async (share) => {
    try {
      await navigator.clipboard.writeText(share.publicUrl);
      toast.success("Link copied to clipboard.");
    } catch {
      toast.error("Unable to copy the link");
    }
  };

  const saveListing = async ({ listing, media }) => {
    const property = editing.property;
    const result = await run(`listing:${property.id}`, async () => {
      const savedListing = await savePropertyShareListingAction(
        property.id,
        listing,
      );
      if (!savedListing.success) return savedListing;
      if (media.length > 0) {
        const savedMedia = await savePropertyMediaPreferencesAction(
          property.id,
          media.map(({ deliveryFileId, visible, isCover }) => ({
            deliveryFileId,
            visible,
            isCover,
          })),
        );
        if (!savedMedia.success) return savedMedia;
      }
      return savedListing;
    });
    if (!result) return;
    setEditing(null);
    toast.success("Listing updated.");
  };

  const createShare = async ({ listing, media }) => {
    const property = creating;
    const result = await run(`create:${property.id}`, async () => {
      const savedListing = await savePropertyShareListingAction(
        property.id,
        listing,
      );
      if (!savedListing.success) return savedListing;
      if (media.length > 0) {
        const savedMedia = await savePropertyMediaPreferencesAction(
          property.id,
          media.map(({ deliveryFileId, visible, isCover }) => ({
            deliveryFileId,
            visible,
            isCover,
          })),
        );
        if (!savedMedia.success) return savedMedia;
      }
      return createSinglePropertyShareAction(property.id);
    });
    if (!result) return;
    setCreating(null);
    try {
      await navigator.clipboard.writeText(result.publicUrl);
      toast.success("Share link created and copied.");
    } catch {
      toast.success("Share link created.");
    }
  };

  const toggleShare = async (share) => {
    const result = await run(`${share.id}:toggle`, () =>
      setPropertyShareEnabledAction(share.id, !share.enabled),
    );
    if (result) {
      toast.success(share.enabled ? "Link disabled." : "Link enabled.");
    }
  };

  const saveContact = async (contact) => {
    const result = await run("contact:save", () =>
      savePropertyContactAction(contact),
    );
    if (result) toast.success("Contact saved for reuse.");
  };

  const deleteContact = async (contactId) => {
    const result = await run(`contact:${contactId}:delete`, () =>
      deletePropertyContactAction(contactId),
    );
    if (result) toast.success("Saved contact deleted.");
  };

  const toggleSelected = (bookingId) => {
    setMasterSelection((current) =>
      current.includes(bookingId)
        ? current.filter((id) => id !== bookingId)
        : [...current, bookingId],
    );
  };

  const saveMaster = async () => {
    const result = await run(`${masterShare?.id || "new"}:master`, () =>
      masterShare
        ? updateMasterPropertyShareAction(masterShare.id, masterSelection)
        : createMasterPropertyShareAction(masterSelection),
    );
    if (!result) return;
    setSelectionMode(false);
    setShowMasterLinks(true);
    if (!masterShare && result.publicUrl) {
      try {
        await navigator.clipboard.writeText(result.publicUrl);
        toast.success("Master link created and copied.");
      } catch {
        toast.success("Master link created.");
      }
    } else {
      toast.success("Master link updated.");
    }
  };

  return (
    <section
      className={styles.manager}
      aria-label="Property sharing management"
    >
      <p className={styles.tabHint}>
        Delivered shoots land here. Download the raw files, or publish one link
        with every photo, video and the 360° tour.
      </p>

      {!showMasterLinks && readyProperties.length > 0 ? (
        <section className={styles.readySection} aria-label="Ready to share">
          <div className={styles.sectionLabel}>READY TO SHARE</div>
          <div className={styles.readyGrid}>
            {readyProperties.map((property, index) => (
              <article className={styles.readyCard} key={property.id}>
                <div className={styles.readyHero} data-tone={index % 3}>
                  {property.coverUrl ? (
                    <Image
                      alt={`${property.bookingTitle} cover`}
                      className={styles.sharedHeroImage}
                      fill
                      sizes="(max-width: 899px) 100vw, 260px"
                      src={property.coverUrl}
                      unoptimized
                    />
                  ) : (
                    <div className={styles.photoPlaceholder} aria-hidden="true">
                      PHOTO READY
                    </div>
                  )}
                </div>
                <div className={styles.readyBody}>
                  <div>
                    <h3>{property.bookingTitle}</h3>
                    <p>
                      {property.location}
                      {property.bedrooms !== null
                        ? ` · ${property.bedrooms} Bed`
                        : ""}
                      {` · ${completedLabel(property.completedAt)}`}
                    </p>
                    <div className={styles.readyBadges}>
                      {property.imageCount ? (
                        <span>✓ {property.imageCount} Photos</span>
                      ) : null}
                      {property.hasVideo ? <span>✓ Video</span> : null}
                      {property.hasTour ? <span>✓ 360° Tour</span> : null}
                    </div>
                  </div>
                  <div className={styles.readyActions}>
                    <button
                      type="button"
                      className={styles.primaryButton}
                      onClick={() => setCreating(property)}
                    >
                      <Copy /> Create Share Link
                    </button>
                    <button
                      type="button"
                      disabled={!bookingsById.has(Number(property.id))}
                      onClick={() =>
                        setSelectedBooking(
                          bookingsById.get(Number(property.id)),
                        )
                      }
                    >
                      ↓ Download Files
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <div className={`sec-row ${styles.sectionRow}`}>
        <div className={`sec-label ${styles.sectionLabel}`}>
          {showMasterLinks ? "MASTER LINKS" : "SHARED PROPERTIES"}
        </div>
        <div className={styles.sectionButtons}>
          <button
            type="button"
            aria-label={
              showMasterLinks
                ? "Back to Properties"
                : `Master Links (${masterShare ? 1 : 0})`
            }
            onClick={() => {
              setShowMasterLinks((current) => !current);
              setSelectionMode(false);
            }}
          >
            {showMasterLinks
              ? "← Back to Properties"
              : `🔗 Master Links (${masterShare ? 1 : 0})`}
          </button>
          {!showMasterLinks && singleShares.length > 0 ? (
            <button
              type="button"
              aria-label={
                selectionMode ? "Cancel Selection" : "Select Multiple"
              }
              onClick={() => setSelectionMode((current) => !current)}
            >
              {selectionMode ? "✕ Cancel Selection" : "☑ Select Multiple"}
            </button>
          ) : null}
        </div>
      </div>

      {showMasterLinks ? (
        <>
          <p className={styles.masterHint}>
            One link, multiple properties — opens as a curated list. Select
            properties in Shared Properties to create or update a master link.
            Disabled links show “listing unavailable” to viewers.
          </p>
          {masterShare ? (
            <article className={`mcard ${styles.masterCard}`}>
              <div className={styles.masterTop}>
                <div>
                  <h3>
                    Collection — {masterShare.properties.length} properties
                  </h3>
                  <p>
                    {masterShare.properties
                      .map((property) => property.listing?.listingTitle)
                      .join(" + ")}
                  </p>
                </div>
                <span
                  className={
                    masterShare.enabled ? styles.livePill : styles.offPill
                  }
                >
                  {masterShare.enabled ? "enabled" : "disabled"}
                </span>
              </div>
              <button
                type="button"
                className={styles.masterThumbs}
                onClick={() => setPreviewShare(masterShare)}
                aria-label="Preview master collection"
              >
                {masterShare.properties.map((property, index) => (
                  <i key={property.id} data-tone={index % 3} />
                ))}
              </button>
              <div className={styles.linkRow}>
                <span>{masterShare.publicUrl}</span>
                <b>{masterShare.linkViews} views</b>
              </div>
              <div className={styles.masterActions}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => copyShare(masterShare)}
                >
                  <Copy /> Copy Link
                </button>
                <button type="button" onClick={() => toggleShare(masterShare)}>
                  {masterShare.enabled ? "Disable" : "Enable"}
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewShare(masterShare)}
                >
                  Preview
                </button>
              </div>
            </article>
          ) : (
            <p className={styles.emptyState}>
              No master links yet — go back, select two or more properties, and
              create one.
            </p>
          )}
        </>
      ) : (
        <div className={`grid2 ${styles.gridTwo}`}>
          {singleShares.map((share, index) => {
            const property = share.properties[0];
            const selected = masterSelection.includes(property.bookingId);
            const openOrSelect = () =>
              selectionMode
                ? toggleSelected(property.bookingId)
                : setPreviewShare(share);
            return (
              <article
                className={`pshared ${styles.sharedCard} ${selectionMode ? styles.selectable : ""} ${selected && selectionMode ? styles.selected : ""}`}
                key={share.id}
              >
                <button
                  type="button"
                  className={styles.cardHitArea}
                  aria-label={`${selectionMode ? (selected ? "Remove" : "Add") : "Preview"} ${property.listing?.listingTitle || property.bookingTitle}${selectionMode ? `${selected ? " from" : " to"} master collection` : ""}`}
                  onClick={openOrSelect}
                />
                <div
                  className={`${styles.sharedHero} ${share.enabled ? "" : styles.disabledHero}`}
                  data-tone={index % 3}
                >
                  {selectionMode ? (
                    <button
                      type="button"
                      className={styles.selectCheck}
                      aria-label={`${selected ? "Remove" : "Add"} ${property.listing?.listingTitle || property.bookingTitle} ${selected ? "from" : "to"} master collection`}
                      onClick={openOrSelect}
                    >
                      {selected ? <Check /> : null}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={share.enabled ? styles.liveTag : styles.offTag}
                    aria-label={`${share.enabled ? "Disable" : "Enable"} ${property.listing?.listingTitle || property.bookingTitle}`}
                    onClick={(event) => {
                      stopPropagation(event);
                      toggleShare(share);
                    }}
                  >
                    <span className={styles.statusSwitch} aria-hidden="true">
                      <i />
                    </span>
                    {share.enabled ? "LIVE" : "DISABLED"}
                  </button>
                  {property.coverUrl ? (
                    <Image
                      alt={
                        property.listing?.listingTitle || property.bookingTitle
                      }
                      className={styles.sharedHeroImage}
                      fill
                      sizes="(max-width: 899px) 100vw, 420px"
                      src={property.coverUrl}
                      unoptimized
                    />
                  ) : (
                    <div className={styles.photoPlaceholder} aria-hidden="true">
                      PHOTO READY
                    </div>
                  )}
                  <span className={styles.mediaCount}>
                    {mediaSummary(property)}
                  </span>
                </div>
                <div className={styles.sharedBody}>
                  <div className={styles.sharedInfo}>
                    <p className={styles.listingType}>
                      {property.listing?.listingTypeLabel || "For Sale"}
                    </p>
                    <b className={styles.listingPrice}>
                      {formatPrice(property.listing)}
                    </b>
                    <h3>{property.listing?.listingTitle}</h3>
                  </div>
                  <div className={styles.cardFooter}>
                    <span>◉ {share.linkViews} link views</span>
                    {!selectionMode ? (
                      <div className={styles.cardActions}>
                        <button
                          type="button"
                          className={styles.primaryButton}
                          onClick={(event) => {
                            stopPropagation(event);
                            copyShare(share);
                          }}
                        >
                          <Copy /> Copy Link
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            stopPropagation(event);
                            setPreviewShare(share);
                          }}
                        >
                          View Page
                        </button>
                        <button
                          type="button"
                          aria-label="Edit"
                          onClick={(event) => {
                            stopPropagation(event);
                            const eligible = data.eligibleProperties.find(
                              (item) => item.id === property.bookingId,
                            );
                            if (eligible) {
                              setEditing({ property: eligible, mode: "edit" });
                            }
                          }}
                        >
                          ✎ Edit
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
          {singleShares.length === 0 ? (
            <p className={styles.emptyState}>No shared properties yet.</p>
          ) : null}
        </div>
      )}

      {selectionMode ? (
        <div className={`actionbar ${styles.actionBar}`}>
          <span>
            <b>{masterSelection.length}</b> selected
          </span>
          <button
            type="button"
            disabled={
              masterSelection.length < 2 || loadingKey.endsWith(":master")
            }
            onClick={saveMaster}
          >
            {loadingKey.endsWith(":master") ? (
              <Loader2 className="animate-spin" />
            ) : null}
            {masterShare ? "Update Master Link" : "Create Master Link"}
          </button>
          <button type="button" onClick={() => setSelectionMode(false)}>
            Cancel
          </button>
        </div>
      ) : null}

      {editing ? (
        <ListingForm
          property={editing.property}
          savedContacts={data.savedContacts || []}
          mode={editing.mode}
          busy={loadingKey === `listing:${editing.property.id}`}
          onClose={() => setEditing(null)}
          onSubmit={saveListing}
          onSaveContact={saveContact}
          onDeleteContact={deleteContact}
        />
      ) : null}
      {creating ? (
        <ListingForm
          property={creating}
          savedContacts={data.savedContacts || []}
          mode="create"
          busy={loadingKey === `create:${creating.id}`}
          onClose={() => setCreating(null)}
          onSubmit={createShare}
          onSaveContact={saveContact}
          onDeleteContact={deleteContact}
        />
      ) : null}
      {previewShare ? (
        <BuyerPreview
          share={previewShare}
          onClose={() => setPreviewShare(null)}
        />
      ) : null}
      <ServiceDeliveryModal
        booking={selectedBooking}
        open={Boolean(selectedBooking)}
        onOpenChange={(open) => {
          if (!open) setSelectedBooking(null);
        }}
      />
    </section>
  );
}
