import React from "react";
import { IconX } from "../icons/Icons";
import { cn, focusRing } from "../utils/cn";

export interface FilterChipProps {
  label: string;
  value: string;
  onRemove: () => void;
  className?: string;
}

export function FilterChip({
  label,
  value,
  onRemove,
  className,
}: FilterChipProps): React.ReactElement {
  const removeLabel = `Remove ${label} filter: ${value}`;

  return (
    <span
      className={cn(
        "inline-flex h-[var(--size-status-chip-height)] max-w-full items-center gap-[var(--space-inline-sm)] rounded-[var(--radius-full)] border border-[var(--color-border-default)] bg-[var(--color-surface-card)] px-[var(--space-inline-md)] text-[length:var(--font-size-caption)] font-[var(--font-weight-medium)] text-[var(--color-text-primary)] shadow-[var(--shadow-sm)]",
        className,
      )}
    >
      <span className="truncate">
        <span className="font-[var(--font-weight-medium)]">{label}:</span> {value}
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-[var(--radius-sm)] p-0.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-card)] hover:text-[var(--color-text-primary)]",
          focusRing,
        )}
      >
        <IconX className="h-[var(--size-icon-sm)] w-[var(--size-icon-sm)]" />
      </button>
    </span>
  );
}
