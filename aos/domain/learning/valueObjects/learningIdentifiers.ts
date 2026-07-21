import type { LearningCandidateType } from "../entities/learningCandidate";

/**
 * Deterministic fingerprint input contract.
 * Hashing uses pure djb2 in-domain — no crypto dependency at domain boundary.
 * Application may substitute stronger hashing for persistence keys if needed,
 * but must preserve deterministic equivalence for the same normalized input.
 */
export interface SourceFingerprintInput {
  candidateType: LearningCandidateType;
  normalizedTitle: string;
  promotionTargetKind: string;
}

/** Normalize title for stable fingerprint: trim, lowercase, collapse whitespace. */
export function normalizeCandidateTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Pure djb2 hash — deterministic, architecture-safe for domain dedup. */
export function computeDjb2Hash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

export function computeSourceFingerprint(input: SourceFingerprintInput): string {
  const payload = [
    input.candidateType,
    input.normalizedTitle,
    input.promotionTargetKind,
  ].join("|");
  return computeDjb2Hash(payload);
}

export function buildExtractionRunId(
  companyId: string,
  engagementId: string,
  retrospectiveId: string,
): string {
  return `${companyId}_${engagementId}_${retrospectiveId}`;
}

export function buildCandidateId(
  extractionRunId: string,
  candidateType: LearningCandidateType,
  sourceFingerprint: string,
): string {
  return `${extractionRunId}_${candidateType}_${sourceFingerprint}`;
}
