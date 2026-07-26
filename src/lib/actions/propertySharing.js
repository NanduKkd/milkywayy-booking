"use server";

import { actionWrapper } from "@/lib/actions/utils";
import { USER_ROLES } from "@/lib/config/app.config";
import { auth } from "@/lib/helpers/auth";
import {
  createMasterPropertyShare,
  createSinglePropertyShare,
  deletePropertyContact,
  getPropertySharingDashboard,
  savePropertyContact,
  savePropertyMediaPreferences,
  savePropertyShareListing,
  setPropertyShareEnabled,
  updateMasterPropertyShare,
} from "@/lib/services/propertySharing";

async function withOwner(operation) {
  const session = await auth();
  if (!session?.id || session.role !== USER_ROLES.CUSTOMER) {
    throw new Error("Unauthorized");
  }
  return operation(Number(session.id));
}

export const getPropertySharingDashboardAction = actionWrapper(() =>
  withOwner((ownerUserId) => getPropertySharingDashboard(ownerUserId)),
);

export const savePropertyShareListingAction = actionWrapper(
  (bookingId, listing) =>
    withOwner((ownerUserId) =>
      savePropertyShareListing(ownerUserId, bookingId, listing),
    ),
);

export const createSinglePropertyShareAction = actionWrapper((bookingId) =>
  withOwner((ownerUserId) => createSinglePropertyShare(ownerUserId, bookingId)),
);

export const createMasterPropertyShareAction = actionWrapper((bookingIds) =>
  withOwner((ownerUserId) =>
    createMasterPropertyShare(ownerUserId, bookingIds),
  ),
);

export const updateMasterPropertyShareAction = actionWrapper(
  (shareId, bookingIds) =>
    withOwner((ownerUserId) =>
      updateMasterPropertyShare(ownerUserId, shareId, bookingIds),
    ),
);

export const setPropertyShareEnabledAction = actionWrapper((shareId, enabled) =>
  withOwner((ownerUserId) =>
    setPropertyShareEnabled(ownerUserId, shareId, enabled),
  ),
);

export const savePropertyMediaPreferencesAction = actionWrapper(
  (bookingId, preferences) =>
    withOwner((ownerUserId) =>
      savePropertyMediaPreferences(ownerUserId, bookingId, preferences),
    ),
);

export const savePropertyContactAction = actionWrapper((contact, contactId) =>
  withOwner((ownerUserId) =>
    savePropertyContact(ownerUserId, contact, contactId),
  ),
);

export const deletePropertyContactAction = actionWrapper((contactId) =>
  withOwner((ownerUserId) => deletePropertyContact(ownerUserId, contactId)),
);
