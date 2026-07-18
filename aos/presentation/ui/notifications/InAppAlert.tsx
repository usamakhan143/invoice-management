import React from "react";
import { IconAlertTriangle, IconX } from "../icons/Icons";
import { cn, focusRing } from "../utils/cn";

export type InAppAlertVariant = "info" | "warning" | "error";

const variantStyles: Record<InAppAlertVariant, string> = {
  info: "border-[var(--color-border-default)] bg-[var(--color-surface-inset)] text-[var(--color-text-primary)]",
  warning:
    "border-[var(--color-border-default)] bg-[var(--color-surface-warning-subtle)] text-[var(--color-text-warning)]",
  error:
    "border-[var(--color-border-danger)] bg-[var(--color-surface-danger-subtle)] text-[var(--color-text-danger)]",
};

export interface InAppAlertProps {
  variant?: InAppAlertVariant;
  title?: React.ReactNode;
  children: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  action?: React.ReactNode;
  className?: string;
}

export function InAppAlert({
  variant = "info",
  title,
  children,
  dismissible = false,
  onDismiss,
  action,
  className,
}: InAppAlertProps): React.ReactElement {
  const isError = variant === "error";

  return (
    <div
      role={isError ? "alert" : "status"}
      className={cn(
        "flex items-start gap-[var(--space-inline-md)] rounded-[var(--radius-lg)] border p-[var(--space-stack-md)]",
        variantStyles[variant],
        className,
      )}
    >
      {variant !== "info" && (
        <IconAlertTriangle
          className="mt-0.5 h-[var(--size-icon-md)] w-[var(--size-icon-md)] shrink-0"
          aria-hidden="true"
        />
      )}
      <div className="min-w-0 flex-1">
        {title != null && (
          <p className="mb-[var(--space-stack-xs)] text-[length:var(--font-size-label)] font-[var(--font-weight-semibold)]">
            {title}
          </p>
        )}
        <div className="text-[length:var(--font-size-body)] leading-[var(--line-height-body)]">
          {children}
        </div>
        {action != null && (
          <div className="mt-[var(--space-stack-sm)]">{action}</div>
        )}
      </div>
      {dismissible && onDismiss != null && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss alert"
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-[var(--radius-sm)] p-0.5 opacity-70 hover:opacity-100",
            focusRing,
          )}
        >
          <IconX className="h-[var(--size-icon-sm)] w-[var(--size-icon-sm)]" />
        </button>
      )}
    </div>
  );
}
