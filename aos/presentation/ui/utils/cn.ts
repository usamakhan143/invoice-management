export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export const focusRing =
  "focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus-offset)]";

export const inputFocusRing =
  "focus-visible:outline-none focus-visible:border-[var(--color-border-focus)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500,#3b82f6)]/20";

export const disabledStyles = "disabled:cursor-not-allowed disabled:opacity-50";
