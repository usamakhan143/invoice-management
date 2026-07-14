import { toUsdAmount } from "./financeCurrencyDisplay";

export const DEFAULT_EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  PKR: 278,
  EUR: 0.85,
};

export async function fetchExchangeRates(): Promise<Record<string, number>> {
  try {
    const response = await fetch("https://open.er-api.com/v6/latest/USD", {
      signal: AbortSignal.timeout(5000),
    });
    const data = await response.json();
    if (data?.rates) {
      return data.rates as Record<string, number>;
    }
  } catch {
    // fall through to defaults
  }
  return DEFAULT_EXCHANGE_RATES;
}

/** Converts an amount from one currency to another using USD-based rates. */
export function convertCurrencyAmount(
  amount: number,
  fromCurrency: string | undefined,
  toCurrency: string | undefined,
  exchangeRates: Record<string, number>,
): number {
  const from = fromCurrency || "USD";
  const to = toCurrency || "USD";
  if (from === to) return amount;
  const usdAmount = toUsdAmount(amount, from, exchangeRates);
  const toRate = exchangeRates[to] || 1;
  return usdAmount * toRate;
}
