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
    <header className={cn("mb-[var(--space-stack-lg)]", className)}>
      {breadcrumb ? (
        <div className="mb-[var(--space-stack-sm)] w-full">{breadcrumb}</div>
      ) : null}
      <div className="flex w-full flex-col gap-[var(--space-stack-md)] sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="m-0 text-[length:var(--font-size-page-title)] font-[var(--font-weight-bold)] leading-[var(--line-height-tight)] text-[var(--color-text-primary)] sm:text-[length:var(--font-size-display)]">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-[var(--space-stack-sm)] text-[length:var(--font-size-body)] text-[var(--color-text-secondary)]">
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
