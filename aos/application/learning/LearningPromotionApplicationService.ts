import type { AuditEventRepository } from "../../contracts/EngagementWorkflowRepository";
import type { KnowledgeRepository } from "../../contracts/KnowledgeRepository";
import type {
  LearningCandidateRepository,
  LearningPromotionRepository,
} from "../../contracts/learning/LearningRepositories";
import type { ModuleRegistryRepository } from "../../contracts/ModuleRegistryRepository";
import type { PlaybookRepository } from "../../contracts/PlaybookRepository";
import { createAuditEvent } from "../../domain/audit/rules/auditEventRules";
import {
  assertNonDestructivePromotionStrategy,
  assertPromotionEligible,
} from "../../domain/learning/rules/promotionEligibilityRules";
import {
  applyCandidatePromotionFailedTransition,
  applyCandidatePromotedTransition,
} from "../../domain/learning/rules/learningPromotionLifecycleRules";
import {
  assertPromotionBackwardTrace,
  buildLearningSourceRef,
  createLearningPromotionRecord,
} from "../../domain/learning/rules/learningPromotionRecordRules";
import {
  assertTargetPromotionGatesPassed,
  type PromotionGateContext,
} from "../../domain/learning/rules/promotionGateRules";
import { resolvePromotionWritePlan } from "../../domain/learning/rules/promotionTargetDraftRules";
import { evaluateUniversalGates } from "../../domain/learning/rules/learningGateRules";
import { AosRepositoryError } from "../../infrastructure/firestore/errors";
import { composeLearningAuditEvent } from "./learningAuditHelpers";
import {
  assertAosPermission,
  LEARNING_PROMOTE_PERMISSION,
} from "../authorization/aosAuthorization";
import type {
  LearningGovernanceActor,
  LearningPromotionResultDto,
  PromoteLearningCandidateCommand,
} from "./learningGovernanceDtos";
import {
  createPromotionAuditEventId,
  deterministicPromotionId,
  LearningPromotionOrchestrator,
} from "./LearningPromotionOrchestrator";
import type firebase from "firebase/compat/app";

export interface LearningPromotionApplicationServiceDeps {
  firestore: firebase.firestore.Firestore;
  candidates: LearningCandidateRepository;
  promotions: LearningPromotionRepository;
  auditEvents: AuditEventRepository;
  knowledge: KnowledgeRepository;
  registry: ModuleRegistryRepository;
  playbook: PlaybookRepository;
}

export class LearningPromotionApplicationService {
  private readonly orchestrator: LearningPromotionOrchestrator;

  constructor(private readonly deps: LearningPromotionApplicationServiceDeps) {
    this.orchestrator = new LearningPromotionOrchestrator({
      firestore: deps.firestore,
      knowledge: deps.knowledge,
      registry: deps.registry,
      playbook: deps.playbook,
    });
  }

  async promoteCandidate(
    scope: LearningGovernanceActor,
    command: PromoteLearningCandidateCommand,
  ): Promise<LearningPromotionResultDto> {
    assertAosPermission(scope, LEARNING_PROMOTE_PERMISSION);
    if (scope.actorUserId === "ai") {
      throw new AosRepositoryError("AI cannot promote candidates", "AOS_UPDATE_FAILED");
    }

    const loaded = await this.deps.candidates.getById(scope.companyId, command.candidateId);
    if (!loaded) {
      throw new AosRepositoryError(`Candidate ${command.candidateId} not found`, "AOS_NOT_FOUND");
    }
    if (loaded.companyId !== scope.companyId) {
      throw new AosRepositoryError("Cross-company promotion rejected", "AOS_UPDATE_FAILED");
    }

    const existingPromotion = await this.deps.promotions.getByCandidateId(
      scope.companyId,
      command.candidateId,
    );
    if (existingPromotion) {
      return this.toResultDto(existingPromotion, loaded);
    }

    if (loaded.version !== command.expectedVersion) {
      throw new AosRepositoryError(
        `Candidate version conflict: expected ${command.expectedVersion}, got ${loaded.version}`,
        "VERSION_CONFLICT",
      );
    }

    const eligibility = assertPromotionEligible(loaded, {
      actorId: scope.actorUserId,
      existingPromotionForCandidate: Boolean(existingPromotion),
    });
    if (!eligibility.ok) {
      await this.auditPromotionBlocked(scope, loaded, eligibility.errors[0]?.message ?? "Not eligible");
      throw new AosRepositoryError(
        eligibility.errors[0]?.message ?? "Promotion not eligible",
        "AOS_UPDATE_FAILED",
      );
    }

    const strategyCheck = assertNonDestructivePromotionStrategy(loaded);
    if (!strategyCheck.ok) {
      throw new AosRepositoryError(
        strategyCheck.errors[0]?.message ?? "Invalid promotion strategy",
        "AOS_UPDATE_FAILED",
      );
    }

    const gateContext = await this.buildGateContext(scope.companyId);
    const targetGates = assertTargetPromotionGatesPassed(loaded, gateContext);
    if (!targetGates.ok) {
      await this.auditPromotionGateBlocked(scope, loaded, targetGates.errors[0]?.message ?? "Gate blocked");
      throw new AosRepositoryError(
        targetGates.errors[0]?.message ?? "Target promotion gate blocked",
        "AOS_UPDATE_FAILED",
      );
    }

    const universalGates = evaluateUniversalGates({
      retrospectiveApproved: true,
      retrospectiveId: loaded.retrospectiveId,
      candidateType: loaded.candidateType,
      provenance: loaded.provenance,
      proposedContent: loaded.proposedContent,
      aiRecommendation: loaded.aiRecommendation,
      evaluatedAt: Date.now(),
    });
    if (universalGates.overallStatus === "gate_blocked") {
      const blocked = universalGates.evaluations.find((g) => g.status === "gate_blocked");
      await this.auditPromotionGateBlocked(
        scope,
        loaded,
        blocked?.message ?? "Universal gate blocked",
      );
      throw new AosRepositoryError(
        blocked?.message ?? "Universal gate blocked promotion",
        "AOS_UPDATE_FAILED",
      );
    }

    const promotedAt = new Date().toISOString();
    const nowMs = Date.now();
    const learningSourceRef = buildLearningSourceRef(
      loaded,
      promotedAt,
      scope.actorUserId,
    );

    const existingTarget = await this.loadExistingTarget(scope.companyId, loaded);
    const planResult = resolvePromotionWritePlan({
      candidate: loaded,
      learningSource: learningSourceRef,
      existingKnowledge: existingTarget.knowledge,
      existingModule: existingTarget.module,
      existingPlaybook: existingTarget.playbook,
    });
    if (!planResult.ok) {
      throw new AosRepositoryError(
        planResult.errors[0]?.message ?? "Promotion plan failed",
        "AOS_UPDATE_FAILED",
      );
    }

    const promotionId = deterministicPromotionId(loaded.candidateId);
    const recordResult = createLearningPromotionRecord({
      promotionId,
      companyId: scope.companyId,
      candidateId: loaded.candidateId,
      extractionRunId: loaded.extractionRunId,
      promotedAssetKind: planResult.value.promotedAssetKind,
      promotedAssetId: planResult.value.assetId,
      promotedVersion: planResult.value.versionLabel,
      promotedAt,
      promotedBy: scope.actorUserId,
      sourceProvenance: loaded.provenance,
      learningSourceRef,
    });
    if (!recordResult.ok) {
      throw new AosRepositoryError(
        recordResult.errors[0]?.message ?? "Promotion record invalid",
        "AOS_CREATE_FAILED",
      );
    }
    const traceCheck = assertPromotionBackwardTrace(recordResult.value, loaded);
    if (!traceCheck.ok) {
      throw new AosRepositoryError(
        traceCheck.errors[0]?.message ?? "Backward trace invalid",
        "AOS_CREATE_FAILED",
      );
    }

    const promotedTransition = applyCandidatePromotedTransition(
      loaded,
      {
        promotionId,
        promotedAssetKind: planResult.value.promotedAssetKind,
        promotedAssetId: planResult.value.assetId,
        promotedVersion: planResult.value.versionLabel,
        promotedAt,
        promotedBy: scope.actorUserId,
      },
      promotedAt,
    );
    if (!promotedTransition.ok) {
      throw new AosRepositoryError(
        promotedTransition.errors[0]?.message ?? "Promoted transition failed",
        "AOS_UPDATE_FAILED",
      );
    }

    const promotedAudit = createAuditEvent(
      {
        companyId: scope.companyId,
        engagementId: loaded.engagementId,
        type: "aos_learning_candidate_promoted",
        title: `Learning candidate promoted to ${planResult.value.promotedAssetKind}`,
        actorUserId: scope.actorUserId,
        occurredAt: nowMs,
        artifactType: "learning_promotion",
        source: `${loaded.candidateId}:${promotionId}`,
      },
      createPromotionAuditEventId("aos_learning_candidate_promoted", nowMs),
    );
    if (!promotedAudit.ok) {
      throw new AosRepositoryError(
        promotedAudit.errors[0]?.message ?? "Audit event invalid",
        "AOS_CREATE_FAILED",
      );
    }

    try {
      const txResult = await this.orchestrator.executePromotionTransaction({
        companyId: scope.companyId,
        candidate: loaded,
        plan: planResult.value,
        promotionRecord: recordResult.value,
        promotedCandidate: promotedTransition.value,
        auditEvents: [promotedAudit.value],
      });

      return this.toResultDto(txResult.promotionRecord, txResult.candidate);
    } catch (error) {
      const failed = applyCandidatePromotionFailedTransition(loaded, promotedAt);
      if (failed.ok && loaded.status === "approved") {
        try {
          await this.deps.candidates.saveCandidate({
            companyId: scope.companyId,
            candidate: failed.value,
            expectedVersion: command.expectedVersion,
          });
        } catch {
          // Candidate may have concurrent update — promotion_failed best effort.
        }
      }

      await this.deps.auditEvents.append(
        composeLearningAuditEvent("aos_learning_promotion_failed", "Learning promotion failed", {
          companyId: scope.companyId,
          engagementId: loaded.engagementId,
          actorUserId: scope.actorUserId,
          occurredAt: nowMs,
          retrospectiveId: loaded.retrospectiveId,
          extractionRunId: loaded.extractionRunId,
          candidateId: loaded.candidateId,
          reason: error instanceof Error ? error.message : "Unknown error",
        }),
      );

      throw error instanceof AosRepositoryError
        ? error
        : new AosRepositoryError(
            error instanceof Error ? error.message : "Promotion failed",
            "AOS_UPDATE_FAILED",
          );
    }
  }

  private async buildGateContext(companyId: string): Promise<PromotionGateContext> {
    const scope = { companyId };
    const [knowledge, modules, playbook] = await Promise.all([
      this.deps.knowledge.listAll(scope),
      this.deps.registry.listAll(scope),
      this.deps.playbook.listAll(scope),
    ]);
    return {
      existingKnowledgeTitles: knowledge
        .filter((p) => p.promotionStatus === "pattern_active")
        .map((p) => p.title),
      existingModuleNames: modules
        .filter((m) => m.status !== "deprecated")
        .map((m) => m.moduleName),
      existingPlaybookTitles: playbook.map((p) => p.title),
    };
  }

  private async loadExistingTarget(
    companyId: string,
    candidate: import("../../domain/learning/entities/learningCandidate").LearningCandidate,
  ) {
    const scope = { companyId };
    const targetId = candidate.promotionTarget.targetId;
    switch (candidate.candidateType) {
      case "knowledge_pattern":
        return {
          knowledge: targetId
            ? await this.deps.knowledge.findById(scope, targetId)
            : null,
          module: null,
          playbook: null,
        };
      case "module":
        return {
          knowledge: null,
          module: targetId ? await this.deps.registry.findById(scope, targetId) : null,
          playbook: null,
        };
      case "prompt_improvement":
      case "playbook_improvement":
      case "evaluation_insight":
        return {
          knowledge: null,
          module: null,
          playbook: targetId ? await this.deps.playbook.findById(scope, targetId) : null,
        };
      default:
        return { knowledge: null, module: null, playbook: null };
    }
  }

  private async auditPromotionGateBlocked(
    scope: LearningGovernanceActor,
    candidate: import("../../domain/learning/entities/learningCandidate").LearningCandidate,
    reason: string,
  ) {
    await this.deps.auditEvents.append(
      composeLearningAuditEvent("aos_learning_gate_evaluated", "Promotion gate blocked", {
        companyId: scope.companyId,
        engagementId: candidate.engagementId,
        actorUserId: scope.actorUserId,
        occurredAt: Date.now(),
        retrospectiveId: candidate.retrospectiveId,
        extractionRunId: candidate.extractionRunId,
        candidateId: candidate.candidateId,
        reason,
      }),
    );
  }

  private async auditPromotionBlocked(
    scope: LearningGovernanceActor,
    candidate: import("../../domain/learning/entities/learningCandidate").LearningCandidate,
    reason: string,
  ) {
    await this.deps.auditEvents.append(
      composeLearningAuditEvent("aos_learning_promotion_failed", "Promotion blocked", {
        companyId: scope.companyId,
        engagementId: candidate.engagementId,
        actorUserId: scope.actorUserId,
        occurredAt: Date.now(),
        retrospectiveId: candidate.retrospectiveId,
        extractionRunId: candidate.extractionRunId,
        candidateId: candidate.candidateId,
        reason,
      }),
    );
  }

  private toResultDto(
    record: import("../../domain/learning/entities/learningPromotionRecord").LearningPromotionRecord,
    candidate: import("../../domain/learning/entities/learningCandidate").LearningCandidate,
  ): LearningPromotionResultDto {
    return {
      promotionId: record.promotionId,
      candidateId: record.candidateId,
      promotedAssetKind: record.promotedAssetKind,
      promotedAssetId: record.promotedAssetId,
      promotedVersion: record.promotedVersion,
      promotedAt: record.promotedAt,
      candidateStatus: candidate.status,
    };
  }
}
