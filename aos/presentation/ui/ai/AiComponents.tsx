import React from "react";
import { Button } from "../buttons/Button";
import { cn } from "../utils/cn";

export interface AiDraftPanelProps {
  title: React.ReactNode;
  versionLabel?: React.ReactNode;
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
}

/** C-030 AiDraftPanel */
export const AiDraftPanel: React.FC<AiDraftPanelProps> = ({
  title,
  versionLabel,
  loading = false,
  children,
  className,
}) => (
  <section
    className={cn(
      "rounded-[var(--radius-2xl)] border border-[var(--color-border-ai)] bg-[var(--color-surface-ai-draft)] p-[var(--space-card-padding)] shadow-[var(--shadow-card)] ring-1 ring-[var(--ring-card)]",
      className,
    )}
  >
    <div
      role="status"
      className="mb-[var(--space-stack-sm)] text-[length:var(--font-size-label)] font-[var(--font-weight-medium)] text-[var(--color-text-ai)]"
    >
      AI Draft · Not approved
    </div>
    <header className="mb-[var(--space-stack-md)]">
      <h3 className="text-[length:var(--font-size-heading)] font-[var(--font-weight-semibold)] text-[var(--color-text-primary)]">
        {title}
      </h3>
      {versionLabel ? (
        <p className="text-[length:var(--font-size-caption)] text-[var(--color-text-secondary)]">{versionLabel}</p>
      ) : null}
    </header>
    {loading ? (
      <p className="text-[length:var(--font-size-body)] text-[var(--color-text-secondary)]">Generating draft…</p>
    ) : (
      <div className="flex flex-col gap-[var(--space-stack-md)] text-[length:var(--font-size-body)]">{children}</div>
    )}
  </section>
);

export interface ApprovalPanelProps {
  canApprove: boolean;
  onApprove: () => void;
  onRequestRevision?: () => void;
  approveLabel?: string;
  revisionLabel?: string;
  loading?: boolean;
  error?: React.ReactNode;
  children?: React.ReactNode;
}

/** C-031 ApprovalPanel */
export const ApprovalPanel: React.FC<ApprovalPanelProps> = ({
  canApprove,
  onApprove,
  onRequestRevision,
  approveLabel = "Approve",
  revisionLabel = "Request revision",
  loading = false,
  error,
  children,
}) => (
  <aside className="rounded-[var(--radius-2xl)] border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-[var(--space-card-padding)] shadow-[var(--shadow-card)] ring-1 ring-[var(--ring-card)]">
    <h3 className="mb-[var(--space-stack-md)] text-[length:var(--font-size-heading)] font-[var(--font-weight-semibold)] text-[var(--color-text-primary)]">
      Approval
    </h3>
    {children}
    {error ? <p className="mb-[var(--space-stack-sm)] text-[length:var(--font-size-caption)] text-[var(--color-text-danger)]" role="alert">{error}</p> : null}
    <div className="flex flex-wrap gap-[var(--space-inline-md)]">
      {onRequestRevision ? (
        <Button variant="ghost" size="sm" onClick={onRequestRevision}>
          {revisionLabel}
        </Button>
      ) : null}
      <Button variant="approve" disabled={!canApprove || loading} loading={loading} onClick={onApprove}>
        {approveLabel}
      </Button>
    </div>
  </aside>
);

export interface ContextPanelProps {
  title?: React.ReactNode;
  children: React.ReactNode;
}

/** C-032 ContextPanel */
export const ContextPanel: React.FC<ContextPanelProps> = ({ title = "Context", children }) => (
  <aside className="rounded-[var(--radius-xl)] border border-[var(--color-border-default)] bg-[var(--color-surface-inset)] p-[var(--space-card-padding)]">
    <h3 className="mb-[var(--space-stack-md)] text-[length:var(--font-size-label)] font-[var(--font-weight-semibold)] text-[var(--color-text-primary)]">{title}</h3>
    <div className="text-[length:var(--font-size-body)] text-[var(--color-text-on-inset)]">{children}</div>
  </aside>
);

export interface EvidencePanelProps {
  title?: React.ReactNode;
  children: React.ReactNode;
}

/** C-033 EvidencePanel */
export const EvidencePanel: React.FC<EvidencePanelProps> = ({ title = "Evidence", children }) => (
  <section className="rounded-[var(--radius-xl)] border border-[var(--color-border-default)] bg-[var(--color-surface-inset)] p-[var(--space-stack-md)]">
    <h4 className="mb-[var(--space-stack-sm)] text-[length:var(--font-size-label)] font-[var(--font-weight-medium)] text-[var(--color-text-primary)]">{title}</h4>
    <div className="text-[length:var(--font-size-body)] text-[var(--color-text-on-inset)]">{children}</div>
  </section>
);

/** C-034 AiExplainBlock */
export const AiExplainBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="rounded-[var(--radius-md)] border border-[var(--color-border-ai)] bg-[var(--color-surface-ai-draft)] p-[var(--space-stack-sm)] text-[length:var(--font-size-caption)] text-[var(--color-text-ai)]">
    AI insight: {children}
  </p>
);

/** C-035 AiConfidenceIndicator */
export const AiConfidenceIndicator: React.FC<{ level: "high" | "medium" | "low" }> = ({ level }) => (
  <span className="text-[length:var(--font-size-caption)] text-[var(--color-text-secondary)]">Confidence: {level}</span>
);

export type AttentionSeverity = "neutral" | "warning" | "error";

export interface AttentionItemProps {
  actionLabel: string;
  engagementTitle: string;
  clientLabel: string;
  whyNow: string;
  severity?: AttentionSeverity;
  aiDraft?: boolean;
  href: string;
  onNavigate: (href: string) => void;
}

const severityBorder: Record<AttentionSeverity, string> = {
  neutral: "border-l-[var(--color-border-default)]",
  warning: "border-l-[var(--color-accent-warning)]",
  error: "border-l-[var(--color-accent-danger)]",
};

/** C-021 AttentionItem */
export const AttentionItem: React.FC<AttentionItemProps> = ({
  actionLabel,
  engagementTitle,
  clientLabel,
  whyNow,
  severity = "neutral",
  aiDraft = false,
  href,
  onNavigate,
}) => (
  <li role="listitem">
    <button
      type="button"
      onClick={() => onNavigate(href)}
      className={cn(
        "flex w-full items-start gap-[var(--space-inline-md)] rounded-[var(--radius-xl)] border border-[var(--color-border-default)] border-l-4 bg-[var(--color-surface-card)] p-[var(--space-stack-md)] text-left shadow-[var(--shadow-sm)] transition-all hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-table-row-hover)] hover:shadow-[var(--shadow-md)]",
        severityBorder[severity],
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[length:var(--font-size-body)] font-[var(--font-weight-medium)] text-[var(--color-text-primary)]">
          {actionLabel} — {engagementTitle}
        </p>
        <p className="text-[length:var(--font-size-caption)] text-[var(--color-text-secondary)]">
          {clientLabel} · {whyNow}
          {aiDraft ? " · AI draft" : ""}
        </p>
        <p className="sr-only">Severity: {severity}</p>
      </div>
      <span aria-hidden="true" className="text-[var(--color-text-tertiary)]">›</span>
    </button>
  </li>
);

export interface AttentionQueueProps {
  items: AttentionItemProps[];
  onNavigate: (href: string) => void;
  emptyAction?: React.ReactNode;
}

/** C-020 AttentionQueue */
export const AttentionQueue: React.FC<AttentionQueueProps> = ({ items, onNavigate, emptyAction }) => {
  if (items.length === 0) {
    return (
      <section aria-labelledby="attention-queue-heading">
        <h2 id="attention-queue-heading" className="aos-section-title">
          Attention Queue
        </h2>
        <p className="text-[length:var(--font-size-body)] text-[var(--color-text-secondary)]">
          Nothing needs your attention
        </p>
        {emptyAction}
      </section>
    );
  }

  return (
    <section aria-labelledby="attention-queue-heading">
      <h2 id="attention-queue-heading" className="aos-section-title mb-[var(--space-stack-md)]">
        Attention Queue
      </h2>
      <ul role="list" className="flex flex-col gap-[var(--space-stack-sm)]">
        {items.map((item) => (
          <AttentionItem key={`${item.href}-${item.actionLabel}`} {...item} onNavigate={onNavigate} />
        ))}
      </ul>
    </section>
  );
};

export interface RiskPanelProps {
  risks: Array<{
    id: string;
    message: string;
    severity?: AttentionSeverity;
    evidenceHref: string;
    evidenceLabel: string;
  }>;
  onNavigate: (href: string) => void;
}

/** C-024 RiskPanel */
export const RiskPanel: React.FC<RiskPanelProps> = ({ risks, onNavigate }) => (
  <section aria-labelledby="risk-panel-heading" className="rounded-[var(--radius-2xl)] border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-[var(--space-card-padding)] shadow-[var(--shadow-card)] ring-1 ring-[var(--ring-card)]">
    <h2 id="risk-panel-heading" className="aos-section-title mb-[var(--space-stack-md)]">
      Delivery Risks
    </h2>
    {risks.length === 0 ? (
      <p className="text-[length:var(--font-size-caption)] text-[var(--color-text-secondary)]">
        No active risks identified from evaluations or paused engagements.
      </p>
    ) : (
      <ul className="flex flex-col gap-[var(--space-stack-sm)]">
        {risks.slice(0, 3).map((risk) => (
          <li key={risk.id} className="flex flex-col gap-[var(--space-stack-xs)]">
            <p className="text-[length:var(--font-size-body)] text-[var(--color-text-primary)]">{risk.message}</p>
            <button
              type="button"
              className="w-fit text-[length:var(--font-size-caption)] text-[var(--color-text-link)]"
              onClick={() => onNavigate(risk.evidenceHref)}
            >
              {risk.evidenceLabel}
            </button>
          </li>
        ))}
      </ul>
    )}
  </section>
);
