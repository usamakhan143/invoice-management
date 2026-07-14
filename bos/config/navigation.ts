import { BOS_PERMISSION_KEY } from "../constants/permissionKeys";
import { BOS_ROUTE_ID, BOS_ROUTE_PATH } from "./routes";

export const BOS_NAV_GROUP_ID = "bos-strategy" as const;

export interface BosNavItemDefinition {
  routeId: string;
  path: string;
  label: string;
  requiredPermissions: readonly string[];
}

/**
 * Vertical slice navigation — initiatives workflow only (no dashboard/reports).
 */
export const BOS_VERTICAL_SLICE_NAV_ITEMS: readonly BosNavItemDefinition[] = [
  {
    routeId: BOS_ROUTE_ID.INITIATIVES,
    path: BOS_ROUTE_PATH.INITIATIVES,
    label: "Initiatives",
    requiredPermissions: [BOS_PERMISSION_KEY.INITIATIVES_VIEW],
  },
  {
    routeId: BOS_ROUTE_ID.VENTURES,
    path: BOS_ROUTE_PATH.VENTURES,
    label: "Ventures",
    requiredPermissions: [BOS_PERMISSION_KEY.VENTURES_VIEW],
  },
] as const;

export const BOS_NAV_GROUP_LABEL = "Strategy" as const;

export const BOS_NAV_GROUP_VISIBILITY_PERMISSIONS: readonly string[] = [
  BOS_PERMISSION_KEY.VENTURES_VIEW,
  BOS_PERMISSION_KEY.INITIATIVES_VIEW,
  BOS_PERMISSION_KEY.DECISIONS_VIEW,
  BOS_PERMISSION_KEY.ATTRIBUTIONS_VIEW,
  BOS_PERMISSION_KEY.ADMIN,
];
