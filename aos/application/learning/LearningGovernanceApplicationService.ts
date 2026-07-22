import type { AuditEventRepository } from "../../contracts/EngagementWorkflowRepository";
import type { LearningCandidateRepository } from "../../contracts/learning/LearningRepositories";
import {
  approveCandidate,
  deferCandidate,
  rejectCandidate,
  rejectAiApprovalAttempt,
  supersedeCandidate,
} from "../../domain/learning/rules/learningApprovalRules";
import { AosRepositoryError } from "../../infrastructure/firestore/errors";
import { composeLearningAuditEvent } from "./learningAuditHelpers";
import {
  assertAosPermission,
  LEARNING_REVIEW_PERMISSION,
} from "../authorization/aosAuthorization";
import type {
  ApproveLearningCandidateCommand,
  DeferLearningCandidateCommand,
  LearningGovernanceActionResultDto,
  LearningGovernanceActor,
  RejectLearningCandidateCommand,
  SupersedeLearningCandidateCommand,
} from "./learningGovernanceDtos";
import { toLearningCandidateReviewDto } from "./learningGovernanceDtos";

export interface LearningGovernanceApplicationServiceDeps {
  candidates: LearningCandidateRepository;
  auditEvents: AuditEventRepository;
}

export class LearningGovernanceApplicationService {
  constructor(private readonly deps: LearningGovernanceApplicationServiceDeps) {}

  async approveCandidate(
    scope: LearningGovernanceActor,
    command: ApproveLearningCandidateCommand,
  ): Promise<LearningGovernanceActionResultDto> {
    assertAosPermission(scope, LEARNING_REVIEW_PERMISSION);
    if (scope.actorUserId === "ai") {
      throw new AosRepositoryError("AI cannot approve candidates", "AOS_UPDATE_FAILED");
    }

    const loaded = await this.loadCandidate(scope.companyId, command.candidateId);
    const approvedAt = new Date().toISOString();
    const nowMs = Date.now();

    const result = approveCandidate({
      actorId: scope.actorUserId,
      candidate: loaded,
      expectedVersion: command.expectedVersion,
      approvedAt,
      approvalNote: command.approvalNote,
    });
    if (!result.ok) {
      throw new AosRepositoryError(result.errors[0]?.message ?? "Approve failed", "AOS_UPDATE_FAILED");
    }

    const saved = await this.deps.candidates.saveCandidate({
      companyId: scope.companyId,
      candidate: result.value,
      expectedVersion: command.expectedVersion,
    });

    await this.deps.auditEvents.append(
      composeLearningAuditEvent("aos_learning_candidate_approved", "Learning candidate approved", {
        companyId: scope.companyId,
        engagementId: saved.engagementId,
        actorUserId: scope.actorUserId,
        occurredAt: nowMs,
        retrospectiveId: saved.retrospectiveId,
        extractionRunId: saved.extractionRunId,
        candidateId: saved.candidateId,
        candidateType: saved.candidateType,
      }),
    );

    return { candidate: toLearningCandidateReviewDto(saved) };
  }

  async rejectCandidate(
    scope: LearningGovernanceActor,
    command: RejectLearningCandidateCommand,
  ): Promise<LearningGovernanceActionResultDto> {
    assertAosPermission(scope, LEARNING_REVIEW_PERMISSION);
    if (scope.actorUserId === "ai") {
      throw new AosRepositoryError("AI cannot reject candidates", "AOS_UPDATE_FAILED");
    }

    const loaded = await this.loadCandidate(scope.companyId, command.candidateId);
    const rejectedAt = new Date().toISOString();
    const nowMs = Date.now();

    const result = rejectCandidate({
      actorId: scope.actorUserId,
      candidate: loaded,
      expectedVersion: command.expectedVersion,
      rejectedAt,
      rejectionReason: command.rejectionReason,
    });
    if (!result.ok) {
      throw new AosRepositoryError(result.errors[0]?.message ?? "Reject failed", "AOS_UPDATE_FAILED");
    }

    const saved = await this.deps.candidates.saveCandidate({
      companyId: scope.companyId,
      candidate: result.value,
      expectedVersion: command.expectedVersion,
    });

    await this.deps.auditEvents.append(
      composeLearningAuditEvent("aos_learning_candidate_rejected", "Learning candidate rejected", {
        companyId: scope.companyId,
        engagementId: saved.engagementId,
        actorUserId: scope.actorUserId,
        occurredAt: nowMs,
        retrospectiveId: saved.retrospectiveId,
        extractionRunId: saved.extractionRunId,
        candidateId: saved.candidateId,
        reason: command.rejectionReason,
      }),
    );

    return { candidate: toLearningCandidateReviewDto(saved) };
  }

  async deferCandidate(
    scope: LearningGovernanceActor,
    command: DeferLearningCandidateCommand,
  ): Promise<LearningGovernanceActionResultDto> {
    assertAosPermission(scope, LEARNING_REVIEW_PERMISSION);
    if (scope.actorUserId === "ai") {
      throw new AosRepositoryError("AI cannot defer candidates", "AOS_UPDATE_FAILED");
    }

    const loaded = await this.loadCandidate(scope.companyId, command.candidateId);
    const deferredAt = new Date().toISOString();
    const nowMs = Date.now();

    const result = deferCandidate({
      actorId: scope.actorUserId,
      candidate: loaded,
      expectedVersion: command.expectedVersion,
      deferredAt,
      deferReason: command.deferReason,
    });
    if (!result.ok) {
      throw new AosRepositoryError(result.errors[0]?.message ?? "Defer failed", "AOS_UPDATE_FAILED");
    }

    const saved = await this.deps.candidates.saveCandidate({
      companyId: scope.companyId,
      candidate: result.value,
      expectedVersion: command.expectedVersion,
    });

    await this.deps.auditEvents.append(
      composeLearningAuditEvent("aos_learning_candidate_deferred", "Learning candidate deferred", {
        companyId: scope.companyId,
        engagementId: saved.engagementId,
        actorUserId: scope.actorUserId,
        occurredAt: nowMs,
        retrospectiveId: saved.retrospectiveId,
        extractionRunId: saved.extractionRunId,
        candidateId: saved.candidateId,
        reason: command.deferReason,
      }),
    );

    return { candidate: toLearningCandidateReviewDto(saved) };
  }

  async supersedeCandidate(
    scope: LearningGovernanceActor,
    command: SupersedeLearningCandidateCommand,
  ): Promise<LearningGovernanceActionResultDto> {
    assertAosPermission(scope, LEARNING_REVIEW_PERMISSION);
    if (scope.actorUserId === "ai") {
      throw new AosRepositoryError("AI cannot supersede candidates", "AOS_UPDATE_FAILED");
    }

    const loaded = await this.loadCandidate(scope.companyId, command.candidateId);
    const supersededAt = new Date().toISOString();
    const nowMs = Date.now();

    const result = supersedeCandidate({
      actorId: scope.actorUserId,
      candidate: loaded,
      expectedVersion: command.expectedVersion,
      supersededAt,
      supersededByCandidateId: command.supersededByCandidateId,
      reason: command.reason,
    });
    if (!result.ok) {
      throw new AosRepositoryError(
        result.errors[0]?.message ?? "Supersede failed",
        "AOS_UPDATE_FAILED",
      );
    }

    const saved = await this.deps.candidates.saveCandidate({
      companyId: scope.companyId,
      candidate: result.value,
      expectedVersion: command.expectedVersion,
    });

    await this.deps.auditEvents.append(
      composeLearningAuditEvent("aos_learning_candidate_superseded", "Learning candidate superseded", {
        companyId: scope.companyId,
        engagementId: saved.engagementId,
        actorUserId: scope.actorUserId,
        occurredAt: nowMs,
        retrospectiveId: saved.retrospectiveId,
        extractionRunId: saved.extractionRunId,
        candidateId: saved.candidateId,
        reason: command.reason,
      }),
    );

    return { candidate: toLearningCandidateReviewDto(saved) };
  }

  /** Explicit guard for LF-05 — AI approval attempts fail deterministically. */
  rejectAiApproval(
    scope: LearningGovernanceActor,
    candidate: import("../../domain/learning/entities/learningCandidate").LearningCandidate,
  ) {
    return rejectAiApprovalAttempt(candidate, scope.actorUserId);
  }

  private async loadCandidate(companyId: string, candidateId: string) {
    const loaded = await this.deps.candidates.getById(companyId, candidateId);
    if (!loaded) {
      throw new AosRepositoryError(`Candidate ${candidateId} not found`, "AOS_NOT_FOUND");
    }
    return loaded;
  }
}
