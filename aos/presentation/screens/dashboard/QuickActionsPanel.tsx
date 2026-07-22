import React from "react";
import { Card } from "../../ui/cards/Card";
import {
  IconBookOpen,
  IconChevronRight,
  IconClipboardList,
  IconLayers,
  IconPlus,
  IconSparkles,
} from "../../ui/icons/Icons";
import { cn, focusRing } from "../../ui/utils/cn";

export interface QuickActionItem {
  id: string;
  label: string;
  href: string;
}

interface QuickActionMeta {
  description: string;
  icon: React.ReactNode;
  accent: "primary" | "neutral" | "ai" | "success";
}

const ACCENT_STYLES: Record<QuickActionMeta["accent"], { tile: string; icon: string }> = {
  primary: {
    tile: "border-[var(--color-border-focus)] bg-[var(--color-surface-card)] hover:border-[var(--color-interactive-primary)] hover:bg-[var(--color-surface-muted)]",
    icon: "bg-[var(--color-interactive-primary)] text-[var(--color-text-inverse)]",
  },
  neutral: {
    tile: "border-[var(--color-border-default)] bg-[var(--color-surface-card)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-table-row-hover)]",
    icon: "bg-[var(--color-surface-inset)] text-[var(--color-text-primary)]",
  },
  ai: {
    tile: "border-[var(--color-border-ai)] bg-[var(--color-surface-ai-draft)] hover:border-[var(--color-border-ai)] hover:shadow-[var(--shadow-md)]",
    icon: "bg-[var(--color-text-ai)] text-[var(--color-text-inverse)]",
  },
  success: {
    tile: "border-[var(--color-border-approved)] bg-[var(--color-surface-approved)] hover:border-[var(--color-border-approved)] hover:shadow-[var(--shadow-md)]",
    icon: "bg-[var(--color-text-success)] text-[var(--color-text-inverse)]",
  },
};

function metaForAction(action: QuickActionItem): QuickActionMeta {
  switch (action.id) {
    case "create":
      return {
        description: "Start a new client delivery engagement",
        icon: <IconPlus className="h-[var(--size-icon-sm)] w-[var(--size-icon-sm)]" />,
        accent: "primary",
      };
    case "delivery":
      return {
        description: "Browse and manage all engagements",
        icon: <IconLayers className="h-[var(--size-icon-sm)] w-[var(--size-icon-sm)]" />,
        accent: "neutral",
      };
    case "requirements":
      return {
        description: "Review pending requirement approvals",
        icon: <IconClipboardList className="h-[var(--size-icon-sm)] w-[var(--size-icon-sm)]" />,
        accent: "neutral",
      };
    case "learning":
      return {
        description: "Approve and promote learning candidates",
        icon: <IconSparkles className="h-[var(--size-icon-sm)] w-[var(--size-icon-sm)]" />,
        accent: "ai",
      };
    case "playbook":
      return {
        description: "Agency standards, templates, and rubrics",
        icon: <IconBookOpen className="h-[var(--size-icon-sm)] w-[var(--size-icon-sm)]" />,
        accent: "success",
      };
    default:
      return {
        description: "Open workspace area",
        icon: <IconChevronRight className="h-[var(--size-icon-sm)] w-[var(--size-icon-sm)]" />,
        accent: "neutral",
      };
  }
}

export interface QuickActionsPanelProps {
  actions: readonly QuickActionItem[];
  onNavigate: (href: string) => void;
}

export const QuickActionsPanel: React.FC<QuickActionsPanelProps> = ({ actions, onNavigate }) => {
  if (actions.length === 0) return null;

  return (
    <section aria-labelledby="quick-actions-heading">
      <Card className="overflow-hidden p-0">
        <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] px-[var(--space-card-padding)] py-[var(--space-stack-md)]">
          <h2 id="quick-actions-heading" className="aos-section-title">
            Quick Actions
          </h2>
          <p className="mt-[var(--space-stack-xs)] text-[length:var(--font-size-body)] text-[var(--color-text-secondary)]">
            Jump to the most common founder workflows
          </p>
        </div>
        <div className="grid grid-cols-1 gap-[var(--space-stack-sm)] p-[var(--space-card-padding)] sm:grid-cols-2 xl:grid-cols-3">
          {actions.map((action) => {
            const meta = metaForAction(action);
            const accent = ACCENT_STYLES[meta.accent];
            const isPrimary = action.id === "create";

            return (
              <button
                key={action.id}
                type="button"
                onClick={() => onNavigate(action.href)}
                className={cn(
                  "group flex w-full items-center gap-[var(--space-inline-md)] rounded-[var(--radius-xl)] border p-[var(--space-stack-md)] text-left shadow-[var(--shadow-sm)] transition-all duration-[var(--duration-normal)] hover:-translate-y-px hover:shadow-[var(--shadow-md)]",
                  accent.tile,
                  isPrimary && "sm:col-span-2 xl:col-span-1",
                  focusRing,
                )}
              >
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)]",
                    accent.icon,
                  )}
                >
                  {meta.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[length:var(--font-size-body)] font-[var(--font-weight-semibold)] text-[var(--color-text-primary)]">
                    {action.label}
                  </span>
                  <span className="mt-0.5 block text-[length:var(--font-size-caption)] leading-[var(--line-height-body)] text-[var(--color-text-secondary)]">
                    {meta.description}
                  </span>
                </span>
                <IconChevronRight
                  aria-hidden="true"
                  className="h-[var(--size-icon-sm)] w-[var(--size-icon-sm)] shrink-0 text-[var(--color-text-tertiary)] transition-transform duration-[var(--duration-fast)] group-hover:translate-x-0.5 group-hover:text-[var(--color-text-link)]"
                />
              </button>
            );
          })}
        </div>
      </Card>
    </section>
  );
};
