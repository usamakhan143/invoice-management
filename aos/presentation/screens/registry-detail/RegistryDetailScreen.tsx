/** ST-17 — Module Detail */
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AOS_FEATURE_FLAG } from "../../../config/featureFlags";
import { MODULE_TYPE_LABELS } from "../../../constants/moduleType";
import { useRegistryModuleQuery } from "../../../hooks/queries/useRegistryQueries";
import { FeatureFlagGate } from "../../gates";
import { PageHeader, PageShell } from "../../layouts";
import {
  Breadcrumb,
  DataTable,
  EmptyState,
  ErrorState,
  InAppAlert,
  KnowledgeCard,
  LinkButton,
  LoadingState,
  RegistryCard,
  StatusChip,
} from "../../ui";

function formatUsedAt(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const RegistryDetailScreen: React.FC = () => {
  const navigate = useNavigate();
  const { moduleId } = useParams<{ moduleId: string }>();
  const detailQuery = useRegistryModuleQuery(moduleId);
  const module = detailQuery.data;

  if (detailQuery.isLoading) {
    return <LoadingState message="Loading module detail…" />;
  }

  if (detailQuery.isError || !module) {
    return (
      <PageShell>
        <ErrorState
          title="Module not found"
          message={detailQuery.error?.message ?? "This module is not in the registry catalog."}
          onRetry={() => void detailQuery.refetch()}
        />
        <div className="flex justify-center pb-[var(--space-stack-xl)]">
          <LinkButton onClick={() => navigate("/aos/registry")}>Back to registry</LinkButton>
        </div>
      </PageShell>
    );
  }

  return (
    <FeatureFlagGate
      flag={AOS_FEATURE_FLAG.REGISTRY}
      fallback={
        <InAppAlert
          variant="info"
          title="Registry disabled"
          message="Module registry is not enabled for this workspace."
        />
      }
    >
      <PageShell>
        <Breadcrumb
          items={[
            { label: "Module Registry", href: "/aos/registry" },
            { label: module.moduleName },
          ]}
        />
        <PageHeader
          title={module.moduleName}
          subtitle={`${MODULE_TYPE_LABELS[module.moduleType]} · Quality ${module.qualityScore}%`}
        />
        <RegistryCard
          moduleId={module.moduleId}
          moduleName={module.moduleName}
          status={module.status}
          version={module.version}
          reuseCount={module.reuseCount}
        />
        <section className="flex flex-col gap-[var(--space-stack-sm)]">
          <h2 className="text-[length:var(--font-size-heading)] font-[var(--font-weight-semibold)] text-[var(--color-text-primary)]">
            Description
          </h2>
          <p className="text-[length:var(--font-size-body)] text-[var(--color-text-primary)]">{module.description}</p>
          <p className="font-mono text-[length:var(--font-size-caption)] text-[var(--color-text-secondary)]">
            {module.locationReference}
          </p>
          <div className="flex flex-wrap gap-[var(--space-inline-sm)]">
            {module.tags.map((tag) => (
              <StatusChip key={tag} label={tag} variant="neutral" />
            ))}
          </div>
          <LinkButton
            onClick={() => {
              void navigator.clipboard.writeText(module.moduleId);
            }}
          >
            Copy module ID
          </LinkButton>
        </section>
        <section className="flex flex-col gap-[var(--space-stack-sm)]">
          <h2 className="text-[length:var(--font-size-heading)] font-[var(--font-weight-semibold)] text-[var(--color-text-primary)]">
            Usage history
          </h2>
          {module.usageHistory.length === 0 ? (
            <EmptyState title="No recorded usage" description="This module has not been referenced in an engagement yet." />
          ) : (
            <DataTable
              density="compact"
              columns={[
                { id: "engagement", header: "Engagement", cell: (row) => row.engagementTitle },
                { id: "version", header: "Version used", cell: (row) => row.versionUsed },
                { id: "usedAt", header: "Used", cell: (row) => formatUsedAt(row.usedAt) },
                {
                  id: "action",
                  header: "Action",
                  cell: (row) => (
                    <LinkButton onClick={() => navigate(`/aos/delivery/${row.engagementId}`)}>
                      Open engagement
                    </LinkButton>
                  ),
                },
              ]}
              rows={module.usageHistory}
              getRowKey={(row) => `${row.engagementId}-${row.usedAt}`}
            />
          )}
        </section>
        {module.knowledgeLinks.length > 0 ? (
          <section className="flex flex-col gap-[var(--space-stack-sm)]">
            <h2 className="text-[length:var(--font-size-heading)] font-[var(--font-weight-semibold)] text-[var(--color-text-primary)]">
              Related knowledge
            </h2>
            <div className="grid grid-cols-1 gap-[var(--space-stack-md)] md:grid-cols-2">
              {module.knowledgeLinks.map((link) => (
                <KnowledgeCard key={link.patternId} title={link.title} scope={link.scope} />
              ))}
            </div>
          </section>
        ) : null}
      </PageShell>
    </FeatureFlagGate>
  );
};

export default RegistryDetailScreen;
