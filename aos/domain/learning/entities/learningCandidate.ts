import type { CompanyId, UserId } from "../../../types";
import type { DeliveryEngagementId } from "../../delivery/valueObjects";
import type { ConfidenceSnapshot } from "../valueObjects/confidenceSnapshot";
import type { GateResult } from "../valueObjects/gateResult";
import type { LearningProvenance } from "../valueObjects/learningProvenance";
import type { PromotionTargetRef } from "../valueObjects/promotionTargetRef";
import type { LearningProposedContent } from "../valueObjects/proposedContent";

export type LearningCandidateType =
  | "knowledge_pattern"
  | "module"
  | "prompt_improvement"
  | "playbook_improvement"
  | "evaluation_insight";

export const LEARNING_CANDIDATE_TYPES: readonly LearningCandidateType[] = [
  "knowledge_pattern",
  "module",
  "prompt_improvement",
  "playbook_improvement",
  "evaluation_insight",
] as const;

export type LearningCandidateStatus =
  | "extracted"
  | "gate_blocked"
  | "gate_deferred"
  | "pending_review"
  | "approved"
  | "rejected"
  | "promoted"
  | "promotion_failed"
  | "superseded";

export const TERMINAL_CANDIDATE_STATUSES: readonly LearningCandidateStatus[] = [
  "gate_blocked",
  "rejected",
  "promoted",
  "superseded",
] as const;

export type LearningCreatedBy = "system" | UserId;

export interface AiRecommendationMetadata {
  readonly modelProvider: string;
  readonly modelId: string;
  readonly promptVersion: string;
  readonly rawResponseHash?: string;
}

export interface CandidateApprovalMetadata {
  readonly approvedBy: UserId;
  readonly approvedAt: string;
  readonly approvalNote?: string;
}

export interface CandidateRejectionMetadata {
  readonly rejectedBy: UserId;
  readonly rejectedAt: string;
  readonly rejectionReason: string;
}

export interface CandidateDeferMetadata {
  readonly deferredBy: UserId;
  readonly deferredAt: string;
  readonly deferReason?: string;
}

export interface CandidatePromotionMetadata {
  readonly promotionId: string;
  readonly promotedAssetKind: string;
  readonly promotedAssetId: string;
  readonly promotedVersion: string;
  readonly promotedAt: string;
  readonly promotedBy: UserId;
}

export interface CandidateSupersessionMetadata {
  readonly supersededAt: string;
  readonly supersededBy: UserId | "system";
  readonly supersededByCandidateId?: string;
  readonly reason?: string;
}

export interface LearningCandidate {
  readonly candidateId: string;
  readonly companyId: CompanyId;
  readonly engagementId: DeliveryEngagementId;
  readonly retrospectiveId: string;
  readonly extractionRunId: string;
  readonly candidateType: LearningCandidateType;
  readonly title: string;
  readonly summary: string;
  readonly proposedContent: LearningProposedContent;
  readonly status: LearningCandidateStatus;
  readonly confidence: ConfidenceSnapshot;
  readonly promotionTarget: PromotionTargetRef;
  readonly provenance: LearningProvenance;
  readonly gateResult: GateResult | null;
  readonly createdAt: string;
  readonly createdBy: LearningCreatedBy;
  readonly sourceFingerprint: string;
  readonly version: number;
  readonly aiRecommendation?: AiRecommendationMetadata;
  readonly approval?: CandidateApprovalMetadata;
  readonly rejection?: CandidateRejectionMetadata;
  readonly defer?: CandidateDeferMetadata;
  readonly promotion?: CandidatePromotionMetadata;
  readonly supersession?: CandidateSupersessionMetadata;
  readonly amendmentOfCandidateId?: string;
  readonly bundleId?: string;
  readonly gateRuleSetVersion?: string;
  readonly updatedAt?: string;
}

export function isLearningCandidateType(value: string): value is LearningCandidateType {
  return (LEARNING_CANDIDATE_TYPES as readonly string[]).includes(value);
}

export function isTerminalCandidateStatus(status: LearningCandidateStatus): boolean {
  return (TERMINAL_CANDIDATE_STATUSES as readonly string[]).includes(status);
}

export function isHumanActor(actorId: string): boolean {
  return actorId !== "system" && actorId !== "ai";
}
