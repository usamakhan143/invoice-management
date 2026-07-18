/**
 * Requirement MoSCoW priority — frozen domain model §02.
 * @see docs/aos-domain-model/02_REQUIREMENTS_DOMAIN.md
 */

export const REQUIREMENT_PRIORITY = {
  MUST_HAVE: "must_have",
  SHOULD_HAVE: "should_have",
  COULD_HAVE: "could_have",
  WONT_HAVE: "wont_have",
} as const;

export type RequirementPriority =
  (typeof REQUIREMENT_PRIORITY)[keyof typeof REQUIREMENT_PRIORITY];

export const REQUIREMENT_PRIORITY_LABELS: Record<RequirementPriority, string> = {
  [REQUIREMENT_PRIORITY.MUST_HAVE]: "Must have",
  [REQUIREMENT_PRIORITY.SHOULD_HAVE]: "Should have",
  [REQUIREMENT_PRIORITY.COULD_HAVE]: "Could have",
  [REQUIREMENT_PRIORITY.WONT_HAVE]: "Won't have",
};

export const REQUIREMENT_PRIORITIES: readonly RequirementPriority[] =
  Object.values(REQUIREMENT_PRIORITY);
