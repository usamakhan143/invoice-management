import React from "react";
import { cn } from "../utils/cn";

export interface TableToolbarProps {
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}

export function TableToolbar({
  left,
  center,
  right,
  className,
}: TableToolbarProps): React.ReactElement {
  return (
    <div
      className={cn(
        "aos-toolbar mb-[var(--space-stack-md)] flex flex-col gap-[var(--space-stack-sm)] rounded-[var(--radius-xl)] border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-[var(--space-stack-md)] shadow-[var(--shadow-md)] ring-1 ring-[var(--ring-card)] sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      {left != null && (
        <div className="flex min-w-0 flex-1 items-center gap-[var(--space-inline-md)]">{left}</div>
      )}
      {center != null && (
        <div className="flex flex-wrap items-center gap-[var(--space-inline-sm)]">{center}</div>
      )}
      {right != null && (
        <div className="flex shrink-0 items-center justify-end gap-[var(--space-inline-md)]">
          {right}
        </div>
      )}
    </div>
  );
}
