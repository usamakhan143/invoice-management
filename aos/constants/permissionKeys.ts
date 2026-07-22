/**
 * AOS permission keys — canonical namespace (aos_*).
 * ERP permissions remain in config/permissions.ts — never merge namespaces.
 */

export const AOS_PERMISSION_KEY = {
  // Dashboard
  DASHBOARD_VIEW: "aos_dashboard_view",

  // Delivery engagements
  ENGAGEMENTS_VIEW: "aos_engagements_view",
  ENGAGEMENTS_MANAGE: "aos_engagements_manage",

  // Module registry
  REGISTRY_VIEW: "aos_registry_view",
  REGISTRY_MANAGE: "aos_registry_manage",

  // Requirements
  REQUIREMENTS_VIEW: "aos_requirements_view",
  REQUIREMENTS_EDIT: "aos_requirements_edit",
  REQUIREMENTS_APPROVE: "aos_requirements_approve",

  // Prompts
  PROMPTS_VIEW: "aos_prompts_view",
  PROMPTS_MANAGE: "aos_prompts_manage",

  // Cursor execution
  CURSOR_VIEW: "aos_cursor_view",
  CURSOR_EXECUTE: "aos_cursor_execute",

  // Evaluation
  EVALUATION_VIEW: "aos_evaluation_view",
  EVALUATION_MANAGE: "aos_evaluation_manage",

  // Knowledge
  KNOWLEDGE_VIEW: "aos_knowledge_view",
  KNOWLEDGE_MANAGE: "aos_knowledge_manage",

  // Learning Engine governance
  LEARNING_VIEW: "aos_learning_view",
  LEARNING_REVIEW: "aos_learning_review",
  LEARNING_PROMOTE: "aos_learning_promote",

  // Playbook & templates
  PLAYBOOK_VIEW: "aos_playbook_view",
  PLAYBOOK_MANAGE: "aos_playbook_manage",
  TEMPLATES_VIEW: "aos_templates_view",
  TEMPLATES_MANAGE: "aos_templates_manage",

  // Rubrics
  RUBRICS_VIEW: "aos_rubrics_view",
  RUBRICS_MANAGE: "aos_rubrics_manage",

  // Admin
  ADMIN: "aos_admin",
} as const;

export type AosPermissionKey =
  (typeof AOS_PERMISSION_KEY)[keyof typeof AOS_PERMISSION_KEY];

export const AOS_PERMISSION_CATEGORY = {
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
  ADMIN: "aos-admin",
} as const;

export type AosPermissionCategory =
  (typeof AOS_PERMISSION_CATEGORY)[keyof typeof AOS_PERMISSION_CATEGORY];

export interface AosPermissionDefinition {
  key: AosPermissionKey;
  label: string;
  description: string;
  category: AosPermissionCategory;
  phase: "1a" | "1b" | "2" | "3";
}
