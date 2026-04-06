import type { BankAccount } from "../types";

/**
 * Label shown on invoices and in invoice bank dropdowns.
 * Uses optional masking name when set; otherwise the real bank name.
 */
export function getInvoiceBankDisplayName(account: BankAccount): string {
  const masked = account.invoiceDisplayBankName?.trim();
  return masked || account.bankName;
}
