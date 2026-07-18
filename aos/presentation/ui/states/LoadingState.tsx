import React from "react";
import { IconSpinner } from "../icons/Icons";
import { cn } from "../utils/cn";

export interface LoadingStateProps {
  message?: React.ReactNode;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message,
  className,
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        "flex flex-col items-center justify-center gap-[var(--space-stack-md)] px-[var(--space-page-x)] py-[var(--space-stack-xl)] text-center",
        className,
      )}
    >
      <IconSpinner className="h-[var(--size-icon-md)] w-[var(--size-icon-md)] animate-spin text-[var(--color-interactive-primary)]" />
      {message ? (
        <p className="text-[length:var(--font-size-body)] text-[var(--color-text-secondary)]">
          {message}
        </p>
      ) : (
        <span className="absolute h-px w-px overflow-hidden whitespace-nowrap border-0 p-0 [clip:rect(0,0,0,0)]">
          Loading
        </span>
      )}
    </div>
  );
};
