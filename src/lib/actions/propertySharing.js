"use server";

import { actionWrapper } from "@/lib/actions/utils";
import { USER_ROLES } from "@/lib/config/app.config";
import { auth } from "@/lib/helpers/auth";
import {
  createMasterPropertyShare,
  createSinglePropertyShare,
  getPropertySharingDashboard,
  refreshPropertyShareSnapshot,
  revokePropertyShare,
  rotatePropertyShareToken,
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

export const refreshPropertyShareSnapshotAction = actionWrapper((shareId) =>
  withOwner((ownerUserId) =>
    refreshPropertyShareSnapshot(ownerUserId, shareId),
  ),
);

export const setPropertyShareEnabledAction = actionWrapper((shareId, enabled) =>
  withOwner((ownerUserId) =>
    setPropertyShareEnabled(ownerUserId, shareId, enabled),
  ),
);

export const rotatePropertyShareTokenAction = actionWrapper((shareId) =>
  withOwner((ownerUserId) => rotatePropertyShareToken(ownerUserId, shareId)),
);

export const revokePropertyShareAction = actionWrapper((shareId) =>
  withOwner((ownerUserId) => revokePropertyShare(ownerUserId, shareId)),
);
