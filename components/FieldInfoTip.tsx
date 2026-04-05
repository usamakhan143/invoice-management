import React, { useId } from "react";

/** Small “?” control; full hint appears on hover or keyboard focus (focus-within). */
const FieldInfoTip: React.FC<{ text: string }> = ({ text }) => {
  const tipId = useId();
  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gray-400 text-[11px] font-bold leading-none text-gray-500 hover:border-primary-500 hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-500 dark:text-gray-400 dark:hover:border-primary-400"
        aria-label="More information"
        aria-describedby={tipId}
      >
        ?
      </button>
      <span
        id={tipId}
        role="tooltip"
        className="pointer-events-none invisible absolute bottom-[calc(100%+6px)] left-1/2 z-[100] w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 rounded-md bg-gray-900 px-2.5 py-2 text-left text-[11px] font-normal leading-snug text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 dark:bg-gray-100 dark:text-gray-900"
      >
        {text}
      </span>
    </span>
  );
};

export default FieldInfoTip;
