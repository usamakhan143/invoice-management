export type EvidenceConfidenceLevel =
  | "insufficient"
  | "single_engagement"
  | "multi_signal"
  | "validated";

export type OrganizationalConfidenceLevel = "proposed" | "validated" | "proven";

/** Domain-computed confidence — AI confidence alone cannot authorize promotion. */
export interface ConfidenceSnapshot {
  readonly aiConfidence?: number;
  readonly evidenceConfidence: EvidenceConfidenceLevel;
  readonly organizationalConfidence: OrganizationalConfidenceLevel;
  readonly promotionEligible: boolean;
}

export interface EvidenceConfidenceInput {
  hasEvaluation: boolean;
  hasRetrospective: boolean;
  hasReuseAssessment?: boolean;
  hasRetroLessons?: boolean;
  priorValidatedPromotion?: boolean;
}

export function computeEvidenceConfidence(
  input: EvidenceConfidenceInput,
): EvidenceConfidenceLevel {
  if (!input.hasEvaluation || !input.hasRetrospective) {
    return "insufficient";
  }
  if (input.priorValidatedPromotion) {
    return "validated";
  }
  if (input.hasReuseAssessment && input.hasRetroLessons) {
    return "multi_signal";
  }
  return "single_engagement";
}

export interface BuildConfidenceSnapshotInput {
  evidenceConfidence: EvidenceConfidenceLevel;
  aiConfidence?: number;
  organizationalConfidence?: OrganizationalConfidenceLevel;
  /** Explicit human override for promotion queue — never derived from aiConfidence alone. */
  humanValidatedOverride?: boolean;
}

export function buildConfidenceSnapshot(
  input: BuildConfidenceSnapshotInput,
): ConfidenceSnapshot {
  const organizationalConfidence = input.organizationalConfidence ?? "proposed";

  const promotionEligible =
    input.humanValidatedOverride === true ||
    (input.evidenceConfidence === "validated" ||
      input.evidenceConfidence === "multi_signal");

  // LF-05 / planning: AI confidence MUST NOT independently make promotionEligible true
  if (
    input.aiConfidence !== undefined &&
    input.aiConfidence >= 0.9 &&
    input.evidenceConfidence === "insufficient" &&
    !input.humanValidatedOverride
  ) {
    return {
      aiConfidence: input.aiConfidence,
      evidenceConfidence: input.evidenceConfidence,
      organizationalConfidence,
      promotionEligible: false,
    };
  }

  return {
    aiConfidence: input.aiConfidence,
    evidenceConfidence: input.evidenceConfidence,
    organizationalConfidence,
    promotionEligible,
  };
}
