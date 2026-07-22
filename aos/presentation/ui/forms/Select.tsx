import React from "react";
import { cn, disabledStyles, inputFocusRing } from "../utils/cn";

export const selectBaseClasses = cn(
  "w-full appearance-none rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-surface-card)] px-[var(--space-inline-md)] text-[length:var(--font-size-body)] text-[var(--color-text-primary)] shadow-[var(--shadow-sm)]",
  "h-[var(--size-input-height)] leading-[var(--line-height-body)]",
  "transition-[border-color,box-shadow] duration-[var(--duration-fast)]",
  inputFocusRing,
  disabledStyles,
);

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  options: SelectOption[];
  placeholder?: string;
  hasError?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, placeholder, hasError, disabled, ...props }, ref) => {
    return (
      <select
        ref={ref}
        disabled={disabled}
        aria-invalid={hasError || undefined}
        className={cn(
          selectBaseClasses,
          "aria-[invalid=true]:border-[var(--color-border-danger)] aria-[invalid=true]:ring-red-500/20",
          className,
        )}
        {...props}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    );
  },
);

Select.displayName = "Select";
