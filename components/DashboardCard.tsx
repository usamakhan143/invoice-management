import React from "react";

export type DashboardStatVariant = "emerald" | "amber" | "rose" | "sky";

const variantConfig: Record<
  DashboardStatVariant,
  { iconWrap: string; accentBar: string }
> = {
  emerald: {
    iconWrap:
      "bg-emerald-500/[0.12] text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-400",
    accentBar: "from-emerald-400 via-teal-500 to-cyan-500",
  },
  amber: {
    iconWrap:
      "bg-amber-500/[0.12] text-amber-600 dark:bg-amber-400/15 dark:text-amber-400",
    accentBar: "from-amber-400 via-orange-400 to-amber-500",
  },
  rose: {
    iconWrap:
      "bg-rose-500/[0.12] text-rose-600 dark:bg-rose-400/15 dark:text-rose-400",
    accentBar: "from-rose-400 via-pink-500 to-rose-500",
  },
  sky: {
    iconWrap:
      "bg-sky-500/[0.12] text-sky-600 dark:bg-sky-400/15 dark:text-sky-400",
    accentBar: "from-sky-400 via-blue-500 to-indigo-500",
  },
};

interface DashboardCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  variant: DashboardStatVariant;
  /** When true, the value is visually blurred (revenue privacy). */
  blurValue?: boolean;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  value,
  icon,
  variant,
  blurValue = false,
}) => {
  const { iconWrap, accentBar } = variantConfig[variant];

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-gray-200/90 bg-gradient-to-br from-white via-white to-gray-50/90 shadow-sm ring-1 ring-black/[0.03] transition-all duration-200 hover:border-gray-300/90 hover:shadow-md dark:border-gray-700/80 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900/60 dark:ring-white/[0.05] dark:hover:border-gray-600/90"
      role="status"
      aria-label={
        blurValue
          ? `${title}: hidden — use the dashboard PIN to view`
          : `${title}: ${value}`
      }
    >
      <div
        className={`h-1 w-full bg-gradient-to-r opacity-95 ${accentBar}`}
        aria-hidden
      />
      <div className="flex items-start justify-between gap-4 p-5 sm:p-6">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
            {title}
          </p>
          <p
            className={`mt-2.5 text-2xl font-bold tabular-nums tracking-tight text-gray-900 dark:text-white sm:text-[1.65rem] ${
              blurValue ? "select-none" : ""
            }`}
          >
            <span
              className={
                blurValue
                  ? "inline-block blur-[10px] opacity-90"
                  : undefined
              }
              aria-hidden={blurValue}
            >
              {value}
            </span>
          </p>
        </div>
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-visible rounded-2xl ${iconWrap} transition-transform duration-200 group-hover:scale-[1.03]`}
        >
          <span className="flex items-center justify-center [&_svg]:block [&_svg]:overflow-visible [&_svg]:h-6 [&_svg]:w-6">
            {icon}
          </span>
        </div>
      </div>
    </div>
  );
};

export default DashboardCard;

/** Compact metric tile for analytics grids (lead stats, etc.). */
export const DashboardMiniStat: React.FC<{
  label: string;
  value: string | number;
  hint?: string;
}> = ({ label, value, hint }) => (
  <div className="rounded-xl border border-gray-200/80 bg-gradient-to-b from-gray-50/80 to-white/60 px-4 py-3.5 shadow-sm dark:border-gray-700/80 dark:from-gray-900/40 dark:to-gray-800/40">
    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
      {label}
    </p>
    <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-gray-900 dark:text-white">
      {value}
    </p>
    {hint ? (
      <p className="mt-1 text-xs leading-snug text-gray-500 dark:text-gray-400">
        {hint}
      </p>
    ) : null}
  </div>
);
