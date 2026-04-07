import React from "react";
import { FloatingFieldTooltip } from "./FloatingFieldTooltip";

/** Amber “!” control for possible duplicate phone/email; full text on hover / focus. */
const DuplicateContactTip: React.FC<{ text: string }> = ({ text }) => {
  return (
    <FloatingFieldTooltip text={text} variant="warning">
      <button
        type="button"
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-amber-600 bg-amber-50 text-[11px] font-bold leading-none text-amber-800 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-amber-500 dark:bg-amber-900/40 dark:text-amber-100 dark:hover:bg-amber-900/60"
        aria-label="Possible duplicate"
      >
        !
      </button>
    </FloatingFieldTooltip>
  );
};

export default DuplicateContactTip;
