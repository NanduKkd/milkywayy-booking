"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  createSinglePropertyShareAction,
  savePropertyContactAction,
  savePropertyMediaPreferencesAction,
  savePropertyShareListingAction,
} from "@/lib/actions/propertySharing";
import { ListingForm } from "./PropertySharingManager";

export default function CreatePropertyShareDialog({
  property,
  savedContacts = [],
  onClose,
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const saveListing = async ({ listing, media }) => {
    setBusy(true);
    try {
      const saved = await savePropertyShareListingAction(property.id, listing);
      if (!saved.success) throw new Error(saved.message);
      if (media.length > 0) {
        const savedMedia = await savePropertyMediaPreferencesAction(
          property.id,
          media.map(({ deliveryFileId, visible, isCover }) => ({
            deliveryFileId,
            visible,
            isCover,
          })),
        );
        if (!savedMedia.success) throw new Error(savedMedia.message);
      }

      const created = await createSinglePropertyShareAction(property.id);
      if (!created.success) throw new Error(created.message);

      try {
        await navigator.clipboard.writeText(created.data.publicUrl);
        toast.success("Share link created and copied.");
      } catch {
        toast.success("Share link created.");
      }

      onClose();
      router.refresh();
    } catch (error) {
      toast.error(error.message || "Unable to create the property share link");
    } finally {
      setBusy(false);
    }
  };

  const saveDraft = async ({ listing, media }) => {
    setBusy(true);
    try {
      const saved = await savePropertyShareListingAction(property.id, listing);
      if (!saved.success) throw new Error(saved.message);
      if (media.length > 0) {
        const savedMedia = await savePropertyMediaPreferencesAction(
          property.id,
          media.map(({ deliveryFileId, visible, isCover }) => ({
            deliveryFileId,
            visible,
            isCover,
          })),
        );
        if (!savedMedia.success) throw new Error(savedMedia.message);
      }
      toast.success("Draft saved.");
      onClose();
      router.refresh();
    } catch (error) {
      toast.error(error.message || "Unable to save the property draft");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ListingForm
      property={property}
      savedContacts={savedContacts}
      mode="create"
      busy={busy}
      onClose={onClose}
      onSubmit={saveListing}
      onSaveDraft={saveDraft}
      onPreview={() =>
        toast.info("Generate the share link to preview the public page.")
      }
      onSaveContact={async (contact) => {
        const result = await savePropertyContactAction(contact);
        if (result.success) toast.success("Contact saved for reuse.");
        else toast.error(result.message);
      }}
    />
  );
}
