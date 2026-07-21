/**
 * Top-level Firestore collection names for AOS Delivery bounded context.
 */
export const AOS_COLLECTIONS = {
  DELIVERY_ENGAGEMENTS: "aosDeliveryEngagements",
  DELIVERY_TEMPLATES: "aosDeliveryTemplates",
  DELIVERY_QUALITY_REPORTS: "aosDeliveryQualityReports",
  ENGAGEMENT_WORKFLOWS: "aosEngagementWorkflows",
  AUDIT_EVENTS: "aosAuditEvents",
  MODULE_REGISTRY: "aosModuleRegistry",
  KNOWLEDGE_PATTERNS: "aosKnowledgePatterns",
  PLAYBOOK_ENTRIES: "aosPlaybookEntries",
  REQUIREMENT_VERSIONS: "aosRequirementVersions",
  PROMPT_VERSIONS: "aosPromptVersions",
  CURSOR_SESSIONS: "aosCursorSessions",
  CURSOR_REVISIONS: "aosCursorRevisions",
  EVALUATIONS: "aosEvaluations",
} as const;

export type AosCollectionName = (typeof AOS_COLLECTIONS)[keyof typeof AOS_COLLECTIONS];

export const DEFAULT_PAGE_SIZE = 25;

export const MAX_PAGE_SIZE = 100;
