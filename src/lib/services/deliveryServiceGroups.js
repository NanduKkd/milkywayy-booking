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

const findRequestedNote = (members) =>
  members
    .flatMap((file) => file.fileRevisions || [])
    .filter((revision) => !revision?.resolvedAt)
    .sort((left, right) => {
      const requestedAtComparison = String(
        right.requestedAt || "",
      ).localeCompare(String(left.requestedAt || ""));
      return (
        requestedAtComparison || Number(right.id || 0) - Number(left.id || 0)
      );
    })[0]?.note || null;

const projectGroup = (type, members, files, includeRequestedNote) => {
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
    status: groupStatus(members),
    reviewDeadlineAt: deadline,
    revisionCount: Math.max(
      0,
      ...members.map((file) => Number(file.revisionCount || 0)),
    ),
    pendingReplacementCount: members.filter(
      (file) => file.status === DELIVERY_FILE_STATUS.CHANGES_REQUESTED,
    ).length,
    memberCount: members.length,
    ...(includeRequestedNote
      ? { requestedNote: findRequestedNote(members) }
      : {}),
    files,
  };
};

const projectGroups = (
  files,
  { includePrivate, includeRequestedNote, projectFiles },
) => {
  const buckets = new Map();

  for (const file of activeFiles(files)) {
    const type = String(file.type || "").trim();
    if (
      !type ||
      (!includePrivate && file.status === DELIVERY_FILE_STATUS.PRIVATE)
    ) {
      continue;
    }
    const bucket = buckets.get(type) || [];
    bucket.push(file);
    buckets.set(type, bucket);
  }

  return [...buckets.entries()]
    .map(([type, members]) =>
      projectGroup(type, members, projectFiles(members), includeRequestedNote),
    )
    .sort((left, right) => left.type.localeCompare(right.type));
};

// This is deliberately derived from persisted file rows. A service group has no
// client-issued identity beyond its booking and exact persisted delivery type.
export const projectDeliveryServiceGroups = (files) => {
  return projectGroups(files, {
    includePrivate: false,
    includeRequestedNote: false,
    projectFiles: (members) => members.filter(isCustomerDeliveryFileVisible),
  });
};

// The admin projection deliberately includes every active member, including
// private and replacement-pending files. It shares exact-type grouping and
// group state calculations with the customer projection without changing what
// customers can see.
export const projectAdminDeliveryServiceGroups = (files) =>
  projectGroups(files, {
    includePrivate: true,
    includeRequestedNote: true,
    projectFiles: (members) => members,
  });

export const hasUnresolvedDeliveryGroups = (files) =>
  projectDeliveryServiceGroups(files).some(
    (group) =>
      ![
        DELIVERY_FILE_STATUS.UNDER_REVIEW,
        DELIVERY_FILE_STATUS.ACCEPTED,
      ].includes(group.status),
  );
