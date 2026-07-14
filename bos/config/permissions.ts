import {
  BOS_PERMISSION_CATEGORY,
  BOS_PERMISSION_KEY,
  type BosPermissionDefinition,
} from "../constants/permissionKeys";

/**
 * BOS permission registry — maps keys to UI labels for RoleManagement (Phase 1+).
 * Keys must match Doc 12; ERP config/permissions.ts stays separate.
 */
export const BOS_PERMISSION_DEFINITIONS: readonly BosPermissionDefinition[] = [
  {
    key: BOS_PERMISSION_KEY.PORTFOLIO_VIEW,
    label: "View portfolio summary",
    description: "View venture list and portfolio-level BOS dashboard",
    category: BOS_PERMISSION_CATEGORY.PORTFOLIO,
    phase: "1a",
  },
  {
    key: BOS_PERMISSION_KEY.VENTURES_VIEW,
    label: "View ventures",
    description: "View BosVenture records",
    category: BOS_PERMISSION_CATEGORY.PORTFOLIO,
    phase: "1a",
  },
  {
    key: BOS_PERMISSION_KEY.VENTURES_MANAGE,
    label: "Manage ventures",
    description: "Create, edit, pause, archive ventures",
    category: BOS_PERMISSION_CATEGORY.PORTFOLIO,
    phase: "1a",
  },
  {
    key: BOS_PERMISSION_KEY.INITIATIVES_VIEW,
    label: "View initiatives",
    description: "View BosInitiative records",
    category: BOS_PERMISSION_CATEGORY.STRATEGY,
    phase: "1a",
  },
  {
    key: BOS_PERMISSION_KEY.INITIATIVES_MANAGE,
    label: "Manage initiatives",
    description: "Create, activate, pause, close initiatives",
    category: BOS_PERMISSION_CATEGORY.STRATEGY,
    phase: "1a",
  },
  {
    key: BOS_PERMISSION_KEY.MILESTONES_VIEW,
    label: "View milestones",
    description: "View initiative milestones and progress",
    category: BOS_PERMISSION_CATEGORY.STRATEGY,
    phase: "1a",
  },
  {
    key: BOS_PERMISSION_KEY.MILESTONES_MANAGE,
    label: "Manage milestones",
    description: "Create, edit, complete, block, and skip milestones",
    category: BOS_PERMISSION_CATEGORY.STRATEGY,
    phase: "1a",
  },
  {
    key: BOS_PERMISSION_KEY.MILESTONE_TEMPLATES_VIEW,
    label: "View milestone templates",
    description: "View reusable milestone templates",
    category: BOS_PERMISSION_CATEGORY.STRATEGY,
    phase: "1a",
  },
  {
    key: BOS_PERMISSION_KEY.MILESTONE_TEMPLATES_MANAGE,
    label: "Manage milestone templates",
    description: "Create and edit milestone templates from initiatives",
    category: BOS_PERMISSION_CATEGORY.STRATEGY,
    phase: "1a",
  },
  {
    key: BOS_PERMISSION_KEY.DECISIONS_VIEW,
    label: "View decisions",
    description: "View BosDecision log",
    category: BOS_PERMISSION_CATEGORY.INTELLIGENCE,
    phase: "1a",
  },
  {
    key: BOS_PERMISSION_KEY.DECISIONS_MANAGE,
    label: "Manage decisions",
    description: "Create and update decisions",
    category: BOS_PERMISSION_CATEGORY.INTELLIGENCE,
    phase: "1a",
  },
  {
    key: BOS_PERMISSION_KEY.KPIS_VIEW,
    label: "View BOS KPIs",
    description: "View BOS dashboard and KPI snapshots",
    category: BOS_PERMISSION_CATEGORY.MEASUREMENT,
    phase: "1a",
  },
  {
    key: BOS_PERMISSION_KEY.ATTRIBUTIONS_VIEW,
    label: "View attributions",
    description: "View BosAttribution sidecar records",
    category: BOS_PERMISSION_CATEGORY.ATTRIBUTION,
    phase: "1b",
  },
  {
    key: BOS_PERMISSION_KEY.ATTRIBUTIONS_MANAGE,
    label: "Manage attributions",
    description: "Create and supersede attributions (sidecar only)",
    category: BOS_PERMISSION_CATEGORY.ATTRIBUTION,
    phase: "1b",
  },
  {
    key: BOS_PERMISSION_KEY.ATTRIBUTIONS_VOID,
    label: "Void attributions",
    description: "Void or dispute attributions (elevated)",
    category: BOS_PERMISSION_CATEGORY.ATTRIBUTION,
    phase: "1b",
  },
  {
    key: BOS_PERMISSION_KEY.KPIS_EXPORT,
    label: "Export BOS reports",
    description: "Export BOS-enriched CSV reports",
    category: BOS_PERMISSION_CATEGORY.MEASUREMENT,
    phase: "1b",
  },
  {
    key: BOS_PERMISSION_KEY.ADMIN,
    label: "BOS administrator",
    description: "Full BOS access within company",
    category: BOS_PERMISSION_CATEGORY.ADMIN,
    phase: "1a",
  },
] as const;

export const PHASE_1A_PERMISSION_KEYS: readonly string[] = BOS_PERMISSION_DEFINITIONS.filter(
  (p) => p.phase === "1a",
).map((p) => p.key);

export const PHASE_1B_PERMISSION_KEYS: readonly string[] = BOS_PERMISSION_DEFINITIONS.filter(
  (p) => p.phase === "1b",
).map((p) => p.key);

/** Owner bypass remains in ERP usePermissions — BOS respects isOwner at app layer. */
export const BOS_DEFAULT_DENY = true as const;
