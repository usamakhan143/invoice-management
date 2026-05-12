import React from "react";

type Props = {
  displayName?: string;
  email?: string;
};

/**
 * Friendly header for sales / agent dashboard (non-team-overview mode).
 */
const AgentWorkspaceHero: React.FC<Props> = ({ displayName, email }) => {
  const raw = (displayName || "").trim();
  const first =
    raw.split(/\s+/)[0] ||
    (email?.includes("@") ? email.split("@")[0] : "") ||
    "there";

  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl border border-primary-200/50 bg-gradient-to-br from-primary-50/95 via-white to-sky-50/70 shadow-sm ring-1 ring-primary-500/[0.06] dark:border-primary-800/40 dark:from-primary-950/35 dark:via-gray-900/90 dark:to-sky-950/25 dark:ring-primary-400/10">
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary-400/10 blur-2xl dark:bg-primary-400/5"
        aria-hidden
      />
      <div className="relative px-5 py-5 sm:px-7 sm:py-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-700 dark:text-primary-300/95">
          Your workspace
        </p>
        <h2 className="mt-1.5 text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
          Hi, {first}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600 dark:text-gray-300">
          Track your pipeline and calls in one place. Numbers below update live; use{" "}
          <span className="font-medium text-gray-800 dark:text-gray-200">My workspace</span> to log
          activity and move deals forward.
        </p>
      </div>
    </div>
  );
};

export default AgentWorkspaceHero;
