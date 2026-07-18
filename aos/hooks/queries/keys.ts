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
} as const;
