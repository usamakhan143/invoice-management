/**
 * Centralized TanStack Query key factory — hierarchical keys per Frontend Architecture.
 */
export const aosQueryKeys = {
  all: ["aos"] as const,

  deliveries: {
    all: () => [...aosQueryKeys.all, "deliveries"] as const,
    list: (filters: Record<string, unknown>) =>
      [...aosQueryKeys.deliveries.all(), "list", filters] as const,
    detail: (engagementId: string) =>
      [...aosQueryKeys.all, "delivery", engagementId] as const,
    workflow: (engagementId: string) =>
      [...aosQueryKeys.all, "workflow", engagementId] as const,
  },

  queues: {
    requirements: (filters: Record<string, unknown>) =>
      [...aosQueryKeys.all, "queues", "requirements", filters] as const,
    prompts: (filters: Record<string, unknown>) =>
      [...aosQueryKeys.all, "queues", "prompts", filters] as const,
    cursor: (filters: Record<string, unknown>) =>
      [...aosQueryKeys.all, "queues", "cursor", filters] as const,
    evaluation: (filters: Record<string, unknown>) =>
      [...aosQueryKeys.all, "queues", "evaluation", filters] as const,
  },

  attention: () => [...aosQueryKeys.all, "attention"] as const,

  erp: {
    customers: (companyId: string) =>
      [...aosQueryKeys.all, "erp", "customers", companyId] as const,
  },

  registry: {
    all: () => [...aosQueryKeys.all, "registry"] as const,
    list: (filters: Record<string, unknown>) =>
      [...aosQueryKeys.registry.all(), "list", filters] as const,
    detail: (moduleId: string) =>
      [...aosQueryKeys.registry.all(), "detail", moduleId] as const,
  },

  knowledge: {
    all: () => [...aosQueryKeys.all, "knowledge"] as const,
    list: (filters: Record<string, unknown>) =>
      [...aosQueryKeys.knowledge.all(), "list", filters] as const,
    detail: (patternId: string) =>
      [...aosQueryKeys.knowledge.all(), "detail", patternId] as const,
  },

  dashboard: () => [...aosQueryKeys.all, "dashboard", "founder"] as const,

  playbook: {
    all: () => [...aosQueryKeys.all, "playbook"] as const,
    list: (filters: Record<string, unknown>) =>
      [...aosQueryKeys.playbook.all(), "list", filters] as const,
    detail: (entryId: string) =>
      [...aosQueryKeys.playbook.all(), "detail", entryId] as const,
  },

  learning: {
    all: () => [...aosQueryKeys.all, "learning"] as const,
    reviewQueue: (filters: Record<string, unknown>) =>
      [...aosQueryKeys.learning.all(), "review-queue", filters] as const,
    candidateDetail: (candidateId: string) =>
      [...aosQueryKeys.learning.all(), "candidate", candidateId] as const,
    engagementSummary: (engagementId: string) =>
      [...aosQueryKeys.learning.all(), "engagement-summary", engagementId] as const,
  },

  versionHistory: {
    all: () => [...aosQueryKeys.all, "version-history"] as const,
    requirements: (engagementId: string, requirementSetId: string) =>
      [...aosQueryKeys.versionHistory.all(), "requirements", engagementId, requirementSetId] as const,
    requirementDetail: (versionId: string) =>
      [...aosQueryKeys.versionHistory.all(), "requirement-detail", versionId] as const,
    prompts: (promptArtifactId: string, engagementId: string) =>
      [...aosQueryKeys.versionHistory.all(), "prompts", promptArtifactId, engagementId] as const,
    promptDetail: (versionId: string) =>
      [...aosQueryKeys.versionHistory.all(), "prompt-detail", versionId] as const,
    cursorSessions: (engagementId: string) =>
      [...aosQueryKeys.versionHistory.all(), "cursor-sessions", engagementId] as const,
    cursorRevisions: (sessionId: string) =>
      [...aosQueryKeys.versionHistory.all(), "cursor-revisions", sessionId] as const,
    evaluations: (engagementId: string) =>
      [...aosQueryKeys.versionHistory.all(), "evaluations", engagementId] as const,
    evaluationDetail: (evaluationId: string) =>
      [...aosQueryKeys.versionHistory.all(), "evaluation-detail", evaluationId] as const,
  },
} as const;
