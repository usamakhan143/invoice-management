import React from "react";
import { IconX } from "../icons/Icons";
import { cn, focusRing } from "../utils/cn";

export type ToastVariant = "success" | "warning" | "error" | "neutral";

const variantStyles: Record<ToastVariant, { container: string; icon: string }> = {
  success: {
    container:
      "border-[var(--color-border-approved)] bg-[var(--color-surface-approved)] text-[var(--color-text-success)]",
    icon: "text-[var(--color-text-success)]",
  },
  warning: {
    container:
      "border-[var(--color-border-default)] bg-[var(--color-surface-warning-subtle)] text-[var(--color-text-warning)]",
    icon: "text-[var(--color-text-warning)]",
  },
  error: {
    container:
      "border-[var(--color-border-danger)] bg-[var(--color-surface-danger-subtle)] text-[var(--color-text-danger)]",
    icon: "text-[var(--color-text-danger)]",
  },
  neutral: {
    container:
      "border-[var(--color-border-default)] bg-[var(--color-surface-card)] text-[var(--color-text-primary)]",
    icon: "text-[var(--color-text-secondary)]",
  },
};

export interface ToastProps {
  id: string;
  message: React.ReactNode;
  variant?: ToastVariant;
  action?: React.ReactNode;
  onDismiss: (id: string) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  className?: string;
}

export function Toast({
  id,
  message,
  variant = "neutral",
  action,
  onDismiss,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  className,
}: ToastProps): React.ReactElement {
  const styles = variantStyles[variant];
  const isAlert = variant === "error";

  return (
    <div
      role={isAlert ? "alert" : "status"}
      aria-live={isAlert ? "assertive" : "polite"}
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-[var(--space-inline-md)] rounded-[var(--radius-lg)] border p-[var(--space-stack-md)] shadow-[var(--shadow-md)]",
        styles.container,
        className,
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      <div className="min-w-0 flex-1 text-[length:var(--font-size-body)] leading-[var(--line-height-body)]">
        {message}
        {action != null && (
          <div className="mt-[var(--space-stack-xs)]">{action}</div>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(id)}
        aria-label="Dismiss notification"
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-[var(--radius-sm)] p-0.5 opacity-70 hover:opacity-100",
          focusRing,
          styles.icon,
        )}
      >
        <IconX className="h-[var(--size-icon-sm)] w-[var(--size-icon-sm)]" />
      </button>
    </div>
  );
}
