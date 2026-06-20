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
  label,
  deliveryMode,
  replacementFileId = null,
  transaction: providedTransaction = null,
}) => {
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
          status: DELIVERY_FILE_STATUS.UNDER_REVIEW,
          reviewDeadlineAt: deadline,
          currentVersionId: replacement.id,
          deliveryMode,
          acceptedAt: null,
        },
        { transaction },
      );
      deliveryFile.setDataValue("currentVersion", replacement);
      createdFiles.push(deliveryFile);
    } else {
      for (const upload of normalizedUploads) {
        const deliveryFile = await BookingDeliveryFile.create(
          {
            bookingId: booking.id,
            type,
            label: label || type,
            deliveryMode,
            status: DELIVERY_FILE_STATUS.UNDER_REVIEW,
            reviewDeadlineAt: deadline,
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

export const requestFileRevisionState = async (fileId, userId, note) =>
  sequelize.transaction(async (transaction) => {
    const deliveryFile = await BookingDeliveryFile.findByPk(fileId, {
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

    const booking = await Booking.findOne({
      where: { id: deliveryFile.bookingId, userId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!booking) throw new Error("Delivery file not found");
    if (booking.cancelledAt || booking.status === "CANCELLED") {
      throw new Error("Cancelled bookings cannot be revised");
    }
    if (deliveryFile.status !== DELIVERY_FILE_STATUS.UNDER_REVIEW) {
      throw new Error("This file is not available for revision");
    }
    if (
      deliveryFile.reviewDeadlineAt &&
      new Date(deliveryFile.reviewDeadlineAt).getTime() <= Date.now()
    ) {
      throw new Error("The revision window has closed");
    }

    const trimmedNote = String(note || "").trim();
    if (!trimmedNote) throw new Error("Revision details are required");
    if (Number(deliveryFile.revisionCount || 0) >= MAX_FILE_REVISIONS) {
      throw new Error("Maximum revision requests reached for this file");
    }

    const requestNumber = Number(deliveryFile.revisionCount || 0) + 1;
    const now = new Date();
    await BookingFileRevision.create(
      {
        deliveryFileId: deliveryFile.id,
        versionId: deliveryFile.currentVersionId,
        requestNumber,
        note: trimmedNote,
        requestedAt: now,
      },
      { transaction },
    );
    await deliveryFile.update(
      {
        status: DELIVERY_FILE_STATUS.CHANGES_REQUESTED,
        revisionCount: requestNumber,
        reviewDeadlineAt: null,
        acceptedAt: null,
      },
      { transaction },
    );
    const filesUrl = await syncLegacyFilesPayload(booking.id, transaction);

    return {
      deliveryFile: serializeDeliveryFile(deliveryFile),
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
    const deliveryFile = await BookingDeliveryFile.findOne({
      where: { id: fileId, bookingId },
      include: [
        {
          model: BookingDeliveryFileVersion,
          as: "currentVersion",
          required: true,
        },
        {
          model: BookingDeliveryFileVersion,
          as: "versions",
          required: false,
        },
      ],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!deliveryFile) throw new Error("Delivery file not found");
    const booking = await Booking.findByPk(deliveryFile.bookingId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    assertUploadableBooking(booking);
    const urls = [
      ...new Set(
        [
          ...(deliveryFile.versions || []).map((version) => version.url),
          deliveryFile.currentVersion?.url,
        ].filter(Boolean),
      ),
    ];
    await deliveryFile.destroy({ transaction });
    await booking.update({ deliveryFinishedAt: null }, { transaction });
    const filesUrl = await syncLegacyFilesPayload(booking.id, transaction);
    return { urls, filesUrl, bookingId: booking.id };
  });
