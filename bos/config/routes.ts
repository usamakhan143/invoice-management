import { BOS_PERMISSION_KEY, type BosPermissionDefinition } from "../constants/permissionKeys";

/**
 * BOS route paths — HashRouter paths (Doc 20 §I).
 * Route params use :param syntax for react-router.
 */
export const BOS_ROUTE_PATH = {
  ROOT: "/bos",
  DASHBOARD: "/bos",
  VENTURES: "/bos/ventures",
  VENTURES_NEW: "/bos/ventures/new",
  INITIATIVES: "/bos/initiatives",
  INITIATIVES_NEW: "/bos/initiatives/new",
  INITIATIVE_DETAIL: "/bos/initiatives/:initiativeId",
  DECISIONS: "/bos/decisions",
  ATTRIBUTIONS: "/bos/attributions",
  REPORTS: "/bos/reports",
} as const;

export type BosRoutePath = (typeof BOS_ROUTE_PATH)[keyof typeof BOS_ROUTE_PATH];

export const BOS_ROUTE_ID = {
  DASHBOARD: "bos-dashboard",
  VENTURES: "bos-ventures",
  INITIATIVES: "bos-initiatives",
  INITIATIVE_DETAIL: "bos-initiative-detail",
  DECISIONS: "bos-decisions",
  ATTRIBUTIONS: "bos-attributions",
  REPORTS: "bos-reports",
} as const;

export type BosRouteId = (typeof BOS_ROUTE_ID)[keyof typeof BOS_ROUTE_ID];

export interface BosRouteDefinition {
  id: BosRouteId;
  path: BosRoutePath;
  label: string;
  /** Permission required to view this route (any one if array). */
  requiredPermissions: readonly string[];
  phase: "1a" | "1b";
}

export const BOS_ROUTES: readonly BosRouteDefinition[] = [
  {
    id: BOS_ROUTE_ID.DASHBOARD,
    path: BOS_ROUTE_PATH.DASHBOARD,
    label: "BOS Dashboard",
    requiredPermissions: [BOS_PERMISSION_KEY.KPIS_VIEW, BOS_PERMISSION_KEY.PORTFOLIO_VIEW],
    phase: "1a",
  },
  {
    id: BOS_ROUTE_ID.VENTURES,
    path: BOS_ROUTE_PATH.VENTURES,
    label: "Ventures",
    requiredPermissions: [BOS_PERMISSION_KEY.VENTURES_VIEW],
    phase: "1a",
  },
  {
    id: BOS_ROUTE_ID.INITIATIVES,
    path: BOS_ROUTE_PATH.INITIATIVES,
    label: "Initiatives",
    requiredPermissions: [BOS_PERMISSION_KEY.INITIATIVES_VIEW],
    phase: "1a",
  },
  {
    id: BOS_ROUTE_ID.DECISIONS,
    path: BOS_ROUTE_PATH.DECISIONS,
    label: "Decisions",
    requiredPermissions: [BOS_PERMISSION_KEY.DECISIONS_VIEW],
    phase: "1a",
  },
  {
    id: BOS_ROUTE_ID.ATTRIBUTIONS,
    path: BOS_ROUTE_PATH.ATTRIBUTIONS,
    label: "Attributions",
    requiredPermissions: [BOS_PERMISSION_KEY.ATTRIBUTIONS_VIEW],
    phase: "1b",
  },
  {
    id: BOS_ROUTE_ID.REPORTS,
    path: BOS_ROUTE_PATH.REPORTS,
    label: "BOS Reports",
    requiredPermissions: [BOS_PERMISSION_KEY.KPIS_VIEW, BOS_PERMISSION_KEY.KPIS_EXPORT],
    phase: "1b",
  },
] as const;

export function getBosRoutesForPhase(phase: "1a" | "1b"): readonly BosRouteDefinition[] {
  if (phase === "1b") return BOS_ROUTES;
  return BOS_ROUTES.filter((r) => r.phase === "1a");
}

export function buildInitiativeDetailPath(initiativeId: string): string {
  return BOS_ROUTE_PATH.INITIATIVE_DETAIL.replace(":initiativeId", initiativeId);
}
