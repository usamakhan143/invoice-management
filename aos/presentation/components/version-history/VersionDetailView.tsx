import React from "react";
import { Card, StatusChip } from "../../ui";
import { TraceabilityReference } from "./TraceabilityReference";
import { formatVersionTimestamp } from "./versionHistoryFormat";

export interface VersionDetailField {
  label: string;
  value: React.ReactNode;
  technicalId?: string;
  onNavigate?: () => void;
  navigateLabel?: string;
}

export interface VersionDetailViewProps {
  title: string;
  subtitle?: string;
  statusLabel?: string;
  statusVariant?: "neutral" | "success" | "warning" | "error" | "ai" | "approved";
  readOnly?: boolean;
  fields?: VersionDetailField[];
  references?: VersionDetailField[];
  children?: React.ReactNode;
}

/** Read-only immutable version / session / evaluation detail surface. */
export const VersionDetailView: React.FC<VersionDetailViewProps> = ({
  title,
  subtitle,
  statusLabel,
  statusVariant = "approved",
  readOnly = true,
  fields = [],
  references = [],
  children,
}) => (
  <div className="flex flex-col gap-[var(--space-stack-md)]">
    <header>
      <div className="flex flex-wrap items-center gap-[var(--space-inline-sm)]">
        <h3 className="text-[length:var(--font-size-heading)] font-[var(--font-weight-semibold)]">{title}</h3>
        {statusLabel ? <StatusChip label={statusLabel} variant={statusVariant} /> : null}
        {readOnly ? (
          <span
            className="text-[length:var(--font-size-caption)] text-[var(--color-text-secondary)]"
            aria-label="Historical read-only record"
          >
            Read-only history
          </span>
        ) : null}
      </div>
      {subtitle ? (
        <p className="mt-[var(--space-stack-xs)] text-[length:var(--font-size-body)] text-[var(--color-text-secondary)]">
          {subtitle}
        </p>
      ) : null}
    </header>

    {fields.length > 0 ? (
      <Card>
        <Card.Body>
          <dl className="grid gap-[var(--space-stack-sm)]">
            {fields.map((field) => (
              <div key={field.label}>
                <dt className="text-[length:var(--font-size-caption)] font-[var(--font-weight-medium)] uppercase text-[var(--color-text-secondary)]">
                  {field.label}
                </dt>
                <dd className="mt-0.5 text-[length:var(--font-size-body)] text-[var(--color-text-primary)]">
                  {field.value}
                </dd>
              </div>
            ))}
          </dl>
        </Card.Body>
      </Card>
    ) : null}

    {references.length > 0 ? (
      <section aria-label="Lineage references">
        <h4 className="mb-[var(--space-stack-sm)] text-[length:var(--font-size-body)] font-[var(--font-weight-semibold)]">
          Lineage
        </h4>
        <div className="grid gap-[var(--space-stack-sm)]">
          {references.map((ref) => (
            <TraceabilityReference
              key={ref.label}
              label={ref.label}
              technicalId={ref.technicalId}
              onNavigate={ref.onNavigate}
              navigateLabel={ref.navigateLabel}
            />
          ))}
        </div>
      </section>
    ) : null}

    {children}
  </div>
);

export function timestampField(label: string, epochMs?: number): VersionDetailField {
  return { label, value: formatVersionTimestamp(epochMs) };
}
