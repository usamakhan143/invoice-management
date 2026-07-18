import React from "react";
import { cn } from "../utils/cn";

export interface SkeletonBlockProps {
  lines?: number;
  className?: string;
}

export const SkeletonBlock: React.FC<SkeletonBlockProps> = ({
  lines = 3,
  className,
}) => {
  const safeLineCount = Math.max(1, lines);

  return (
    <div
      aria-busy="true"
      aria-hidden="true"
      className={cn(
        "flex w-full flex-col gap-[var(--space-stack-sm)]",
        className,
      )}
    >
      {Array.from({ length: safeLineCount }, (_, index) => (
        <div
          key={index}
          className={cn(
            "h-[var(--size-input-height)] animate-pulse rounded-[var(--radius-md)] bg-[var(--color-surface-inset)]",
            index === safeLineCount - 1 && safeLineCount > 1 ? "w-2/3" : "w-full",
          )}
        />
      ))}
    </div>
  );
};
