/** What the founder plans to do after completing a milestone. */
export const MILESTONE_COMPLETION_NEXT_ACTION = {
  NOTHING: "nothing",
  START_DEPENDENT_MILESTONE: "start_dependent_milestone",
  RECORD_DECISION: "record_decision",
  LINK_EXPENSE: "link_expense",
  CREATE_FOLLOW_UP_MILESTONE: "create_follow_up_milestone",
  CUSTOM: "custom",
} as const;

export type MilestoneCompletionNextAction =
  (typeof MILESTONE_COMPLETION_NEXT_ACTION)[keyof typeof MILESTONE_COMPLETION_NEXT_ACTION];

export const MILESTONE_COMPLETION_NEXT_ACTION_LABELS: Record<
  MilestoneCompletionNextAction,
  string
> = {
  [MILESTONE_COMPLETION_NEXT_ACTION.NOTHING]: "Nothing",
  [MILESTONE_COMPLETION_NEXT_ACTION.START_DEPENDENT_MILESTONE]: "Start dependent milestone",
  [MILESTONE_COMPLETION_NEXT_ACTION.RECORD_DECISION]: "Record Decision",
  [MILESTONE_COMPLETION_NEXT_ACTION.LINK_EXPENSE]: "Link Expense",
  [MILESTONE_COMPLETION_NEXT_ACTION.CREATE_FOLLOW_UP_MILESTONE]: "Create Follow-up Milestone",
  [MILESTONE_COMPLETION_NEXT_ACTION.CUSTOM]: "Custom",
};

const VALID = new Set<string>(Object.values(MILESTONE_COMPLETION_NEXT_ACTION));

export function isMilestoneCompletionNextAction(
  value: unknown,
): value is MilestoneCompletionNextAction {
  return typeof value === "string" && VALID.has(value);
}
