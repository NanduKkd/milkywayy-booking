import { NextResponse } from "next/server";
import Booking from "@/lib/db/models/booking";
import Transaction from "@/lib/db/models/transaction";
import User from "@/lib/db/models/user";
import { ensureTransactionInvoiceUrl } from "@/lib/helpers/invoice";
import "@/lib/db/relations";

export async function GET() {
  try {
    const transactions = await Transaction.findAll({
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "fullName", "email"],
        },
        {
          model: Booking,
          as: "bookings",
          attributes: ["id", "bookingCode"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    await Promise.all(
      transactions
        .filter((transaction) => transaction.status === "success")
        .map((transaction) =>
          ensureTransactionInvoiceUrl(transaction, transaction.user),
        ),
    );

    return NextResponse.json(
      transactions.map((transaction) => transaction.toJSON()),
    );
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 },
    );
  }
}
