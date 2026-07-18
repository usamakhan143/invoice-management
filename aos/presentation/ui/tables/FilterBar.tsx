import React from "react";
import { cn, focusRing } from "../utils/cn";

export interface FilterBarProps {
  children: React.ReactNode;
  onClearAll?: () => void;
  clearAllLabel?: string;
  className?: string;
}

export function FilterBar({
  children,
  onClearAll,
  clearAllLabel = "Clear all",
  className,
}: FilterBarProps): React.ReactElement {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-[var(--space-inline-sm)]",
        className,
      )}
      role="group"
      aria-label="Filters"
    >
      {children}
      {onClearAll != null && (
        <button
          type="button"
          onClick={onClearAll}
          className={cn(
            "ml-auto text-[length:var(--font-size-label)] font-[var(--font-weight-medium)] text-[var(--color-text-link)] underline-offset-2 hover:underline",
            focusRing,
          )}
        >
          {clearAllLabel}
        </button>
      )}
    </div>
  );
}
