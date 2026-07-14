/**
 * Completion requirement flags — saved on milestone, not enforced yet.
 * Founder chooses what evidence will be expected when completing later.
 */

export const MILESTONE_COMPLETION_REQUIREMENT_KEY = {
  DECISION_REQUIRED: "decisionRequired",
  EXPENSE_LINKED: "expenseLinked",
  REVENUE_LINKED: "revenueLinked",
  DOCUMENT_ATTACHED: "documentAttached",
  URL_ATTACHED: "urlAttached",
  NOTES_REQUIRED: "notesRequired",
  SCREENSHOT_REQUIRED: "screenshotRequired",
  NOTHING_REQUIRED: "nothingRequired",
} as const;

export type MilestoneCompletionRequirementKey =
  (typeof MILESTONE_COMPLETION_REQUIREMENT_KEY)[keyof typeof MILESTONE_COMPLETION_REQUIREMENT_KEY];

export const MILESTONE_COMPLETION_REQUIREMENT_LABELS: Record<
  MilestoneCompletionRequirementKey,
  string
> = {
  [MILESTONE_COMPLETION_REQUIREMENT_KEY.DECISION_REQUIRED]: "Decision required",
  [MILESTONE_COMPLETION_REQUIREMENT_KEY.EXPENSE_LINKED]: "Expense linked",
  [MILESTONE_COMPLETION_REQUIREMENT_KEY.REVENUE_LINKED]: "Revenue linked",
  [MILESTONE_COMPLETION_REQUIREMENT_KEY.DOCUMENT_ATTACHED]: "Document attached",
  [MILESTONE_COMPLETION_REQUIREMENT_KEY.URL_ATTACHED]: "URL attached",
  [MILESTONE_COMPLETION_REQUIREMENT_KEY.NOTES_REQUIRED]: "Outcome summary required",
  [MILESTONE_COMPLETION_REQUIREMENT_KEY.SCREENSHOT_REQUIRED]: "Screenshot required",
  [MILESTONE_COMPLETION_REQUIREMENT_KEY.NOTHING_REQUIRED]: "Nothing required",
};

export interface MilestoneCompletionRequirements {
  decisionRequired?: boolean;
  expenseLinked?: boolean;
  revenueLinked?: boolean;
  documentAttached?: boolean;
  urlAttached?: boolean;
  notesRequired?: boolean;
  screenshotRequired?: boolean;
  nothingRequired?: boolean;
}

export const EMPTY_MILESTONE_COMPLETION_REQUIREMENTS: MilestoneCompletionRequirements = {};

export function hasAnyCompletionRequirement(
  requirements: MilestoneCompletionRequirements | undefined,
): boolean {
  if (!requirements) return false;
  return Object.values(requirements).some(Boolean);
}
