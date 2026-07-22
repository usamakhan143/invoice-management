import { AOS_PERMISSION_KEY } from "../constants/permissionKeys";
import { AOS_ROUTE_ID, AOS_ROUTE_PATH } from "./routes";

export const AOS_NAV_GROUP_ID = "aos-delivery" as const;

export const AOS_NAV_GROUP_LABEL = "Delivery (AOS)" as const;

export interface AosNavItemDefinition {
  routeId: string;
  path: string;
  label: string;
  requiredPermissions: readonly string[];
}

/**
 * AOS sidebar navigation — placeholder pages for Phase 1A scaffold.
 */
export const AOS_NAV_ITEMS: readonly AosNavItemDefinition[] = [
  {
    routeId: AOS_ROUTE_ID.DASHBOARD,
    path: AOS_ROUTE_PATH.DASHBOARD,
    label: "Dashboard",
    requiredPermissions: [AOS_PERMISSION_KEY.DASHBOARD_VIEW, AOS_PERMISSION_KEY.ADMIN],
  },
  {
    routeId: AOS_ROUTE_ID.DELIVERY,
    path: AOS_ROUTE_PATH.DELIVERY,
    label: "Delivery",
    requiredPermissions: [AOS_PERMISSION_KEY.ENGAGEMENTS_VIEW, AOS_PERMISSION_KEY.ADMIN],
  },
  {
    routeId: AOS_ROUTE_ID.REGISTRY,
    path: AOS_ROUTE_PATH.REGISTRY,
    label: "Registry",
    requiredPermissions: [AOS_PERMISSION_KEY.REGISTRY_VIEW, AOS_PERMISSION_KEY.ADMIN],
  },
  {
    routeId: AOS_ROUTE_ID.REQUIREMENTS,
    path: AOS_ROUTE_PATH.REQUIREMENTS,
    label: "Requirements",
    requiredPermissions: [AOS_PERMISSION_KEY.REQUIREMENTS_VIEW, AOS_PERMISSION_KEY.ADMIN],
  },
  {
    routeId: AOS_ROUTE_ID.PROMPTS,
    path: AOS_ROUTE_PATH.PROMPTS,
    label: "Prompts",
    requiredPermissions: [AOS_PERMISSION_KEY.PROMPTS_VIEW, AOS_PERMISSION_KEY.ADMIN],
  },
  {
    routeId: AOS_ROUTE_ID.CURSOR,
    path: AOS_ROUTE_PATH.CURSOR,
    label: "Cursor",
    requiredPermissions: [AOS_PERMISSION_KEY.CURSOR_VIEW, AOS_PERMISSION_KEY.ADMIN],
  },
  {
    routeId: AOS_ROUTE_ID.EVALUATION,
    path: AOS_ROUTE_PATH.EVALUATION,
    label: "Evaluation",
    requiredPermissions: [AOS_PERMISSION_KEY.EVALUATION_VIEW, AOS_PERMISSION_KEY.ADMIN],
  },
  {
    routeId: AOS_ROUTE_ID.KNOWLEDGE,
    path: AOS_ROUTE_PATH.KNOWLEDGE,
    label: "Knowledge",
    requiredPermissions: [AOS_PERMISSION_KEY.KNOWLEDGE_VIEW, AOS_PERMISSION_KEY.ADMIN],
  },
  {
    routeId: AOS_ROUTE_ID.LEARNING,
    path: AOS_ROUTE_PATH.LEARNING,
    label: "Learning Review",
    requiredPermissions: [AOS_PERMISSION_KEY.LEARNING_VIEW, AOS_PERMISSION_KEY.ADMIN],
  },
  {
    routeId: AOS_ROUTE_ID.PLAYBOOK,
    path: AOS_ROUTE_PATH.PLAYBOOK,
    label: "Playbook",
    requiredPermissions: [AOS_PERMISSION_KEY.PLAYBOOK_VIEW, AOS_PERMISSION_KEY.ADMIN],
  },
] as const;

export const AOS_NAV_GROUP_VISIBILITY_PERMISSIONS: readonly string[] = [
  AOS_PERMISSION_KEY.DASHBOARD_VIEW,
  AOS_PERMISSION_KEY.ENGAGEMENTS_VIEW,
  AOS_PERMISSION_KEY.REGISTRY_VIEW,
  AOS_PERMISSION_KEY.REQUIREMENTS_VIEW,
  AOS_PERMISSION_KEY.PROMPTS_VIEW,
  AOS_PERMISSION_KEY.CURSOR_VIEW,
  AOS_PERMISSION_KEY.EVALUATION_VIEW,
  AOS_PERMISSION_KEY.KNOWLEDGE_VIEW,
  AOS_PERMISSION_KEY.LEARNING_VIEW,
  AOS_PERMISSION_KEY.PLAYBOOK_VIEW,
  AOS_PERMISSION_KEY.ADMIN,
];

export function getAosNavItemsForPhase(_phase: "1a" | "1b"): readonly AosNavItemDefinition[] {
  return AOS_NAV_ITEMS;
}
