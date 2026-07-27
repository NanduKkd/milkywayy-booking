"use client";

import { Check, Copy, Eye, EyeOff, Loader2, Trash2, X } from "lucide-react";
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

const DEFAULT_AMENITIES = [
  "Sea view",
  "Golf view",
  "Balcony",
  "Private pool",
  "Shared pool",
  "Covered parking",
  "Chiller free",
];
const MAX_HIGHLIGHTS = 6;

function normalizeMediaOrder(items) {
  const firstVisibleImage = items.find(
    (item) => item.kind === "IMAGE" && item.visible,
  );
  return items.map((item, position) => ({
    ...item,
    position,
    isCover:
      item.kind === "IMAGE" &&
      firstVisibleImage?.deliveryFileId === item.deliveryFileId,
  }));
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
  onSaveDraft,
  onPreview,
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
    highlights: (existing?.highlights || []).slice(0, MAX_HIGHLIGHTS),
    contactName: existing?.contactName || "",
    contactPhone: existing?.contactPhone || "",
  });
  const [media, setMedia] = useState(() =>
    normalizeMediaOrder(
      (property.media || []).map((item, position) => ({ ...item, position })),
    ),
  );
  const [highlight, setHighlight] = useState("");
  const [amenityOptions, setAmenityOptions] = useState(() => [
    ...new Set([...DEFAULT_AMENITIES, ...(existing?.highlights || [])]),
  ]);
  const [draggedPhotoId, setDraggedPhotoId] = useState(null);
  const photos = media.filter((item) => item.kind === "IMAGE");
  const pageMedia = media.filter((item) => item.kind !== "IMAGE");

  const update = (field, value) =>
    setForm((current) => ({ ...current, [field]: value }));

  const toggleHighlight = (value) => {
    const selected = form.highlights.includes(value);
    if (!selected && form.highlights.length >= MAX_HIGHLIGHTS) {
      toast.error("Maximum 6 highlights per property");
      return;
    }
    update(
      "highlights",
      selected
        ? form.highlights.filter((item) => item !== value)
        : [...form.highlights, value],
    );
  };

  const addHighlight = () => {
    const value = highlight.replace(/\s+/gu, " ").trim();
    if (!value) return;
    if (
      form.highlights.some(
        (current) => current.toLowerCase() === value.toLowerCase(),
      )
    ) {
      setHighlight("");
      return;
    }
    if (form.highlights.length >= MAX_HIGHLIGHTS) {
      toast.error("Maximum 6 highlights per property");
      return;
    }
    setAmenityOptions((current) =>
      current.some((item) => item.toLowerCase() === value.toLowerCase())
        ? current
        : [...current, value],
    );
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

  const reorderPhotos = (fromId, toId) => {
    if (!fromId || fromId === toId) return;
    setMedia((current) => {
      const currentPhotos = current.filter((item) => item.kind === "IMAGE");
      const from = currentPhotos.findIndex(
        (item) => item.deliveryFileId === fromId,
      );
      const to = currentPhotos.findIndex(
        (item) => item.deliveryFileId === toId,
      );
      if (from < 0 || to < 0) return current;
      const nextPhotos = [...currentPhotos];
      const [moved] = nextPhotos.splice(from, 1);
      nextPhotos.splice(to, 0, moved);
      return normalizeMediaOrder([
        ...nextPhotos,
        ...current.filter((item) => item.kind !== "IMAGE"),
      ]);
    });
    setDraggedPhotoId(null);
  };

  const toggleMedia = (deliveryFileId) => {
    setMedia((current) => {
      const target = current.find(
        (item) => item.deliveryFileId === deliveryFileId,
      );
      const visiblePhotoCount = current.filter(
        (item) => item.kind === "IMAGE" && item.visible,
      ).length;
      if (
        target?.kind === "IMAGE" &&
        target.visible &&
        visiblePhotoCount <= 1
      ) {
        toast.error("At least one photo must stay visible");
        return current;
      }
      return normalizeMediaOrder(
        current.map((item) =>
          item.deliveryFileId === deliveryFileId
            ? { ...item, visible: !item.visible }
            : item,
        ),
      );
    });
  };

  const applicableArea =
    Number(String(form.plotAreaSqft).replaceAll(",", "")) ||
    Number(String(form.builtUpAreaSqft).replaceAll(",", "")) ||
    Number(String(form.sizeSqft).replaceAll(",", "")) ||
    0;
  const pricePerSqft =
    applicableArea > 0 && Number(String(form.priceAed).replaceAll(",", "")) > 0
      ? Number(String(form.priceAed).replaceAll(",", "")) / applicableArea
      : null;
  const isSimpleSize = ["APARTMENT", "PENTHOUSE"].includes(form.propertyType);
  const isCommercial = form.propertyType === "COMMERCIAL";
  const orderedAmenities = amenityOptions
    .filter((item) => form.highlights.includes(item))
    .concat(amenityOptions.filter((item) => !form.highlights.includes(item)));
  const submitPayload = () => ({ listing: form, media });

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
          onSubmit(submitPayload());
        }}
      >
        <header className={styles.listingHeader}>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close listing form"
          >
            <X />
          </button>
          <h3>{mode === "create" ? "Create Share Link" : "Edit Share Link"}</h3>
          <p className={styles.modalSubtitle}>
            {property.bookingTitle} · details and media order are saved to this
            property.
          </p>
        </header>

        <div className={styles.listingBody}>
          <section className={styles.listingDetailsPane}>
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
                  onChange={(event) =>
                    update("listingTitle", event.target.value)
                  }
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
                <span>PRICE (AED) *</span>
                <input
                  required
                  inputMode="decimal"
                  value={form.priceAed}
                  onChange={(event) => update("priceAed", event.target.value)}
                />
              </label>
              <div className={styles.derivedPrice}>
                <span>PRICE PER FT²</span>
                <b>
                  {pricePerSqft
                    ? `AED ${new Intl.NumberFormat("en-AE", {
                        maximumFractionDigits: 2,
                      }).format(pricePerSqft)}`
                    : "—"}
                </b>
                <small>auto</small>
              </div>
              {isSimpleSize ? (
                <label>
                  <span>SIZE (FT²)</span>
                  <input
                    inputMode="numeric"
                    value={form.sizeSqft}
                    onChange={(event) => update("sizeSqft", event.target.value)}
                  />
                </label>
              ) : (
                <>
                  <label>
                    <span>BUILT-UP AREA (FT²)</span>
                    <input
                      inputMode="numeric"
                      value={form.builtUpAreaSqft}
                      onChange={(event) =>
                        update("builtUpAreaSqft", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    <span>PLOT SIZE (FT²)</span>
                    <input
                      inputMode="numeric"
                      value={form.plotAreaSqft}
                      onChange={(event) =>
                        update("plotAreaSqft", event.target.value)
                      }
                    />
                  </label>
                </>
              )}
              <label>
                <span>LISTING TYPE *</span>
                <select
                  value={form.listingType}
                  onChange={(event) =>
                    update("listingType", event.target.value)
                  }
                >
                  <option value="FOR_SALE">For Sale</option>
                  <option value="FOR_RENT_YEARLY">For Rent (yearly)</option>
                  <option value="HOLIDAY_HOME">Holiday Home</option>
                </select>
              </label>
              {!isCommercial ? (
                <>
                  <label>
                    <span>BEDROOMS</span>
                    <input
                      readOnly
                      value={property.bedrooms ?? "From booking"}
                      aria-label="Bedrooms from booking"
                    />
                  </label>
                  <button
                    type="button"
                    className={`${styles.maidToggle} ${
                      form.maidRoom ? styles.maidToggleActive : ""
                    }`}
                    aria-pressed={form.maidRoom}
                    onClick={() => update("maidRoom", !form.maidRoom)}
                  >
                    {form.maidRoom ? "✓ " : ""}Maid&apos;s room
                  </button>
                  <label>
                    <span>BATHROOMS</span>
                    <select
                      value={form.bathrooms}
                      onChange={(event) =>
                        update("bathrooms", event.target.value)
                      }
                    >
                      <option value="">Select</option>
                      {[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6].map(
                        (value) => (
                          <option key={value} value={value}>
                            {value === 6 ? "6+" : value}
                          </option>
                        ),
                      )}
                    </select>
                    <small className={styles.fieldHelp}>
                      Half bathrooms are supported.
                    </small>
                  </label>
                </>
              ) : null}
              <fieldset
                className={`${styles.fullField} ${styles.segmentField}`}
                aria-label="FURNISHING *"
              >
                <legend className={styles.fieldLabel}>FURNISHING *</legend>
                <div className={styles.segment}>
                  {["FURNISHED", "UNFURNISHED"].map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={
                        form.furnishing === value ? styles.selectedSegment : ""
                      }
                      aria-pressed={form.furnishing === value}
                      onClick={() => update("furnishing", value)}
                    >
                      {value === "FURNISHED" ? "Furnished" : "Unfurnished"}
                    </button>
                  ))}
                </div>
              </fieldset>
              <label className={styles.fullField}>
                <span>DESCRIPTION</span>
                <textarea
                  maxLength={4000}
                  value={form.description}
                  onChange={(event) =>
                    update("description", event.target.value)
                  }
                />
              </label>
              <div className={styles.fullField}>
                <span className={styles.fieldLabel}>
                  AMENITIES &amp; HIGHLIGHTS · {form.highlights.length}/
                  {MAX_HIGHLIGHTS}
                </span>
                <p className={styles.fieldHelp}>
                  Tap to select — up to 6 show on the shared page. Add anything
                  else below.
                </p>
                <div className={styles.highlightChips}>
                  {orderedAmenities.map((item) => {
                    const selected = form.highlights.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        className={
                          selected ? styles.selectedHighlight : undefined
                        }
                        aria-pressed={selected}
                        onClick={() => toggleHighlight(item)}
                      >
                        {selected ? "✓ " : ""}
                        {item}
                      </button>
                    );
                  })}
                </div>
                <div className={styles.highlightInput}>
                  <input
                    value={highlight}
                    maxLength={80}
                    placeholder="Add your own — e.g. Vacant on transfer"
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
              </div>
              <div className={`${styles.fullField} ${styles.contactSection}`}>
                <span className={styles.fieldLabel}>POINT OF CONTACT</span>
                <p className={styles.fieldHelp}>
                  This name and number appear on the public page.
                </p>
              </div>
              <label>
                <span>NAME *</span>
                <input
                  required
                  maxLength={100}
                  autoComplete="name"
                  value={form.contactName}
                  onChange={(event) =>
                    update("contactName", event.target.value)
                  }
                />
              </label>
              <label>
                <span>PHONE *</span>
                <input
                  required
                  maxLength={40}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={form.contactPhone}
                  onChange={(event) =>
                    update("contactPhone", event.target.value)
                  }
                />
              </label>
              <div className={styles.fullField}>
                <button
                  type="button"
                  className={styles.saveContactButton}
                  disabled={
                    !form.contactName.trim() || !form.contactPhone.trim()
                  }
                  onClick={() =>
                    onSaveContact?.({
                      name: form.contactName,
                      phone: form.contactPhone,
                    })
                  }
                >
                  + Save this contact
                </button>
              </div>
              {savedContacts.length > 0 ? (
                <div
                  className={`${styles.fullField} ${styles.savedContactSection}`}
                >
                  <span className={styles.fieldLabel}>SAVED CONTACTS</span>
                  <div className={styles.contactPills}>
                    {savedContacts.map((contact) => {
                      const selected =
                        form.contactName.trim() === contact.name.trim() &&
                        form.contactPhone.trim() === contact.phone.trim();
                      return (
                        <span
                          key={contact.id}
                          className={
                            selected ? styles.selectedContact : undefined
                          }
                        >
                          <button
                            type="button"
                            aria-pressed={selected}
                            onClick={() =>
                              setForm((current) => ({
                                ...current,
                                contactName: contact.name,
                                contactPhone: contact.phone,
                              }))
                            }
                          >
                            {selected ? "✓ " : ""}
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
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <section className={styles.mediaPane}>
            <span className={styles.fieldLabel}>
              PHOTO ORDER · {photos.length} PHOTOS
            </span>
            <p className={styles.mediaHelp}>
              Drag a photo onto another to reorder. The grid scrolls
              automatically. Use the eye to hide a photo. Photo 1 is the cover
              and link preview.
            </p>
            <ul className={styles.photoOrderGrid}>
              {photos.map((item, index) => (
                <li
                  key={item.deliveryFileId}
                  className={`${styles.photoOrderItem} ${
                    item.visible ? "" : styles.hiddenMedia
                  } ${draggedPhotoId === item.deliveryFileId ? styles.draggingPhoto : ""}`}
                  draggable
                  onDragStart={() => setDraggedPhotoId(item.deliveryFileId)}
                  onDragEnd={() => setDraggedPhotoId(null)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() =>
                    reorderPhotos(draggedPhotoId, item.deliveryFileId)
                  }
                >
                  <Image
                    alt={item.label}
                    fill
                    sizes="140px"
                    src={`/api/files/download?fileId=${encodeURIComponent(
                      item.deliveryFileId,
                    )}`}
                    unoptimized
                  />
                  <span className={styles.photoNumber}>{index + 1}</span>
                  {item.isCover ? (
                    <span className={styles.coverBadge}>COVER</span>
                  ) : null}
                  <button
                    type="button"
                    aria-label={`${item.visible ? "Hide" : "Show"} ${item.label}`}
                    onClick={() => toggleMedia(item.deliveryFileId)}
                  >
                    {item.visible ? <Eye /> : <EyeOff />}
                  </button>
                  {!item.visible ? (
                    <span className={styles.hiddenBadge}>HIDDEN</span>
                  ) : null}
                </li>
              ))}
            </ul>

            <span className={`${styles.fieldLabel} ${styles.pageMediaLabel}`}>
              MEDIA ON THE PAGE
            </span>
            <div className={styles.pageMediaList}>
              {pageMedia.map((item) => (
                <div
                  key={item.deliveryFileId}
                  className={item.visible ? "" : styles.hiddenMedia}
                >
                  <span className={styles.mediaKindIcon}>
                    {item.kind === "VIDEO" ? "▶" : "360"}
                  </span>
                  <span>
                    <b>
                      {item.kind === "VIDEO"
                        ? "Video walkthrough"
                        : "360° virtual tour"}
                    </b>
                    <small>
                      {item.visible ? "Delivered · included" : "Hidden"}
                    </small>
                  </span>
                  <button
                    type="button"
                    aria-label={`${item.visible ? "Hide" : "Show"} ${item.label}`}
                    onClick={() => toggleMedia(item.deliveryFileId)}
                  >
                    {item.visible ? <Eye /> : <EyeOff />}
                  </button>
                </div>
              ))}
              {pageMedia.length === 0 ? (
                <div className={styles.pendingMedia}>
                  <span className={styles.mediaKindIcon}>+</span>
                  <span>
                    <b>Video &amp; 360° media</b>
                    <small>Pending delivery</small>
                  </span>
                </div>
              ) : null}
            </div>

            <div className={styles.listingActions}>
              <button type="submit" disabled={busy}>
                {busy ? <Loader2 className="animate-spin" /> : null}
                {mode === "create"
                  ? "Generate & Copy Link"
                  : "Update & Copy Link"}
              </button>
              <button
                type="button"
                disabled={!onPreview}
                onClick={() => onPreview?.(submitPayload())}
              >
                Preview Page
              </button>
              <button
                type="button"
                disabled={busy || !onSaveDraft}
                onClick={() => onSaveDraft?.(submitPayload())}
              >
                Save Draft
              </button>
            </div>
          </section>
        </div>
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
    const share = editing.share;
    setEditing(null);
    if (share) {
      try {
        await navigator.clipboard.writeText(share.publicUrl);
        toast.success("Share link updated and copied.");
      } catch {
        toast.success("Share link updated.");
      }
    } else {
      toast.success("Listing updated.");
    }
  };

  const saveDraft = async (property, payload, close) => {
    const result = await run(`draft:${property.id}`, async () => {
      const savedListing = await savePropertyShareListingAction(
        property.id,
        payload.listing,
      );
      if (!savedListing.success) return savedListing;
      if (payload.media.length > 0) {
        return savePropertyMediaPreferencesAction(
          property.id,
          payload.media.map(({ deliveryFileId, visible, isCover }) => ({
            deliveryFileId,
            visible,
            isCover,
          })),
        );
      }
      return savedListing;
    });
    if (!result) return;
    close();
    toast.success("Draft saved.");
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
                              setEditing({
                                property: eligible,
                                mode: "edit",
                                share,
                              });
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
          busy={
            loadingKey === `listing:${editing.property.id}` ||
            loadingKey === `draft:${editing.property.id}`
          }
          onClose={() => setEditing(null)}
          onSubmit={saveListing}
          onSaveDraft={(payload) =>
            saveDraft(editing.property, payload, () => setEditing(null))
          }
          onPreview={() => {
            setEditing(null);
            setPreviewShare(editing.share);
          }}
          onSaveContact={saveContact}
          onDeleteContact={deleteContact}
        />
      ) : null}
      {creating ? (
        <ListingForm
          property={creating}
          savedContacts={data.savedContacts || []}
          mode="create"
          busy={
            loadingKey === `create:${creating.id}` ||
            loadingKey === `draft:${creating.id}`
          }
          onClose={() => setCreating(null)}
          onSubmit={createShare}
          onSaveDraft={(payload) =>
            saveDraft(creating, payload, () => setCreating(null))
          }
          onPreview={() =>
            toast.info("Generate the share link to preview the public page.")
          }
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
