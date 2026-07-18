import React, { useCallback, useId } from "react";
import { createPortal } from "react-dom";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { cn } from "../utils/cn";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  preventCloseOnOverlay?: boolean;
  preventCloseOnEscape?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeStyles: Record<NonNullable<DialogProps["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  preventCloseOnOverlay = false,
  preventCloseOnEscape = false,
  className,
  size = "md",
}: DialogProps): React.ReactElement | null {
  const titleId = useId();
  const descriptionId = useId();
  const containerRef = useFocusTrap(open);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEscapeKey(open && !preventCloseOnEscape, handleClose);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center p-0 sm:items-center sm:p-[var(--space-page-x)]"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close dialog overlay"
        className="absolute inset-0 bg-black/40"
        onClick={preventCloseOnOverlay ? undefined : handleClose}
        tabIndex={-1}
      />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          "relative z-[calc(var(--z-modal)+1)] flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-[var(--radius-xl)] border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-md)] sm:max-h-[85vh] sm:rounded-[var(--radius-lg)]",
          sizeStyles[size],
          className,
        )}
      >
        <div className="overflow-y-auto p-[var(--space-stack-lg)]">
          <h2
            id={titleId}
            className="text-[length:var(--font-size-heading)] font-[var(--font-weight-semibold)] leading-[var(--line-height-tight)] text-[var(--color-text-primary)]"
          >
            {title}
          </h2>
          {description != null && (
            <p
              id={descriptionId}
              className="mt-[var(--space-stack-sm)] text-[length:var(--font-size-body)] leading-[var(--line-height-body)] text-[var(--color-text-secondary)]"
            >
              {description}
            </p>
          )}
          {children != null && (
            <div className="mt-[var(--space-stack-md)]">{children}</div>
          )}
        </div>
        {footer != null && (
          <div className="flex shrink-0 flex-col-reverse gap-[var(--space-stack-sm)] border-t border-[var(--color-border-subtle)] p-[var(--space-stack-md)] sm:flex-row sm:justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
