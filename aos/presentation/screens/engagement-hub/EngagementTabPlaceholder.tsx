/** ST-04 tab placeholder — shell only; domain content deferred to M7+. */
import React from "react";
import { LoadingState, SkeletonBlock } from "../../ui";

export interface EngagementTabPlaceholderProps {
  tabLabel: string;
}

export const EngagementTabPlaceholder: React.FC<EngagementTabPlaceholderProps> = ({
  tabLabel,
}) => {
  return (
    <div
      role="tabpanel"
      aria-label={`${tabLabel} placeholder`}
      className="flex flex-col gap-[var(--space-stack-md)]"
    >
      <LoadingState message={`${tabLabel} loads in a later milestone`} />
      <SkeletonBlock lines={4} />
    </div>
  );
};
