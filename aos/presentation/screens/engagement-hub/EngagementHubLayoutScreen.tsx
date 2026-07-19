/** ST-04 — Engagement Hub layout with continuous workflow tab gates */
import React, { useCallback, useEffect, useMemo } from "react";
import { Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { DELIVERY_STATE_LABELS } from "../../../constants/deliveryState";
import { AOS_FEATURE_FLAG } from "../../../config/featureFlags";
import { useDeliveryEngagementQuery } from "../../../hooks/queries/useDeliveryEngagementQuery";
import { useEngagementWorkflowQuery } from "../../../hooks/queries/useEngagementWorkflowQuery";
import { FeatureFlagGate } from "../../gates";
import { ContextBanner, PageHeader, PageShell } from "../../layouts";
import {
  Breadcrumb,
  EngagementTabBar,
  ErrorState,
  GateChip,
  InAppAlert,
  LifecycleBadge,
  LoadingState,
} from "../../ui";
import { ENGAGEMENT_HUB_TABS, getEngagementHubTabPath, resolveEngagementHubTabId } from "./engagementHubTabs";
import { EngagementContextProvider } from "./EngagementContextProvider";
import { getWorkflowTabAccess } from "./workflowGates";

const EngagementHubLayoutScreen: React.FC = () => {
  const { engagementId = "" } = useParams<{ engagementId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const engagementQuery = useDeliveryEngagementQuery(engagementId);
  const workflowQuery = useEngagementWorkflowQuery(engagementId);

  useEffect(() => {
    if (!engagementId) return;
    void engagementQuery.refetch();
    void workflowQuery.refetch();
  }, [engagementId, engagementQuery.refetch, workflowQuery.refetch]);

  const activeTab = resolveEngagementHubTabId(location.pathname, engagementId);
  const tabAccess = useMemo(() => getWorkflowTabAccess(workflowQuery.data), [workflowQuery.data]);

  const handleTabChange = useCallback(
    (tabId: string) => {
      const access = tabAccess.find((tab) => tab.id === tabId);
      if (access && !access.enabled) return;
      const tab = ENGAGEMENT_HUB_TABS.find((entry) => entry.id === tabId);
      if (!tab) return;
      navigate(getEngagementHubTabPath(engagementId, tab.path));
    },
    [engagementId, navigate, tabAccess],
  );

  const engagement = engagementQuery.data;

  return (
    <FeatureFlagGate
      flag={AOS_FEATURE_FLAG.DELIVERY}
      fallback={
        <PageShell>
          <InAppAlert variant="warning" title="Delivery module disabled">
            The Delivery feature flag is off for this workspace.
          </InAppAlert>
        </PageShell>
      }
    >
      <EngagementContextProvider
        engagementId={engagementId}
        engagement={engagement}
        isLoading={engagementQuery.isLoading}
        isError={engagementQuery.isError}
        error={engagementQuery.error}
        refetch={() => void engagementQuery.refetch()}
      >
        <PageShell>
          <PageHeader
            breadcrumb={
              <Breadcrumb
                items={[
                  { label: "Delivery", href: "/aos/delivery" },
                  { label: engagement?.title ?? "Engagement" },
                ]}
              />
            }
            title={engagement?.title ?? "Engagement"}
            subtitle={
              engagement ? (
                <span className="inline-flex items-center gap-[var(--space-inline-sm)]">
                  <LifecycleBadge label={DELIVERY_STATE_LABELS[engagement.status]} />
                  <span>{engagement.erpCustomerId}</span>
                </span>
              ) : (
                "Loading engagement context…"
              )
            }
          />

          {engagementQuery.isLoading ? (
            <LoadingState message="Loading engagement…" />
          ) : engagementQuery.isError ? (
            <ErrorState
              title="Could not load engagement"
              message={engagementQuery.error?.message}
              onRetry={() => void engagementQuery.refetch()}
              retrying={engagementQuery.isFetching}
            />
          ) : !engagement ? (
            <ErrorState
              title="Engagement not found"
              message="This delivery engagement does not exist or you cannot access it."
            />
          ) : (
            <>
              <ContextBanner variant="lifecycle">
                Founder workflow: Requirements → Reuse → Prompts → Cursor → Evaluation → QA → Retrospective
              </ContextBanner>
              <div className="mb-[var(--space-stack-md)] flex flex-wrap gap-[var(--space-inline-sm)]">
                {tabAccess.slice(1).map((tab) => (
                  <GateChip
                    key={tab.id}
                    label={tab.label}
                    satisfied={tab.enabled && !tab.indicator}
                    onClick={() => tab.enabled && handleTabChange(tab.id)}
                  />
                ))}
              </div>
              <EngagementTabBar
                tabs={ENGAGEMENT_HUB_TABS.map((tab) => {
                  const access = tabAccess.find((entry) => entry.id === tab.id);
                  return {
                    id: tab.id,
                    label: tab.label,
                    indicator: access?.indicator,
                    disabled: access ? !access.enabled : false,
                    title: access?.reason,
                  };
                })}
                activeTab={activeTab}
                onTabChange={handleTabChange}
              />
              <Outlet />
            </>
          )}
        </PageShell>
      </EngagementContextProvider>
    </FeatureFlagGate>
  );
};

export default EngagementHubLayoutScreen;
