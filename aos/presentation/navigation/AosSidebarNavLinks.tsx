import React from "react";
import { NavLink } from "react-router-dom";
import { AOS_ROUTE_ID } from "../../config/routes";
import type { AosNavItemDefinition } from "../../config/navigation";
import { useQueueBadgeCountsQuery } from "../../hooks/queries/useQueueQueries";
import { NotificationBadge } from "../ui";

function badgeCountForRoute(
  routeId: string,
  counts: { requirements: number; prompts: number; cursor: number; evaluation: number } | undefined,
): number | undefined {
  if (!counts) return undefined;
  switch (routeId) {
    case AOS_ROUTE_ID.REQUIREMENTS:
      return counts.requirements || undefined;
    case AOS_ROUTE_ID.PROMPTS:
      return counts.prompts || undefined;
    case AOS_ROUTE_ID.CURSOR:
      return counts.cursor || undefined;
    case AOS_ROUTE_ID.EVALUATION:
      return counts.evaluation || undefined;
    default:
      return undefined;
  }
}

export interface AosSidebarNavLinksProps {
  items: readonly AosNavItemDefinition[];
  linkClassName: ({ isActive }: { isActive: boolean }) => string;
  onNavigate: () => void;
}

export const AosSidebarNavLinks: React.FC<AosSidebarNavLinksProps> = ({
  items,
  linkClassName,
  onNavigate,
}) => {
  const badgeQuery = useQueueBadgeCountsQuery();

  return (
    <ul className="ml-3 space-y-0.5 border-l border-slate-200/90 pl-2 dark:border-gray-700">
      {items.map((item) => {
        const badgeCount = badgeCountForRoute(item.routeId, badgeQuery.data);
        return (
          <li key={item.path}>
            <NavLink
              to={item.path}
              end={item.path === "/aos"}
              onClick={onNavigate}
              className={linkClassName}
            >
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {badgeCount ? (
                <NotificationBadge count={badgeCount} label={`${badgeCount} pending`} />
              ) : null}
            </NavLink>
          </li>
        );
      })}
    </ul>
  );
};
