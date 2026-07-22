import { AOS_PERMISSION_KEY, type AosPermissionDefinition } from "../constants/permissionKeys";
import { AOS_FEATURE_FLAG, type AosFeatureFlag } from "./featureFlags";

/**
 * AOS route paths — HashRouter paths.
 * Route params use :param syntax for react-router.
 */
export const AOS_ROUTE_PATH = {
  ROOT: "/aos",
  DASHBOARD: "/aos",
  DELIVERY: "/aos/delivery",
  DELIVERY_CREATE: "/aos/delivery/new",
  DELIVERY_ENGAGEMENT: "/aos/delivery/:engagementId",
  REGISTRY: "/aos/registry",
  REGISTRY_DETAIL: "/aos/registry/:moduleId",
  REQUIREMENTS: "/aos/requirements",
  PROMPTS: "/aos/prompts",
  CURSOR: "/aos/cursor",
  EVALUATION: "/aos/evaluation",
  KNOWLEDGE: "/aos/knowledge",
  LEARNING: "/aos/learning",
  PLAYBOOK: "/aos/playbook",
} as const;

export type AosRoutePath = (typeof AOS_ROUTE_PATH)[keyof typeof AOS_ROUTE_PATH];

export const AOS_ROUTE_ID = {
  DASHBOARD: "aos-dashboard",
  DELIVERY: "aos-delivery",
  REGISTRY: "aos-registry",
  REQUIREMENTS: "aos-requirements",
  PROMPTS: "aos-prompts",
  CURSOR: "aos-cursor",
  EVALUATION: "aos-evaluation",
  KNOWLEDGE: "aos-knowledge",
  LEARNING: "aos-learning",
  PLAYBOOK: "aos-playbook",
} as const;

export type AosRouteId = (typeof AOS_ROUTE_ID)[keyof typeof AOS_ROUTE_ID];

export interface AosRouteDefinition {
  id: AosRouteId;
  path: AosRoutePath;
  label: string;
  requiredPermissions: readonly string[];
  featureFlag: AosFeatureFlag;
  phase: "1a" | "1b";
}

export const AOS_ROUTES: readonly AosRouteDefinition[] = [
  {
    id: AOS_ROUTE_ID.DASHBOARD,
    path: AOS_ROUTE_PATH.DASHBOARD,
    label: "AOS Dashboard",
    requiredPermissions: [AOS_PERMISSION_KEY.DASHBOARD_VIEW, AOS_PERMISSION_KEY.ADMIN],
    featureFlag: AOS_FEATURE_FLAG.MODULE_ENABLED,
    phase: "1a",
  },
  {
    id: AOS_ROUTE_ID.DELIVERY,
    path: AOS_ROUTE_PATH.DELIVERY,
    label: "Delivery",
    requiredPermissions: [AOS_PERMISSION_KEY.ENGAGEMENTS_VIEW, AOS_PERMISSION_KEY.ADMIN],
    featureFlag: AOS_FEATURE_FLAG.DELIVERY,
    phase: "1a",
  },
  {
    id: AOS_ROUTE_ID.REGISTRY,
    path: AOS_ROUTE_PATH.REGISTRY,
    label: "Registry",
    requiredPermissions: [AOS_PERMISSION_KEY.REGISTRY_VIEW, AOS_PERMISSION_KEY.ADMIN],
    featureFlag: AOS_FEATURE_FLAG.REGISTRY,
    phase: "1a",
  },
  {
    id: AOS_ROUTE_ID.REQUIREMENTS,
    path: AOS_ROUTE_PATH.REQUIREMENTS,
    label: "Requirements",
    requiredPermissions: [AOS_PERMISSION_KEY.REQUIREMENTS_VIEW, AOS_PERMISSION_KEY.ADMIN],
    featureFlag: AOS_FEATURE_FLAG.REQUIREMENTS,
    phase: "1a",
  },
  {
    id: AOS_ROUTE_ID.PROMPTS,
    path: AOS_ROUTE_PATH.PROMPTS,
    label: "Prompts",
    requiredPermissions: [AOS_PERMISSION_KEY.PROMPTS_VIEW, AOS_PERMISSION_KEY.ADMIN],
    featureFlag: AOS_FEATURE_FLAG.PROMPTS,
    phase: "1a",
  },
  {
    id: AOS_ROUTE_ID.CURSOR,
    path: AOS_ROUTE_PATH.CURSOR,
    label: "Cursor",
    requiredPermissions: [AOS_PERMISSION_KEY.CURSOR_VIEW, AOS_PERMISSION_KEY.ADMIN],
    featureFlag: AOS_FEATURE_FLAG.CURSOR,
    phase: "1a",
  },
  {
    id: AOS_ROUTE_ID.EVALUATION,
    path: AOS_ROUTE_PATH.EVALUATION,
    label: "Evaluation",
    requiredPermissions: [AOS_PERMISSION_KEY.EVALUATION_VIEW, AOS_PERMISSION_KEY.ADMIN],
    featureFlag: AOS_FEATURE_FLAG.EVALUATION,
    phase: "1a",
  },
  {
    id: AOS_ROUTE_ID.KNOWLEDGE,
    path: AOS_ROUTE_PATH.KNOWLEDGE,
    label: "Knowledge",
    requiredPermissions: [AOS_PERMISSION_KEY.KNOWLEDGE_VIEW, AOS_PERMISSION_KEY.ADMIN],
    featureFlag: AOS_FEATURE_FLAG.KNOWLEDGE,
    phase: "1a",
  },
  {
    id: AOS_ROUTE_ID.LEARNING,
    path: AOS_ROUTE_PATH.LEARNING,
    label: "Learning Review",
    requiredPermissions: [AOS_PERMISSION_KEY.LEARNING_VIEW, AOS_PERMISSION_KEY.ADMIN],
    featureFlag: AOS_FEATURE_FLAG.LEARNING_ENGINE,
    phase: "1b",
  },
  {
    id: AOS_ROUTE_ID.PLAYBOOK,
    path: AOS_ROUTE_PATH.PLAYBOOK,
    label: "Playbook",
    requiredPermissions: [AOS_PERMISSION_KEY.PLAYBOOK_VIEW, AOS_PERMISSION_KEY.ADMIN],
    featureFlag: AOS_FEATURE_FLAG.PLAYBOOK,
    phase: "1a",
  },
] as const;

export function getAosRoutesForPhase(phase: "1a" | "1b"): readonly AosRouteDefinition[] {
  if (phase === "1b") return AOS_ROUTES;
  return AOS_ROUTES.filter((r) => r.phase === "1a");
}

export function getAosRouteById(id: AosRouteId): AosRouteDefinition | undefined {
  return AOS_ROUTES.find((route) => route.id === id);
}
