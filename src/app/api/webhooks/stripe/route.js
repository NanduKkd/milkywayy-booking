import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import Transaction from "@/lib/db/models/transaction";
import Booking from "@/lib/db/models/booking";
import WalletTransaction from "@/lib/db/models/wallettransaction";
import User from "@/lib/db/models/user";
import { generateAndUploadInvoice } from "@/lib/helpers/invoice";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req) {
  const body = await req.text();
  const signature = headers().get("stripe-signature");

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error(`Webhook signature verification failed.`, err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object;
        await handleCheckoutSessionCompleted(session);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  } catch (error) {
    console.error("Error handling webhook event:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutSessionCompleted(session) {
  const transactionId = session.metadata?.transactionId;
  const paymentIntentId = session.payment_intent;

  if (!transactionId) {
    console.error("No transaction ID found in session metadata");
    return;
  }

  const transaction = await Transaction.findByPk(transactionId);
  if (!transaction) {
    console.error(`Transaction not found: ${transactionId}`);
    return;
  }

  // Update Transaction
  await transaction.update({
    status: "success",
    stripePaymentIntentId: paymentIntentId,
    paidAt: new Date(),
  });



  // Generate Invoice
  const user = await User.findByPk(transaction.userId);
  if (user) {
    const invoiceUrl = await generateAndUploadInvoice(transaction, user);
    if (invoiceUrl) {
      await transaction.update({ invoiceUrl });
      console.log(
        `Invoice generated for transaction ${transactionId}: ${invoiceUrl}`,
      );
    }
  }

  // Update Bookings to CONFIRMED
  await Booking.update(
    { status: "CONFIRMED" },
    { where: { transactionId: transaction.id } }
  );

  console.log(`Transaction ${transactionId} marked as success.`);
}
