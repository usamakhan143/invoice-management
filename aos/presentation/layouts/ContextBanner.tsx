import React from "react";
import { cn } from "../ui/utils/cn";

export type ContextBannerVariant = "lifecycle" | "blocked" | "paused" | "sidecar-info";

export interface ContextBannerProps {
  variant?: ContextBannerVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<ContextBannerVariant, string> = {
  lifecycle:
    "border-[var(--color-border-default)] bg-[var(--color-lifecycle-neutral-bg)] text-[var(--color-lifecycle-neutral-text)]",
  blocked:
    "border-[var(--color-border-danger)] bg-[var(--color-surface-danger-subtle)] text-[var(--color-text-danger)]",
  paused:
    "border-[var(--color-accent-warning)] bg-[var(--color-lifecycle-paused-bg)] text-[var(--color-lifecycle-paused-text)]",
  "sidecar-info":
    "border-[var(--color-border-subtle)] bg-[var(--color-surface-inset)] text-[var(--color-text-link-sidecar)]",
};

/**
 * Engagement lifecycle, blockers, and ERP/BOS context strip.
 */
const ContextBanner: React.FC<ContextBannerProps> = ({
  variant = "lifecycle",
  children,
  className,
}) => {
  return (
    <div
      role="status"
      className={cn(
        "mb-[var(--space-stack-md)] rounded-[var(--radius-xl)] border px-[var(--space-card-padding)] py-[var(--space-stack-sm)] text-[length:var(--font-size-body)] font-[var(--font-weight-medium)] shadow-[var(--shadow-sm)]",
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </div>
  );
};

export default ContextBanner;
