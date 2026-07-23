"use client";

import { Check, Copy, Link2, Loader2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  createMasterPropertyShareAction,
  createSinglePropertyShareAction,
  getPropertySharingDashboardAction,
  savePropertyShareListingAction,
  setPropertyShareEnabledAction,
  updateMasterPropertyShareAction,
} from "@/lib/actions/propertySharing";
import styles from "./PropertySharingManager.module.css";

function formatDate(value) {
  if (!value) return "Delivered";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Delivered";
  return new Intl.DateTimeFormat("en-AE", {
    timeZone: "Asia/Dubai",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

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

function BuyerPreview({ share, onClose }) {
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

function ListingForm({ property, mode, busy, onClose, onSubmit }) {
  const existing = property.listing;
  const [form, setForm] = useState({
    listingTitle: existing?.listingTitle || property.bookingTitle || "",
    priceAed: existing?.priceAed || "",
    listingType: existing?.listingType || "FOR_SALE",
    bathrooms: existing?.bathrooms ?? "",
    sizeSqft: existing?.sizeSqft ?? "",
    furnishing: existing?.furnishing || "FURNISHED",
    description: existing?.description || "",
    highlights: existing?.highlights || [],
    contactName: existing?.contactName || "",
    contactPhone: existing?.contactPhone || "",
  });
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
          onSubmit(form);
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
              onChange={(event) => update("bathrooms", event.target.value)}
            >
              <option value="">Select</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5+</option>
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

export default function PropertySharingManager({ initialData }) {
  const [data, setData] = useState(initialData);
  const [loadingKey, setLoadingKey] = useState("");
  const [editing, setEditing] = useState(null);
  const [previewShare, setPreviewShare] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [showMasterLinks, setShowMasterLinks] = useState(false);
  const [masterSelection, setMasterSelection] = useState(() =>
    initialMasterSelection(initialData),
  );

  const singleShares = useMemo(
    () => data.shares.filter((share) => share.kind === "SINGLE_PROPERTY"),
    [data.shares],
  );
  const sharedBookingIds = useMemo(
    () =>
      new Set(
        singleShares.flatMap((share) =>
          share.properties.map((property) => property.bookingId),
        ),
      ),
    [singleShares],
  );
  const readyProperties = data.eligibleProperties.filter(
    (property) => !sharedBookingIds.has(property.id),
  );
  const masterShare = data.shares.find((share) => share.kind === "MASTER");

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

  const saveListing = async (form) => {
    const property = editing.property;
    const shouldCreate = editing.mode === "create";
    const result = await run(`listing:${property.id}`, async () => {
      const saved = await savePropertyShareListingAction(property.id, form);
      if (!saved.success || !shouldCreate) return saved;
      return createSinglePropertyShareAction(property.id);
    });
    if (!result) return;
    setEditing(null);
    if (shouldCreate && result.publicUrl) {
      try {
        await navigator.clipboard.writeText(result.publicUrl);
        toast.success("Share link created and copied.");
      } catch {
        toast.success("Share link created.");
      }
    } else {
      toast.success("Listing updated.");
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
        Delivered shoots become shareable property pages — click a card to see
        exactly what viewers see.
      </p>

      <div className={`sec-row ${styles.sectionRow}`}>
        <div className={`sec-label ${styles.sectionLabel}`}>READY TO SHARE</div>
      </div>
      {readyProperties.length > 0 ? (
        <div className={`grid2 ${styles.gridTwo}`}>
          {readyProperties.map((property) => (
            <article className={`rcard ${styles.readyCard}`} key={property.id}>
              <div className={styles.readyTop}>
                <div>
                  <h3>{property.bookingTitle}</h3>
                  <p>
                    {property.location}
                    {property.bedrooms !== null
                      ? ` · ${property.bedrooms} Bed`
                      : ""}{" "}
                    · {property.mediaCount} media
                  </p>
                </div>
                <div>
                  <b>Delivered</b>
                  <span>{formatDate(property.completedAt)}</span>
                </div>
              </div>
              <div className={styles.readyActions}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => setEditing({ property, mode: "create" })}
                >
                  <Link2 /> Create Share Link
                </button>
                <a href="#delivered-files">↓ Download Files</a>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className={styles.emptyState}>
          No additional completed properties are ready to share.
        </p>
      )}

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
                  aria-label={`${selectionMode ? (selected ? "Remove" : "Add") : "Preview"} ${property.listing?.listingTitle || property.bookingTitle}${selectionMode ? " from master collection" : ""}`}
                  onClick={openOrSelect}
                />
                <div className={styles.sharedHero} data-tone={index % 3}>
                  {selectionMode ? (
                    <span className={styles.selectCheck}>
                      {selected ? <Check /> : null}
                    </span>
                  ) : null}
                  <span
                    className={share.enabled ? styles.liveTag : styles.offTag}
                  >
                    ● {share.enabled ? "LIVE" : "DISABLED"}
                  </span>
                  <span className={styles.mediaCount}>
                    {property.mediaCount} media
                  </span>
                </div>
                <div className={styles.sharedBody}>
                  <div className={styles.priceRow}>
                    <b>{formatPrice(property.listing)}</b>
                    <span>{property.listing?.listingTypeLabel}</span>
                  </div>
                  <h3>{property.listing?.listingTitle}</h3>
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
                            toggleShare(share);
                          }}
                        >
                          {share.enabled ? "Disable" : "Enable"}
                        </button>
                        <button
                          type="button"
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
                          Edit
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
          mode={editing.mode}
          busy={loadingKey === `listing:${editing.property.id}`}
          onClose={() => setEditing(null)}
          onSubmit={saveListing}
        />
      ) : null}
      {previewShare ? (
        <BuyerPreview
          share={previewShare}
          onClose={() => setPreviewShare(null)}
        />
      ) : null}
    </section>
  );
}
