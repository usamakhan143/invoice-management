import React from "react";
import { IconSearch, IconX } from "../icons/Icons";
import { cn, disabledStyles, focusRing } from "../utils/cn";
import { inputBaseClasses } from "./TextInput";

export interface SearchInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "size" | "type" | "value" | "onChange"
  > {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  hasError?: boolean;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      value,
      onChange,
      onClear,
      hasError,
      disabled,
      className,
      placeholder = "Search…",
      onKeyDown,
      ...props
    },
    ref,
  ) => {
    const handleClear = () => {
      onChange("");
      onClear?.();
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Escape" && value) {
        event.preventDefault();
        handleClear();
      }
      onKeyDown?.(event);
    };

    return (
      <div className={cn("relative w-full", className)}>
        <IconSearch className="pointer-events-none absolute left-[var(--space-inline-md)] top-1/2 h-[var(--size-icon-sm)] w-[var(--size-icon-sm)] -translate-y-1/2 text-[var(--color-text-tertiary)]" />
        <input
          ref={ref}
          type="search"
          role="searchbox"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          aria-invalid={hasError || undefined}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          className={cn(
            inputBaseClasses,
            "pl-[calc(var(--space-inline-md)+var(--size-icon-sm)+var(--space-inline-sm))]",
            value ? "pr-[calc(var(--size-touch-min)/2)]" : undefined,
          )}
          {...props}
        />
        {value ? (
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            aria-label="Clear search"
            className={cn(
              "absolute right-[var(--space-inline-sm)] top-1/2 inline-flex min-h-[var(--size-touch-min)] min-w-[var(--size-touch-min)] -translate-y-1/2 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-secondary)] transition-colors duration-[var(--duration-fast)] hover:bg-[var(--color-surface-inset)] hover:text-[var(--color-text-primary)]",
              focusRing,
              disabledStyles,
            )}
          >
            <IconX className="h-[var(--size-icon-sm)] w-[var(--size-icon-sm)]" />
          </button>
        ) : null}
      </div>
    );
  },
);

SearchInput.displayName = "SearchInput";
