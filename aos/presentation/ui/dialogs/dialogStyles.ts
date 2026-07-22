import { cn, disabledStyles, focusRing, inputFocusRing } from "../utils/cn";

export type DialogButtonVariant = "secondary" | "primary" | "approve" | "danger";

const variantStyles: Record<DialogButtonVariant, string> = {
  secondary:
    "border border-[var(--color-border-default)] bg-[var(--color-interactive-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-inset)]",
  primary:
    "border border-transparent bg-[var(--color-interactive-primary)] text-[var(--color-text-inverse)] hover:bg-[var(--color-interactive-primary-hover)]",
  approve:
    "border border-[var(--color-border-approved)] bg-[var(--color-text-success)] text-[var(--color-text-inverse)] hover:opacity-90",
  danger:
    "border border-transparent bg-[var(--color-interactive-danger)] text-[var(--color-text-inverse)] hover:opacity-90",
};

export function dialogButtonClass(
  variant: DialogButtonVariant = "secondary",
  className?: string,
): string {
  return cn(
    "inline-flex h-[var(--size-button-height-md)] min-w-[5rem] items-center justify-center rounded-[var(--radius-lg)] px-[var(--space-inline-md)] text-[length:var(--font-size-label)] font-[var(--font-weight-medium)] transition-opacity",
    variantStyles[variant],
    focusRing,
    disabledStyles,
    className,
  );
}

export const dialogFieldClass = cn(
  "w-full rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-surface-card)] px-[var(--space-inline-md)] py-[var(--space-stack-sm)] text-[length:var(--font-size-body)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] shadow-[var(--shadow-sm)]",
  inputFocusRing,
);

export const dialogFieldErrorClass =
  "border-[var(--color-border-danger)] focus-visible:outline-[var(--color-border-danger)]";

export const dialogLabelClass =
  "mb-[var(--space-stack-xs)] block text-[length:var(--font-size-label)] font-[var(--font-weight-medium)] text-[var(--color-text-primary)]";

export const dialogHintClass =
  "mt-[var(--space-stack-xs)] text-[length:var(--font-size-caption)] text-[var(--color-text-secondary)]";

export const dialogErrorTextClass =
  "mt-[var(--space-stack-xs)] text-[length:var(--font-size-caption)] text-[var(--color-text-danger)]";
