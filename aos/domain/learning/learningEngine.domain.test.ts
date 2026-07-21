import { describe, expect, it } from "vitest";
import {
  buildExtractionRunId,
  buildCandidateId,
  computeSourceFingerprint,
  normalizeCandidateTitle,
} from "./valueObjects/learningIdentifiers";
import {
  createLearningProvenance,
  buildLearningProvenanceFromTraceability,
  validateLearningProvenanceContext,
} from "./valueObjects/learningProvenance";
import {
  buildConfidenceSnapshot,
  computeEvidenceConfidence,
} from "./valueObjects/confidenceSnapshot";
import {
  evaluateGateG001,
  evaluateGateG002,
  evaluateGateG003,
  evaluateGateG004,
  evaluateGateG005,
  evaluateUniversalGates,
} from "./rules/learningGateRules";
import { createLearningCandidate } from "./rules/learningCandidateRules";
import {
  approveCandidate,
  rejectCandidate,
  deferCandidate,
  rejectAiApprovalAttempt,
} from "./rules/learningApprovalRules";
import {
  assertCandidateTransition,
  applyCandidateStatusTransition,
  assertNotGateBlockedForReview,
} from "./rules/learningCandidateLifecycleRules";
import {
  createLearningExtractionRun,
  assertRunTransition,
  applyRunStatusTransition,
} from "./rules/learningExtractionRunLifecycleRules";
import {
  createAmendmentCandidate,
  assertAmendmentProvenancePreserved,
} from "./rules/learningAmendmentRules";
import {
  assertPromotionEligible,
  assertNonDestructivePromotionStrategy,
  isCandidateInReviewQueue,
} from "./rules/promotionEligibilityRules";
import {
  createLearningPromotionRecord,
  buildLearningSourceRef,
  assertPromotionBackwardTrace,
  assertDuplicatePromotionGuard,
} from "./rules/learningPromotionRecordRules";
import type { LearningCandidate } from "./entities/learningCandidate";
import type { KnowledgePatternProposedContent } from "./valueObjects/proposedContent";

const companyId = "co1";
const engagementId = "eng1";
const retrospectiveId = "retro1";
const actorUserId = "user-founder";

function provenanceInput() {
  return {
    requirementVersionId: "rv-1",
    promptVersionId: "pv-1",
    cursorSessionId: "cs-1",
    evaluationId: "ev-1",
    retrospectiveId,
    sourceAuditEventIds: ["audit-retro-approved"],
  };
}

function knowledgeContent(): KnowledgePatternProposedContent {
  return {
    patternName: "Reuse-first intake",
    category: "delivery",
    description: "Always check registry before custom build",
    applicabilityTags: ["intake"],
    generalizationNotes: "Client facts removed",
  };
}

function provenance() {
  const result = createLearningProvenance(provenanceInput());
  if (!result.ok) throw new Error("fixture provenance");
  return result.value;
}

function baseCandidateInput(overrides: Partial<Parameters<typeof createLearningCandidate>[0]> = {}) {
  const extractionRunId = buildExtractionRunId(companyId, engagementId, retrospectiveId);
  return {
    companyId,
    engagementId,
    retrospectiveId,
    extractionRunId,
    candidateType: "knowledge_pattern" as const,
    title: "Reuse-first intake",
    summary: "Check registry first",
    proposedContent: knowledgeContent(),
    provenance: provenance(),
    createdAt: "2026-07-21T00:00:00.000Z",
    createdBy: "system" as const,
    retrospectiveApproved: true,
    hasReuseAssessment: true,
    hasRetroLessons: true,
    ...overrides,
  };
}

function createCandidate(overrides?: Partial<Parameters<typeof createLearningCandidate>[0]>) {
  return createLearningCandidate(baseCandidateInput(overrides));
}

describe("learningIdentifiers — LF-03", () => {
  it("builds deterministic extractionRunId", () => {
    expect(buildExtractionRunId(companyId, engagementId, retrospectiveId)).toBe(
      "co1_eng1_retro1",
    );
  });

  it("builds deterministic candidateId from fingerprint", () => {
    const runId = buildExtractionRunId(companyId, engagementId, retrospectiveId);
    const fp = computeSourceFingerprint({
      candidateType: "knowledge_pattern",
      normalizedTitle: normalizeCandidateTitle("Reuse-first intake"),
      promotionTargetKind: "knowledge_pattern",
    });
    const id = buildCandidateId(runId, "knowledge_pattern", fp);
    expect(id.startsWith(`${runId}_knowledge_pattern_`)).toBe(true);
    expect(buildCandidateId(runId, "knowledge_pattern", fp)).toBe(id);
  });

  it("normalizes titles deterministically", () => {
    expect(normalizeCandidateTitle("  Hello   World  ")).toBe("hello world");
  });
});

describe("learningProvenance — LF-01 LF-02", () => {
  it("requires all Phase E evidence refs", () => {
    const result = createLearningProvenance({
      ...provenanceInput(),
      requirementVersionId: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe("LEARNING_PROVENANCE_INCOMPLETE");
    }
  });

  it("builds from DeliveryTraceabilityRefs without inventing IDs", () => {
    const result = buildLearningProvenanceFromTraceability(
      {
        requirementVersionId: "rv-1",
        promptVersionId: "pv-1",
        cursorSessionId: "cs-1",
        evaluationId: "ev-1",
      },
      retrospectiveId,
      ["audit-1"],
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.requirementVersionId).toBe("rv-1");
    }
  });

  it("rejects cross-company refs when metadata supplied", () => {
    const prov = createLearningProvenance(provenanceInput());
    if (!prov.ok) return;
    const result = validateLearningProvenanceContext(prov.value, {
      companyId: "co1",
      engagementId,
      refCompanyIds: { requirementVersionId: "co-other" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe("LEARNING_COMPANY_MISMATCH");
    }
  });
});

describe("confidence model — LF-05", () => {
  it("never sets promotionEligible from AI confidence alone", () => {
    const snapshot = buildConfidenceSnapshot({
      evidenceConfidence: "insufficient",
      aiConfidence: 0.99,
    });
    expect(snapshot.promotionEligible).toBe(false);
  });

  it("computes evidence confidence levels deterministically", () => {
    expect(
      computeEvidenceConfidence({ hasEvaluation: false, hasRetrospective: true }),
    ).toBe("insufficient");
    expect(
      computeEvidenceConfidence({ hasEvaluation: true, hasRetrospective: true }),
    ).toBe("single_engagement");
    expect(
      computeEvidenceConfidence({
        hasEvaluation: true,
        hasRetrospective: true,
        hasReuseAssessment: true,
        hasRetroLessons: true,
      }),
    ).toBe("multi_signal");
  });
});

describe("quality gates G-001 through G-005", () => {
  const prov = createLearningProvenance(provenanceInput());
  if (!prov.ok) throw new Error("fixture");

  it("G-001 blocks when retrospective not approved", () => {
    const gate = evaluateGateG001({
      retrospectiveApproved: false,
      retrospectiveId,
      candidateType: "knowledge_pattern",
      provenance: prov.value,
      promotableText: "",
      evaluatedAt: 0,
    });
    expect(gate.status).toBe("gate_blocked");
  });

  it("G-002 requires grounded artifact IDs", () => {
    const empty = evaluateGateG002({
      ...prov.value,
      requirementVersionId: "",
      promptVersionId: "",
      cursorSessionId: "",
      evaluationId: "",
    });
    expect(empty.status).toBe("gate_blocked");
  });

  it("G-003 blocks email patterns in promotable text", () => {
    const gate = evaluateGateG003("Contact client@example.com for details");
    expect(gate.status).toBe("gate_blocked");
    expect(gate.reasonCode).toBe("email_detected");
  });

  it("G-004 blocks AI proposals without metadata", () => {
    const gate = evaluateGateG004({
      modelProvider: "",
      modelId: "",
      promptVersion: "",
    });
    expect(gate.status).toBe("gate_blocked");
  });

  it("G-005 blocks unknown candidate types", () => {
    expect(evaluateGateG005("unknown_type").status).toBe("gate_blocked");
    expect(evaluateGateG005("knowledge_pattern").status).toBe("gate_passed");
  });

  it("evaluates all universal gates together", () => {
    const result = evaluateUniversalGates({
      retrospectiveApproved: true,
      retrospectiveId,
      candidateType: "knowledge_pattern",
      provenance: prov.value,
      proposedContent: knowledgeContent(),
      evaluatedAt: 1,
    });
    expect(result.overallStatus).toBe("gate_passed");
    expect(result.mayEnterPendingReview).toBe(true);
    expect(result.evaluations).toHaveLength(5);
  });
});

describe("candidate lifecycle", () => {
  it("creates candidate in pending_review when gates pass", () => {
    const result = createCandidate();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe("pending_review");
      expect(result.value.provenance.requirementVersionId).toBe("rv-1");
    }
  });

  it("creates gate_blocked candidate when PII detected — LF-09 LF-12", () => {
    const result = createCandidate({
      proposedContent: {
        ...knowledgeContent(),
        description: "Email us at leak@client.com",
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe("gate_blocked");
      expect(isCandidateInReviewQueue(result.value)).toBe(false);
      expect(assertNotGateBlockedForReview(result.value).ok).toBe(false);
    }
  });

  it("rejects illegal transitions — promoted terminal", () => {
    expect(assertCandidateTransition("promoted", "approved").ok).toBe(false);
    expect(assertCandidateTransition("rejected", "approved").ok).toBe(false);
    expect(assertCandidateTransition("gate_blocked", "approved").ok).toBe(false);
  });

  it("allows legal transitions", () => {
    expect(assertCandidateTransition("pending_review", "approved").ok).toBe(true);
    expect(assertCandidateTransition("approved", "promoted").ok).toBe(true);
    expect(assertCandidateTransition("promotion_failed", "promoted").ok).toBe(true);
  });
});

describe("human approval — LF-05 LF-06 LF-14", () => {
  it("approves pending_review candidate with human actor", () => {
    const created = createCandidate();
    if (!created.ok) return;
    const approved = approveCandidate({
      candidate: created.value,
      expectedVersion: created.value.version,
      actorId: actorUserId,
      approvedAt: "2026-07-21T01:00:00.000Z",
    });
    expect(approved.ok).toBe(true);
    if (approved.ok) {
      expect(approved.value.status).toBe("approved");
      expect(approved.value.approval?.approvedBy).toBe(actorUserId);
      expect(approved.value.version).toBe(2);
    }
  });

  it("rejects AI approval — LF-05", () => {
    const created = createCandidate();
    if (!created.ok) return;
    const result = rejectAiApprovalAttempt(created.value, "ai");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe("LEARNING_AI_ACTOR_FORBIDDEN");
    }
  });

  it("rejects system actor for approval", () => {
    const created = createCandidate();
    if (!created.ok) return;
    const result = approveCandidate({
      candidate: created.value,
      expectedVersion: created.value.version,
      actorId: "system",
      approvedAt: "2026-07-21T01:00:00.000Z",
    });
    expect(result.ok).toBe(false);
  });

  it("detects version conflict — LF-14", () => {
    const created = createCandidate();
    if (!created.ok) return;
    const result = approveCandidate({
      candidate: created.value,
      expectedVersion: 999,
      actorId: actorUserId,
      approvedAt: "2026-07-21T01:00:00.000Z",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe("LEARNING_VERSION_CONFLICT");
    }
  });

  it("rejects and defers candidates", () => {
    const created = createCandidate();
    if (!created.ok) return;
    const rejected = rejectCandidate({
      candidate: created.value,
      expectedVersion: created.value.version,
      actorId: actorUserId,
      rejectedAt: "2026-07-21T02:00:00.000Z",
      rejectionReason: "Not reusable",
    });
    expect(rejected.ok).toBe(true);
    if (rejected.ok) expect(rejected.value.status).toBe("rejected");

    const created2 = createCandidate();
    if (!created2.ok) return;
    const deferred = deferCandidate({
      candidate: created2.value,
      expectedVersion: created2.value.version,
      actorId: actorUserId,
      deferredAt: "2026-07-21T02:00:00.000Z",
    });
    expect(deferred.ok).toBe(true);
    if (deferred.ok) expect(deferred.value.status).toBe("gate_deferred");
  });
});

describe("amendment flow", () => {
  it("supersedes original and creates amended candidate", () => {
    const created = createCandidate();
    if (!created.ok) return;
    const amended = createAmendmentCandidate({
      originalCandidate: created.value,
      expectedOriginalVersion: created.value.version,
      supersededAt: "2026-07-21T03:00:00.000Z",
      amendedBy: actorUserId,
      ...baseCandidateInput({ title: "Amended title" }),
      provenance: created.value.provenance,
    });
    expect(amended.ok).toBe(true);
    if (amended.ok) {
      expect(amended.value.original.status).toBe("superseded");
      expect(amended.value.amended.amendmentOfCandidateId).toBe(created.value.candidateId);
      expect(
        assertAmendmentProvenancePreserved(amended.value.original, amended.value.amended).ok,
      ).toBe(true);
    }
  });
});

describe("extraction run lifecycle", () => {
  it("creates run with deterministic id", () => {
    const result = createLearningExtractionRun({
      companyId,
      engagementId,
      retrospectiveId,
      provenance: provenanceInput(),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.extractionRunId).toBe("co1_eng1_retro1");
      expect(result.value.status).toBe("pending");
    }
  });

  it("enforces legal run transitions", () => {
    expect(assertRunTransition("pending", "running").ok).toBe(true);
    expect(assertRunTransition("completed", "running").ok).toBe(false);
    expect(assertRunTransition("running", "completed").ok).toBe(true);
  });

  it("applies run status transitions", () => {
    const run = createLearningExtractionRun({
      companyId,
      engagementId,
      retrospectiveId,
      provenance: provenanceInput(),
    });
    if (!run.ok) return;
    const running = applyRunStatusTransition(run.value, "running", {
      startedAt: "2026-07-21T00:00:01.000Z",
    });
    expect(running.ok).toBe(true);
    if (running.ok) expect(running.value.status).toBe("running");
  });
});

describe("promotion eligibility — LF-06 LF-08 LF-11 LF-13", () => {
  function approvedCandidate(): LearningCandidate {
    const created = createCandidate();
    if (!created.ok) throw new Error("fixture");
    const approved = approveCandidate({
      candidate: created.value,
      expectedVersion: created.value.version,
      actorId: actorUserId,
      approvedAt: "2026-07-21T01:00:00.000Z",
    });
    if (!approved.ok) throw new Error("approve");
    return approved.value;
  }

  it("requires human approval before promotion", () => {
    const created = createCandidate();
    if (!created.ok) return;
    const result = assertPromotionEligible(created.value, { actorId: "system" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe("LEARNING_NOT_APPROVED");
    }
  });

  it("rejects AI promotion actor — LF-05", () => {
    const candidate = approvedCandidate();
    const result = assertPromotionEligible(candidate, { actorId: "ai" });
    expect(result.ok).toBe(false);
  });

  it("allows promotion for approved candidate", () => {
    const candidate = approvedCandidate();
    const result = assertPromotionEligible(candidate, { actorId: "system" });
    expect(result.ok).toBe(true);
    expect(assertNonDestructivePromotionStrategy(candidate).ok).toBe(true);
  });

  it("rejects duplicate promotion — LF-11", () => {
    const candidate = approvedCandidate();
    const promoted = applyCandidateStatusTransition(
      candidate,
      "promoted",
      "2026-07-21T04:00:00.000Z",
    );
    if (!promoted.ok) return;
    expect(assertDuplicatePromotionGuard(promoted.value).ok).toBe(false);
  });

  it("creates promotion record with backward trace — LF-13", () => {
    const candidate = approvedCandidate();
    const sourceRef = buildLearningSourceRef(
      candidate,
      "2026-07-21T04:00:00.000Z",
      actorUserId,
    );
    const record = createLearningPromotionRecord({
      promotionId: "promo-1",
      companyId,
      candidateId: candidate.candidateId,
      extractionRunId: candidate.extractionRunId,
      promotedAssetKind: "knowledge_pattern",
      promotedAssetId: "pattern-new-1",
      promotedVersion: "2",
      promotedAt: "2026-07-21T04:00:00.000Z",
      promotedBy: actorUserId,
      sourceProvenance: candidate.provenance,
      learningSourceRef: sourceRef,
    });
    expect(record.ok).toBe(true);
    if (record.ok) {
      expect(assertPromotionBackwardTrace(record.value, candidate).ok).toBe(true);
      expect(record.value.learningSourceRef.evaluationId).toBe("ev-1");
    }
  });
});

describe("NullLearningExtractionAiPort", () => {
  it("returns empty proposals deterministically", async () => {
    const { nullLearningExtractionAiPort } = await import(
      "../../contracts/learning/NullLearningExtractionAiPort"
    );
    const output = await nullLearningExtractionAiPort.proposeCandidates({
      evidenceBundle: {
        engagementId,
        retrospectiveId,
        retrospectiveApproved: true,
        summaryText: "summary",
      },
      candidateTypesRequested: ["knowledge_pattern"],
      modelPolicy: { maxCandidates: 5, temperature: 0 },
    });
    expect(output.proposals).toEqual([]);
    expect(output.modelMetadata.provider).toBe("null");
  });
});

describe("audit event types — LF-15", () => {
  it("includes frozen learning taxonomy", () => {
    const events: import("../audit/entities/auditEvent").LearningAuditEventType[] = [
      "aos_learning_extraction_started",
      "aos_learning_candidate_promoted",
      "aos_learning_promotion_failed",
    ];
    expect(events).toContain("aos_learning_candidate_promoted");
  });
});
