import type {
  CreateLearningPromotionRecordInput,
  LearningPromotionRecord,
} from "../entities/learningPromotionRecord";
import { freezePublishedRecord } from "../../versioning/versionResult";
import { learningFailOne, learningOk, type LearningResult } from "../learningResult";
import type { LearningCandidate } from "../entities/learningCandidate";
import type { LearningSourceRef } from "../valueObjects/learningSourceRef";

export function buildLearningSourceRef(
  candidate: LearningCandidate,
  promotedAt: string,
  promotedBy: string,
): LearningSourceRef {
  return {
    candidateId: candidate.candidateId,
    extractionRunId: candidate.extractionRunId,
    engagementId: candidate.engagementId,
    retrospectiveId: candidate.retrospectiveId,
    requirementVersionId: candidate.provenance.requirementVersionId,
    promptVersionId: candidate.provenance.promptVersionId,
    cursorSessionId: candidate.provenance.cursorSessionId,
    evaluationId: candidate.provenance.evaluationId,
    promotedAt,
    promotedBy,
  };
}

export function createLearningPromotionRecord(
  input: CreateLearningPromotionRecordInput,
): LearningResult<LearningPromotionRecord> {
  if (!input.promotionId.trim()) {
    return learningFailOne("LEARNING_INVALID_INPUT", "promotionId required");
  }
  if (!input.promotedAssetId.trim() || !input.promotedVersion.trim()) {
    return learningFailOne(
      "LEARNING_INVALID_INPUT",
      "promoted asset identity required",
    );
  }

  const record: LearningPromotionRecord = {
    promotionId: input.promotionId,
    companyId: input.companyId,
    candidateId: input.candidateId,
    extractionRunId: input.extractionRunId,
    promotedAssetKind: input.promotedAssetKind,
    promotedAssetId: input.promotedAssetId,
    promotedVersion: input.promotedVersion,
    promotedAt: input.promotedAt,
    promotedBy: input.promotedBy,
    sourceProvenance: input.sourceProvenance,
    learningSourceRef: input.learningSourceRef,
    rollbackOfPromotionId: input.rollbackOfPromotionId,
    kilHandoff: input.kilHandoff,
  };

  return learningOk(freezePublishedRecord(record));
}

export function assertPromotionBackwardTrace(
  record: LearningPromotionRecord,
  candidate: LearningCandidate,
): LearningResult<void> {
  if (record.candidateId !== candidate.candidateId) {
    return learningFailOne(
      "LEARNING_PROVENANCE_INVALID",
      "Promotion record candidateId mismatch",
    );
  }
  if (record.learningSourceRef.evaluationId !== candidate.provenance.evaluationId) {
    return learningFailOne(
      "LEARNING_PROVENANCE_INVALID",
      "Promotion backward trace evaluationId mismatch",
    );
  }
  return learningOk(undefined);
}

export function assertDuplicatePromotionGuard(
  candidate: LearningCandidate,
  existingPromotionCandidateId?: string,
): LearningResult<void> {
  if (candidate.status === "promoted" || existingPromotionCandidateId === candidate.candidateId) {
    return learningFailOne(
      "LEARNING_ALREADY_PROMOTED",
      "Duplicate promotion guard triggered",
    );
  }
  return learningOk(undefined);
}
