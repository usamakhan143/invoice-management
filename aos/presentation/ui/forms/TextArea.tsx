import React from "react";
import { cn, disabledStyles, focusRing } from "../utils/cn";

export interface TextAreaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "size"> {
  hasError?: boolean;
  minRows?: number;
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, hasError, minRows = 3, disabled, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        disabled={disabled}
        rows={minRows}
        aria-invalid={hasError || undefined}
        className={cn(
          "w-full resize-y rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-surface-card)] px-[var(--space-inline-md)] py-[var(--space-stack-sm)] text-[length:var(--font-size-body)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]",
          "leading-[var(--line-height-body)]",
          "transition-colors duration-[var(--duration-fast)]",
          focusRing,
          disabledStyles,
          "read-only:cursor-default read-only:bg-[var(--color-surface-inset)]",
          "aria-[invalid=true]:border-[var(--color-border-danger)]",
          className,
        )}
        {...props}
      />
    );
  },
);

TextArea.displayName = "TextArea";
