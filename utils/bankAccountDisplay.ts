import type { BankAccount } from "../types";

/**
 * Label shown on invoices and in invoice bank dropdowns.
 * Uses optional masking name when set; otherwise the real bank name.
 */
export function getInvoiceBankDisplayName(account: BankAccount): string {
  const masked = account.invoiceDisplayBankName?.trim();
  return masked || account.bankName;
}

/**
 * Picker / transfer / list label: account name plus institution so duplicate
 * account names (e.g. two "Main" accounts) stay distinguishable.
 */
export function formatBankAccountListLabel(account: BankAccount): string {
  const name = account.accountName?.trim() || "Account";
  const bank = account.bankName?.trim();
  if (bank) return `${name} · ${bank}`;
  return name;
}

/** Whether this account appears in the invoice “pay to” bank dropdown. */
export function isBankIncludedInInvoicePicker(account: BankAccount): boolean {
  return account.includeInInvoicePicker !== false;
}
