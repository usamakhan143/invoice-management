import React from "react";
import { cn } from "../utils/cn";

export type CardVariant = "default" | "aiDraft" | "approved" | "risk" | "evidence";

const variantStyles: Record<CardVariant, string> = {
  default:
    "border-[var(--color-border-default)] bg-[var(--color-surface-card)] shadow-[var(--shadow-card)] ring-1 ring-[var(--ring-card)]",
  aiDraft:
    "border-[var(--color-border-ai)] bg-[var(--color-surface-ai-draft)] shadow-[var(--shadow-card)] ring-1 ring-[var(--ring-card)]",
  approved:
    "border-[var(--color-border-approved)] bg-[var(--color-surface-approved)] shadow-[var(--shadow-card)] ring-1 ring-[var(--ring-card)]",
  risk:
    "border-[var(--color-border-default)] bg-[var(--color-surface-warning-subtle)] shadow-[var(--shadow-card)] ring-1 ring-[var(--ring-card)]",
  evidence:
    "border-[var(--color-border-default)] bg-[var(--color-surface-inset)] shadow-[var(--shadow-sm)]",
};

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  interactive?: boolean;
  selected?: boolean;
}

function CardRoot({
  variant = "default",
  interactive = false,
  selected = false,
  className,
  children,
  ...props
}: CardProps): React.ReactElement {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-2xl)] border p-[var(--space-card-padding)]",
        variantStyles[variant],
        interactive &&
          "cursor-pointer transition-[border-color,box-shadow] hover:border-[var(--color-border-focus)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-border-focus)]",
        selected && "ring-2 ring-[var(--color-border-focus)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  meta?: React.ReactNode;
}

function CardHeader({
  title,
  meta,
  className,
  children,
  ...props
}: CardHeaderProps): React.ReactElement {
  return (
    <div
      className={cn(
        "mb-[var(--space-stack-md)] flex items-start justify-between gap-[var(--space-inline-md)]",
        className,
      )}
      {...props}
    >
      <div className="min-w-0 flex-1">
        {title != null && (
          <h3 className="text-[length:var(--font-size-heading)] font-[var(--font-weight-semibold)] leading-[var(--line-height-tight)] text-[var(--color-text-primary)]">
            {title}
          </h3>
        )}
        {children}
      </div>
      {meta != null && <div className="shrink-0">{meta}</div>}
    </div>
  );
}

function CardBody({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return (
    <div
      className={cn(
        "text-[length:var(--font-size-body)] leading-[var(--line-height-body)] text-[var(--color-text-primary)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function CardFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return (
    <div
      className={cn(
        "mt-[var(--space-stack-md)] flex items-center justify-end gap-[var(--space-inline-md)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Body: CardBody,
  Footer: CardFooter,
});
