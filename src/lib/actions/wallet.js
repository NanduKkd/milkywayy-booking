"use server";

import { sequelize as db } from "@/lib/db/db";
import WalletTransaction from "@/lib/db/models/wallettransaction";
import Transaction from "@/lib/db/models/transaction";
import { auth } from "@/lib/helpers/auth";
import { actionWrapper } from "@/lib/actions/utils";

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
    order: [["createdAt", "DESC"]],
  });

  return transactions.map((t) => t.toJSON());
};
export const getInvoices = actionWrapper(getInvoicesHandler);
