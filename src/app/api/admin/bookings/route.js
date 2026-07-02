import { NextResponse } from "next/server";
import { Op } from "sequelize";
import Stripe from "stripe";
import { USER_ROLES } from "@/lib/config/app.config";
import Booking from "@/lib/db/models/booking";
import BookingDeliveryFile from "@/lib/db/models/bookingdeliveryfile";
import BookingRevision from "@/lib/db/models/bookingrevision";
import Transaction from "@/lib/db/models/transaction";
import User from "@/lib/db/models/user";
import { auth } from "@/lib/helpers/auth";
import {
  isAdminBookingHandoffExpired,
  isAdminBookingHandoffTransaction,
} from "@/lib/services/adminBookingHandoffState";
import { DELIVERY_FILE_INCLUDE } from "@/lib/services/fileDelivery";
import {
  applyPromotionForCheckoutTransaction,
  expirePromotionForCheckoutTransaction,
} from "@/lib/services/promotionCheckout";
import "@/lib/db/relations";

const getStripeClient = () => {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (typeof fetch !== "function") return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
};

const reconcilePendingTransactions = async () => {
  const stripe = getStripeClient();
  if (!stripe) return;

  const pendingTransactions = await Transaction.findAll({
    where: {
      status: "pending",
      stripePaymentIntentId: { [Op.like]: "cs_%" },
    },
    // metadata is required to distinguish expiring admin handoff reservations
    // from ordinary checkout sessions.
    attributes: ["id", "status", "stripePaymentIntentId", "paidAt", "metadata"],
    order: [["updatedAt", "DESC"]],
    limit: 50,
  });

  await Promise.all(
    pendingTransactions.map(async (transaction) => {
      try {
        if (
          isAdminBookingHandoffTransaction(transaction) &&
          isAdminBookingHandoffExpired(transaction)
        ) {
          await transaction.update({ status: "failed" });
          await expirePromotionForCheckoutTransaction({
            transactionId: transaction.id,
          });
          await Booking.update(
            { cancelledAt: new Date(), status: "CANCELLED" },
            {
              where: {
                transactionId: transaction.id,
                status: { [Op.in]: ["DRAFT", "CANCELLED"] },
              },
            },
          );
          return;
        }

        const session = await stripe.checkout.sessions.retrieve(
          transaction.stripePaymentIntentId,
        );
        if (session?.payment_status === "paid") {
          await transaction.update({
            status: "success",
            stripePaymentIntentId:
              session.payment_intent || transaction.stripePaymentIntentId,
            paidAt: transaction.paidAt || new Date(),
          });
          await applyPromotionForCheckoutTransaction({
            transactionId: transaction.id,
          });

          await Booking.update(
            { status: "CONFIRMED" },
            {
              where: {
                transactionId: transaction.id,
                status: { [Op.in]: ["DRAFT"] },
              },
            },
          );
          return;
        }

        const sessionExpired =
          Number(session?.expires_at || 0) > 0 &&
          Number(session.expires_at) * 1000 <= Date.now();

        if (sessionExpired) {
          await transaction.update({ status: "failed" });
          await expirePromotionForCheckoutTransaction({
            transactionId: transaction.id,
          });
          await Booking.update(
            { cancelledAt: null, status: "DRAFT" },
            {
              where: {
                transactionId: transaction.id,
                status: { [Op.in]: ["DRAFT", "CANCELLED"] },
              },
            },
          );
        }
      } catch (error) {
        console.error("Pending transaction reconciliation failed", {
          transactionId: transaction.id,
          error: error?.message || String(error),
        });
      }
    }),
  );
};

export async function GET() {
  try {
    const session = await auth();
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== USER_ROLES.SUPERADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await reconcilePendingTransactions();

    const bookings = await Booking.findAll({
      where: {
        status: {
          [Op.in]: ["DRAFT", "CONFIRMED", "COMPLETED", "CANCELLED"],
        },
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "fullName", "email", "phone"],
        },
        {
          model: Transaction,
          as: "transaction",
          attributes: ["id", "amount", "status", "invoiceUrl"],
        },
        {
          model: BookingRevision,
          as: "revisions",
          separate: true,
          order: [["revisionNumber", "DESC"]],
        },
        {
          model: BookingDeliveryFile,
          as: "deliveryFiles",
          include: DELIVERY_FILE_INCLUDE,
          separate: true,
          order: [["createdAt", "ASC"]],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return NextResponse.json(bookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 },
    );
  }
}
