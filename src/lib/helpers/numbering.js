import { QueryTypes } from "sequelize";
import { sequelize as db } from "@/lib/db/db";
import { buildInvoiceNumber } from "@/lib/helpers/invoice-format";

function resolveEffectiveTransactionDate(transaction) {
  const value = transaction?.paidAt || transaction?.createdAt || new Date();
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return new Date();
  return date;
}

export async function ensureTransactionInvoiceNumber(transaction) {
  if (!transaction) return "";
  if (transaction.invoiceNumber) return transaction.invoiceNumber;

  const effectiveAt = resolveEffectiveTransactionDate(transaction);
  const dayStart = new Date(
    Date.UTC(
      effectiveAt.getUTCFullYear(),
      effectiveAt.getUTCMonth(),
      effectiveAt.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );
  const dayEnd = new Date(
    Date.UTC(
      effectiveAt.getUTCFullYear(),
      effectiveAt.getUTCMonth(),
      effectiveAt.getUTCDate() + 1,
      0,
      0,
      0,
      0,
    ),
  );

  const [result] = await db.query(
    `
      SELECT COUNT(*)::int AS sequence
      FROM transactions
      WHERE status = 'success'
        AND COALESCE(paid_at, created_at) >= :dayStart
        AND COALESCE(paid_at, created_at) < :dayEnd
        AND (
          COALESCE(paid_at, created_at) < :effectiveAt
          OR (
            COALESCE(paid_at, created_at) = :effectiveAt
            AND id <= :transactionId
          )
        )
    `,
    {
      replacements: {
        dayStart,
        dayEnd,
        effectiveAt,
        transactionId: transaction.id,
      },
      type: QueryTypes.SELECT,
    },
  );

  const sequence = Number(result?.sequence || 0);
  if (!Number.isInteger(sequence) || sequence < 1) return "";

  const invoiceNumber = buildInvoiceNumber(effectiveAt, sequence);
  if (!invoiceNumber) return "";

  await transaction.update({ invoiceNumber });
  if (typeof transaction.setDataValue === "function") {
    transaction.setDataValue("invoiceNumber", invoiceNumber);
  } else {
    transaction.invoiceNumber = invoiceNumber;
  }

  return invoiceNumber;
}
