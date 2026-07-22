import type { LearningCandidate } from "../../domain/learning/entities/learningCandidate";
import type { LearningPromotionRecord } from "../../domain/learning/entities/learningPromotionRecord";
import type { DeliveryEngagementId } from "../../domain/delivery/valueObjects";
import type { CompanyId, UserId } from "../../types";

/** F4-ready DTOs — no UI in F3. */
export interface LearningCandidateReviewDto {
  candidateId: string;
  companyId: CompanyId;
  engagementId: DeliveryEngagementId;
  candidateType: LearningCandidate["candidateType"];
  title: string;
  summary: string;
  status: LearningCandidate["status"];
  confidence: LearningCandidate["confidence"];
  promotionTarget: LearningCandidate["promotionTarget"];
  version: number;
  approval?: LearningCandidate["approval"];
  rejection?: LearningCandidate["rejection"];
  defer?: LearningCandidate["defer"];
  promotion?: LearningCandidate["promotion"];
  createdAt: string;
  updatedAt?: string;
}

export interface LearningPromotionResultDto {
  promotionId: string;
  candidateId: string;
  promotedAssetKind: LearningPromotionRecord["promotedAssetKind"];
  promotedAssetId: string;
  promotedVersion: string;
  promotedAt: string;
  candidateStatus: LearningCandidate["status"];
}

export interface LearningGovernanceActionResultDto {
  candidate: LearningCandidateReviewDto;
}

export function toLearningCandidateReviewDto(
  candidate: LearningCandidate,
): LearningCandidateReviewDto {
  return {
    candidateId: candidate.candidateId,
    companyId: candidate.companyId,
    engagementId: candidate.engagementId,
    candidateType: candidate.candidateType,
    title: candidate.title,
    summary: candidate.summary,
    status: candidate.status,
    confidence: candidate.confidence,
    promotionTarget: candidate.promotionTarget,
    version: candidate.version,
    approval: candidate.approval,
    rejection: candidate.rejection,
    defer: candidate.defer,
    promotion: candidate.promotion,
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt,
  };
}

export interface ApproveLearningCandidateCommand {
  candidateId: string;
  expectedVersion: number;
  approvalNote?: string;
}

export interface RejectLearningCandidateCommand {
  candidateId: string;
  expectedVersion: number;
  rejectionReason: string;
}

export interface DeferLearningCandidateCommand {
  candidateId: string;
  expectedVersion: number;
  deferReason?: string;
}

export interface SupersedeLearningCandidateCommand {
  candidateId: string;
  expectedVersion: number;
  supersededByCandidateId?: string;
  reason?: string;
}

export interface PromoteLearningCandidateCommand {
  candidateId: string;
  expectedVersion: number;
}

import type { AosActorScope } from "../types";

/** Actor context for learning governance writes — includes authorization fields. */
export type LearningGovernanceActor = AosActorScope;
