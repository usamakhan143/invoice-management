/**
 * AOS feature flags — working enforcement at nav and route gates (Stage A).
 * Phase 1A: module and area flags default enabled for scaffold visibility.
 */

export const AOS_FEATURE_FLAG = {
  /** Phase 1A — master switch for AOS module nav and routes */
  MODULE_ENABLED: "aos_module_enabled",

  /** Phase 1A — delivery engagement area */
  DELIVERY: "aos_delivery_enabled",

  /** Phase 1A — module registry area */
  REGISTRY: "aos_registry_enabled",

  /** Phase 1B — requirements area */
  REQUIREMENTS: "aos_requirements_enabled",

  /** Phase 2 — prompt engine area */
  PROMPTS: "aos_prompts_enabled",

  /** Phase 3 — cursor execution area */
  CURSOR: "aos_cursor_enabled",

  /** Phase 3 — evaluation area */
  EVALUATION: "aos_evaluation_enabled",

  /** Phase 4 — knowledge engine area */
  KNOWLEDGE: "aos_knowledge_enabled",

  /** Phase 1A — agency playbook area */
  PLAYBOOK: "aos_playbook_enabled",

  /** Phase 1B — ERP customer read port adapter */
  ERP_CUSTOMER_READ: "aos_erp_customer_read",

  /** Phase 1B — ERP user read port adapter */
  ERP_USER_READ: "aos_erp_user_read",

  /** Phase 1B — ERP lead read port adapter */
  ERP_LEAD_READ: "aos_erp_lead_read",

  /** Phase 1B — BOS initiative read port adapter */
  BOS_INITIATIVE_READ: "aos_bos_initiative_read",

  /** Phase E — immutable version chain repositories (Firestore collections) */
  VERSION_CHAINS: "aos_version_chains_enabled",

  /** Phase F — learning engine extraction and candidate persistence */
  LEARNING_ENGINE: "learning_engine",
} as const;

export type AosFeatureFlag = (typeof AOS_FEATURE_FLAG)[keyof typeof AOS_FEATURE_FLAG];

export interface AosFeatureFlagDefinition {
  key: AosFeatureFlag;
  label: string;
  defaultEnabled: boolean;
  phase: "1a" | "1b" | "2" | "3" | "4";
}

export const AOS_FEATURE_FLAG_DEFINITIONS: readonly AosFeatureFlagDefinition[] = [
  {
    key: AOS_FEATURE_FLAG.MODULE_ENABLED,
    label: "AOS module",
    defaultEnabled: true,
    phase: "1a",
  },
  {
    key: AOS_FEATURE_FLAG.DELIVERY,
    label: "Delivery engagements",
    defaultEnabled: true,
    phase: "1a",
  },
  {
    key: AOS_FEATURE_FLAG.REGISTRY,
    label: "Module registry",
    defaultEnabled: true,
    phase: "1a",
  },
  {
    key: AOS_FEATURE_FLAG.PLAYBOOK,
    label: "Agency playbook",
    defaultEnabled: true,
    phase: "1a",
  },
  {
    key: AOS_FEATURE_FLAG.REQUIREMENTS,
    label: "Requirements",
    defaultEnabled: true,
    phase: "1b",
  },
  {
    key: AOS_FEATURE_FLAG.PROMPTS,
    label: "Prompt engine",
    defaultEnabled: true,
    phase: "2",
  },
  {
    key: AOS_FEATURE_FLAG.CURSOR,
    label: "Cursor execution",
    defaultEnabled: true,
    phase: "3",
  },
  {
    key: AOS_FEATURE_FLAG.EVALUATION,
    label: "Evaluation",
    defaultEnabled: true,
    phase: "3",
  },
  {
    key: AOS_FEATURE_FLAG.KNOWLEDGE,
    label: "Knowledge engine",
    defaultEnabled: true,
    phase: "4",
  },
  {
    key: AOS_FEATURE_FLAG.ERP_CUSTOMER_READ,
    label: "ERP customer read port",
    defaultEnabled: false,
    phase: "1b",
  },
  {
    key: AOS_FEATURE_FLAG.ERP_USER_READ,
    label: "ERP user read port",
    defaultEnabled: false,
    phase: "1b",
  },
  {
    key: AOS_FEATURE_FLAG.ERP_LEAD_READ,
    label: "ERP lead read port",
    defaultEnabled: false,
    phase: "1b",
  },
  {
    key: AOS_FEATURE_FLAG.BOS_INITIATIVE_READ,
    label: "BOS initiative read port",
    defaultEnabled: false,
    phase: "1b",
  },
  {
    key: AOS_FEATURE_FLAG.VERSION_CHAINS,
    label: "Immutable version chain repositories",
    defaultEnabled: true,
    phase: "2",
  },
  {
    key: AOS_FEATURE_FLAG.LEARNING_ENGINE,
    label: "Learning engine extraction",
    defaultEnabled: false,
    phase: "4",
  },
] as const;

/** Runtime defaults for Phase 1A scaffold. */
export const PHASE_1A_FEATURE_DEFAULTS: Record<AosFeatureFlag, boolean> = {
  [AOS_FEATURE_FLAG.MODULE_ENABLED]: true,
  [AOS_FEATURE_FLAG.DELIVERY]: true,
  [AOS_FEATURE_FLAG.REGISTRY]: true,
  [AOS_FEATURE_FLAG.REQUIREMENTS]: true,
  [AOS_FEATURE_FLAG.PROMPTS]: true,
  [AOS_FEATURE_FLAG.CURSOR]: true,
  [AOS_FEATURE_FLAG.EVALUATION]: true,
  [AOS_FEATURE_FLAG.KNOWLEDGE]: true,
  [AOS_FEATURE_FLAG.PLAYBOOK]: true,
  [AOS_FEATURE_FLAG.ERP_CUSTOMER_READ]: false,
  [AOS_FEATURE_FLAG.ERP_USER_READ]: false,
  [AOS_FEATURE_FLAG.ERP_LEAD_READ]: false,
  [AOS_FEATURE_FLAG.BOS_INITIATIVE_READ]: false,
  [AOS_FEATURE_FLAG.VERSION_CHAINS]: true,
  [AOS_FEATURE_FLAG.LEARNING_ENGINE]: false,
};

export function isAosFeatureEnabled(
  flags: Partial<Record<AosFeatureFlag, boolean>>,
  flag: AosFeatureFlag,
): boolean {
  const envOverride = readEnvFeatureOverride(flag);
  if (envOverride !== undefined) return envOverride;
  if (flag in flags && flags[flag] !== undefined) return Boolean(flags[flag]);
  return PHASE_1A_FEATURE_DEFAULTS[flag];
}

function readEnvFeatureOverride(flag: AosFeatureFlag): boolean | undefined {
  const env = typeof import.meta !== "undefined" ? import.meta.env : undefined;
  if (!env) return undefined;

  if (flag === AOS_FEATURE_FLAG.LEARNING_ENGINE) {
    if (env.VITE_AOS_LEARNING_ENGINE === "true") return true;
    if (env.VITE_AOS_LEARNING_ENGINE === "false") return false;
  }
  if (flag === AOS_FEATURE_FLAG.VERSION_CHAINS) {
    if (env.VITE_AOS_VERSION_CHAINS === "true") return true;
    if (env.VITE_AOS_VERSION_CHAINS === "false") return false;
  }
  return undefined;
}
