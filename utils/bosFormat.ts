import { parseLocalDayKey } from "./localDayKey";

export const BOS_FIELD_CLASS =
  "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-500";

/** Converts `<input type="date">` value to epoch ms (local start of day). */
export function parseBosPlannedDate(dayKey: string): number | undefined {
  const date = parseLocalDayKey(dayKey);
  return date ? date.getTime() : undefined;
}

export function formatBosPlannedDateInput(epochMs?: number): string {
  if (!epochMs) return "";
  const d = new Date(epochMs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatBosMoney(amount: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatBosDate(epochMs: number): string {
  if (!epochMs) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(epochMs));
}
