/** ST-01 — Founder Dashboard */
import React from "react";
import { useNavigate } from "react-router-dom";
import { DELIVERY_STATE_LABELS } from "../../../constants/deliveryState";
import { AOS_FEATURE_FLAG } from "../../../config/featureFlags";
import { useFounderDashboardQuery } from "../../../hooks/queries/useDashboardQueries";
import { FeatureFlagGate } from "../../gates";
import { ContentGrid, PageHeader, PageShell } from "../../layouts";
import {
  AiExplainBlock,
  AttentionQueue,
  Card,
  ErrorState,
  InAppAlert,
  KnowledgeCard,
  LinkButton,
  LoadingState,
  NextBestActionCard,
  RegistryCard,
  RiskPanel,
} from "../../ui";

function DashboardWidgetError({
  title,
  message,
  onRetry,
}: {
  title: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border-default)] p-[var(--space-card-padding)]">
      <ErrorState title={title} message={message} onRetry={onRetry} className="py-[var(--space-stack-md)]" />
    </div>
  );
}

const FounderDashboardScreen: React.FC = () => {
  const navigate = useNavigate();
  const dashboardQuery = useFounderDashboardQuery();

  if (dashboardQuery.isLoading) {
    return <LoadingState message="Loading founder dashboard…" />;
  }

  const data = dashboardQuery.data;

  return (
    <FeatureFlagGate
      flag={AOS_FEATURE_FLAG.MODULE_ENABLED}
      fallback={
        <InAppAlert variant="info" title="AOS disabled" message="AOS module is not enabled for this workspace." />
      }
    >
      <PageShell>
        <PageHeader
          title="Dashboard"
          subtitle="What needs you now — decision surface, not analytics."
        />
        {dashboardQuery.isError ? (
          <DashboardWidgetError
            title="Unable to load dashboard"
            message={dashboardQuery.error?.message}
            onRetry={() => void dashboardQuery.refetch()}
          />
        ) : null}
        {data ? (
          <div className="flex flex-col gap-[var(--space-stack-lg)]">
            <AttentionQueue
              items={data.attentionQueue.map((item) => ({
                actionLabel: item.actionLabel,
                engagementTitle: item.engagementTitle,
                clientLabel: item.clientLabel,
                whyNow: item.whyNow,
                severity: item.severity,
                aiDraft: item.aiDraft,
                href: item.tabHref,
              }))}
              onNavigate={(href) => navigate(href)}
              emptyAction={<LinkButton onClick={() => navigate("/aos/delivery")}>View deliveries</LinkButton>}
            />
            {data.nextBestAction ? (
              <NextBestActionCard
                engagementTitle={data.nextBestAction.engagementTitle}
                clientLabel={data.nextBestAction.clientLabel}
                lifecycleLabel={DELIVERY_STATE_LABELS[data.nextBestAction.lifecycleState]}
                rationale={data.nextBestAction.rationale}
                ctaLabel={data.nextBestAction.ctaLabel}
                blockers={data.nextBestAction.blockers}
                onContinue={() => navigate(data.nextBestAction!.tabHref)}
              />
            ) : null}
            <ContentGrid columns={2}>
              <div className="flex flex-col gap-[var(--space-stack-md)]">
                <section aria-labelledby="todays-focus-heading">
                  <h2 id="todays-focus-heading" className="mb-[var(--space-stack-sm)] text-[length:var(--font-size-heading)] font-[var(--font-weight-semibold)]">
                    Today&apos;s Focus
                  </h2>
                  <AiExplainBlock>{data.todaysFocus}</AiExplainBlock>
                </section>
                <Card>
                  <Card.Header title="Pending Reviews" />
                  <Card.Body>
                    <ul className="flex flex-col gap-[var(--space-stack-xs)] text-[length:var(--font-size-body)]">
                      <li>
                        <LinkButton onClick={() => navigate("/aos/requirements")}>
                          Requirements ({data.pendingReviews.requirements})
                        </LinkButton>
                      </li>
                      <li>
                        <LinkButton onClick={() => navigate("/aos/prompts")}>
                          Prompts ({data.pendingReviews.prompts})
                        </LinkButton>
                      </li>
                      <li>
                        <LinkButton onClick={() => navigate("/aos/cursor")}>
                          Cursor ({data.pendingReviews.cursor})
                        </LinkButton>
                      </li>
                      <li>
                        <LinkButton onClick={() => navigate("/aos/evaluation")}>
                          Evaluations ({data.pendingReviews.evaluations})
                        </LinkButton>
                      </li>
                    </ul>
                  </Card.Body>
                </Card>
                {data.evaluationAlerts.length > 0 ? (
                  <Card variant="risk">
                    <Card.Header title="Evaluation Alerts" />
                    <Card.Body>
                      <ul className="list-disc space-y-[var(--space-stack-xs)] pl-[var(--space-inline-md)] text-[length:var(--font-size-body)]">
                        {data.evaluationAlerts.map((alert) => (
                          <li key={alert.id}>
                            <button
                              type="button"
                              className="text-left text-[var(--color-text-link)]"
                              onClick={() => navigate(alert.tabHref)}
                            >
                              {alert.engagementTitle}: {alert.whyNow}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </Card.Body>
                  </Card>
                ) : null}
                <section aria-labelledby="ai-insights-heading">
                  <h2 id="ai-insights-heading" className="mb-[var(--space-stack-sm)] text-[length:var(--font-size-heading)] font-[var(--font-weight-semibold)]">
                    AI Insights
                  </h2>
                  <div className="flex flex-col gap-[var(--space-stack-sm)]">
                    {data.aiInsights.map((insight) => (
                      <AiExplainBlock key={insight.id}>{insight.message}</AiExplainBlock>
                    ))}
                  </div>
                </section>
                {data.founderDecisionCards.length > 0 ? (
                  <section aria-labelledby="decision-cards-heading">
                    <h2 id="decision-cards-heading" className="mb-[var(--space-stack-sm)] text-[length:var(--font-size-heading)] font-[var(--font-weight-semibold)]">
                      Founder Decision Cards
                    </h2>
                    <div className="grid gap-[var(--space-stack-sm)]">
                      {data.founderDecisionCards.map((card) => (
                        <Card key={card.id} interactive onClick={() => navigate(card.tabHref)}>
                          <Card.Header title={card.actionLabel} meta={<span>{card.clientLabel}</span>} />
                          <Card.Body>
                            <p className="text-[length:var(--font-size-caption)] text-[var(--color-text-secondary)]">
                              {card.engagementTitle} · {card.whyNow}
                            </p>
                          </Card.Body>
                        </Card>
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
              <div className="flex flex-col gap-[var(--space-stack-md)]">
                <RiskPanel risks={data.risks} onNavigate={(href) => navigate(href)} />
                {data.upcomingCritical.length > 0 ? (
                  <Card>
                    <Card.Header title="Upcoming Critical Items" />
                    <Card.Body>
                      <ul className="flex flex-col gap-[var(--space-stack-sm)]">
                        {data.upcomingCritical.map((item) => (
                          <li key={item.id}>
                            <button
                              type="button"
                              className="text-left text-[length:var(--font-size-body)] text-[var(--color-text-link)]"
                              onClick={() => navigate(item.tabHref)}
                            >
                              {item.actionLabel} — {item.engagementTitle}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </Card.Body>
                  </Card>
                ) : null}
                <section aria-labelledby="active-engagements-heading">
                  <h2 id="active-engagements-heading" className="mb-[var(--space-stack-sm)] text-[length:var(--font-size-heading)] font-[var(--font-weight-semibold)]">
                    Active Engagement Summary
                  </h2>
                  {data.lifecycleCounts.length === 0 ? (
                    <p className="text-[length:var(--font-size-caption)] text-[var(--color-text-secondary)]">
                      No active engagements
                    </p>
                  ) : (
                    <p className="flex flex-wrap gap-x-[var(--space-inline-md)] gap-y-[var(--space-stack-xs)] text-[length:var(--font-size-caption)] text-[var(--color-text-secondary)]">
                      {data.lifecycleCounts.map((entry) => (
                        <span key={entry.state}>
                          {entry.label}: {entry.count}
                        </span>
                      ))}
                    </p>
                  )}
                </section>
              </div>
            </ContentGrid>
            <section aria-labelledby="reuse-strip-heading">
              <h2 id="reuse-strip-heading" className="mb-[var(--space-stack-sm)] text-[length:var(--font-size-heading)] font-[var(--font-weight-semibold)]">
                Reuse Opportunities
              </h2>
              <div className="grid grid-cols-1 gap-[var(--space-stack-md)] lg:grid-cols-2">
                {data.reuseOpportunities.map((module) => (
                  <RegistryCard
                    key={module.moduleId}
                    moduleId={module.moduleId}
                    moduleName={module.moduleName}
                    status={module.status}
                    version={module.version}
                    reuseCount={module.reuseCount}
                    onSelect={() => navigate(`/aos/registry/${module.moduleId}`)}
                  />
                ))}
              </div>
            </section>
            <section aria-labelledby="learned-knowledge-heading">
              <h2 id="learned-knowledge-heading" className="mb-[var(--space-stack-sm)] text-[length:var(--font-size-heading)] font-[var(--font-weight-semibold)]">
                Recently Learned Knowledge
              </h2>
              <div className="grid grid-cols-1 gap-[var(--space-stack-md)] md:grid-cols-3">
                {data.recentKnowledge.map((item) => (
                  <KnowledgeCard
                    key={item.patternId}
                    title={item.title}
                    scope={item.primaryDomain}
                    knowledgeType={item.knowledgeType}
                    confidence={item.confidence}
                    promotionStatus={item.promotionStatus}
                    version={item.patternVersion}
                    onSelect={() => navigate(`/aos/knowledge?pattern=${item.patternId}`)}
                  />
                ))}
              </div>
            </section>
            <section aria-labelledby="registry-activity-heading">
              <h2 id="registry-activity-heading" className="mb-[var(--space-stack-sm)] text-[length:var(--font-size-heading)] font-[var(--font-weight-semibold)]">
                Registry Activity
              </h2>
              <div className="grid grid-cols-1 gap-[var(--space-stack-md)] md:grid-cols-3">
                {data.registryActivity.map((module) => (
                  <RegistryCard
                    key={module.moduleId}
                    moduleId={module.moduleId}
                    moduleName={module.moduleName}
                    status={module.status}
                    version={module.version}
                    reuseCount={module.reuseCount}
                    onSelect={() => navigate(`/aos/registry/${module.moduleId}`)}
                  />
                ))}
              </div>
            </section>
            <section aria-labelledby="quick-actions-heading">
              <h2 id="quick-actions-heading" className="mb-[var(--space-stack-sm)] text-[length:var(--font-size-heading)] font-[var(--font-weight-semibold)]">
                Quick Actions
              </h2>
              <div className="flex flex-wrap gap-[var(--space-inline-md)]">
                {data.quickActions.map((action) => (
                  <LinkButton key={action.id} onClick={() => navigate(action.href)}>
                    {action.label}
                  </LinkButton>
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </PageShell>
    </FeatureFlagGate>
  );
};

export default FounderDashboardScreen;
