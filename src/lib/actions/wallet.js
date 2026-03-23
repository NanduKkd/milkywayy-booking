"use server";

import { actionWrapper } from "@/lib/actions/utils";
import Booking from "@/lib/db/models/booking";
import Transaction from "@/lib/db/models/transaction";
import WalletTransaction from "@/lib/db/models/wallettransaction";
import { auth } from "@/lib/helpers/auth";
import { ensureTransactionInvoiceUrl } from "@/lib/helpers/invoice";
import "@/lib/db/relations";

const getWalletDataHandler = async () => {
  const session = await auth();
  if (!session?.id) throw new Error("Unauthorized");

  const userId = session.id;

  // Calculate Balance
  const balance =
    (await WalletTransaction.sum("amount", {
      where: { userId, status: "active" },
    })) || 0;

  const transactions = await WalletTransaction.findAll({
    where: { userId },
    order: [["createdAt", "DESC"]],
  });

  return {
    balance,
    transactions: transactions.map((t) => t.toJSON()),
  };
};
export const getWalletData = actionWrapper(getWalletDataHandler);

const getInvoicesHandler = async () => {
  const session = await auth();
  if (!session?.id) throw new Error("Unauthorized");

  const userId = session.id;

  const transactions = await Transaction.findAll({
    where: {
      userId,
      status: "success",
    },
    include: [
      {
        model: Booking,
        as: "bookings",
        attributes: ["id", "bookingCode", "propertyDetails", "date"],
      },
    ],
    order: [["createdAt", "DESC"]],
  });

  await Promise.all(
    transactions
      .filter((transaction) => transaction.status === "success")
      .map((transaction) => ensureTransactionInvoiceUrl(transaction)),
  );

  return transactions.map((t) => t.toJSON());
};
export const getInvoices = actionWrapper(getInvoicesHandler);
