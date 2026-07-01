function roundCurrency(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100) / 100;
}

function normalizePromotionCode(value) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();

  return normalized || null;
}

function normalizePromotionName(value) {
  const normalized = String(value || "").trim();
  return normalized || null;
}

export function buildTransactionPromotionSummary(transaction) {
  const snapshot = transaction?.promotionSnapshot;
  const amount = roundCurrency(snapshot?.benefitAmount || 0);

  if (!snapshot || amount <= 0) {
    return null;
  }

  const code = normalizePromotionCode(snapshot.code);
  const name = normalizePromotionName(snapshot.name);

  return {
    promotionId: Number.isInteger(Number(snapshot.id))
      ? Number(snapshot.id)
      : null,
    kind: snapshot.kind || null,
    code,
    name,
    label: code
      ? `Promo Code (${code})`
      : name
        ? `Promotion (${name})`
        : "Promotion",
    amount,
  };
}

export function getTransactionGrossAmount(transaction) {
  const promotionAmount =
    buildTransactionPromotionSummary(transaction)?.amount || 0;

  return roundCurrency(
    Number(transaction?.amount || 0) +
      Number(transaction?.couponDeduction || 0) +
      Number(transaction?.bulkDeduction || 0) +
      Number(promotionAmount || 0),
  );
}

export function buildTransactionPaymentSummary(
  transaction,
  bookingSummaries = [],
) {
  const subtotalFromBookings = roundCurrency(
    Array.isArray(bookingSummaries)
      ? bookingSummaries.reduce(
          (sum, summary) => sum + Number(summary?.amount || 0),
          0,
        )
      : 0,
  );

  return {
    subtotal:
      subtotalFromBookings > 0
        ? subtotalFromBookings
        : getTransactionGrossAmount(transaction),
    promotion: buildTransactionPromotionSummary(transaction),
    totalPaidAmount: roundCurrency(transaction?.amount || 0),
  };
}
