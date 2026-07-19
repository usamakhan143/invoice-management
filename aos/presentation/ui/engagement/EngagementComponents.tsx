import React from "react";
import { Card } from "../cards/Card";
import { Button } from "../buttons/Button";
import { cn } from "../utils/cn";

type ArtifactStatus = "empty" | "draft" | "in_review" | "approved" | "running" | "passed" | "failed";

function statusLabel(status: ArtifactStatus | string): string {
  return status.replace(/_/g, " ");
}

/** C-022 NextBestActionCard */
export const NextBestActionCard: React.FC<{
  engagementTitle: string;
  clientLabel: string;
  lifecycleLabel: string;
  rationale: string;
  ctaLabel: string;
  blockers?: readonly string[];
  onContinue: () => void;
}> = ({
  engagementTitle,
  clientLabel,
  lifecycleLabel,
  rationale,
  ctaLabel,
  blockers = [],
  onContinue,
}) => (
  <Card className="border-[var(--color-border-focus)]">
    <Card.Header
      title="Next Best Action"
      meta={<LifecycleBadge label={lifecycleLabel} />}
    />
    <Card.Body>
      <p className="text-[length:var(--font-size-body)] font-[var(--font-weight-medium)] text-[var(--color-text-primary)]">
        {engagementTitle} · {clientLabel}
      </p>
      <p className="mt-[var(--space-stack-xs)] text-[length:var(--font-size-body)] text-[var(--color-text-secondary)]">
        {rationale}
      </p>
      {blockers.length > 0 ? (
        <ul className="mt-[var(--space-stack-sm)] list-disc pl-[var(--space-inline-md)] text-[length:var(--font-size-caption)] text-[var(--color-text-secondary)]">
          {blockers.map((blocker) => (
            <li key={blocker}>{blocker}</li>
          ))}
        </ul>
      ) : null}
    </Card.Body>
    <Card.Footer>
      <Button size="lg" onClick={onContinue}>
        {ctaLabel}
      </Button>
    </Card.Footer>
  </Card>
);

/** C-050 LifecycleBadge */
export const LifecycleBadge: React.FC<{ label: string; className?: string }> = ({ label, className }) => (
  <span
    className={cn(
      "inline-flex items-center rounded-[var(--radius-full)] bg-[var(--color-lifecycle-neutral-bg)] px-[var(--space-inline-md)] py-0.5 text-[length:var(--font-size-caption)] font-[var(--font-weight-medium)] uppercase text-[var(--color-lifecycle-neutral-text)]",
      className,
    )}
  >
    {label}
  </span>
);

/** C-051 StatusChip */
export const StatusChip: React.FC<{
  label: string;
  variant?: "neutral" | "success" | "warning" | "error" | "ai" | "approved";
}> = ({ label, variant = "neutral" }) => {
  const styles = {
    neutral: "bg-[var(--color-surface-inset)] text-[var(--color-text-secondary)]",
    success: "bg-[var(--color-surface-approved)] text-[var(--color-text-success)]",
    warning: "bg-[var(--color-surface-warning-subtle)] text-[var(--color-text-warning)]",
    error: "bg-[var(--color-surface-danger-subtle)] text-[var(--color-text-danger)]",
    ai: "bg-[var(--color-surface-ai-draft)] text-[var(--color-text-ai)]",
    approved: "bg-[var(--color-surface-approved)] text-[var(--color-text-approved)]",
  }[variant];
  return (
    <span className={cn("inline-flex rounded-[var(--radius-full)] px-[var(--space-inline-md)] py-0.5 text-[length:var(--font-size-caption)] font-[var(--font-weight-medium)]", styles)}>
      {label}
    </span>
  );
};

/** C-052 GateChip */
export const GateChip: React.FC<{ label: string; satisfied: boolean; onClick?: () => void }> = ({
  label,
  satisfied,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "inline-flex rounded-[var(--radius-full)] border px-[var(--space-inline-md)] py-0.5 text-[length:var(--font-size-caption)]",
      satisfied
        ? "border-[var(--color-border-approved)] bg-[var(--color-surface-approved)] text-[var(--color-text-success)]"
        : "border-[var(--color-border-default)] bg-[var(--color-surface-inset)] text-[var(--color-text-secondary)]",
    )}
  >
    {label}: {satisfied ? "Approved" : "Blocked"}
  </button>
);

/** C-023 WaitingStatePanel */
export const WaitingStatePanel: React.FC<{ title: string; message: React.ReactNode }> = ({ title, message }) => (
  <div role="status" className="rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-surface-inset)] p-[var(--space-card-padding)]">
    <h3 className="text-[length:var(--font-size-heading)] font-[var(--font-weight-semibold)]">{title}</h3>
    <p className="mt-[var(--space-stack-sm)] text-[length:var(--font-size-body)] text-[var(--color-text-secondary)]">{message}</p>
  </div>
);

/** C-040 RequirementCard */
export const RequirementCard: React.FC<{
  title: string;
  version: number;
  status: ArtifactStatus;
  requirementCount: number;
  aiGenerated?: boolean;
  onClick?: () => void;
}> = ({ title, version, status, requirementCount, aiGenerated, onClick }) => (
  <Card interactive={Boolean(onClick)} onClick={onClick}>
    <Card.Header
      title={title}
      meta={<StatusChip label={statusLabel(status)} variant={status === "approved" ? "approved" : aiGenerated ? "ai" : "neutral"} />}
    />
    <Card.Body>
      <p className="text-[length:var(--font-size-caption)] text-[var(--color-text-secondary)]">
        v{version} · {requirementCount} requirements
      </p>
    </Card.Body>
  </Card>
);

/** C-041 PromptCard */
export const PromptCard: React.FC<{
  title: string;
  version: number;
  status: ArtifactStatus;
  artifactCount: number;
  actions?: React.ReactNode;
}> = ({ title, version, status, artifactCount, actions }) => (
  <Card>
    <Card.Header title={title} meta={<StatusChip label={statusLabel(status)} variant={status === "approved" ? "approved" : "ai"} />} />
    <Card.Body>
      <p className="text-[length:var(--font-size-caption)] text-[var(--color-text-secondary)]">
        v{version} · {artifactCount} artifacts
      </p>
    </Card.Body>
    {actions ? <Card.Footer>{actions}</Card.Footer> : null}
  </Card>
);

/** C-042 CursorSessionCard */
export const CursorSessionCard: React.FC<{
  sessionId: string;
  status: string;
  captureSummary?: string;
  actions?: React.ReactNode;
}> = ({ sessionId, status, captureSummary, actions }) => (
  <Card>
    <Card.Header title={`Session ${sessionId.slice(-6)}`} meta={<StatusChip label={status.replace(/_/g, " ")} variant={status === "submitted" ? "success" : "neutral"} />} />
    {captureSummary ? <Card.Body>{captureSummary}</Card.Body> : null}
    {actions ? <Card.Footer>{actions}</Card.Footer> : null}
  </Card>
);

/** C-043 EvaluationCard */
export const EvaluationCard: React.FC<{
  rubricName: string;
  scorePercent: number;
  passed: boolean;
  status: ArtifactStatus;
}> = ({ rubricName, scorePercent, passed, status }) => (
  <Card variant={passed ? "approved" : "risk"}>
    <Card.Header
      title={rubricName}
      meta={<StatusChip label={passed ? "Passed" : "Failed"} variant={passed ? "success" : "error"} />}
    />
    <Card.Body>
      <p className="text-[length:var(--font-size-heading)] font-[var(--font-weight-semibold)]">{passed ? "Pass" : "Fail"}</p>
      <p className="text-[length:var(--font-size-caption)] text-[var(--color-text-secondary)]">Score {scorePercent}% · {statusLabel(status)}</p>
    </Card.Body>
  </Card>
);

/** C-044 KnowledgeCard */
export const KnowledgeCard: React.FC<{
  title: string;
  scope: string;
  knowledgeType?: string;
  confidence?: string;
  promotionStatus?: string;
  version?: number;
  onSelect?: () => void;
}> = ({ title, scope, knowledgeType, confidence, promotionStatus, version, onSelect }) => {
  const catalogMode = knowledgeType !== undefined;

  return (
    <Card
      interactive={Boolean(onSelect)}
      onClick={onSelect}
      onKeyDown={
        onSelect
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect();
              }
            }
          : undefined
      }
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      <Card.Header
        title={title}
        meta={
          catalogMode && confidence ? (
            <StatusChip
              label={confidence.replace(/_/g, " ")}
              variant={
                confidence === "canonical" || confidence === "repeated"
                  ? "success"
                  : confidence === "validated"
                    ? "approved"
                    : "ai"
              }
            />
          ) : (
            <StatusChip label={scope} />
          )
        }
      />
      {catalogMode ? (
        <Card.Body>
          <p className="text-[length:var(--font-size-caption)] text-[var(--color-text-secondary)]">
            {scope} · {knowledgeType?.replace(/_/g, " ")}
          </p>
          {promotionStatus ? (
            <p className="mt-[var(--space-stack-xs)] text-[length:var(--font-size-caption)] text-[var(--color-text-secondary)]">
              {promotionStatus.replace(/_/g, " ")}
              {version !== undefined ? ` · v${version}` : ""}
            </p>
          ) : null}
        </Card.Body>
      ) : null}
    </Card>
  );
};

/** C-045 RegistryCard */
export const RegistryCard: React.FC<{
  moduleId: string;
  moduleName: string;
  matchScore?: number;
  decision?: string;
  status?: "stable" | "experimental" | "deprecated";
  version?: string;
  reuseCount?: number;
  onAccept?: () => void;
  onReject?: () => void;
  onSelect?: () => void;
}> = ({
  moduleId,
  moduleName,
  matchScore,
  decision,
  status,
  version,
  reuseCount,
  onAccept,
  onReject,
  onSelect,
}) => {
  const catalogMode = status !== undefined;

  return (
    <Card
      interactive={Boolean(onSelect)}
      onClick={onSelect}
      onKeyDown={
        onSelect
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect();
              }
            }
          : undefined
      }
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      <Card.Header
        title={moduleName}
        meta={
          catalogMode ? (
            <StatusChip
              label={status}
              variant={status === "deprecated" ? "warning" : status === "experimental" ? "ai" : "success"}
            />
          ) : (
            <StatusChip label={`${matchScore ?? 0}% match`} variant="ai" />
          )
        }
      />
      <Card.Body>
        <p className="font-mono text-[length:var(--font-size-caption)] text-[var(--color-text-secondary)]">{moduleId}</p>
        {catalogMode ? (
          <>
            {version ? (
              <p className="mt-[var(--space-stack-xs)] text-[length:var(--font-size-caption)] text-[var(--color-text-secondary)]">
                Version {version}
              </p>
            ) : null}
            {reuseCount !== undefined ? (
              <p className="mt-[var(--space-stack-xs)] text-[length:var(--font-size-caption)] text-[var(--color-text-secondary)]">
                Reused {reuseCount} times
              </p>
            ) : null}
          </>
        ) : (
          <p className="mt-[var(--space-stack-xs)] text-[length:var(--font-size-caption)]">Decision: {decision}</p>
        )}
      </Card.Body>
      <Card.Footer>
        <div className="flex gap-[var(--space-inline-sm)]">
          {onAccept ? <button type="button" className="text-[var(--color-text-link)]" onClick={onAccept}>Accept</button> : null}
          {onReject ? <button type="button" className="text-[var(--color-text-danger)]" onClick={onReject}>Reject</button> : null}
        </div>
      </Card.Footer>
    </Card>
  );
};

/** C-053 Timeline + C-054 TimelineEvent */
export const Timeline: React.FC<{ events: Array<{ id: string; title: string; actorLabel: string; timestamp: number }> }> = ({ events }) => (
  <ol className="flex flex-col gap-[var(--space-stack-md)]" aria-label="Engagement timeline">
    {events.map((event) => (
      <li key={event.id} className="border-l-2 border-[var(--color-border-default)] pl-[var(--space-inline-md)]">
        <p className="text-[length:var(--font-size-body)] font-[var(--font-weight-medium)]">{event.title}</p>
        <p className="text-[length:var(--font-size-caption)] text-[var(--color-text-secondary)]">
          {event.actorLabel} · {new Date(event.timestamp).toLocaleString()}
        </p>
      </li>
    ))}
  </ol>
);

/** Handoff strip pattern (M8/M9) */
export const HandoffStrip: React.FC<{ promptTitle: string; onCopy?: () => void }> = ({ promptTitle, onCopy }) => (
  <div className="flex flex-wrap items-center justify-between gap-[var(--space-inline-md)] rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-[var(--space-stack-md)]">
    <span className="text-[length:var(--font-size-body)]">Handoff: {promptTitle}</span>
    {onCopy ? (
      <button type="button" className="text-[length:var(--font-size-label)] text-[var(--color-text-link)]" onClick={onCopy}>
        Copy prompt
      </button>
    ) : null}
  </div>
);
