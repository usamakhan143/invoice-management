import type {
  LearningCandidate,
  LearningCandidateType,
  LearningCreatedBy,
} from "../entities/learningCandidate";
import { isHumanActor } from "../entities/learningCandidate";
import type { ConfidenceSnapshot } from "../valueObjects/confidenceSnapshot";
import {
  buildCandidateId,
  computeSourceFingerprint,
  normalizeCandidateTitle,
} from "../valueObjects/learningIdentifiers";
import type { LearningProvenance } from "../valueObjects/learningProvenance";
import { createLearningProvenance } from "../valueObjects/learningProvenance";
import type { PromotionTargetRef } from "../valueObjects/promotionTargetRef";
import {
  defaultPromotionTargetForCandidateType,
  createPromotionTargetRef,
} from "../valueObjects/promotionTargetRef";
import type { LearningProposedContent } from "../valueObjects/proposedContent";
import { isRecognizedProposedContent } from "../valueObjects/proposedContent";
import {
  evaluateUniversalGates,
  statusAfterGateResult,
} from "./learningGateRules";
import { learningFailOne, learningOk, type LearningResult } from "../learningResult";
import { buildConfidenceSnapshot, computeEvidenceConfidence } from "../valueObjects/confidenceSnapshot";

export interface CreateLearningCandidateInput {
  companyId: string;
  engagementId: string;
  retrospectiveId: string;
  extractionRunId: string;
  candidateType: LearningCandidateType;
  title: string;
  summary: string;
  proposedContent: LearningProposedContent;
  provenance: LearningProvenance;
  promotionTarget?: PromotionTargetRef;
  confidence?: ConfidenceSnapshot;
  createdAt: string;
  createdBy: LearningCreatedBy;
  retrospectiveApproved: boolean;
  hasReuseAssessment?: boolean;
  hasRetroLessons?: boolean;
  aiRecommendation?: LearningCandidate["aiRecommendation"];
  amendmentOfCandidateId?: string;
  bundleId?: string;
}

export function createLearningCandidate(
  input: CreateLearningCandidateInput,
): LearningResult<LearningCandidate> {
  const provenanceCheck = createLearningProvenance({
    requirementVersionId: input.provenance.requirementVersionId,
    promptVersionId: input.provenance.promptVersionId,
    cursorSessionId: input.provenance.cursorSessionId,
    evaluationId: input.provenance.evaluationId,
    retrospectiveId: input.provenance.retrospectiveId,
    rubricVersionId: input.provenance.rubricVersionId,
    cursorRevisionIds: input.provenance.cursorRevisionIds,
    sourceAuditEventIds: [...input.provenance.sourceAuditEventIds],
    reuseAssessmentSnapshotId: input.provenance.reuseAssessmentSnapshotId,
  });
  if (!provenanceCheck.ok) return provenanceCheck;

  if (!isRecognizedProposedContent(input.candidateType, input.proposedContent)) {
    return learningFailOne(
      "LEARNING_INVALID_INPUT",
      "proposedContent does not match candidateType",
    );
  }

  const promotionTarget =
    input.promotionTarget ??
    createPromotionTargetRef({
      targetKind: defaultPromotionTargetForCandidateType(input.candidateType),
      expectedVersionStrategy:
        input.candidateType === "module" ? "new_version" : "new_version",
    });

  const normalizedTitle = normalizeCandidateTitle(input.title);
  const sourceFingerprint = computeSourceFingerprint({
    candidateType: input.candidateType,
    normalizedTitle,
    promotionTargetKind: promotionTarget.targetKind,
  });

  const candidateId = buildCandidateId(
    input.extractionRunId,
    input.candidateType,
    sourceFingerprint,
  );

  const evidenceConfidence = input.confidence?.evidenceConfidence ??
    computeEvidenceConfidence({
      hasEvaluation: Boolean(input.provenance.evaluationId),
      hasRetrospective: Boolean(input.provenance.retrospectiveId),
      hasReuseAssessment: input.hasReuseAssessment,
      hasRetroLessons: input.hasRetroLessons,
    });

  const confidence =
    input.confidence ??
    buildConfidenceSnapshot({
      evidenceConfidence,
      aiConfidence: input.aiRecommendation ? 0.5 : undefined,
    });

  const gateResult = evaluateUniversalGates({
    retrospectiveApproved: input.retrospectiveApproved,
    retrospectiveId: input.retrospectiveId,
    candidateType: input.candidateType,
    provenance: provenanceCheck.value,
    proposedContent: input.proposedContent,
    aiRecommendation: input.aiRecommendation,
    evaluatedAt: Date.parse(input.createdAt) || 0,
  });

  const status = statusAfterGateResult(gateResult.overallStatus);

  return learningOk({
    candidateId,
    companyId: input.companyId,
    engagementId: input.engagementId,
    retrospectiveId: input.retrospectiveId,
    extractionRunId: input.extractionRunId,
    candidateType: input.candidateType,
    title: input.title.trim(),
    summary: input.summary.trim(),
    proposedContent: input.proposedContent,
    status,
    confidence,
    promotionTarget,
    provenance: provenanceCheck.value,
    gateResult,
    createdAt: input.createdAt,
    createdBy: input.createdBy,
    sourceFingerprint,
    version: 1,
    aiRecommendation: input.aiRecommendation,
    amendmentOfCandidateId: input.amendmentOfCandidateId,
    bundleId: input.bundleId,
    gateRuleSetVersion: gateResult.gateRuleSetVersion,
  });
}

export interface GovernedActorInput {
  actorId: string;
}

export function assertHumanGovernedActor(
  input: GovernedActorInput,
): LearningResult<void> {
  if (input.actorId === "ai") {
    return learningFailOne(
      "LEARNING_AI_ACTOR_FORBIDDEN",
      "AI actor cannot perform governed approval actions",
    );
  }
  if (!isHumanActor(input.actorId)) {
    return learningFailOne(
      "LEARNING_INVALID_ACTOR",
      "Human actor identity required",
    );
  }
  return learningOk(undefined);
}

export function assertSystemPromotionActor(actorId: string): LearningResult<void> {
  if (actorId !== "system") {
    return learningFailOne(
      "LEARNING_INVALID_ACTOR",
      "Promotion status transition requires system orchestrator",
    );
  }
  return learningOk(undefined);
}
