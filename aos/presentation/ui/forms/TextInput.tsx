import React from "react";
import { cn, disabledStyles, inputFocusRing } from "../utils/cn";

export const inputBaseClasses = cn(
  "w-full rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-surface-card)] px-[var(--space-inline-md)] text-[length:var(--font-size-body)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] shadow-[var(--shadow-sm)]",
  "h-[var(--size-input-height)] leading-[var(--line-height-body)]",
  "transition-[border-color,box-shadow] duration-[var(--duration-fast)]",
  inputFocusRing,
  disabledStyles,
  "read-only:cursor-default read-only:bg-[var(--color-surface-inset)]",
  "aria-[invalid=true]:border-[var(--color-border-danger)] aria-[invalid=true]:ring-red-500/20",
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
