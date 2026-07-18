import React from "react";
import { Link } from "react-router-dom";
import { IconChevronRight } from "../icons/Icons";
import { cn, focusRing } from "../utils/cn";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Wayfinding trail — all segments linked except the current (last) item.
 */
export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className }) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-[var(--space-inline-sm)]">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-[var(--space-inline-sm)]">
              {index > 0 ? (
                <IconChevronRight
                  aria-hidden="true"
                  className="h-[var(--size-icon-sm)] w-[var(--size-icon-sm)] shrink-0 text-[var(--color-text-tertiary)]"
                />
              ) : null}
              {isCurrent || !item.href ? (
                <span
                  aria-current={isCurrent ? "page" : undefined}
                  className={cn(
                    "truncate text-[length:var(--font-size-caption)]",
                    isCurrent
                      ? "font-[var(--font-weight-medium)] text-[var(--color-text-primary)]"
                      : "text-[var(--color-text-secondary)]",
                  )}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.href}
                  className={cn(
                    "truncate text-[length:var(--font-size-caption)] text-[var(--color-text-link)] hover:text-[var(--color-interactive-primary-hover)] hover:underline",
                    focusRing,
                  )}
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
