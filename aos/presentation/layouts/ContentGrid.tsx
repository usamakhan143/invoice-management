import React from "react";
import { cn } from "../ui/utils/cn";

export interface ContentGridProps {
  columns?: 1 | 2;
  children: React.ReactNode;
  className?: string;
}

/**
 * Responsive column layout — 1 col default, 2 col at lg for list+detail.
 */
const ContentGrid: React.FC<ContentGridProps> = ({ columns = 1, children, className }) => {
  return (
    <div
      className={cn(
        "grid gap-[var(--space-stack-lg)]",
        columns === 2 ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1",
        className,
      )}
    >
      {children}
    </div>
  );
};

export default ContentGrid;
