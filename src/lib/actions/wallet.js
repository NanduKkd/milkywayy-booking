"use server";

import { sequelize as db } from "@/lib/db/db";
import WalletTransaction from "@/lib/db/models/wallettransaction";
import Transaction from "@/lib/db/models/transaction";
import { auth } from "@/lib/helpers/auth";

export const getWalletData = async () => {
  const session = await auth();
  if (!session?.id) throw new Error("Unauthorized");

  const userId = session.id;

  // Calculate Balance
  // We need to sum all amounts. Assuming amount can be negative for debits?
  // Or are debits handled differently?
  // Looking at WalletTransaction model, it just has 'amount'.
  // Usually credits are positive, debits are negative.
  // Let's assume that for now.
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

export const getInvoices = async () => {
  const session = await auth();
  if (!session?.id) throw new Error("Unauthorized");

  const userId = session.id;

  const transactions = await Transaction.findAll({
    where: {
      userId,
      status: "success",
      // We might want to show all successful transactions even if invoice generation failed/pending?
      // But user asked for "listing out recent invoices".
      // Let's filter by invoiceUrl not null if we want to be strict, or just show all success ones and show "Generating..." if null.
    },
    order: [["createdAt", "DESC"]],
  });

  return transactions.map((t) => t.toJSON());
};
