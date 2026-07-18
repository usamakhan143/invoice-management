import React from "react";

export interface AosPlaceholderLayoutProps {
  title: string;
  description?: string;
}

/**
 * Minimal placeholder shell for AOS pages — Stage A scaffold only.
 */
const AosPlaceholderLayout: React.FC<AosPlaceholderLayoutProps> = ({
  title,
  description = "This area is scaffolded. Business features arrive in later stages.",
}) => {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-400">
          AOS — Phase 1 Stage A
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-gray-300">
          {description}
        </p>
      </div>
    </div>
  );
};

export default AosPlaceholderLayout;
