"use client";

import {
  Check,
  Copy,
  Eye,
  Link2,
  Loader2,
  Pencil,
  Phone,
  RefreshCcw,
  RotateCw,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  createMasterPropertyShareAction,
  createSinglePropertyShareAction,
  getPropertySharingDashboardAction,
  refreshPropertyShareSnapshotAction,
  revokePropertyShareAction,
  rotatePropertyShareTokenAction,
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

function formatDateTime(value) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return new Intl.DateTimeFormat("en-AE", {
    timeZone: "Asia/Dubai",
    dateStyle: "medium",
    timeStyle: "short",
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
  const master = data.shares.find(
    (share) => share.kind === "MASTER" && share.status !== "REVOKED",
  );
  return master ? master.properties.map((property) => property.bookingId) : [];
}

function ViewSeries({ series }) {
  const max = Math.max(1, ...(series || []).map((day) => day.requestViews));
  return (
    <div className={styles.viewSeries}>
      <span>30 Dubai days</span>
      <div role="img" aria-label="Trailing 30-day request views">
        {(series || []).map((day) => (
          <i
            key={day.date}
            title={`${day.date}: ${day.requestViews} request views`}
            style={{
              height: `${Math.max(3, (day.requestViews / max) * 100)}%`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ListingPreview({ property, onClose }) {
  const listing = property.listing;
  return (
    <div className={`overlay ${styles.overlay}`} role="presentation">
      <div
        className={`pv-wrap ${styles.preview}`}
        role="dialog"
        aria-modal="true"
        aria-label="Listing preview"
      >
        <div className={styles.previewBar}>
          <span>Buyer showcase preview</span>
          <button type="button" onClick={onClose} aria-label="Close preview">
            <X /> Close
          </button>
        </div>
        <div className={styles.previewGrid}>
          <div className={`sp-hero ${styles.previewHero}`}>
            <span>{property.mediaCount} accepted media</span>
          </div>
          <div className={styles.previewBody}>
            <strong>{formatPrice(listing)}</strong>
            <h3>{listing.listingTitle}</h3>
            <p>{property.location}</p>
            <div className={styles.previewChips}>
              <span>{listing.listingTypeLabel}</span>
              {property.bedrooms !== null ? (
                <span>{property.bedrooms} Bed</span>
              ) : null}
              {listing.bathrooms !== null ? (
                <span>{listing.bathrooms} Bath</span>
              ) : null}
              {listing.sizeSqft ? <span>{listing.sizeSqft} sqft</span> : null}
              <span>{listing.furnishingLabel}</span>
            </div>
            <p className={styles.previewDescription}>{listing.description}</p>
            <ul>
              {listing.highlights.map((highlight) => (
                <li key={highlight}>✓ {highlight}</li>
              ))}
            </ul>
            <div className={styles.previewContact}>
              <Phone />
              <span>
                <b>{listing.contactName}</b>
                {listing.contactPhone}
              </span>
              <em>WhatsApp</em>
            </div>
          </div>
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
          {property.bookingTitle} · Complete the public listing details once.
        </p>

        <p className={styles.formSection}>FROM YOUR BOOKING</p>
        <div className={styles.knownRow}>
          <span className={styles.introCopy}>
            <b>Location</b> {property.location}
          </span>
          {property.bedrooms !== null ? (
            <span>
              <b>Bedrooms</b> {property.bedrooms}
            </span>
          ) : null}
          <span>
            <b>Media</b> {property.mediaCount}
          </span>
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
            <input
              inputMode="numeric"
              value={form.bathrooms}
              onChange={(event) => update("bathrooms", event.target.value)}
            />
          </label>
          <label>
            <span>SIZE (SQFT)</span>
            <input
              inputMode="numeric"
              value={form.sizeSqft}
              onChange={(event) => update("sizeSqft", event.target.value)}
            />
          </label>
          <label className={styles.fullField}>
            <span>FURNISHING *</span>
            <select
              value={form.furnishing}
              onChange={(event) => update("furnishing", event.target.value)}
            >
              <option value="FURNISHED">Furnished</option>
              <option value="UNFURNISHED">Unfurnished</option>
            </select>
          </label>
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
                placeholder="e.g. Private balcony"
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

        <Button type="submit" className={styles.submitButton} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : null}
          {mode === "create" ? "Save & create share link" : "Save listing"}
        </Button>
        <p className={styles.formNote}>
          Contact details are public listing configuration. No buyer form or
          contact record is created.
        </p>
      </form>
    </div>
  );
}

function ShareControls({ share, busy, onAction }) {
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  return (
    <div className={styles.secondaryControls}>
      <button
        type="button"
        disabled={busy}
        onClick={() => onAction("refresh", share)}
      >
        <RefreshCcw /> <span>Refresh media</span>
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => onAction("rotate", share)}
      >
        <RotateCw /> <span>Rotate &amp; copy</span>
      </button>
      {confirmRevoke ? (
        <button
          type="button"
          className={styles.danger}
          disabled={busy}
          onClick={() => onAction("revoke", share)}
        >
          Confirm revoke
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => setConfirmRevoke(true)}
        >
          Revoke
        </button>
      )}
    </div>
  );
}

export default function PropertySharingManager({ initialData }) {
  const [data, setData] = useState(initialData);
  const [loadingKey, setLoadingKey] = useState("");
  const [issuedUrl, setIssuedUrl] = useState(null);
  const [editing, setEditing] = useState(null);
  const [previewProperty, setPreviewProperty] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [showMasterLinks, setShowMasterLinks] = useState(false);
  const [masterSelection, setMasterSelection] = useState(() =>
    initialMasterSelection(initialData),
  );

  const activeSingleShares = useMemo(
    () =>
      data.shares.filter(
        (share) =>
          share.kind === "SINGLE_PROPERTY" && share.status !== "REVOKED",
      ),
    [data.shares],
  );
  const activeSingleBookingIds = useMemo(
    () =>
      new Set(
        activeSingleShares.flatMap((share) =>
          share.properties.map((property) => property.bookingId),
        ),
      ),
    [activeSingleShares],
  );
  const readyProperties = data.eligibleProperties.filter(
    (property) => !activeSingleBookingIds.has(property.id),
  );
  const masterShare = data.shares.find(
    (share) => share.kind === "MASTER" && share.status !== "REVOKED",
  );

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
      if (result.data?.publicUrl) {
        setIssuedUrl({
          shareId: result.data.shareId,
          publicUrl: result.data.publicUrl,
        });
      }
      await reload();
      toast.success("Property sharing updated.");
      return result.data;
    } catch (error) {
      toast.error(error.message || "Unable to update property sharing");
      return null;
    } finally {
      setLoadingKey("");
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
    if (result) setEditing(null);
  };

  const shareAction = async (action, share) => {
    const operations = {
      refresh: () => refreshPropertyShareSnapshotAction(share.id),
      toggle: () => setPropertyShareEnabledAction(share.id, !share.enabled),
      rotate: () => rotatePropertyShareTokenAction(share.id),
      revoke: () => revokePropertyShareAction(share.id),
    };
    await run(`${share.id}:${action}`, operations[action]);
  };

  const copyIssuedUrl = async () => {
    if (!issuedUrl) return;
    try {
      await navigator.clipboard.writeText(issuedUrl.publicUrl);
      setIssuedUrl(null);
      toast.success("Secure link copied.");
    } catch {
      toast.error("Unable to copy the secure link");
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
    if (result) {
      setSelectionMode(false);
      setShowMasterLinks(true);
    }
  };

  return (
    <section
      className={styles.manager}
      aria-labelledby="property-sharing-title"
    >
      <div className={styles.intro}>
        <div>
          <p>PROPERTY SHOWCASES</p>
          <h2 id="property-sharing-title">Share completed properties</h2>
          <span>
            Configure polished buyer listings and curate master collections.
            Delivered files and authenticated downloads stay private below.
          </span>
        </div>
        <div className={styles.aggregateNote}>
          <Eye /> Metrics are request views, never unique visitors.
        </div>
      </div>

      {issuedUrl ? (
        <div className={styles.issuedUrl}>
          <div>
            <b>
              <Link2 /> New secure URL is ready
            </b>
            <span className={styles.issuedHelp}>
              Copy it now. Plaintext is shown only after create or rotation.
            </span>
          </div>
          <Button type="button" size="sm" onClick={copyIssuedUrl}>
            <Copy /> Copy secure URL
          </Button>
        </div>
      ) : null}

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
                  <Link2 />
                  <span>
                    {property.listing ? "Review & share" : "Create share link"}
                  </span>
                </button>
                <a href="#delivered-files">View delivered files</a>
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
            onClick={() => {
              setShowMasterLinks((current) => !current);
              setSelectionMode(false);
            }}
          >
            {showMasterLinks
              ? "← Back to Properties"
              : `Master Links (${masterShare ? 1 : 0})`}
          </button>
          {!showMasterLinks && activeSingleShares.length > 0 ? (
            <button
              type="button"
              onClick={() => setSelectionMode((current) => !current)}
            >
              {selectionMode ? "✕ Cancel Selection" : "☑ Select Multiple"}
            </button>
          ) : null}
        </div>
      </div>

      {showMasterLinks ? (
        masterShare ? (
          <article className={`mcard ${styles.masterCard}`}>
            <div className={styles.masterTop}>
              <div>
                <h3>Collection — {masterShare.properties.length} properties</h3>
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
            <div className={styles.masterThumbs}>
              {masterShare.properties.map((property, index) => (
                <i key={property.id} data-tone={index % 3} />
              ))}
            </div>
            <div className={styles.masterMetrics}>
              <span>
                <Eye /> {masterShare.analytics.totalRequestViews} request views
              </span>
              <span>
                Last viewed {formatDateTime(masterShare.analytics.lastViewedAt)}
              </span>
            </div>
            <div className={styles.masterActions}>
              <button
                type="button"
                onClick={() => {
                  setShowMasterLinks(false);
                  setSelectionMode(true);
                }}
              >
                Edit selection
              </button>
              <button
                type="button"
                onClick={() => shareAction("toggle", masterShare)}
              >
                {masterShare.enabled ? "Disable" : "Enable"}
              </button>
              <button
                type="button"
                onClick={() => shareAction("rotate", masterShare)}
              >
                Rotate &amp; copy
              </button>
              <button
                type="button"
                onClick={() => shareAction("refresh", masterShare)}
              >
                Refresh media
              </button>
            </div>
            <ViewSeries series={masterShare.analytics.trailing30Days} />
          </article>
        ) : (
          <p className={styles.emptyState}>
            No master link yet. Return to Shared Properties, select two or more,
            and create a curated collection.
          </p>
        )
      ) : (
        <div className={`grid2 ${styles.gridTwo}`}>
          {activeSingleShares.map((share, index) => {
            const property = share.properties[0];
            const selected = masterSelection.includes(property.bookingId);
            const busy = loadingKey.startsWith(`${share.id}:`);
            return (
              <article
                className={`pshared ${styles.sharedCard} ${selectionMode ? styles.selectable : ""} ${selected && selectionMode ? styles.selected : ""}`}
                key={share.id}
              >
                <div className={styles.sharedHero} data-tone={index % 3}>
                  {selectionMode ? (
                    <button
                      type="button"
                      className={styles.selectionButton}
                      aria-label={`${selected ? "Remove" : "Add"} ${property.listing?.listingTitle} ${selected ? "from" : "to"} master collection`}
                      aria-pressed={selected}
                      onClick={() => toggleSelected(property.bookingId)}
                    >
                      <span className={styles.selectCheck}>
                        {selected ? <Check /> : null}
                      </span>
                    </button>
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
                  <p>{property.location}</p>
                  <div className={styles.cardMetrics}>
                    <span>
                      <Eye /> <b>{share.analytics.totalRequestViews}</b> request
                      views
                    </span>
                    <span>{formatDateTime(share.analytics.lastViewedAt)}</span>
                  </div>
                  {!selectionMode ? (
                    <>
                      <div className={styles.cardActions}>
                        <button
                          type="button"
                          className={styles.primaryButton}
                          onClick={(event) => {
                            event.stopPropagation();
                            shareAction("rotate", share);
                          }}
                        >
                          <Copy /> <span>Rotate &amp; copy</span>
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            shareAction("toggle", share);
                          }}
                        >
                          {share.enabled ? "Disable" : "Enable"}
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            const eligible = data.eligibleProperties.find(
                              (item) => item.id === property.bookingId,
                            );
                            if (eligible)
                              setEditing({ property: eligible, mode: "edit" });
                          }}
                        >
                          <Pencil /> <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setPreviewProperty(property);
                          }}
                        >
                          <Eye /> <span>Preview</span>
                        </button>
                      </div>
                      <ShareControls
                        share={share}
                        busy={busy}
                        onAction={shareAction}
                      />
                      <ViewSeries series={share.analytics.trailing30Days} />
                    </>
                  ) : null}
                </div>
              </article>
            );
          })}
          {activeSingleShares.length === 0 ? (
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
      {previewProperty ? (
        <ListingPreview
          property={previewProperty}
          onClose={() => setPreviewProperty(null)}
        />
      ) : null}
    </section>
  );
}
