/**
 * Milestone template visibility — marketplace reserved for future use.
 */

export const MILESTONE_TEMPLATE_VISIBILITY = {
  PRIVATE: "private",
  COMPANY: "company",
  MARKETPLACE: "marketplace",
} as const;

export type MilestoneTemplateVisibility =
  (typeof MILESTONE_TEMPLATE_VISIBILITY)[keyof typeof MILESTONE_TEMPLATE_VISIBILITY];

export const MILESTONE_TEMPLATE_VISIBILITY_LABELS: Record<MilestoneTemplateVisibility, string> = {
  [MILESTONE_TEMPLATE_VISIBILITY.PRIVATE]: "Private",
  [MILESTONE_TEMPLATE_VISIBILITY.COMPANY]: "Company",
  [MILESTONE_TEMPLATE_VISIBILITY.MARKETPLACE]: "Marketplace (future)",
};
