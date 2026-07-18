import React from "react";
import { IconLock } from "../ui/icons/Icons";
import { cn } from "../ui/utils/cn";

export interface LockedOverlayProps {
  message: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Semi-transparent overlay blocking interaction with read-only content.
 */
export const LockedOverlay: React.FC<LockedOverlayProps> = ({
  message,
  children,
  className,
}) => {
  return (
    <div className={cn("relative", className)}>
      <div aria-hidden="true" className="pointer-events-none select-none opacity-60">
        {children}
      </div>
      <div
        role="status"
        tabIndex={0}
        className="absolute inset-0 flex flex-col items-center justify-center gap-[var(--space-stack-sm)] rounded-[var(--radius-md)] bg-[var(--color-surface-page)]/80 px-[var(--space-card-padding)] text-center backdrop-blur-[1px]"
      >
        <IconLock className="h-[var(--size-icon-md)] w-[var(--size-icon-md)] text-[var(--color-text-secondary)]" />
        <p className="max-w-sm text-[length:var(--font-size-body)] text-[var(--color-text-primary)]">
          {message}
        </p>
      </div>
    </div>
  );
};
