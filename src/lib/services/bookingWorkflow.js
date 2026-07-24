import { Op } from "sequelize";
import { sequelize } from "@/lib/db/db";
import Booking from "@/lib/db/models/booking";
import BookingDeliveryFile from "@/lib/db/models/bookingdeliveryfile";
import WalletTransaction from "@/lib/db/models/wallettransaction";
import {
  BOOKING_WORKFLOW_STATUS,
  DELIVERY_FILE_STATUS,
} from "@/lib/helpers/bookingWorkflow";

const ADMIN_TRANSITIONS = {
  [BOOKING_WORKFLOW_STATUS.SHOOT_BOOKED]: BOOKING_WORKFLOW_STATUS.SHOOT_DONE,
  [BOOKING_WORKFLOW_STATUS.SHOOT_DONE]: BOOKING_WORKFLOW_STATUS.EDITING,
};

const serializeDate = (value) =>
  value instanceof Date ? value.toISOString() : value || null;

const toWorkflowPayload = (booking) => ({
  id: booking.id,
  status: booking.status,
  workflowStatus: booking.workflowStatus,
  shootCompletedAt: serializeDate(booking.shootCompletedAt),
  editingStartedAt: serializeDate(booking.editingStartedAt),
  filesUploadedAt: serializeDate(booking.filesUploadedAt),
  reviewDeadlineAt: serializeDate(booking.reviewDeadlineAt),
  revisionCount: Number(booking.revisionCount || 0),
  deliveryFinishedAt: serializeDate(booking.deliveryFinishedAt),
  completedAt: serializeDate(booking.completedAt),
  filesUrl: booking.filesUrl || null,
});

const finalizeBookingInTransaction = async (booking, transaction, now) => {
  if (
    booking.workflowStatus === BOOKING_WORKFLOW_STATUS.PROJECT_COMPLETED ||
    booking.completedAt
  ) {
    return false;
  }

  await booking.update(
    {
      workflowStatus: BOOKING_WORKFLOW_STATUS.PROJECT_COMPLETED,
      completedAt: now,
      reviewDeadlineAt: null,
      status: "COMPLETED",
    },
    { transaction },
  );

  if (booking.transactionId) {
    const pendingBookingsCount = await Booking.count({
      where: {
        transactionId: booking.transactionId,
        workflowStatus: {
          [Op.ne]: BOOKING_WORKFLOW_STATUS.PROJECT_COMPLETED,
        },
      },
      transaction,
    });

    if (pendingBookingsCount === 0) {
      await WalletTransaction.update(
        { status: "active", creditsAt: now },
        {
          where: {
            transactionId: booking.transactionId,
            status: "pending",
          },
          transaction,
        },
      );
    }
  }

  return true;
};

export const updateBookingWorkflowState = async (bookingId, nextStatus) =>
  sequelize.transaction(async (transaction) => {
    const booking = await Booking.findByPk(bookingId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!booking) throw new Error("Booking not found");
    if (booking.cancelledAt || booking.status === "CANCELLED") {
      throw new Error("Cancelled bookings cannot be updated");
    }
    if (booking.status !== "CONFIRMED") {
      throw new Error("Only confirmed bookings can enter delivery workflow");
    }

    const expectedStatus = ADMIN_TRANSITIONS[booking.workflowStatus];
    if (expectedStatus !== nextStatus) {
      throw new Error(
        `Invalid workflow transition from ${booking.workflowStatus} to ${nextStatus}`,
      );
    }

    const now = new Date();
    const updates = { workflowStatus: nextStatus };

    if (nextStatus === BOOKING_WORKFLOW_STATUS.SHOOT_DONE) {
      updates.shootCompletedAt = now;
    }
    if (nextStatus === BOOKING_WORKFLOW_STATUS.EDITING) {
      updates.editingStartedAt = now;
    }
    await booking.update(updates, { transaction });
    return toWorkflowPayload(booking);
  });

export const completeDeliveredBookingState = async (bookingId, userId) =>
  sequelize.transaction(async (transaction) => {
    const booking = await Booking.findOne({
      where: { id: bookingId, userId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!booking) throw new Error("Booking not found");
    if (booking.cancelledAt || booking.status === "CANCELLED") {
      throw new Error("Cancelled bookings cannot be completed");
    }
    if (booking.workflowStatus !== BOOKING_WORKFLOW_STATUS.FILES_UPLOADED) {
      throw new Error("This booking cannot be completed yet");
    }
    if (!booking.deliveryFinishedAt) {
      throw new Error("Delivery is not finished yet");
    }
    const files = await BookingDeliveryFile.findAll({
      where: { bookingId: booking.id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (files.length === 0) throw new Error("No delivery files are available");
    if (
      files.some(
        (file) =>
          file.status === DELIVERY_FILE_STATUS.PRIVATE ||
          file.status === DELIVERY_FILE_STATUS.CHANGES_REQUESTED,
      )
    ) {
      throw new Error("Resolve all requested file changes first");
    }

    const now = new Date();
    const reviewableIds = files
      .filter((file) => file.status === DELIVERY_FILE_STATUS.UNDER_REVIEW)
      .map((file) => file.id);
    await BookingDeliveryFile.update(
      {
        status: DELIVERY_FILE_STATUS.ACCEPTED,
        acceptedAt: now,
        reviewDeadlineAt: null,
      },
      {
        where: {
          id: { [Op.in]: reviewableIds },
        },
        transaction,
      },
    );
    await finalizeBookingInTransaction(booking, transaction, now);
    return toWorkflowPayload(booking);
  });

export const autoCompleteEligibleBookings = async (now = new Date()) => {
  const expiredFiles = await BookingDeliveryFile.findAll({
    where: {
      status: DELIVERY_FILE_STATUS.UNDER_REVIEW,
      reviewDeadlineAt: { [Op.lte]: now },
    },
    attributes: ["bookingId", "type"],
  });
  let acceptedFileCount = 0;
  const expiredGroups = new Map();
  for (const item of expiredFiles) {
    expiredGroups.set(`${item.bookingId}:${item.type}`, item);
  }
  for (const item of expiredGroups.values()) {
    const accepted = await sequelize.transaction(async (transaction) => {
      const booking = await Booking.findByPk(item.bookingId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!booking || booking.cancelledAt || booking.status === "CANCELLED") {
        return 0;
      }
      const files = await BookingDeliveryFile.findAll({
        where: { bookingId: booking.id, type: item.type, deletedAt: null },
        transaction,
        lock: transaction.LOCK.UPDATE,
        order: [["id", "ASC"]],
      });
      if (
        files.length === 0 ||
        files.some(
          (file) =>
            file.status !== DELIVERY_FILE_STATUS.UNDER_REVIEW ||
            !file.reviewDeadlineAt ||
            new Date(file.reviewDeadlineAt).getTime() > now.getTime(),
        )
      ) {
        return 0;
      }
      await BookingDeliveryFile.update(
        {
          status: DELIVERY_FILE_STATUS.ACCEPTED,
          acceptedAt: now,
          reviewDeadlineAt: null,
        },
        {
          where: { id: { [Op.in]: files.map((file) => file.id) } },
          transaction,
        },
      );
      for (const file of files) {
        Object.assign(file, {
          status: DELIVERY_FILE_STATUS.ACCEPTED,
          acceptedAt: now,
          reviewDeadlineAt: null,
        });
      }
      return files.length;
    });
    acceptedFileCount += accepted;
  }

  const eligible = await Booking.findAll({
    where: {
      workflowStatus: BOOKING_WORKFLOW_STATUS.FILES_UPLOADED,
      deliveryFinishedAt: { [Op.ne]: null },
      completedAt: null,
      cancelledAt: null,
    },
    attributes: ["id"],
  });

  let completedCount = 0;
  for (const item of eligible) {
    const completed = await sequelize.transaction(async (transaction) => {
      const booking = await Booking.findByPk(item.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (
        !booking ||
        booking.workflowStatus !== BOOKING_WORKFLOW_STATUS.FILES_UPLOADED ||
        !booking.deliveryFinishedAt
      ) {
        return false;
      }
      const files = await BookingDeliveryFile.findAll({
        where: { bookingId: booking.id, deletedAt: null },
        transaction,
        lock: transaction.LOCK.UPDATE,
        order: [["id", "ASC"]],
      });
      if (
        files.length === 0 ||
        files.some((file) => file.status !== DELIVERY_FILE_STATUS.ACCEPTED)
      ) {
        return false;
      }
      return finalizeBookingInTransaction(booking, transaction, now);
    });
    if (completed) completedCount += 1;
  }

  return { acceptedFileCount, completedCount };
};
