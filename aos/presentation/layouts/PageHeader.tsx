import React from "react";
import { cn } from "../ui/utils/cn";

export interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  breadcrumb?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Title region with optional breadcrumb and a single primary action slot.
 */
const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumb,
  actions,
  className,
}) => {
  return (
    <header className={cn("mb-[var(--space-stack-md)]", className)}>
      {breadcrumb ? (
        <div className="mb-[var(--space-stack-sm)]">{breadcrumb}</div>
      ) : null}
      <div className="flex flex-col gap-[var(--space-stack-md)] sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-[length:var(--font-size-display)] font-[var(--font-weight-semibold)] leading-[var(--line-height-tight)] text-[var(--color-text-primary)]">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-[var(--space-stack-xs)] text-[length:var(--font-size-body)] text-[var(--color-text-secondary)]">
              {subtitle}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-[var(--space-inline-md)]">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
};

export default PageHeader;
