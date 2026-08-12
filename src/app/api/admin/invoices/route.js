import { NextResponse } from "next/server";
import Booking from "@/lib/db/models/booking";
import Transaction from "@/lib/db/models/transaction";
import User from "@/lib/db/models/user";
import { requireSuperadminActor } from "@/lib/helpers/authorization";
import { ensureTransactionInvoiceUrl } from "@/lib/helpers/invoice";
import { authorizationErrorResponse } from "@/lib/helpers/routeAuthorization";
import "@/lib/db/relations";

export async function GET() {
  try {
    await requireSuperadminActor();

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
    const authorizationResponse = authorizationErrorResponse(error);

    if (authorizationResponse) {
      return authorizationResponse;
    }

    console.error("Error fetching invoices:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 },
    );
  }
}
