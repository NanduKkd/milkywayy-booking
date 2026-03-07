import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import Booking from "@/lib/db/models/booking";
import Transaction from "@/lib/db/models/transaction";
import User from "@/lib/db/models/user";
import WalletTransaction from "@/lib/db/models/wallettransaction";
import { generateAndUploadInvoice } from "@/lib/helpers/invoice";
import { sendBookingConfirmation } from "@/lib/actions/notifications";

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
    console.log("[WEBHOOK] Stripe event received", {
      type: event.type,
      eventId: event.id,
    });
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        await handleCheckoutSessionCompleted(session);
        break;
      }
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
  console.log("[WEBHOOK] checkout.session.completed", {
    sessionId: session.id,
    transactionId,
    paymentStatus: session.payment_status,
  });

  if (!transactionId) {
    console.error("No transaction ID found in session metadata");
    return;
  }

  const transaction = await Transaction.findByPk(transactionId);
  if (!transaction) {
    console.error(`Transaction not found: ${transactionId}`);
    return;
  }
  const wasAlreadySuccess = transaction.status === "success";
  const confirmationAlreadySent = Boolean(
    transaction.metadata?.bookingConfirmationSentAt,
  );

  // Update Transaction
  if (!wasAlreadySuccess) {
    await transaction.update({
      status: "success",
      stripePaymentIntentId: paymentIntentId,
      paidAt: new Date(),
    });
  }
  console.log("[WEBHOOK] Transaction state", {
    transactionId,
    wasAlreadySuccess,
    hasInvoiceUrl: Boolean(transaction.invoiceUrl),
    confirmationAlreadySent,
  });

  // Generate Invoice
  let invoiceUrl = transaction.invoiceUrl || null;
  const user = await User.findByPk(transaction.userId);
  if (user && !invoiceUrl) {
    const generatedInvoiceUrl = await generateAndUploadInvoice(transaction, user);
    if (generatedInvoiceUrl) {
      invoiceUrl = generatedInvoiceUrl;
      await transaction.update({ invoiceUrl: generatedInvoiceUrl });
      console.log(
        `Invoice generated for transaction ${transactionId}: ${generatedInvoiceUrl}`,
      );
    }
  }

  // Update Bookings to CONFIRMED
  await Booking.update(
    { status: "CONFIRMED" },
    { where: { transactionId: transaction.id } },
  );
  console.log("[WEBHOOK] Bookings forced to CONFIRMED", {
    transactionId,
  });

  if (user && (!confirmationAlreadySent || !wasAlreadySuccess)) {
    const confirmedBookings = await Booking.findAll({
      where: { transactionId: transaction.id },
    });
    const notifyResults = await Promise.allSettled(
      confirmedBookings.map((booking) =>
        sendBookingConfirmation(booking, user, {
          Invoice_URL: invoiceUrl || transaction.invoiceUrl || "",
        }),
      ),
    );
    notifyResults.forEach((result, idx) => {
      const bookingId = confirmedBookings[idx]?.id;
      if (result.status === "rejected") {
        console.error(
          `WhatsApp confirmation rejected for booking ${bookingId}:`,
          result.reason,
        );
        return;
      }
      if (!result.value?.success) {
        console.error(
          `WhatsApp confirmation failed for booking ${bookingId}:`,
          result.value?.error || "Unknown Twilio error",
        );
      }
    });

    const allNotificationsSuccessful = notifyResults.every(
      (result) => result.status === "fulfilled" && result.value?.success,
    );
    if (allNotificationsSuccessful) {
      await transaction.update({
        metadata: {
          ...(transaction.metadata || {}),
          bookingConfirmationSentAt: new Date().toISOString(),
        },
      });
    }
  }

  if (wasAlreadySuccess) {
    console.log(
      `Transaction ${transactionId} was already success. Reconfirmed bookings in duplicate webhook.`,
    );
  } else {
    console.log(`Transaction ${transactionId} marked as success.`);
  }
}
