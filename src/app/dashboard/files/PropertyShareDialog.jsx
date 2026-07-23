"use client";

import { Copy, Eye, Loader2, Power, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  createSinglePropertyShareAction,
  getPropertySharingDashboardAction,
  savePropertyShareListingAction,
  setPropertyShareEnabledAction,
} from "@/lib/actions/propertySharing";
import { BuyerPreview, ListingForm } from "./PropertySharingManager";
import styles from "./PropertySharingManager.module.css";

function findSingleShare(data, bookingId) {
  return data.shares.find(
    (share) =>
      share.kind === "SINGLE_PROPERTY" &&
      share.properties.some((property) => property.bookingId === bookingId),
  );
}

export default function PropertyShareDialog({
  initialData,
  bookingId,
  onClose,
}) {
  const router = useRouter();
  const initialShare = findSingleShare(initialData, bookingId);
  const [data, setData] = useState(initialData);
  const [view, setView] = useState(initialShare ? "manage" : "listing");
  const [busy, setBusy] = useState(false);

  const property = data.eligibleProperties.find(
    (item) => item.id === bookingId,
  );
  const share = findSingleShare(data, bookingId);

  if (!property) return null;

  const reload = async () => {
    const result = await getPropertySharingDashboardAction();
    if (!result.success) throw new Error(result.message);
    setData(result.data);
    return result.data;
  };

  const copyShare = async (currentShare) => {
    try {
      await navigator.clipboard.writeText(currentShare.publicUrl);
      toast.success("Link copied to clipboard.");
    } catch {
      toast.error("Unable to copy the link");
    }
  };

  const saveListing = async (form) => {
    setBusy(true);
    try {
      const saved = await savePropertyShareListingAction(property.id, form);
      if (!saved.success) throw new Error(saved.message);

      let createdShare = null;
      if (!share) {
        const created = await createSinglePropertyShareAction(property.id);
        if (!created.success) throw new Error(created.message);
        createdShare = created.data;
      }

      const refreshed = await reload();
      const refreshedShare = findSingleShare(refreshed, property.id);
      if (createdShare?.publicUrl) {
        await copyShare({
          ...refreshedShare,
          publicUrl: createdShare.publicUrl,
        });
        toast.success("Share link created.");
      } else {
        toast.success("Listing updated.");
      }
      setView("manage");
      router.refresh();
    } catch (error) {
      toast.error(error.message || "Unable to save the property listing");
    } finally {
      setBusy(false);
    }
  };

  const toggleShare = async () => {
    if (!share) return;
    setBusy(true);
    try {
      const result = await setPropertyShareEnabledAction(
        share.id,
        !share.enabled,
      );
      if (!result.success) throw new Error(result.message);
      await reload();
      toast.success(share.enabled ? "Link disabled." : "Link enabled.");
      router.refresh();
    } catch (error) {
      toast.error(error.message || "Unable to update the share link");
    } finally {
      setBusy(false);
    }
  };

  if (view === "listing") {
    return (
      <ListingForm
        property={property}
        mode={share ? "edit" : "create"}
        busy={busy}
        onClose={() => (share ? setView("manage") : onClose())}
        onSubmit={saveListing}
      />
    );
  }

  if (view === "preview" && share) {
    return <BuyerPreview share={share} onClose={() => setView("manage")} />;
  }

  if (!share) {
    return null;
  }

  return (
    <div className={`overlay ${styles.overlay}`} role="presentation">
      <div
        className={`modal ${styles.listingModal}`}
        role="dialog"
        aria-modal="true"
        aria-label="Manage property share link"
      >
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close share link manager"
        >
          <X />
        </button>
        <h3>Share Link</h3>
        <p className={styles.modalSubtitle}>
          {property.bookingTitle}
          <br />
          Copy, preview, edit or disable this public property page.
        </p>

        <div className={styles.linkRow}>
          <span>{share.publicUrl}</span>
          <b>{share.linkViews} views</b>
        </div>

        <div className={styles.masterActions}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => copyShare(share)}
          >
            <Copy /> Copy Link
          </button>
          <button type="button" onClick={() => setView("preview")}>
            <Eye /> Preview
          </button>
          <button type="button" onClick={() => setView("listing")}>
            Edit
          </button>
          <button type="button" disabled={busy} onClick={toggleShare}>
            {busy ? <Loader2 className="animate-spin" /> : <Power />}
            {share.enabled ? "Disable" : "Enable"}
          </button>
        </div>
      </div>
    </div>
  );
}
