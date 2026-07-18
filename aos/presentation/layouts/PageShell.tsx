import React from "react";
import { cn } from "../ui/utils/cn";

export interface PageShellProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Root wrapper for AOS routes inside the ERP content area.
 */
const PageShell: React.FC<PageShellProps> = ({ children, className }) => {
  return (
    <main
      id="aos-main-content"
      className={cn(
        "mx-auto w-full max-w-[var(--size-content-max-width)] bg-[var(--color-surface-page)] px-[var(--space-page-x)] py-[var(--space-page-y)] font-[family-name:var(--font-family-sans)] text-[length:var(--font-size-body)] leading-[var(--line-height-body)] text-[var(--color-text-primary)]",
        className,
      )}
    >
      {children}
    </main>
  );
};

export default PageShell;
