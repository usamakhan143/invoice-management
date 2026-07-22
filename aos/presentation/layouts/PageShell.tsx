import React from "react";
import { cn } from "../ui/utils/cn";

export interface PageShellProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Root wrapper for AOS routes inside the ERP content area.
 * Padding and canvas come from AppLayout; AOS only sets typography rhythm.
 */
const PageShell: React.FC<PageShellProps> = ({ children, className }) => {
  return (
    <div
      id="aos-main-content"
      className={cn(
        "aos-page mx-auto w-full max-w-[var(--size-content-max-width)] bg-[var(--color-surface-page)] font-[family-name:var(--font-family-sans)] text-[length:var(--font-size-body)] leading-[var(--line-height-body)] text-[var(--color-text-primary)]",
        className,
      )}
    >
      {children}
    </div>
  );
};

export default PageShell;
