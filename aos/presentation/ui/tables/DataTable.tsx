import React from "react";
import { cn } from "../utils/cn";

export interface DataTableColumn<T> {
  id: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  density?: "comfortable" | "compact";
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyState?: React.ReactNode;
  getRowKey?: (row: T, index: number) => string;
  className?: string;
  "aria-label"?: string;
}

const SKELETON_ROW_COUNT = 5;

function TableRowSkeleton({
  columnCount,
  density,
}: {
  columnCount: number;
  density: "comfortable" | "compact";
}) {
  return (
    <tr
      className={cn(
        "border-b border-[var(--color-border-subtle)]",
        density === "compact"
          ? "h-[var(--size-table-row-height-compact)]"
          : "h-[var(--size-table-row-height-comfortable)]",
      )}
    >
      {Array.from({ length: columnCount }, (_, index) => (
        <td
          key={index}
          className="px-[var(--space-inline-md)] py-[var(--space-stack-sm)]"
        >
          <div
            className="h-4 animate-pulse rounded-[var(--radius-sm)] bg-[var(--color-surface-inset)]"
            aria-hidden="true"
          />
        </td>
      ))}
    </tr>
  );
}

export function DataTable<T>({
  columns,
  rows,
  density = "comfortable",
  onRowClick,
  loading = false,
  emptyState,
  getRowKey,
  className,
  "aria-label": ariaLabel,
}: DataTableProps<T>): React.ReactElement {
  const rowHeightClass =
    density === "compact"
      ? "h-[var(--size-table-row-height-compact)]"
      : "h-[var(--size-table-row-height-comfortable)]";

  const isEmpty = !loading && rows.length === 0;

  return (
    <div
      className={cn(
        "overflow-auto rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-surface-card)] shadow-[var(--shadow-md)] ring-1 ring-[var(--ring-card)]",
        className,
      )}
    >
      <table className="w-full border-collapse text-left text-sm" aria-label={ariaLabel}>
        <thead className="sticky top-0 z-[var(--z-sticky)] border-b border-[var(--color-border-default)] bg-[var(--color-surface-table-header)]">
          <tr className="border-b border-[var(--color-border-default)]">
            {columns.map((column) => (
              <th
                key={column.id}
                scope="col"
                className={cn(
                  "px-[var(--space-inline-md)] py-[var(--space-stack-sm)] uppercase tracking-wide",
                  "text-[length:var(--font-size-caption)] font-[var(--font-weight-semibold)] leading-[var(--line-height-tight)] text-[var(--color-text-secondary)]",
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading &&
            Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
              <TableRowSkeleton
                key={`skeleton-${index}`}
                columnCount={columns.length}
                density={density}
              />
            ))}

          {isEmpty && (
            <tr>
              <td colSpan={columns.length} className="p-[var(--space-stack-lg)]">
                {emptyState ?? (
                  <p className="text-center text-[length:var(--font-size-body)] text-[var(--color-text-secondary)]">
                    No results
                  </p>
                )}
              </td>
            </tr>
          )}

          {!loading &&
            rows.map((row, index) => {
              const key = getRowKey?.(row, index) ?? String(index);
              const clickable = Boolean(onRowClick);

              return (
                <tr
                  key={key}
                  className={cn(
                    rowHeightClass,
                    "border-b border-[var(--color-border-subtle)] text-[length:var(--font-size-body)] text-[var(--color-text-primary)]",
                    clickable &&
                      "cursor-pointer transition-colors hover:bg-[var(--color-surface-table-row-hover)] focus-visible:shadow-[var(--shadow-focus-offset)]",
                  )}
                  onClick={clickable ? () => onRowClick?.(row) : undefined}
                  onKeyDown={
                    clickable
                      ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onRowClick?.(row);
                          }
                        }
                      : undefined
                  }
                  tabIndex={clickable ? 0 : undefined}
                  role={clickable ? "button" : undefined}
                >
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className="px-[var(--space-inline-md)] py-[var(--space-stack-sm)] align-middle"
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}
