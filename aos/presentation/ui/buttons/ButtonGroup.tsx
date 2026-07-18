import React from "react";
import { cn } from "../utils/cn";

export interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div
      role="group"
      className={cn(
        "flex flex-wrap items-center gap-[var(--space-inline-md)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};
