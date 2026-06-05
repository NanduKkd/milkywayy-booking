import { Op } from "sequelize";
import { sequelize } from "@/lib/db/db";
import Booking from "@/lib/db/models/booking";
import BookingRevision from "@/lib/db/models/bookingrevision";
import WalletTransaction from "@/lib/db/models/wallettransaction";
import {
  BOOKING_WORKFLOW_STATUS,
  getDubaiReviewDeadline,
  hasUploadedDeliverables,
  MAX_BOOKING_REVISIONS,
  parseFilesPayload,
} from "@/lib/helpers/bookingWorkflow";

const ADMIN_TRANSITIONS = {
  [BOOKING_WORKFLOW_STATUS.SHOOT_BOOKED]: BOOKING_WORKFLOW_STATUS.SHOOT_DONE,
  [BOOKING_WORKFLOW_STATUS.SHOOT_DONE]: BOOKING_WORKFLOW_STATUS.EDITING,
  [BOOKING_WORKFLOW_STATUS.EDITING]: BOOKING_WORKFLOW_STATUS.FILES_UPLOADED,
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
    if (nextStatus === BOOKING_WORKFLOW_STATUS.FILES_UPLOADED) {
      if (!hasUploadedDeliverables(booking.filesUrl)) {
        throw new Error("Upload at least one deliverable first");
      }
      updates.filesUploadedAt = now;
      updates.reviewDeadlineAt = getDubaiReviewDeadline(now);

      await BookingRevision.update(
        { resolvedAt: now },
        {
          where: { bookingId: booking.id, resolvedAt: null },
          transaction,
        },
      );
    }

    await booking.update(updates, { transaction });
    return toWorkflowPayload(booking);
  });

export const requestBookingRevisionState = async (bookingId, userId, note) =>
  sequelize.transaction(async (transaction) => {
    const booking = await Booking.findOne({
      where: { id: bookingId, userId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!booking) throw new Error("Booking not found");
    if (booking.cancelledAt || booking.status === "CANCELLED") {
      throw new Error("Cancelled bookings cannot be revised");
    }
    if (booking.workflowStatus !== BOOKING_WORKFLOW_STATUS.FILES_UPLOADED) {
      throw new Error("This booking is not available for revision");
    }
    if (
      booking.reviewDeadlineAt &&
      new Date(booking.reviewDeadlineAt).getTime() <= Date.now()
    ) {
      throw new Error("The revision window has closed");
    }

    const trimmedNote = String(note || "").trim();
    if (!trimmedNote) throw new Error("Revision details are required");
    if (booking.revisionCount >= MAX_BOOKING_REVISIONS) {
      throw new Error("Maximum revision requests reached");
    }

    const nextRevisionNumber = Number(booking.revisionCount || 0) + 1;
    const now = new Date();
    const payload = parseFilesPayload(booking.filesUrl);
    const nextFilesUrl = payload
      ? JSON.stringify({
          ...payload,
          archivedDeliverables: payload.deliverables || [],
          deliverables: [],
          updatedAt: now.toISOString(),
        })
      : booking.filesUrl;

    await BookingRevision.create(
      {
        bookingId: booking.id,
        revisionNumber: nextRevisionNumber,
        note: trimmedNote,
        requestedAt: now,
      },
      { transaction },
    );
    await booking.update(
      {
        workflowStatus: BOOKING_WORKFLOW_STATUS.EDITING,
        editingStartedAt: now,
        reviewDeadlineAt: null,
        revisionCount: nextRevisionNumber,
        filesUrl: nextFilesUrl,
      },
      { transaction },
    );

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

    await finalizeBookingInTransaction(booking, transaction, new Date());
    return toWorkflowPayload(booking);
  });

export const autoCompleteEligibleBookings = async (now = new Date()) => {
  const eligible = await Booking.findAll({
    where: {
      workflowStatus: BOOKING_WORKFLOW_STATUS.FILES_UPLOADED,
      reviewDeadlineAt: { [Op.lte]: now },
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
        !booking.reviewDeadlineAt ||
        new Date(booking.reviewDeadlineAt).getTime() > now.getTime()
      ) {
        return false;
      }
      return finalizeBookingInTransaction(booking, transaction, now);
    });
    if (completed) completedCount += 1;
  }

  return { completedCount };
};
