import React from "react";

const TAG_COLORS: { key: string; label: string; pill: string }[] = [
  { key: "gray", label: "Gray", pill: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100" },
  { key: "blue", label: "Blue", pill: "bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100" },
  { key: "emerald", label: "Green", pill: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100" },
  { key: "amber", label: "Amber", pill: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100" },
  { key: "rose", label: "Red", pill: "bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-100" },
  { key: "violet", label: "Purple", pill: "bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-100" },
  { key: "sky", label: "Sky", pill: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100" },
  { key: "pink", label: "Pink", pill: "bg-pink-100 text-pink-900 dark:bg-pink-900/40 dark:text-pink-100" },
];

/** Options for color &lt;select&gt; on campaign tag forms */
export const CAMPAIGN_TAG_COLOR_OPTIONS = TAG_COLORS.map(({ key, label }) => ({ key, label }));

export function tagPillClass(color?: string): string {
  return TAG_COLORS.find((c) => c.key === color)?.pill ?? TAG_COLORS[0].pill;
}

function tooltipText(label: string, description?: string | null): string {
  const d = (description ?? "").trim();
  if (d) return d;
  return `No team explanation yet for “${label}”. Add one under Campaigns → this campaign’s tags → Team explanation.`;
}

/** Opens below the pill so it isn’t clipped by parent `overflow-hidden` on cards. */
const TOOLTIP_PANEL =
  "pointer-events-none absolute top-full left-1/2 z-[60] mt-1.5 w-max max-w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-left text-[11px] leading-relaxed text-white opacity-0 shadow-lg ring-1 ring-white/10 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-gray-800 dark:ring-white/5";

export interface CampaignTagPillProps {
  label: string;
  description?: string | null;
  color?: string;
  /** Lead-detail toggle: selected state */
  selected?: boolean;
  onClick?: () => void;
  /** Extra classes on the pill itself */
  className?: string;
  disabled?: boolean;
}

/**
 * Tag pill with hover/focus tooltip showing team explanation (or hint to add one).
 * Use `onClick` for toggle buttons; omit for read-only display.
 */
export const CampaignTagPill: React.FC<CampaignTagPillProps> = ({
  label,
  description,
  color,
  selected,
  onClick,
  className = "",
  disabled,
}) => {
  const tip = tooltipText(label, description);
  const pillVisual = tagPillClass(color);
  const isToggle = typeof onClick === "function";

  const toggleClasses = selected
    ? "bg-primary-100 text-primary-900 border-primary-400 dark:bg-primary-900/40 dark:text-primary-100 dark:border-primary-600"
    : "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 opacity-60 hover:opacity-100";

  const basePill =
    "inline-flex max-w-full items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border transition-all";

  const pillClasses = isToggle
    ? `${basePill} ${toggleClasses} ${className}`.trim()
    : `${basePill} ${pillVisual} ${className}`.trim();

  const inner = isToggle ? (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${pillClasses} disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900`}
      aria-label={`${label}. ${tip}`}
    >
      <span className="truncate">{label}</span>
    </button>
  ) : (
    <span className={`${pillClasses} cursor-default`} aria-hidden={false}>
      <span className="truncate">{label}</span>
    </span>
  );

  return (
    <span className="relative inline-flex max-w-full align-middle group">
      {inner}
      <span className={TOOLTIP_PANEL} role="tooltip">
        {tip}
      </span>
    </span>
  );
};

export default CampaignTagPill;
