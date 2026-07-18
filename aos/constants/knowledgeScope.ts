/**
 * Knowledge record scope — frozen domain model §06.
 * @see docs/aos-domain-model/06_KNOWLEDGE_AND_REGISTRY_DOMAIN.md
 */

export const KNOWLEDGE_SCOPE = {
  ENGAGEMENT: "engagement",
  COMPANY: "company",
} as const;

export type KnowledgeScope = (typeof KNOWLEDGE_SCOPE)[keyof typeof KNOWLEDGE_SCOPE];

export const KNOWLEDGE_SCOPE_LABELS: Record<KnowledgeScope, string> = {
  [KNOWLEDGE_SCOPE.ENGAGEMENT]: "Engagement",
  [KNOWLEDGE_SCOPE.COMPANY]: "Company",
};

export const KNOWLEDGE_SCOPES: readonly KnowledgeScope[] = Object.values(KNOWLEDGE_SCOPE);
