import React from "react";
import { cn } from "../ui/utils/cn";

export interface StickyFooterBarProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Sticky bottom action bar for approve/reject and form flows.
 */
const StickyFooterBar: React.FC<StickyFooterBarProps> = ({ children, className }) => {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-[var(--z-sticky)] -mx-[var(--space-page-x)] mt-[var(--space-stack-lg)] border-t border-[var(--color-border-default)] bg-[var(--color-surface-card)] px-[var(--space-page-x)] py-[var(--space-stack-md)] shadow-[var(--shadow-sm)]",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-end gap-[var(--space-inline-md)]">
        {children}
      </div>
    </div>
  );
};

export default StickyFooterBar;
