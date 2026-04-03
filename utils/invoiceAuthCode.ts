/**
 * Deterministic invoice authentication code (PDF footer + verification).
 * Must stay in sync everywhere this string is shown or looked up.
 */
export function generateInvoiceAuthCode(
  invoiceId: string,
  invoiceNumber: string,
  companyId: string,
  creatorId: string,
): string {
  const invoiceData = `${invoiceId}-${invoiceNumber}-${companyId}-${creatorId}`;

  let hash = 0;
  for (let i = 0; i < invoiceData.length; i++) {
    const char = invoiceData.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  const positiveHash = Math.abs(hash);
  const company = companyId?.substring(0, 3).toUpperCase() || "UNK";
  const invoiceShort =
    invoiceNumber?.replace(/[^0-9]/g, "").substring(0, 3) || "001";
  const hashShort = positiveHash.toString().substring(0, 6);

  return `${company}-${invoiceShort}-${hashShort}`.toUpperCase();
}

export function normalizeVerificationCode(input: string): string {
  return input.trim().toUpperCase();
}
