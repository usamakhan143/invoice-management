import React from "react";
import { cn, disabledStyles, focusRing } from "../utils/cn";

export const inputBaseClasses = cn(
  "w-full rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-surface-card)] px-[var(--space-inline-md)] text-[length:var(--font-size-body)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]",
  "h-[var(--size-input-height)] leading-[var(--line-height-body)]",
  "transition-colors duration-[var(--duration-fast)]",
  focusRing,
  disabledStyles,
  "read-only:cursor-default read-only:bg-[var(--color-surface-inset)]",
  "aria-[invalid=true]:border-[var(--color-border-danger)]",
);

export interface TextInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  hasError?: boolean;
}

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ className, hasError, disabled, ...props }, ref) => {
    return (
      <input
        ref={ref}
        disabled={disabled}
        aria-invalid={hasError || undefined}
        className={cn(inputBaseClasses, className)}
        {...props}
      />
    );
  },
);

TextInput.displayName = "TextInput";
