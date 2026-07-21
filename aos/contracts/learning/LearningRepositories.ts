import type {
  LearningCandidate,
  LearningCandidateStatus,
  LearningCandidateType,
} from "../../domain/learning/entities/learningCandidate";
import type { LearningExtractionRun } from "../../domain/learning/entities/learningExtractionRun";
import type { CompanyId } from "../types";
import type { DeliveryEngagementId } from "../domain/delivery/valueObjects";

export interface UpsertLearningCandidateCommand {
  companyId: CompanyId;
  candidate: LearningCandidate;
}

export interface UpdateLearningCandidateStatusCommand {
  companyId: CompanyId;
  candidateId: string;
  expectedVersion: number;
  status: LearningCandidateStatus;
  updatedAt: string;
}

export interface LearningCandidateRepository {
  getById(companyId: CompanyId, candidateId: string): Promise<LearningCandidate | null>;
  listByEngagement(
    companyId: CompanyId,
    engagementId: DeliveryEngagementId,
  ): Promise<readonly LearningCandidate[]>;
  listByStatus(
    companyId: CompanyId,
    status: LearningCandidateStatus,
  ): Promise<readonly LearningCandidate[]>;
  listByExtractionRun(
    companyId: CompanyId,
    extractionRunId: string,
  ): Promise<readonly LearningCandidate[]>;
  upsert(command: UpsertLearningCandidateCommand): Promise<LearningCandidate>;
  updateStatus(command: UpdateLearningCandidateStatusCommand): Promise<LearningCandidate>;
}

export const LEARNING_CANDIDATE_REPOSITORY = Symbol("LearningCandidateRepository");

export interface CreateLearningExtractionRunCommand {
  companyId: CompanyId;
  run: LearningExtractionRun;
}

export interface UpdateLearningExtractionRunCommand {
  companyId: CompanyId;
  extractionRunId: string;
  run: LearningExtractionRun;
}

export interface LearningExtractionRunRepository {
  getById(
    companyId: CompanyId,
    extractionRunId: string,
  ): Promise<LearningExtractionRun | null>;
  getByRetrospective(
    companyId: CompanyId,
    retrospectiveId: string,
  ): Promise<LearningExtractionRun | null>;
  create(command: CreateLearningExtractionRunCommand): Promise<LearningExtractionRun>;
  update(command: UpdateLearningExtractionRunCommand): Promise<LearningExtractionRun>;
}

export const LEARNING_EXTRACTION_RUN_REPOSITORY = Symbol("LearningExtractionRunRepository");

export interface LearningPromotionRepository {
  getByCandidateId(
    companyId: CompanyId,
    candidateId: string,
  ): Promise<import("../../domain/learning/entities/learningPromotionRecord").LearningPromotionRecord | null>;
  append(
    record: import("../../domain/learning/entities/learningPromotionRecord").LearningPromotionRecord,
  ): Promise<import("../../domain/learning/entities/learningPromotionRecord").LearningPromotionRecord>;
}

export const LEARNING_PROMOTION_REPOSITORY = Symbol("LearningPromotionRepository");

export type { LearningCandidateType };
