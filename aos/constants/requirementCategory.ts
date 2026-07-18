/**
 * Requirement category — frozen domain model §02.
 * @see docs/aos-domain-model/02_REQUIREMENTS_DOMAIN.md
 */

export const REQUIREMENT_CATEGORY = {
  FUNCTIONAL: "functional",
  TECHNICAL: "technical",
  CONSTRAINT: "constraint",
  ACCEPTANCE: "acceptance",
  NON_FUNCTIONAL: "non_functional",
} as const;

export type RequirementCategory =
  (typeof REQUIREMENT_CATEGORY)[keyof typeof REQUIREMENT_CATEGORY];

export const REQUIREMENT_CATEGORY_LABELS: Record<RequirementCategory, string> = {
  [REQUIREMENT_CATEGORY.FUNCTIONAL]: "Functional",
  [REQUIREMENT_CATEGORY.TECHNICAL]: "Technical",
  [REQUIREMENT_CATEGORY.CONSTRAINT]: "Constraint",
  [REQUIREMENT_CATEGORY.ACCEPTANCE]: "Acceptance",
  [REQUIREMENT_CATEGORY.NON_FUNCTIONAL]: "Non-functional",
};

export const REQUIREMENT_CATEGORIES: readonly RequirementCategory[] =
  Object.values(REQUIREMENT_CATEGORY);
