import type { AuditEventRepository } from "../../contracts/EngagementWorkflowRepository";
import type { EngagementWorkflowRepository } from "../../contracts/EngagementWorkflowRepository";
import type {
  LearningCandidateRepository,
  LearningExtractionRunRepository,
} from "../../contracts/learning/LearningRepositories";
import type {
  LearningExtractionAiPort,
  AiCandidateProposal,
  LearningExtractionAiOutput,
} from "../../contracts/learning/LearningExtractionAiPort";
import type { LearningCandidateType } from "../../domain/learning/entities/learningCandidate";
import type { LearningCandidate } from "../../domain/learning/entities/learningCandidate";
import type { KnowledgePatternProposedContent, ModuleProposedContent } from "../../domain/learning/valueObjects/proposedContent";
import { buildExtractionRunId } from "../../domain/learning/valueObjects/learningIdentifiers";
import { buildLearningProvenanceFromTraceability } from "../../domain/learning/valueObjects/learningProvenance";
import { createPromotionTargetRef } from "../../domain/learning/valueObjects/promotionTargetRef";
import { createLearningCandidate } from "../../domain/learning/rules/learningCandidateRules";
import {
  applyRunStatusTransition,
  createLearningExtractionRun,
} from "../../domain/learning/rules/learningExtractionRunLifecycleRules";
import type { DeliveryEngagementId } from "../../domain/delivery/valueObjects";
import type { RetrospectiveLesson } from "../../domain/workflow/entities/engagementWorkflow";
import type { CompanyId } from "../../types";
import { isLearningEngineEnabled } from "../../config/learningEngineConfig";
import type { AosFeatureFlag } from "../../config/featureFlags";
import { composeLearningAuditEvent } from "./learningAuditHelpers";
import { sanitizePromotableText } from "./sanitizePromotableText";

const SYSTEM_ACTOR = "system";

export interface ScheduleLearningExtractionInput {
  companyId: CompanyId;
  engagementId: DeliveryEngagementId;
  retrospectiveId: string;
}

export interface LearningExtractionApplicationServiceDeps {
  extractionRuns: LearningExtractionRunRepository;
  candidates: LearningCandidateRepository;
  workflows: EngagementWorkflowRepository;
  auditEvents: AuditEventRepository;
  aiPort: LearningExtractionAiPort;
  featureFlags?: Partial<Record<AosFeatureFlag, boolean>>;
  versionChainsEnabled?: boolean;
}

export class LearningExtractionApplicationService {
  private readonly extractionRuns: LearningExtractionRunRepository;
  private readonly candidates: LearningCandidateRepository;
  private readonly workflows: EngagementWorkflowRepository;
  private readonly auditEvents: AuditEventRepository;
  private readonly aiPort: LearningExtractionAiPort;
  private readonly featureFlags: Partial<Record<AosFeatureFlag, boolean>>;
  private readonly versionChainsEnabled: boolean;

  constructor(deps: LearningExtractionApplicationServiceDeps) {
    this.extractionRuns = deps.extractionRuns;
    this.candidates = deps.candidates;
    this.workflows = deps.workflows;
    this.auditEvents = deps.auditEvents;
    this.aiPort = deps.aiPort;
    this.featureFlags = deps.featureFlags ?? {};
    this.versionChainsEnabled = deps.versionChainsEnabled ?? true;
  }

  /** Post-commit fire-and-forget trigger — LF-04 safe. */
  scheduleExtraction(input: ScheduleLearningExtractionInput): void {
    if (!isLearningEngineEnabled(this.featureFlags)) return;
    void this.runExtraction(input).catch(() => {
      // Failures recorded on extraction run + audit — never propagate to retrospective
    });
  }

  async runExtraction(input: ScheduleLearningExtractionInput): Promise<void> {
    if (!isLearningEngineEnabled(this.featureFlags)) return;

    const workflow = await this.workflows.get(input.companyId, input.engagementId);
    if (!workflow?.retrospective) return;
    if (workflow.retrospective.status !== "approved") return;
    if (workflow.retrospective.id !== input.retrospectiveId) return;

    const traceabilityRefs = workflow.retrospective.traceabilityRefs;
    if (!traceabilityRefs) {
      await this.failExtraction(input, "Missing traceability refs on approved retrospective");
      return;
    }

    if (
      this.versionChainsEnabled &&
      (!traceabilityRefs.requirementVersionId ||
        !traceabilityRefs.promptVersionId ||
        !traceabilityRefs.cursorSessionId ||
        !traceabilityRefs.evaluationId)
    ) {
      await this.failExtraction(input, "Incomplete Phase E traceability refs");
      return;
    }

    const timeline = await this.auditEvents.listByEngagement(
      input.companyId,
      input.engagementId,
    );
    const retroAuditIds = timeline
      .filter((e) => e.type === "retro.approved" || e.type === "retro.generated")
      .map((e) => e.id);

    const provenanceResult = buildLearningProvenanceFromTraceability(
      traceabilityRefs,
      input.retrospectiveId,
      retroAuditIds.length > 0 ? retroAuditIds : ["retro-approved-synthetic"],
    );
    if (!provenanceResult.ok) {
      await this.failExtraction(input, provenanceResult.errors[0]?.message ?? "Provenance invalid");
      return;
    }

    const extractionRunId = buildExtractionRunId(
      input.companyId,
      input.engagementId,
      input.retrospectiveId,
    );

    const existingRun = await this.extractionRuns.getById(input.companyId, extractionRunId);
    if (existingRun?.status === "completed") return;
    if (existingRun?.status === "running") return;

    const now = new Date().toISOString();
    const nowMs = Date.now();

    let run = existingRun;
    if (!run) {
      const createRunResult = createLearningExtractionRun({
        companyId: input.companyId,
        engagementId: input.engagementId,
        retrospectiveId: input.retrospectiveId,
        provenance: {
          requirementVersionId: provenanceResult.value.requirementVersionId,
          promptVersionId: provenanceResult.value.promptVersionId,
          cursorSessionId: provenanceResult.value.cursorSessionId,
          evaluationId: provenanceResult.value.evaluationId,
          retrospectiveId: provenanceResult.value.retrospectiveId,
          rubricVersionId: provenanceResult.value.rubricVersionId,
          sourceAuditEventIds: [...provenanceResult.value.sourceAuditEventIds],
        },
      });
      if (!createRunResult.ok) {
        await this.failExtraction(
          input,
          createRunResult.errors[0]?.message ?? "Failed to create extraction run",
        );
        return;
      }
      run = await this.extractionRuns.create({
        companyId: input.companyId,
        run: createRunResult.value,
      });
    }

    if (existingRun?.status === "failed" || existingRun?.status === "partial") {
      await this.auditEvents.append(
        composeLearningAuditEvent(
          "aos_learning_extraction_retriggered",
          "Learning extraction retriggered",
          {
            companyId: input.companyId,
            engagementId: input.engagementId,
            actorUserId: SYSTEM_ACTOR,
            occurredAt: nowMs,
            retrospectiveId: input.retrospectiveId,
            extractionRunId,
          },
        ),
      );
    }

    const runningResult = applyRunStatusTransition(run, "running", { startedAt: now });
    if (!runningResult.ok) {
      await this.failExtraction(input, runningResult.errors[0]?.message ?? "Run transition failed");
      return;
    }
    run = await this.extractionRuns.update({
      companyId: input.companyId,
      extractionRunId,
      run: runningResult.value,
    });

    await this.auditEvents.append(
      composeLearningAuditEvent(
        "aos_learning_extraction_started",
        "Learning extraction started",
        {
          companyId: input.companyId,
          engagementId: input.engagementId,
          actorUserId: SYSTEM_ACTOR,
          occurredAt: nowMs,
          retrospectiveId: input.retrospectiveId,
          extractionRunId,
        },
      ),
    );

    const sanitizedLessons = workflow.retrospective.lessons.map((lesson) => ({
      ...lesson,
      text: sanitizePromotableText(lesson.text).sanitized,
    }));

    const deterministicProposals = buildDeterministicProposals(sanitizedLessons);
    let aiProposals: AiCandidateProposal[] = [];
    let aiModelMetadata: LearningExtractionAiOutput["modelMetadata"] | undefined;
    try {
      const aiOutput = await this.aiPort.proposeCandidates({
        evidenceBundle: {
          engagementId: input.engagementId,
          retrospectiveId: input.retrospectiveId,
          retrospectiveApproved: true,
          summaryText: sanitizedLessons.map((l) => l.text).join(" "),
        },
        candidateTypesRequested: ["knowledge_pattern", "module"],
        modelPolicy: { maxCandidates: 5, temperature: 0 },
      });
      aiProposals = [...aiOutput.proposals];
      aiModelMetadata = aiOutput.modelMetadata;
    } catch {
      // AI failure-tolerant — continue with deterministic proposals only
    }

    const allProposals: Array<DeterministicProposal & { aiRecommendation?: LearningCandidate["aiRecommendation"] }> = [
      ...deterministicProposals,
      ...aiProposals.map((proposal) => ({
        candidateType: proposal.candidateType,
        title: proposal.title,
        summary: proposal.summary,
        proposedContent: proposal.proposedContent as KnowledgePatternProposedContent | ModuleProposedContent,
        promotionTarget: createPromotionTargetRef({
          targetKind: proposal.candidateType === "module" ? "module_registry" : "knowledge_pattern",
          expectedVersionStrategy: "new_version",
        }),
        aiRecommendation: aiModelMetadata
          ? {
              modelProvider: aiModelMetadata.provider,
              modelId: aiModelMetadata.modelId,
              promptVersion: aiModelMetadata.promptVersion,
            }
          : undefined,
      })),
    ];
    const candidateIds: string[] = [...run.candidateIds];
    let hadPartial = false;

    for (const proposal of allProposals) {
      const candidateResult = createLearningCandidate({
        companyId: input.companyId,
        engagementId: input.engagementId,
        retrospectiveId: input.retrospectiveId,
        extractionRunId,
        candidateType: proposal.candidateType,
        title: proposal.title,
        summary: proposal.summary,
        proposedContent: proposal.proposedContent,
        provenance: provenanceResult.value,
        promotionTarget: proposal.promotionTarget,
        createdAt: now,
        createdBy: "system",
        retrospectiveApproved: true,
        hasReuseAssessment: Boolean(workflow.reuseAssessment),
        hasRetroLessons: sanitizedLessons.length > 0,
        aiRecommendation: proposal.aiRecommendation,
      });

      if (!candidateResult.ok) {
        hadPartial = true;
        continue;
      }

      const saved = await this.candidates.upsert({
        companyId: input.companyId,
        candidate: candidateResult.value,
      });

      if (!candidateIds.includes(saved.candidateId)) {
        candidateIds.push(saved.candidateId);
      }

      await this.auditEvents.append(
        composeLearningAuditEvent(
          "aos_learning_candidate_created",
          `Learning candidate created: ${saved.candidateType}`,
          {
            companyId: input.companyId,
            engagementId: input.engagementId,
            actorUserId: SYSTEM_ACTOR,
            occurredAt: nowMs,
            retrospectiveId: input.retrospectiveId,
            extractionRunId,
            candidateId: saved.candidateId,
            candidateType: saved.candidateType,
          },
        ),
      );

      if (saved.gateResult) {
        await this.auditEvents.append(
          composeLearningAuditEvent(
            "aos_learning_gate_evaluated",
            `Gate ${saved.gateResult.overallStatus} for ${saved.candidateId}`,
            {
              companyId: input.companyId,
              engagementId: input.engagementId,
              actorUserId: SYSTEM_ACTOR,
              occurredAt: nowMs,
              retrospectiveId: input.retrospectiveId,
              extractionRunId,
              candidateId: saved.candidateId,
              reason: saved.gateResult.overallStatus,
            },
          ),
        );
      }
    }

    const finalStatus = hadPartial && candidateIds.length === 0 ? "failed" : hadPartial ? "partial" : "completed";
    const completedResult = applyRunStatusTransition(run, finalStatus, {
      completedAt: now,
      candidateIds,
      failureReason: finalStatus === "failed" ? "No candidates persisted" : undefined,
    });
    if (completedResult.ok) {
      run = await this.extractionRuns.update({
        companyId: input.companyId,
        extractionRunId,
        run: completedResult.value,
      });
    }

    await this.auditEvents.append(
      composeLearningAuditEvent(
        finalStatus === "failed"
          ? "aos_learning_extraction_failed"
          : "aos_learning_extraction_completed",
        `Learning extraction ${finalStatus}`,
        {
          companyId: input.companyId,
          engagementId: input.engagementId,
          actorUserId: SYSTEM_ACTOR,
          occurredAt: nowMs,
          retrospectiveId: input.retrospectiveId,
          extractionRunId,
          reason: run.failureReason,
        },
      ),
    );
  }

  private async failExtraction(
    input: ScheduleLearningExtractionInput,
    reason: string,
  ): Promise<void> {
    const extractionRunId = buildExtractionRunId(
      input.companyId,
      input.engagementId,
      input.retrospectiveId,
    );
    const now = new Date().toISOString();
    const nowMs = Date.now();

    const existing = await this.extractionRuns.getById(input.companyId, extractionRunId);
    if (existing?.status === "completed") return;

    const createResult = createLearningExtractionRun({
      companyId: input.companyId,
      engagementId: input.engagementId,
      retrospectiveId: input.retrospectiveId,
      provenance: {
        requirementVersionId: "unknown",
        promptVersionId: "unknown",
        cursorSessionId: "unknown",
        evaluationId: "unknown",
        retrospectiveId: input.retrospectiveId,
        sourceAuditEventIds: ["failed-extraction"],
      },
    });

    if (createResult.ok && !existing) {
      const failedRun = applyRunStatusTransition(createResult.value, "failed", {
        startedAt: now,
        completedAt: now,
        failureReason: reason,
      });
      if (failedRun.ok) {
        await this.extractionRuns.create({
          companyId: input.companyId,
          run: failedRun.value,
        });
      }
    } else if (existing) {
      const failedRun = applyRunStatusTransition(existing, "failed", {
        completedAt: now,
        failureReason: reason,
      });
      if (failedRun.ok) {
        await this.extractionRuns.update({
          companyId: input.companyId,
          extractionRunId,
          run: failedRun.value,
        });
      }
    }

    await this.auditEvents.append(
      composeLearningAuditEvent(
        "aos_learning_extraction_failed",
        `Learning extraction failed: ${reason}`,
        {
          companyId: input.companyId,
          engagementId: input.engagementId,
          actorUserId: SYSTEM_ACTOR,
          occurredAt: nowMs,
          retrospectiveId: input.retrospectiveId,
          extractionRunId,
          reason,
        },
      ),
    );
  }
}

interface DeterministicProposal {
  candidateType: LearningCandidateType;
  title: string;
  summary: string;
  proposedContent: KnowledgePatternProposedContent | ModuleProposedContent;
  promotionTarget: ReturnType<typeof createPromotionTargetRef>;
  aiRecommendation?: undefined;
}

function buildDeterministicProposals(lessons: RetrospectiveLesson[]): DeterministicProposal[] {
  return lessons.map((lesson) => {
    const sanitizedText = sanitizePromotableText(lesson.text).sanitized;
    if (lesson.promotionTarget === "registry") {
      return {
        candidateType: "module" as const,
        title: sanitizedText.slice(0, 80),
        summary: sanitizedText,
        proposedContent: {
          moduleName: sanitizedText.slice(0, 60),
          description: sanitizedText,
          capabilityTags: ["delivery"],
          gapRationale: "Identified during retrospective",
          sidecarComplianceNotes: "Requires sidecar law review before promotion",
          promotionAction: "new_module" as const,
        },
        promotionTarget: createPromotionTargetRef({
          targetKind: "module_registry",
          expectedVersionStrategy: "new_version",
        }),
      };
    }
    return {
      candidateType: "knowledge_pattern" as const,
      title: sanitizedText.slice(0, 80),
      summary: sanitizedText,
      proposedContent: {
        patternName: sanitizedText.slice(0, 60),
        category: "delivery",
        description: sanitizedText,
        applicabilityTags: ["retrospective"],
        generalizationNotes: "Client-specific details removed during extraction sanitization",
      },
      promotionTarget: createPromotionTargetRef({
        targetKind: "knowledge_pattern",
        expectedVersionStrategy: "new_version",
      }),
    };
  });
}
