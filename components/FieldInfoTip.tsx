import React from "react";
import { FloatingFieldTooltip } from "./FloatingFieldTooltip";

/** Small “?” control; full hint appears on hover or keyboard focus (focus-within). */
const FieldInfoTip: React.FC<{ text: string }> = ({ text }) => {
  return (
    <FloatingFieldTooltip text={text} variant="info">
      <button
        type="button"
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gray-400 text-[11px] font-bold leading-none text-gray-500 hover:border-primary-500 hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-500 dark:text-gray-400 dark:hover:border-primary-400"
        aria-label="More information"
      >
        ?
      </button>
    </FloatingFieldTooltip>
  );
};

export default FieldInfoTip;
