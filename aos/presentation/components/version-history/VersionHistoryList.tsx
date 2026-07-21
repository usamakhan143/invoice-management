import React from "react";
import { Card, DataTable, EmptyState, ErrorState, LoadingState, StatusChip } from "../../ui";
import { formatVersionTimestamp } from "./versionHistoryFormat";

export interface VersionHistoryRow {
  id: string;
  primaryLabel: string;
  secondaryLabel?: string;
  versionNumber?: number;
  statusLabel?: string;
  statusVariant?: "neutral" | "success" | "warning" | "error" | "ai" | "approved";
  timestamp?: number;
  isCurrent?: boolean;
  readOnly?: boolean;
}

export interface VersionHistoryListProps {
  rows: VersionHistoryRow[];
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  onSelect?: (row: VersionHistoryRow) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  ariaLabel?: string;
}

/** Responsive history list — table on md+, cards on mobile. */
export const VersionHistoryList: React.FC<VersionHistoryListProps> = ({
  rows,
  loading,
  error,
  onRetry,
  onSelect,
  emptyTitle = "No version history",
  emptyDescription = "Published immutable versions will appear here after approval.",
  ariaLabel = "Version history",
}) => {
  if (loading) return <LoadingState message="Loading version history…" />;
  if (error) {
    return (
      <ErrorState title="Could not load history" message={error.message} onRetry={onRetry ? () => void onRetry() : undefined} />
    );
  }
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <>
      <div className="hidden md:block">
        <DataTable
          aria-label={ariaLabel}
          rows={rows}
          getRowKey={(row) => row.id}
          onRowClick={onSelect}
          columns={[
            {
              id: "version",
              header: "Version",
              cell: (row) => (
                <span className="inline-flex flex-wrap items-center gap-[var(--space-inline-sm)] font-[var(--font-weight-medium)]">
                  {row.primaryLabel}
                  {row.isCurrent ? <StatusChip label="Current" variant="approved" /> : null}
                </span>
              ),
            },
            {
              id: "status",
              header: "Status",
              cell: (row) =>
                row.statusLabel ? <StatusChip label={row.statusLabel} variant={row.statusVariant ?? "neutral"} /> : "—",
            },
            {
              id: "published",
              header: "Timestamp",
              cell: (row) => formatVersionTimestamp(row.timestamp),
            },
            {
              id: "meta",
              header: "Notes",
              cell: (row) => row.secondaryLabel ?? (row.readOnly ? "Read-only" : "—"),
            },
          ]}
        />
      </div>
      <ul className="flex flex-col gap-[var(--space-stack-sm)] md:hidden" aria-label={ariaLabel}>
        {rows.map((row) => (
          <li key={row.id}>
            <Card
              className={onSelect ? "cursor-pointer hover:border-[var(--color-border-focus)]" : undefined}
              onClick={onSelect ? () => onSelect(row) : undefined}
              role={onSelect ? "button" : undefined}
              tabIndex={onSelect ? 0 : undefined}
              onKeyDown={
                onSelect
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect(row);
                      }
                    }
                  : undefined
              }
            >
              <Card.Body>
                <div className="flex flex-wrap items-center gap-[var(--space-inline-sm)]">
                  <span className="font-[var(--font-weight-semibold)]">{row.primaryLabel}</span>
                  {row.isCurrent ? <StatusChip label="Current" variant="approved" /> : null}
                  {row.statusLabel ? <StatusChip label={row.statusLabel} variant={row.statusVariant ?? "neutral"} /> : null}
                </div>
                {row.secondaryLabel ? (
                  <p className="mt-[var(--space-stack-xs)] text-[length:var(--font-size-caption)] text-[var(--color-text-secondary)]">
                    {row.secondaryLabel}
                  </p>
                ) : null}
                <p className="mt-[var(--space-stack-xs)] text-[length:var(--font-size-caption)] text-[var(--color-text-secondary)]">
                  {formatVersionTimestamp(row.timestamp)}
                  {row.readOnly ? " · Read-only" : ""}
                </p>
              </Card.Body>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
};
