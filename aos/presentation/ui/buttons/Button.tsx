import React from "react";
import { IconSpinner } from "../icons/Icons";
import { cn, disabledStyles, focusRing } from "../utils/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "approve"
  | "sidecar";

export type ButtonSize = "sm" | "md" | "lg";

export type ButtonType = "button" | "submit";

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  type?: ButtonType;
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-[var(--size-button-height-sm)] px-[var(--space-inline-md)] text-[length:var(--font-size-label)]",
  md: "h-[var(--size-button-height-md)] px-[var(--space-stack-md)] text-[length:var(--font-size-label)]",
  lg: "h-[var(--size-button-height-md)] px-[var(--space-stack-lg)] text-[length:var(--font-size-body)]",
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-interactive-primary)] text-[var(--color-text-inverse)] hover:bg-[var(--color-interactive-primary-hover)] disabled:bg-[var(--color-interactive-primary-disabled)]",
  secondary:
    "border border-[var(--color-border-default)] bg-[var(--color-interactive-secondary)] text-[var(--color-text-primary)] shadow-[var(--shadow-sm)] hover:bg-[var(--color-interactive-secondary-hover)]",
  ghost:
    "bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-inset)] hover:text-[var(--color-text-primary)]",
  danger:
    "bg-[var(--color-interactive-danger)] text-[var(--color-text-inverse)] hover:opacity-90",
  approve:
    "border border-[var(--color-border-approved)] bg-[var(--color-interactive-primary)] text-[var(--color-text-inverse)] hover:bg-[var(--color-interactive-primary-hover)]",
  sidecar:
    "bg-transparent text-[var(--color-text-link-sidecar)] underline-offset-2 hover:text-[var(--color-text-primary)] hover:underline",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      type = "button",
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        className={cn(
          "inline-flex items-center justify-center gap-[var(--space-inline-sm)] rounded-[var(--radius-lg)] font-[var(--font-weight-medium)] leading-[var(--line-height-tight)] transition-colors duration-[var(--duration-fast)]",
          sizeClasses[size],
          variantClasses[variant],
          focusRing,
          disabledStyles,
          className,
        )}
        {...props}
      >
        {loading ? (
          <IconSpinner className="h-[var(--size-icon-sm)] w-[var(--size-icon-sm)] shrink-0 animate-spin" />
        ) : null}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
