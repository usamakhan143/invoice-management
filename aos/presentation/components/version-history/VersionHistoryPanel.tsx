import React, { useState } from "react";
import { Button, SidePanel } from "../../ui";
import { VersionHistoryList, type VersionHistoryRow } from "./VersionHistoryList";

export interface VersionHistoryPanelProps {
  title: string;
  rows: VersionHistoryRow[];
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  renderDetail: (row: VersionHistoryRow, onClose: () => void) => React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  disabledMessage?: string;
}

/**
 * Generic immutable history panel — list + read-only SidePanel detail.
 */
export const VersionHistoryPanel: React.FC<VersionHistoryPanelProps> = ({
  title,
  rows,
  loading,
  error,
  onRetry,
  renderDetail,
  emptyTitle,
  emptyDescription,
  disabledMessage,
}) => {
  const [selected, setSelected] = useState<VersionHistoryRow | null>(null);

  if (disabledMessage) {
    return (
      <section aria-label={title} className="rounded-[var(--radius-lg)] border border-[var(--color-border-default)] p-[var(--space-card-padding)]">
        <h3 className="text-[length:var(--font-size-body)] font-[var(--font-weight-semibold)]">{title}</h3>
        <p className="mt-[var(--space-stack-sm)] text-[length:var(--font-size-body)] text-[var(--color-text-secondary)]">
          {disabledMessage}
        </p>
      </section>
    );
  }

  return (
    <section aria-label={title} className="flex flex-col gap-[var(--space-stack-md)]">
      <div className="flex flex-wrap items-center justify-between gap-[var(--space-inline-sm)]">
        <h3 className="text-[length:var(--font-size-body)] font-[var(--font-weight-semibold)]">{title}</h3>
        {rows.length > 0 ? (
          <span className="text-[length:var(--font-size-caption)] text-[var(--color-text-secondary)]">
            {rows.length} record{rows.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>
      <VersionHistoryList
        rows={rows}
        loading={loading}
        error={error}
        onRetry={onRetry}
        onSelect={setSelected}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        ariaLabel={title}
      />
      <SidePanel
        open={selected != null}
        onClose={() => setSelected(null)}
        title={selected?.primaryLabel ?? "Version detail"}
      >
        {selected ? renderDetail(selected, () => setSelected(null)) : null}
        <div className="mt-[var(--space-stack-lg)]">
          <Button variant="secondary" onClick={() => setSelected(null)}>
            Close
          </Button>
        </div>
      </SidePanel>
    </section>
  );
};
