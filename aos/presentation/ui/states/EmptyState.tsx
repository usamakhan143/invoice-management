import React from "react";
import { cn } from "../utils/cn";

export interface EmptyStateProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-[var(--space-page-x)] py-[var(--space-stack-xl)] text-center",
        className,
      )}
    >
      <div className="flex max-w-md flex-col items-center gap-[var(--space-stack-md)]">
        <h2 className="text-[length:var(--font-size-heading)] font-[var(--font-weight-semibold)] leading-[var(--line-height-tight)] text-[var(--color-text-primary)]">
          {title}
        </h2>
        {description ? (
          <p className="text-[length:var(--font-size-body)] leading-[var(--line-height-body)] text-[var(--color-text-secondary)]">
            {description}
          </p>
        ) : null}
        {action ? <div>{action}</div> : null}
      </div>
    </div>
  );
};
