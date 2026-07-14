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

export function getBankAccountStoredBalance(account: BankAccount): number {
  return Number(account.currentBalance ?? account.initialBalance ?? 0);
}

/** Label for bank account `<select>` options; balance suffix is optional. */
export function formatBankAccountSelectLabel(
  account: BankAccount,
  showBalance: boolean,
): string {
  const sym = account.currencySymbol || "$";
  const base = `${formatBankAccountListLabel(account)} (${sym})`;
  if (!showBalance) return base;
  const bal = getBankAccountStoredBalance(account);
  return `${base} — Balance: ${sym}${bal.toFixed(2)}`;
}
