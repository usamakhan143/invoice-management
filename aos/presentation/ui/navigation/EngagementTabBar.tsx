import React, { useCallback, useRef } from "react";
import { cn, focusRing } from "../utils/cn";

export interface EngagementTab {
  id: string;
  label: string;
  indicator?: boolean;
  disabled?: boolean;
  title?: string;
}

export interface EngagementTabBarProps {
  tabs: EngagementTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

/**
 * Horizontal tabs for engagement hub sub-screens.
 */
export const EngagementTabBar: React.FC<EngagementTabBarProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className,
}) => {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusTabAt = useCallback(
    (index: number) => {
      const tab = tabs[index];
      if (!tab) return;
      tabRefs.current[index]?.focus();
      onTabChange(tab.id);
    },
    [onTabChange, tabs],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        focusTabAt((index + 1) % tabs.length);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        focusTabAt((index - 1 + tabs.length) % tabs.length);
      } else if (event.key === "Home") {
        event.preventDefault();
        focusTabAt(0);
      } else if (event.key === "End") {
        event.preventDefault();
        focusTabAt(tabs.length - 1);
      }
    },
    [focusTabAt, tabs.length],
  );

  return (
    <div
      role="tablist"
      aria-label="Engagement sections"
      className={cn(
        "mb-[var(--space-stack-md)] flex gap-[var(--space-inline-sm)] overflow-x-auto border-b border-[var(--color-border-default)]",
        className,
      )}
    >
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTab;

        return (
          <button
            key={tab.id}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            type="button"
            role="tab"
            id={`aos-engagement-tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`aos-engagement-panel-${tab.id}`}
            aria-disabled={tab.disabled || undefined}
            disabled={tab.disabled}
            title={tab.title}
            tabIndex={isActive ? 0 : -1}
            onClick={() => {
              if (!tab.disabled) onTabChange(tab.id);
            }}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              "relative inline-flex shrink-0 items-center gap-[var(--space-inline-sm)] border-b-2 px-[var(--space-inline-md)] py-[var(--space-stack-sm)] text-[length:var(--font-size-label)] font-[var(--font-weight-medium)] transition-colors duration-[var(--duration-fast)]",
              isActive
                ? "border-[var(--color-interactive-primary)] bg-[var(--color-surface-muted)] text-[var(--color-text-primary)]"
                : "border-transparent text-[var(--color-text-secondary)] hover:border-[var(--color-border-default)] hover:bg-[var(--color-surface-table-row-hover)] hover:text-[var(--color-text-primary)]",
              tab.disabled && "cursor-not-allowed opacity-50",
              focusRing,
            )}
          >
            {tab.label}
            {tab.indicator ? (
              <span
                aria-label="Action required"
                className="h-1.5 w-1.5 shrink-0 rounded-[var(--radius-full)] bg-[var(--color-interactive-primary)]"
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
};
