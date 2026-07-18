import React from "react";
import { cn, disabledStyles, focusRing } from "../utils/cn";

export type IconButtonVariant = "ghost" | "secondary";

export interface IconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "title"> {
  /** Required accessible name; also used as the native tooltip via `title`. */
  "aria-label": string;
  title?: string;
  variant?: IconButtonVariant;
}

const variantClasses: Record<IconButtonVariant, string> = {
  ghost:
    "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-inset)] hover:text-[var(--color-text-primary)]",
  secondary:
    "border border-[var(--color-border-default)] bg-[var(--color-interactive-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-inset)]",
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      "aria-label": ariaLabel,
      title,
      variant = "ghost",
      type = "button",
      className,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={ariaLabel}
        title={title ?? ariaLabel}
        className={cn(
          "inline-flex items-center justify-center rounded-[var(--radius-md)] p-[var(--space-inline-sm)] transition-colors duration-[var(--duration-fast)]",
          "min-h-[var(--size-touch-min)] min-w-[var(--size-touch-min)]",
          "[&_svg]:h-[var(--size-icon-sm)] [&_svg]:w-[var(--size-icon-sm)]",
          variantClasses[variant],
          focusRing,
          disabledStyles,
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);

IconButton.displayName = "IconButton";
