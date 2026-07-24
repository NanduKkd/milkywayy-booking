import {
  DELIVERY_FILE_STATUS,
  isCustomerDeliveryFileVisible,
} from "@/lib/helpers/bookingWorkflow";

const activeFiles = (files) => (files || []).filter((file) => !file?.deletedAt);

const groupStatus = (files) => {
  if (
    files.some((file) => file.status === DELIVERY_FILE_STATUS.CHANGES_REQUESTED)
  ) {
    return DELIVERY_FILE_STATUS.CHANGES_REQUESTED;
  }
  if (files.some((file) => file.status === DELIVERY_FILE_STATUS.UNDER_REVIEW)) {
    return DELIVERY_FILE_STATUS.UNDER_REVIEW;
  }
  if (files.every((file) => file.status === DELIVERY_FILE_STATUS.ACCEPTED)) {
    return DELIVERY_FILE_STATUS.ACCEPTED;
  }
  return DELIVERY_FILE_STATUS.PRIVATE;
};

// This is deliberately derived from persisted file rows. A service group has no
// client-issued identity beyond its booking and exact persisted delivery type.
export const projectDeliveryServiceGroups = (files) => {
  const buckets = new Map();

  for (const file of activeFiles(files)) {
    const type = String(file.type || "").trim();
    if (!type || file.status === DELIVERY_FILE_STATUS.PRIVATE) continue;
    const bucket = buckets.get(type) || [];
    bucket.push(file);
    buckets.set(type, bucket);
  }

  return [...buckets.entries()]
    .map(([type, members]) => {
      const status = groupStatus(members);
      const visibleFiles = members.filter(isCustomerDeliveryFileVisible);
      const reviewFiles = members.filter(
        (file) => file.status === DELIVERY_FILE_STATUS.UNDER_REVIEW,
      );
      const deadline =
        reviewFiles
          .map((file) => file.reviewDeadlineAt)
          .filter(Boolean)
          .sort()[0] || null;

      return {
        type,
        label: members[0]?.label || type,
        status,
        reviewDeadlineAt: deadline,
        revisionCount: Math.max(
          0,
          ...members.map((file) => Number(file.revisionCount || 0)),
        ),
        pendingReplacementCount: members.filter(
          (file) => file.status === DELIVERY_FILE_STATUS.CHANGES_REQUESTED,
        ).length,
        memberCount: members.length,
        files: visibleFiles,
      };
    })
    .sort((left, right) => left.type.localeCompare(right.type));
};

export const hasUnresolvedDeliveryGroups = (files) =>
  projectDeliveryServiceGroups(files).some(
    (group) =>
      ![
        DELIVERY_FILE_STATUS.UNDER_REVIEW,
        DELIVERY_FILE_STATUS.ACCEPTED,
      ].includes(group.status),
  );
