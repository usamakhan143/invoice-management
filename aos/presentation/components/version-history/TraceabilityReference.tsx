import React, { useCallback } from "react";
import { Button } from "../../ui/buttons/Button";
import { cn } from "../../ui/utils/cn";

export interface TraceabilityReferenceProps {
  label: string;
  technicalId?: string;
  onNavigate?: () => void;
  navigateLabel?: string;
  className?: string;
}

/** Secondary metadata reference with optional in-context navigation. */
export const TraceabilityReference: React.FC<TraceabilityReferenceProps> = ({
  label,
  technicalId,
  onNavigate,
  navigateLabel = "View",
  className,
}) => {
  const copyId = useCallback(() => {
    if (!technicalId || !navigator.clipboard) return;
    void navigator.clipboard.writeText(technicalId);
  }, [technicalId]);

  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-surface-inset)] p-[var(--space-stack-sm)]",
        className,
      )}
    >
      <p className="text-[length:var(--font-size-body)] font-[var(--font-weight-medium)] text-[var(--color-text-primary)]">
        {label}
      </p>
      {technicalId ? (
        <div className="mt-[var(--space-stack-xs)] flex flex-wrap items-center gap-[var(--space-inline-sm)]">
          <code className="text-[length:var(--font-size-caption)] text-[var(--color-text-secondary)]">
            {technicalId}
          </code>
          <Button type="button" variant="ghost" size="sm" onClick={copyId} aria-label={`Copy ${label} ID`}>
            Copy ID
          </Button>
        </div>
      ) : null}
      {onNavigate ? (
        <Button type="button" variant="ghost" size="sm" className="mt-[var(--space-stack-xs)]" onClick={onNavigate}>
          {navigateLabel}
        </Button>
      ) : null}
    </div>
  );
};
