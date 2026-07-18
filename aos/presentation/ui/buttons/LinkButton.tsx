import React from "react";
import { IconChevronRight, IconExternalLink } from "../icons/Icons";
import { cn, disabledStyles, focusRing } from "../utils/cn";

export type LinkButtonIcon = "none" | "chevron" | "external";

export interface LinkButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  icon?: LinkButtonIcon;
}

export const LinkButton = React.forwardRef<HTMLButtonElement, LinkButtonProps>(
  ({ icon = "none", className, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        className={cn(
          "inline-flex items-center gap-[var(--space-inline-sm)] rounded-[var(--radius-sm)] text-[length:var(--font-size-label)] font-[var(--font-weight-medium)] text-[var(--color-text-link)] underline-offset-2 transition-colors duration-[var(--duration-fast)] hover:text-[var(--color-interactive-primary-hover)] hover:underline",
          focusRing,
          disabledStyles,
          className,
        )}
        {...props}
      >
        {children}
        {icon === "chevron" ? (
          <IconChevronRight className="h-[var(--size-icon-sm)] w-[var(--size-icon-sm)] shrink-0" />
        ) : null}
        {icon === "external" ? (
          <IconExternalLink className="h-[var(--size-icon-sm)] w-[var(--size-icon-sm)] shrink-0" />
        ) : null}
      </button>
    );
  },
);

LinkButton.displayName = "LinkButton";
