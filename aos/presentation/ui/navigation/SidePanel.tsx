import React, { useCallback } from "react";
import { IconButton } from "../buttons/IconButton";
import { IconX } from "../icons/Icons";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { cn } from "../utils/cn";

export interface SidePanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Secondary detail surface — slides from right on desktop, full-screen on mobile.
 */
export const SidePanel: React.FC<SidePanelProps> = ({
  open,
  onClose,
  title,
  children,
  className,
}) => {
  const panelRef = useFocusTrap(open);
  const handleClose = useCallback(() => onClose(), [onClose]);

  useEscapeKey(open, handleClose);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[var(--z-side-panel)] flex justify-end">
      <button
        type="button"
        aria-label="Close panel"
        className="absolute inset-0 bg-black/30"
        onClick={handleClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="aos-side-panel-title"
        className={cn(
          "relative flex h-full w-full flex-col border-l border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-md)]",
          "sm:max-w-[var(--size-sidebar-panel-width)]",
          className,
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-[var(--space-inline-md)] border-b border-[var(--color-border-default)] px-[var(--space-card-padding)] py-[var(--space-stack-sm)]">
          <h2
            id="aos-side-panel-title"
            className="min-w-0 truncate text-[length:var(--font-size-heading)] font-[var(--font-weight-semibold)] text-[var(--color-text-primary)]"
          >
            {title}
          </h2>
          <IconButton aria-label="Close panel" onClick={handleClose}>
            <IconX />
          </IconButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-[var(--space-card-padding)]">{children}</div>
      </div>
    </div>
  );
};
