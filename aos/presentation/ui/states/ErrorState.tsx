import React from "react";
import { IconAlertTriangle } from "../icons/Icons";
import { Button } from "../buttons/Button";
import { cn } from "../utils/cn";

export interface ErrorStateProps {
  title: React.ReactNode;
  message?: React.ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  retrying?: boolean;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  message,
  onRetry,
  retryLabel = "Retry",
  retrying = false,
  className,
}) => {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center px-[var(--space-page-x)] py-[var(--space-stack-xl)] text-center",
        className,
      )}
    >
      <div className="flex max-w-md flex-col items-center gap-[var(--space-stack-md)]">
        <IconAlertTriangle className="h-[var(--size-icon-md)] w-[var(--size-icon-md)] text-[var(--color-text-danger)]" />
        <h2 className="text-[length:var(--font-size-heading)] font-[var(--font-weight-semibold)] leading-[var(--line-height-tight)] text-[var(--color-text-primary)]">
          {title}
        </h2>
        {message ? (
          <p className="text-[length:var(--font-size-body)] leading-[var(--line-height-body)] text-[var(--color-text-secondary)]">
            {message}
          </p>
        ) : null}
        {onRetry ? (
          <Button
            variant="primary"
            size="md"
            loading={retrying}
            onClick={onRetry}
          >
            {retryLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
};
