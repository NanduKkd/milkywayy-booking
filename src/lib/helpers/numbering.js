import { QueryTypes } from "sequelize";
import { sequelize as db } from "@/lib/db/db";
import { buildInvoiceNumber } from "@/lib/helpers/invoice-format";

const MAX_INVOICE_NUMBER_ATTEMPTS = 3;

function resolveEffectiveTransactionDate(transaction) {
  const value = transaction?.paidAt || transaction?.createdAt || new Date();
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return new Date();
  return date;
}

function buildInvoiceDayKey(date) {
  return `mw_invoice:${date.toISOString().slice(0, 10)}`;
}

function isUniqueConstraintError(error) {
  return (
    error?.name === "SequelizeUniqueConstraintError" ||
    error?.original?.code === "23505"
  );
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

  for (let attempt = 0; attempt < MAX_INVOICE_NUMBER_ATTEMPTS; attempt += 1) {
    try {
      const invoiceNumber = await db.transaction(
        async (databaseTransaction) => {
          // A transaction-scoped advisory lock serializes only one UTC invoice day.
          // The unique constraint remains the final integrity boundary.
          await db.query(
            "SELECT pg_advisory_xact_lock(hashtext(:invoiceDayKey))",
            {
              replacements: { invoiceDayKey: buildInvoiceDayKey(effectiveAt) },
              transaction: databaseTransaction,
              type: QueryTypes.SELECT,
            },
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
              transaction: databaseTransaction,
              type: QueryTypes.SELECT,
            },
          );

          const sequence = Number(result?.sequence || 0) + attempt;
          if (!Number.isInteger(sequence) || sequence < 1) return "";

          const candidate = buildInvoiceNumber(effectiveAt, sequence);
          if (!candidate) return "";

          if (typeof transaction.update === "function") {
            await transaction.update(
              { invoiceNumber: candidate },
              { transaction: databaseTransaction },
            );
          } else {
            transaction.invoiceNumber = candidate;
          }
          return candidate;
        },
      );

      if (!invoiceNumber) return "";

      if (typeof transaction.setDataValue === "function") {
        transaction.setDataValue("invoiceNumber", invoiceNumber);
      } else {
        transaction.invoiceNumber = invoiceNumber;
      }

      return invoiceNumber;
    } catch (error) {
      if (
        !isUniqueConstraintError(error) ||
        attempt === MAX_INVOICE_NUMBER_ATTEMPTS - 1
      ) {
        throw error;
      }
    }
  }

  return "";
}
