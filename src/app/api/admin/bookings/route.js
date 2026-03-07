import { NextResponse } from "next/server";
import { Op } from "sequelize";
import Stripe from "stripe";
import Booking from "@/lib/db/models/booking";
import Transaction from "@/lib/db/models/transaction";
import User from "@/lib/db/models/user";
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
    attributes: ["id", "status", "stripePaymentIntentId", "paidAt"],
    order: [["updatedAt", "DESC"]],
    limit: 50,
  });

  await Promise.all(
    pendingTransactions.map(async (transaction) => {
      try {
        const session = await stripe.checkout.sessions.retrieve(
          transaction.stripePaymentIntentId,
        );
        if (session?.payment_status !== "paid") return;

        await transaction.update({
          status: "success",
          stripePaymentIntentId:
            session.payment_intent || transaction.stripePaymentIntentId,
          paidAt: transaction.paidAt || new Date(),
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
