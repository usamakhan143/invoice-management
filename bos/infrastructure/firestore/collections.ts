/**
 * Top-level Firestore collection names for BOS (Doc 04).
 */
export const BOS_COLLECTIONS = {
  VENTURES: "bosVentures",
  INITIATIVES: "bosInitiatives",
  DECISIONS: "bosDecisions",
  ATTRIBUTIONS: "bosAttributions",
  MILESTONES: "bosMilestones",
  MILESTONE_TEMPLATES: "bosMilestoneTemplates",
} as const;

export type BosCollectionName = (typeof BOS_COLLECTIONS)[keyof typeof BOS_COLLECTIONS];

export const DEFAULT_PAGE_SIZE = 25;

export const MAX_PAGE_SIZE = 100;
