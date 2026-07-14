import React from "react";
import { FloatingFieldTooltip } from "../components/FloatingFieldTooltip";
import type { Expense } from "../types";

export type CurrencyAmountRow = {
  currency: string;
  symbol: string;
  gross: number;
  returns: number;
  net: number;
};

export function formatNativeMoney(symbol: string, amount: number): string {
  return `${symbol}${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatUsdAmount(amount: number): string {
  return `$${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function toUsdAmount(
  amount: number,
  currency: string | undefined,
  exchangeRates: Record<string, number>,
): number {
  const rate = exchangeRates[currency || "USD"] || 1;
  return amount / rate;
}

export function sumRowsUsd(
  rows: CurrencyAmountRow[],
  amountKey: "gross" | "net",
  exchangeRates: Record<string, number>,
): number {
  return rows.reduce(
    (sum, row) => sum + toUsdAmount(row[amountKey], row.currency, exchangeRates),
    0,
  );
}

/** Sum plain amounts grouped by currency (stored in gross/net). */
export function aggregateAmountsByCurrency<T>(
  items: T[],
  getAmount: (item: T) => number,
  getCurrency: (item: T) => string | undefined,
  getSymbol: (item: T) => string | undefined,
): CurrencyAmountRow[] {
  const map = new Map<string, CurrencyAmountRow>();
  for (const item of items) {
    const amount = getAmount(item);
    if (amount <= 0.0001) continue;
    const cur = getCurrency(item) || "USD";
    const row =
      map.get(cur) ??
      ({
        currency: cur,
        symbol: getSymbol(item) || "$",
        gross: 0,
        returns: 0,
        net: 0,
      } satisfies CurrencyAmountRow);
    row.gross += amount;
    row.net += amount;
    const sym = getSymbol(item);
    if (sym) row.symbol = sym;
    map.set(cur, row);
  }
  return [...map.values()].sort((a, b) => a.currency.localeCompare(b.currency));
}

export function aggregateExpensesByCurrency(
  items: Expense[],
  returnedFor: (exp: Expense) => number,
): CurrencyAmountRow[] {
  const map = new Map<string, CurrencyAmountRow>();
  for (const exp of items) {
    const cur = exp.currency || "USD";
    const row =
      map.get(cur) ??
      ({
        currency: cur,
        symbol: exp.currencySymbol || "$",
        gross: 0,
        returns: 0,
        net: 0,
      } satisfies CurrencyAmountRow);
    const gross = Number(exp.amount) || 0;
    const returned = returnedFor(exp);
    row.gross += gross;
    row.returns += returned;
    row.net += Math.max(0, gross - returned);
    if (exp.currencySymbol) row.symbol = exp.currencySymbol;
    map.set(cur, row);
  }
  return [...map.values()].sort((a, b) => a.currency.localeCompare(b.currency));
}

export function FinanceNativeFooter({
  rows,
  amountKey = "gross",
}: {
  rows: CurrencyAmountRow[];
  amountKey?: "gross" | "net";
}) {
  const natives = rows.filter((r) => r[amountKey] > 0.0001);
  if (natives.length === 0) return null;
  if (natives.length === 1 && natives[0].currency === "USD") return null;

  const tooltipText = natives
    .map((r) => `${r.currency}: ${formatNativeMoney(r.symbol, r[amountKey])}`)
    .join("\n");
  const compactParts = natives.map(
    (r) => `${formatNativeMoney(r.symbol, r[amountKey])} ${r.currency}`,
  );
  const maxInline = 2;
  const inline =
    compactParts.length <= maxInline
      ? compactParts.join(" · ")
      : `${compactParts.slice(0, maxInline).join(" · ")} · +${compactParts.length - maxInline}`;

  return (
    <FloatingFieldTooltip text={tooltipText} variant="info">
      <span
        tabIndex={0}
        className="cursor-help underline decoration-dotted decoration-gray-400 underline-offset-2 dark:decoration-gray-500"
      >
        {inline}
      </span>
    </FloatingFieldTooltip>
  );
}

function sortRowsByWeight(
  rows: CurrencyAmountRow[],
  amountKey: "gross" | "net",
  exchangeRates: Record<string, number>,
): CurrencyAmountRow[] {
  const weight = (row: CurrencyAmountRow) =>
    toUsdAmount(row[amountKey], row.currency, exchangeRates);
  return [...rows].sort((a, b) => weight(b) - weight(a));
}

export function buildFinanceStatDisplay(
  rows: CurrencyAmountRow[],
  usdAmount: number,
  canViewUsd: boolean,
  amountKey: "gross" | "net" = "gross",
  exchangeRates: Record<string, number> = {},
): { primary: string; secondary: React.ReactNode } {
  if (rows.length === 0) {
    return { primary: formatUsdAmount(0), secondary: null };
  }

  if (canViewUsd) {
    return {
      primary: formatUsdAmount(usdAmount),
      secondary: <FinanceNativeFooter rows={rows} amountKey={amountKey} />,
    };
  }

  const sorted = sortRowsByWeight(rows, amountKey, exchangeRates);
  const top = sorted[0];
  const rest = sorted.slice(1);
  return {
    primary: formatNativeMoney(top.symbol, top[amountKey]),
    secondary:
      rest.length > 0 ? (
        <FinanceNativeFooter rows={rest} amountKey={amountKey} />
      ) : null,
  };
}

export function financeStatHint(canViewUsd: boolean, context?: string): string {
  if (canViewUsd) {
    return "Converted USD total · hover for native breakdown";
  }
  return context || "By currency · hover for breakdown";
}
