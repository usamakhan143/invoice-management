import React from "react";
import { cn } from "../utils/cn";

export interface FormSectionProps {
  title: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  children,
  className,
}) => {
  return (
    <section
      className={cn(
        "flex flex-col gap-[var(--space-stack-md)]",
        className,
      )}
    >
      <h3 className="text-[length:var(--font-size-heading)] font-[var(--font-weight-semibold)] leading-[var(--line-height-tight)] text-[var(--color-text-primary)]">
        {title}
      </h3>
      <div className="flex flex-col gap-[var(--space-stack-md)]">{children}</div>
    </section>
  );
};
