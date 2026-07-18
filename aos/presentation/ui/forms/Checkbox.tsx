import React from "react";
import { cn, disabledStyles, focusRing } from "../utils/cn";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label?: React.ReactNode;
  hasError?: boolean;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, hasError, disabled, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;

    const input = (
      <input
        ref={ref}
        id={inputId}
        type="checkbox"
        disabled={disabled}
        aria-invalid={hasError || undefined}
        className={cn(
          "h-[var(--size-icon-sm)] w-[var(--size-icon-sm)] shrink-0 rounded-[var(--radius-sm)] border border-[var(--color-border-default)] text-[var(--color-interactive-primary)] accent-[var(--color-interactive-primary)]",
          focusRing,
          disabledStyles,
          className,
        )}
        {...props}
      />
    );

    if (!label) {
      return input;
    }

    return (
      <label
        htmlFor={inputId}
        className={cn(
          "inline-flex cursor-pointer items-start gap-[var(--space-inline-sm)] text-[length:var(--font-size-body)] text-[var(--color-text-primary)]",
          disabled ? "cursor-not-allowed opacity-50" : undefined,
        )}
      >
        {input}
        <span className="leading-[var(--line-height-body)]">{label}</span>
      </label>
    );
  },
);

Checkbox.displayName = "Checkbox";
