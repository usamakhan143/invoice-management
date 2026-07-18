import React from "react";
import { cn, disabledStyles, focusRing } from "../utils/cn";

export interface PaginationProps {
  showingCount: number;
  hasMore: boolean;
  onLoadMore: () => void;
  loadMoreLabel?: string;
  loading?: boolean;
  className?: string;
}

export function Pagination({
  showingCount,
  hasMore,
  onLoadMore,
  loadMoreLabel = "Load more",
  loading = false,
  className,
}: PaginationProps): React.ReactElement {
  if (showingCount <= 0 && !hasMore) {
    return <></>;
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-[var(--space-stack-sm)] sm:flex-row sm:justify-between",
        className,
      )}
      aria-live="polite"
    >
      <p className="text-[length:var(--font-size-caption)] text-[var(--color-text-secondary)]">
        Showing {showingCount.toLocaleString()}
        {hasMore ? ` · ${loadMoreLabel}` : ""}
      </p>
      {hasMore && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={loading}
          className={cn(
            "inline-flex h-[var(--size-button-height-sm)] items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-interactive-secondary)] px-[var(--space-inline-md)] text-[length:var(--font-size-label)] font-[var(--font-weight-medium)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-inset)]",
            focusRing,
            disabledStyles,
          )}
        >
          {loading ? "Loading…" : loadMoreLabel}
        </button>
      )}
    </div>
  );
}
