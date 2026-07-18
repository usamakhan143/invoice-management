import React from "react";
import { cn } from "../utils/cn";

export interface FormFieldProps {
  label: React.ReactNode;
  htmlFor: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  optional?: boolean;
  /** IDs passed to the control's `aria-describedby`. */
  ariaDescribedBy?: string;
  className?: string;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  htmlFor,
  hint,
  error,
  optional = false,
  ariaDescribedBy,
  className,
  children,
}) => {
  const hintId = React.useId();
  const errorId = React.useId();

  const describedByParts = [hint ? hintId : null, error ? errorId : null].filter(
    Boolean,
  ) as string[];
  const describedBy =
    ariaDescribedBy ?? (describedByParts.length > 0 ? describedByParts.join(" ") : undefined);

  const control = React.isValidElement(children)
    ? React.cloneElement(children, {
        id: htmlFor,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
        hasError: Boolean(error),
      } as Record<string, unknown>)
    : children;

  return (
    <div className={cn("flex flex-col gap-[var(--space-stack-xs)]", className)}>
      <div className="flex items-baseline gap-[var(--space-inline-sm)]">
        <label
          htmlFor={htmlFor}
          className="text-[length:var(--font-size-label)] font-[var(--font-weight-medium)] text-[var(--color-text-primary)]"
        >
          {label}
        </label>
        {optional ? (
          <span className="text-[length:var(--font-size-caption)] text-[var(--color-text-tertiary)]">
            Optional
          </span>
        ) : null}
      </div>

      {control}

      {hint ? (
        <p
          id={hintId}
          className="text-[length:var(--font-size-caption)] text-[var(--color-text-secondary)]"
        >
          {hint}
        </p>
      ) : null}

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="text-[length:var(--font-size-caption)] text-[var(--color-text-danger)]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
};
