import React from "react";

type Props = {
  title: string;
  description?: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
};

const DashboardSection: React.FC<Props> = ({
  title,
  description,
  headerAction,
  children,
  className = "",
  bodyClassName = "",
}) => (
  <section
    className={`mb-6 overflow-hidden rounded-2xl border border-gray-200/90 bg-white/80 shadow-sm ring-1 ring-black/[0.03] dark:border-gray-700/90 dark:bg-gray-800/80 dark:ring-white/[0.05] ${className}`}
  >
    <div className="border-b border-gray-100/90 px-5 py-4 dark:border-gray-700/80 sm:px-6 sm:py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-gray-900 dark:text-white sm:text-lg">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              {description}
            </p>
          ) : null}
        </div>
        {headerAction ? (
          <div className="shrink-0 pt-0.5">{headerAction}</div>
        ) : null}
      </div>
    </div>
    <div className={`px-5 py-5 sm:px-6 sm:py-6 ${bodyClassName}`}>{children}</div>
  </section>
);

export default DashboardSection;
