import { Op } from "sequelize";
import { sequelize } from "@/lib/db/db";
import Booking from "@/lib/db/models/booking";
import BookingDeliveryFile from "@/lib/db/models/bookingdeliveryfile";
import BookingDeliveryFileVersion from "@/lib/db/models/bookingdeliveryfileversion";
import BookingFileRevision from "@/lib/db/models/bookingfilerevision";
import {
  BOOKING_WORKFLOW_STATUS,
  DELIVERY_FILE_STATUS,
  getDubaiReviewDeadline,
  isDeliveryFileType,
  isNewDeliveryFileType,
  MAX_FILE_REVISION_NOTE_LENGTH,
  MAX_FILE_REVISIONS,
} from "@/lib/helpers/bookingWorkflow";

export const DELIVERY_FILE_INCLUDE = [
  {
    model: BookingDeliveryFileVersion,
    as: "currentVersion",
    required: false,
  },
  {
    model: BookingDeliveryFileVersion,
    as: "versions",
    separate: true,
    order: [["versionNumber", "DESC"]],
  },
  {
    model: BookingFileRevision,
    as: "fileRevisions",
    separate: true,
    order: [["requestedAt", "DESC"]],
  },
];

const serializeDate = (value) =>
  value instanceof Date ? value.toISOString() : value || null;

export const serializeDeliveryFile = (file) => {
  const value = typeof file?.toJSON === "function" ? file.toJSON() : file;
  if (!value) return null;
  return {
    ...value,
    reviewDeadlineAt: serializeDate(value.reviewDeadlineAt),
    acceptedAt: serializeDate(value.acceptedAt),
    deletedAt: serializeDate(value.deletedAt),
    revisionCount: Number(value.revisionCount || 0),
  };
};

const getFileNameFromUrl = (url) => {
  try {
    return decodeURIComponent(
      new URL(url).pathname.split("/").filter(Boolean).pop() || "",
    );
  } catch {
    return "deliverable";
  }
};

const DELIVERY_GROUP_UNAVAILABLE = "Delivery group unavailable";

const findLockedDeliveryGroup = ({ bookingId, type, transaction }) =>
  BookingDeliveryFile.findAll({
    where: { bookingId, type, deletedAt: null },
    include: [
      {
        model: BookingDeliveryFileVersion,
        as: "currentVersion",
        required: true,
      },
    ],
    transaction,
    lock: transaction.LOCK.UPDATE,
    order: [["id", "ASC"]],
  });

const groupRevisionCount = (files) =>
  Math.max(0, ...files.map((file) => Number(file.revisionCount || 0)));

const reopenDeliveryGroup = async ({ files, deadline, transaction }) => {
  const ids = files.map((file) => file.id);
  if (ids.length === 0) return;
  const revisionCount = groupRevisionCount(files);
  await BookingDeliveryFile.update(
    {
      status: DELIVERY_FILE_STATUS.UNDER_REVIEW,
      reviewDeadlineAt: deadline,
      acceptedAt: null,
      revisionCount,
    },
    { where: { id: { [Op.in]: ids } }, transaction },
  );
  for (const file of files) {
    Object.assign(file, {
      status: DELIVERY_FILE_STATUS.UNDER_REVIEW,
      reviewDeadlineAt: deadline,
      acceptedAt: null,
      revisionCount,
    });
  }
};

export const syncLegacyFilesPayload = async (bookingId, transaction) => {
  const booking = await Booking.findByPk(bookingId, { transaction });
  if (!booking) return null;

  const files = await BookingDeliveryFile.findAll({
    where: {
      bookingId,
      status: { [Op.ne]: DELIVERY_FILE_STATUS.PRIVATE },
    },
    include: [
      {
        model: BookingDeliveryFileVersion,
        as: "currentVersion",
        required: true,
      },
    ],
    transaction,
    order: [["id", "ASC"]],
  });

  const grouped = new Map();
  for (const file of files) {
    if (
      file.status === DELIVERY_FILE_STATUS.CHANGES_REQUESTED ||
      !file.currentVersion?.url
    ) {
      continue;
    }
    const key = `${file.type}:${file.deliveryMode}`;
    const existing = grouped.get(key) || {
      id: String(file.type || "files")
        .toLowerCase()
        .replace(/\s+/g, "-"),
      type: file.type,
      label: file.label,
      deliveryMode: file.deliveryMode,
      urls: [],
      uploadedAt: file.currentVersion.uploadedAt,
    };
    existing.urls.push(file.currentVersion.url);
    grouped.set(key, existing);
  }

  const deliverables = [...grouped.values()].map((item) => ({
    ...item,
    url: item.urls[0],
    count: item.urls.length,
  }));
  const payload = JSON.stringify({
    version: 3,
    deliverables,
    notifications: booking.deliveryNotificationMetadata || {},
    updatedAt: new Date().toISOString(),
  });
  await booking.update({ filesUrl: payload }, { transaction });
  return payload;
};

const assertUploadableBooking = (booking) => {
  if (!booking) throw new Error("Booking not found");
  if (booking.cancelledAt || booking.status === "CANCELLED") {
    throw new Error("Cancelled bookings cannot receive files");
  }
  if (booking.status !== "CONFIRMED") {
    throw new Error("Only confirmed bookings can receive files");
  }
  if (
    ![
      BOOKING_WORKFLOW_STATUS.EDITING,
      BOOKING_WORKFLOW_STATUS.FILES_UPLOADED,
    ].includes(booking.workflowStatus)
  ) {
    throw new Error("Deliverables can only be uploaded after editing starts");
  }
};

export const addUploadedDeliveryFiles = async ({
  bookingId,
  uploads,
  type,
  deliveryMode,
  replacementFileId = null,
  transaction: providedTransaction = null,
}) => {
  const validType = replacementFileId
    ? isDeliveryFileType(type)
    : isNewDeliveryFileType(type);
  if (!validType) {
    throw new Error("Invalid deliverableType");
  }

  const registerUploads = async (transaction) => {
    const booking = await Booking.findByPk(bookingId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    assertUploadableBooking(booking);

    const normalizedUploads = (Array.isArray(uploads) ? uploads : []).filter(
      (item) => item?.url,
    );
    if (normalizedUploads.length === 0) {
      throw new Error("At least one uploaded file is required");
    }

    const now = new Date();
    const deadline = getDubaiReviewDeadline(now);
    const createdFiles = [];

    if (replacementFileId) {
      if (normalizedUploads.length !== 1) {
        throw new Error("Upload exactly one replacement file");
      }
      const deliveryFile = await BookingDeliveryFile.findOne({
        where: { id: replacementFileId, bookingId: booking.id },
        include: [
          {
            model: BookingDeliveryFileVersion,
            as: "currentVersion",
            required: true,
          },
        ],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!deliveryFile) throw new Error("Delivery file not found");
      if (deliveryFile.status !== DELIVERY_FILE_STATUS.CHANGES_REQUESTED) {
        throw new Error("This file is not awaiting a replacement");
      }
      if (deliveryFile.type !== type) {
        throw new Error("deliverableType does not match replacement file");
      }

      const versionNumber = await BookingDeliveryFileVersion.count({
        where: { deliveryFileId: deliveryFile.id },
        transaction,
      });
      const upload = normalizedUploads[0];
      const replacement = await BookingDeliveryFileVersion.create(
        {
          deliveryFileId: deliveryFile.id,
          versionNumber: versionNumber + 1,
          url: upload.url,
          originalFilename:
            upload.originalFilename || getFileNameFromUrl(upload.url),
          mimeType: upload.mimeType || null,
          sizeBytes: upload.sizeBytes || null,
          uploadedAt: now,
        },
        { transaction },
      );
      await BookingDeliveryFileVersion.update(
        { supersededAt: now },
        {
          where: {
            deliveryFileId: deliveryFile.id,
            id: { [Op.ne]: replacement.id },
            supersededAt: null,
          },
          transaction,
        },
      );
      await BookingFileRevision.update(
        {
          resolvedAt: now,
          replacementVersionId: replacement.id,
        },
        {
          where: {
            deliveryFileId: deliveryFile.id,
            resolvedAt: null,
          },
          transaction,
        },
      );
      await deliveryFile.update(
        {
          currentVersionId: replacement.id,
          deliveryMode,
          acceptedAt: null,
        },
        { transaction },
      );
      deliveryFile.setDataValue("currentVersion", replacement);

      // A requested service remains unavailable until every requested member
      // has a replacement. The final replacement reopens every member together.
      const group = await findLockedDeliveryGroup({
        bookingId: booking.id,
        type: deliveryFile.type,
        transaction,
      });
      const unresolvedRevisions = await BookingFileRevision.count({
        where: {
          deliveryFileId: { [Op.in]: group.map((file) => file.id) },
          resolvedAt: null,
        },
        transaction,
      });
      if (Number(unresolvedRevisions || 0) === 0) {
        await reopenDeliveryGroup({ files: group, deadline, transaction });
      }
      createdFiles.push(deliveryFile);
    } else {
      const existingGroup = await findLockedDeliveryGroup({
        bookingId: booking.id,
        type,
        transaction,
      });
      if (
        existingGroup.some(
          (file) => file.status === DELIVERY_FILE_STATUS.CHANGES_REQUESTED,
        )
      ) {
        throw new Error(
          "Requested service files must be replaced before adding another file",
        );
      }
      const revisionCount = groupRevisionCount(existingGroup);
      for (const upload of normalizedUploads) {
        const deliveryFile = await BookingDeliveryFile.create(
          {
            bookingId: booking.id,
            type,
            label: type,
            deliveryMode,
            status: DELIVERY_FILE_STATUS.UNDER_REVIEW,
            reviewDeadlineAt: deadline,
            revisionCount,
          },
          { transaction },
        );
        const version = await BookingDeliveryFileVersion.create(
          {
            deliveryFileId: deliveryFile.id,
            versionNumber: 1,
            url: upload.url,
            originalFilename:
              upload.originalFilename || getFileNameFromUrl(upload.url),
            mimeType: upload.mimeType || null,
            sizeBytes: upload.sizeBytes || null,
            uploadedAt: now,
          },
          { transaction },
        );
        await deliveryFile.update(
          { currentVersionId: version.id },
          { transaction },
        );
        deliveryFile.setDataValue("currentVersion", version);
        createdFiles.push(deliveryFile);
      }

      // Adding a member changes the review decision. Existing accepted or
      // reviewable members are deliberately reopened under one deadline.
      await reopenDeliveryGroup({
        files: [...existingGroup, ...createdFiles],
        deadline,
        transaction,
      });
    }

    const bookingUpdates = {
      workflowStatus: BOOKING_WORKFLOW_STATUS.FILES_UPLOADED,
      filesUploadedAt: booking.filesUploadedAt || now,
      reviewDeadlineAt: null,
      revisionCount: 0,
    };
    if (!replacementFileId) {
      bookingUpdates.deliveryFinishedAt = null;
    }
    await booking.update(bookingUpdates, { transaction });
    const filesUrl = await syncLegacyFilesPayload(booking.id, transaction);

    return {
      booking: {
        id: booking.id,
        workflowStatus: booking.workflowStatus,
        filesUploadedAt: serializeDate(booking.filesUploadedAt),
        deliveryFinishedAt: serializeDate(booking.deliveryFinishedAt),
        filesUrl,
      },
      deliveryFiles: createdFiles.map(serializeDeliveryFile),
    };
  };

  return providedTransaction
    ? registerUploads(providedTransaction)
    : sequelize.transaction(registerUploads);
};

export const requestDeliveryServiceRevisionState = async (
  bookingId,
  type,
  userId,
  note,
) =>
  sequelize.transaction(async (transaction) => {
    if (!Number.isSafeInteger(Number(bookingId)) || Number(bookingId) <= 0) {
      throw new Error(DELIVERY_GROUP_UNAVAILABLE);
    }
    const booking = await Booking.findOne({
      where: { id: Number(bookingId), userId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!booking) throw new Error(DELIVERY_GROUP_UNAVAILABLE);
    if (booking.cancelledAt || booking.status === "CANCELLED") {
      throw new Error("Cancelled bookings cannot be revised");
    }

    const trimmedNote = String(note || "").trim();
    if (!trimmedNote || trimmedNote.length > MAX_FILE_REVISION_NOTE_LENGTH) {
      throw new Error("Revision details are invalid");
    }

    const normalizedType = String(type || "").trim();
    if (!normalizedType || normalizedType.length > 120) {
      throw new Error(DELIVERY_GROUP_UNAVAILABLE);
    }
    const files = await findLockedDeliveryGroup({
      bookingId: booking.id,
      type: normalizedType,
      transaction,
    });
    if (
      files.length === 0 ||
      files.some(
        (file) =>
          file.status !== DELIVERY_FILE_STATUS.UNDER_REVIEW ||
          !file.currentVersionId ||
          !file.reviewDeadlineAt ||
          new Date(file.reviewDeadlineAt).getTime() <= Date.now(),
      )
    ) {
      throw new Error(DELIVERY_GROUP_UNAVAILABLE);
    }

    const requestNumber = groupRevisionCount(files) + 1;
    if (requestNumber > MAX_FILE_REVISIONS) {
      throw new Error("Maximum revision requests reached for this service");
    }
    const now = new Date();
    for (const file of files) {
      await BookingFileRevision.create(
        {
          deliveryFileId: file.id,
          versionId: file.currentVersionId,
          requestNumber,
          note: trimmedNote,
          requestedAt: now,
        },
        { transaction },
      );
    }
    await BookingDeliveryFile.update(
      {
        status: DELIVERY_FILE_STATUS.CHANGES_REQUESTED,
        revisionCount: requestNumber,
        reviewDeadlineAt: null,
        acceptedAt: null,
      },
      { where: { id: { [Op.in]: files.map((file) => file.id) } }, transaction },
    );
    const filesUrl = await syncLegacyFilesPayload(booking.id, transaction);

    return {
      bookingId: booking.id,
      type: normalizedType,
      requestNumber,
      filesUrl,
    };
  });

export const finishBookingDeliveryState = async (bookingId) =>
  sequelize.transaction(async (transaction) => {
    const booking = await Booking.findByPk(bookingId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    assertUploadableBooking(booking);

    const files = await BookingDeliveryFile.findAll({
      where: { bookingId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (files.length === 0) {
      throw new Error("Upload at least one deliverable first");
    }
    if (
      files.some(
        (file) =>
          file.status === DELIVERY_FILE_STATUS.PRIVATE ||
          file.status === DELIVERY_FILE_STATUS.CHANGES_REQUESTED,
      )
    ) {
      throw new Error("Resolve all private or requested files first");
    }

    const now = new Date();
    await booking.update(
      {
        workflowStatus: BOOKING_WORKFLOW_STATUS.FILES_UPLOADED,
        deliveryFinishedAt: now,
      },
      { transaction },
    );
    return {
      id: booking.id,
      workflowStatus: booking.workflowStatus,
      deliveryFinishedAt: serializeDate(booking.deliveryFinishedAt),
    };
  });

export const publishPrivateDeliveryFilesState = async (bookingId) =>
  sequelize.transaction(async (transaction) => {
    const booking = await Booking.findByPk(bookingId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    assertUploadableBooking(booking);

    const privateFiles = await BookingDeliveryFile.findAll({
      where: {
        bookingId,
        status: DELIVERY_FILE_STATUS.PRIVATE,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (privateFiles.length === 0) {
      throw new Error("No staged files are available");
    }

    const now = new Date();
    await BookingDeliveryFile.update(
      {
        status: DELIVERY_FILE_STATUS.UNDER_REVIEW,
        reviewDeadlineAt: getDubaiReviewDeadline(now),
      },
      {
        where: {
          bookingId,
          status: DELIVERY_FILE_STATUS.PRIVATE,
        },
        transaction,
      },
    );
    await booking.update(
      {
        workflowStatus: BOOKING_WORKFLOW_STATUS.FILES_UPLOADED,
        filesUploadedAt: booking.filesUploadedAt || now,
        deliveryFinishedAt: null,
      },
      { transaction },
    );
    const filesUrl = await syncLegacyFilesPayload(booking.id, transaction);
    return {
      id: booking.id,
      workflowStatus: booking.workflowStatus,
      filesUploadedAt: serializeDate(booking.filesUploadedAt),
      deliveryFinishedAt: null,
      filesUrl,
      publishedFileIds: privateFiles.map((file) => file.id),
    };
  });

export const deleteDeliveryFileState = async (fileId, bookingId) =>
  sequelize.transaction(async (transaction) => {
    const booking = await Booking.findByPk(bookingId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    assertUploadableBooking(booking);

    const deliveryFile = await BookingDeliveryFile.findOne({
      where: { id: fileId, bookingId: booking.id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!deliveryFile) throw new Error("Delivery file not found");

    // PostgreSQL cannot lock the nullable side of an outer join. Lock the
    // booking and logical delivery row first, then read the version history
    // separately for post-transaction storage cleanup.
    const versions = await BookingDeliveryFileVersion.findAll({
      where: { deliveryFileId: deliveryFile.id },
      transaction,
    });
    const urls = [
      ...new Set(versions.map((version) => version.url).filter(Boolean)),
    ];
    await deliveryFile.destroy({ transaction });
    await booking.update({ deliveryFinishedAt: null }, { transaction });
    const filesUrl = await syncLegacyFilesPayload(booking.id, transaction);
    return { urls, filesUrl, bookingId: booking.id };
  });
