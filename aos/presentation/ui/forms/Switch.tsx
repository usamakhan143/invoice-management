import React from "react";
import { cn, disabledStyles, focusRing } from "../utils/cn";

export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "role" | "type"> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: React.ReactNode;
  hasError?: boolean;
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      checked,
      onCheckedChange,
      label,
      hasError,
      disabled,
      className,
      id,
      onClick,
      ...props
    },
    ref,
  ) => {
    const generatedId = React.useId();
    const switchId = id ?? generatedId;
    const labelId = React.useId();

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled) {
        onCheckedChange?.(!checked);
      }
      onClick?.(event);
    };

    const track = (
      <button
        ref={ref}
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={label ? labelId : undefined}
        aria-invalid={hasError || undefined}
        disabled={disabled}
        onClick={handleClick}
        className={cn(
          "relative inline-flex h-[var(--size-icon-md)] w-[calc(var(--size-icon-md)*1.75)] shrink-0 items-center rounded-[var(--radius-full)] border border-transparent p-[var(--space-stack-xs)] transition-colors duration-[var(--duration-fast)]",
          checked
            ? "bg-[var(--color-interactive-primary)]"
            : "bg-[var(--color-border-default)]",
          focusRing,
          disabledStyles,
          className,
        )}
        {...props}
      >
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none inline-block h-[var(--size-icon-sm)] w-[var(--size-icon-sm)] rounded-[var(--radius-full)] bg-[var(--color-surface-card)] shadow-[var(--shadow-sm)] transition-transform duration-[var(--duration-fast)]",
            checked
              ? "translate-x-[calc(100%-var(--size-icon-sm))]"
              : "translate-x-0",
          )}
        />
      </button>
    );

    if (!label) {
      return track;
    }

    return (
      <div
        className={cn(
          "inline-flex items-center gap-[var(--space-inline-sm)] text-[length:var(--font-size-body)] text-[var(--color-text-primary)]",
          disabled ? "opacity-50" : undefined,
        )}
      >
        {track}
        <span id={labelId} className="leading-[var(--line-height-body)]">
          {label}
        </span>
      </div>
    );
  },
);

Switch.displayName = "Switch";
