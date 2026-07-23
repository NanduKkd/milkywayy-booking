"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  createSinglePropertyShareAction,
  savePropertyShareListingAction,
} from "@/lib/actions/propertySharing";
import { ListingForm } from "./PropertySharingManager";

export default function CreatePropertyShareDialog({ property, onClose }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const saveListing = async (form) => {
    setBusy(true);
    try {
      const saved = await savePropertyShareListingAction(property.id, form);
      if (!saved.success) throw new Error(saved.message);

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

  return (
    <ListingForm
      property={property}
      mode="create"
      busy={busy}
      onClose={onClose}
      onSubmit={saveListing}
    />
  );
}
