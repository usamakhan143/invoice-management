/** ST-04 Overview — workflow entry and next-step navigation */
import React from "react";
import { useNavigate } from "react-router-dom";
import { useEngagementWorkflowQuery } from "../../../../hooks/queries/useEngagementWorkflowQuery";
import { Button, GateChip, LoadingState, Timeline } from "../../../ui";
import { useEngagementContext } from "../EngagementContextProvider";
import { getNextWorkflowStepHref, getWorkflowTabAccess } from "../workflowGates";

const EngagementOverviewScreen: React.FC = () => {
  const navigate = useNavigate();
  const { engagementId } = useEngagementContext();
  const workflowQuery = useEngagementWorkflowQuery(engagementId);

  if (workflowQuery.isLoading) {
    return <LoadingState message="Loading workflow status…" />;
  }

  const nextHref = getNextWorkflowStepHref(engagementId, workflowQuery.data);
  const tabAccess = getWorkflowTabAccess(workflowQuery.data);

  return (
    <div id="aos-engagement-panel-overview" aria-labelledby="aos-engagement-tab-overview" className="flex flex-col gap-[var(--space-stack-lg)]">
      <section>
        <h3 className="mb-[var(--space-stack-md)] text-[length:var(--font-size-heading)] font-[var(--font-weight-semibold)]">
          Founder workflow status
        </h3>
        <div className="flex flex-wrap gap-[var(--space-inline-sm)]">
          {tabAccess.slice(1).map((tab) => (
            <GateChip
              key={tab.id}
              label={tab.label}
              satisfied={Boolean(workflowQuery.data?.gates && !tab.indicator && tab.enabled)}
            />
          ))}
        </div>
      </section>
      {nextHref ? (
        <Button onClick={() => navigate(nextHref)}>Continue workflow</Button>
      ) : (
        <p className="text-[length:var(--font-size-body)] text-[var(--color-text-success)]">Workflow complete for this engagement.</p>
      )}
      {workflowQuery.data?.timeline?.length ? (
        <section>
          <h3 className="mb-[var(--space-stack-md)] text-[length:var(--font-size-heading)] font-[var(--font-weight-semibold)]">Recent events</h3>
          <Timeline events={workflowQuery.data.timeline.slice(0, 5)} />
        </section>
      ) : null}
    </div>
  );
};

export default EngagementOverviewScreen;
