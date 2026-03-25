import { NextResponse } from "next/server";
import Transaction from "@/lib/db/models/transaction";
import User from "@/lib/db/models/user";
import { ensureTransactionInvoiceUrl } from "@/lib/helpers/invoice";
import "@/lib/db/relations";

export async function GET() {
  try {
    // 1. Find the last successful transaction
    const lastTransaction = await Transaction.findOne({
      where: { status: "success" },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "fullName", "email", "companyName", "billingAddress", "phone", "trn"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    if (!lastTransaction) {
      return NextResponse.json({ error: "No successful transactions found" }, { status: 404 });
    }

    // 2. Force regeneration by clearing the existing invoice URL (optional, but requested "regenerate")
    // If we want to strictly REGENERATE even if one exists, we can pass it through.
    // ensureTransactionInvoiceUrl has logic to check if it's stale, but we want to be sure it's NEW.
    
    // Forcing a fresh generation by temporarily nulling the URL in the local object 
    // (ensureTransactionInvoiceUrl will then generate a new one and update the DB)
    const originalUrl = lastTransaction.invoiceUrl;
    lastTransaction.invoiceUrl = null; 

    const invoiceUrl = await ensureTransactionInvoiceUrl(lastTransaction, lastTransaction.user);

    return NextResponse.json({
      success: true,
      transactionId: lastTransaction.id,
      invoiceNumber: lastTransaction.invoiceNumber,
      previousUrl: originalUrl,
      newUrl: invoiceUrl,
      message: "Invoice regenerated successfully"
    });
  } catch (error) {
    console.error("Error regenerating last invoice:", error);
    return NextResponse.json(
      { error: "Failed to regenerate invoice", details: error.message },
      { status: 500 }
    );
  }
}
