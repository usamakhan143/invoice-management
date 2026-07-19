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
} as const;
