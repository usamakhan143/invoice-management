import React from "react";

/** Shown when a lead has Notes filled — signals pitch/call context is on file. */
export function leadHasPitchNotes(notes: string | undefined): boolean {
  return Boolean(notes?.trim());
}

const LeadPitchReadyIcon: React.FC<{ className?: string }> = ({
  className = "w-4 h-4 shrink-0",
}) => (
  <span
    role="img"
    aria-label="Has notes — ready to pitch on calls"
    title="Has notes — pitch info saved for calls"
    className={`inline-flex text-emerald-600 dark:text-emerald-400 ${className}`.trim()}
  >
    <svg className="h-full w-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  </span>
);

export default LeadPitchReadyIcon;
