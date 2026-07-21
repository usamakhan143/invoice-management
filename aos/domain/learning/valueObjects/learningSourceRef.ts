/** Backward trace from promoted organizational asset to Phase E delivery evidence. */
export interface LearningSourceRef {
  readonly candidateId: string;
  readonly extractionRunId: string;
  readonly engagementId: string;
  readonly retrospectiveId: string;
  readonly requirementVersionId: string;
  readonly promptVersionId: string;
  readonly cursorSessionId: string;
  readonly evaluationId: string;
  readonly promotedAt: string;
  readonly promotedBy: string;
}

/** Structural metadata for future Knowledge Intelligence Layer — not implemented in F1. */
export interface KilRelationshipHint {
  readonly relType:
    | "derived_from"
    | "supersedes"
    | "related_module"
    | "related_pattern"
    | "evaluated_by";
  readonly targetKind: string;
  readonly targetId: string;
}

export interface KilHandoffRef {
  readonly promotedAssetKind: string;
  readonly promotedAssetId: string;
  readonly promotedVersion: string;
  readonly relationshipHints: readonly KilRelationshipHint[];
  readonly sourceEngagementId: string;
  readonly sourceCandidateId: string;
}
