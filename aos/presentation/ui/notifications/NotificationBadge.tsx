import React from "react";
import { cn } from "../utils/cn";

export interface NotificationBadgeProps {
  count: number;
  max?: number;
  label?: string;
  showZero?: boolean;
  className?: string;
}

function formatCount(count: number, max: number): string {
  if (count > max) {
    return `${max}+`;
  }
  return String(count);
}

export function NotificationBadge({
  count,
  max = 99,
  label,
  showZero = false,
  className,
}: NotificationBadgeProps): React.ReactElement | null {
  if (count <= 0 && !showZero) {
    return null;
  }

  const display = formatCount(count, max);
  const ariaLabel = label ?? `${count} notifications`;

  return (
    <span
      aria-label={ariaLabel}
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-[var(--radius-full)] bg-[var(--color-interactive-danger)] px-1 text-[length:var(--font-size-caption)] font-[var(--font-weight-semibold)] leading-none text-[var(--color-text-inverse)]",
        className,
      )}
    >
      {display}
    </span>
  );
}
