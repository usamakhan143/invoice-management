import React from "react";

interface BosSectionShellProps {
  id?: string;
  label: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

const BosSectionShell: React.FC<BosSectionShellProps> = ({
  id,
  label,
  title,
  description,
  action,
  children,
}) => (
  <section id={id} className="scroll-mt-24">
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
          {label}
        </p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-gray-900 dark:text-white">{title}</h2>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-gray-500 dark:text-gray-400">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
    {children}
  </section>
);

export default BosSectionShell;
