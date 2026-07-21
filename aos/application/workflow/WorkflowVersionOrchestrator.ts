import type { AuditEvent } from "../../domain/audit/entities/auditEvent";
import { createAuditEvent } from "../../domain/audit/rules/auditEventRules";
import type { RequirementVersion } from "../../domain/requirements/entities/requirementVersion";
import { createRequirementVersion } from "../../domain/requirements/entities/requirementVersion";
import { publishRequirementVersion } from "../../domain/requirements/rules/requirementVersionRules";
import type { PromptVersion } from "../../domain/prompt/entities/promptVersion";
import {
  approvePromptPackHead,
  publishPromptArtifactVersion,
} from "../../domain/prompt/rules/promptVersionRules";
import type { CursorSession } from "../../domain/cursor/entities/cursorSession";
import {
  finalizeCursorSession,
  startCursorSession as startDomainCursorSession,
  updateCursorSessionCapture,
} from "../../domain/cursor/rules/cursorSessionRules";
import type { Evaluation } from "../../domain/evaluation/entities/evaluation";
import {
  confirmEvaluation,
  createDraftEvaluation,
} from "../../domain/evaluation/rules/evaluationRules";
import { DEFAULT_DELIVERY_RUBRIC } from "../../domain/evaluation/entities/evaluationRubric";
import type { EngagementWorkflow } from "../../domain/workflow/entities/engagementWorkflow";
import { withRecomputedGates } from "../../domain/workflow/entities/engagementWorkflow";
import type { DeliveryEngagementId } from "../../domain/delivery/valueObjects";
import type { CompanyId, EpochMs, UserId } from "../../types";
import { requirementVersionDocId, promptVersionDocId, createRandomVersionChainId } from "../../infrastructure/firestore/versionIds";
import { requirementVersionToFirestore } from "../../infrastructure/firestore/models/requirementVersionDocument";
import { promptVersionToFirestore } from "../../infrastructure/firestore/models/promptVersionDocument";
import { cursorSessionToFirestore } from "../../infrastructure/firestore/models/cursorSessionDocument";
import { evaluationToFirestore } from "../../infrastructure/firestore/models/evaluationDocument";
import {
  engagementWorkflowToFirestore,
} from "../../infrastructure/firestore/models/engagementWorkflowDocument";
import { auditEventToFirestore } from "../../infrastructure/firestore/models/engagementWorkflowDocument";
import { AOS_COLLECTIONS } from "../../infrastructure/firestore/collections";
import { AosRepositoryError } from "../../infrastructure/firestore/errors";
import type firebase from "firebase/compat/app";

export interface VersionOrchestratorDeps {
  firestore: firebase.firestore.Firestore;
}

function auditEventId(type: string, occurredAt: EpochMs): string {
  return createRandomVersionChainId(`${type}-${occurredAt}`);
}

function workflowDocId(companyId: CompanyId, engagementId: DeliveryEngagementId): string {
  return `${companyId}__${engagementId}`;
}

export class WorkflowVersionOrchestrator {
  constructor(private readonly deps: VersionOrchestratorDeps) {}

  private workflowRef(companyId: CompanyId, engagementId: DeliveryEngagementId) {
    return this.deps.firestore.collection(AOS_COLLECTIONS.ENGAGEMENT_WORKFLOWS).doc(workflowDocId(companyId, engagementId));
  }

  async publishRequirementVersionTransactional(input: {
    companyId: CompanyId;
    engagementId: DeliveryEngagementId;
    workflow: EngagementWorkflow;
    note: string;
    actorUserId: UserId;
    occurredAt: EpochMs;
    existingVersionNumbers: readonly number[];
    supersedesVersionId?: string;
  }): Promise<{ workflow: EngagementWorkflow; auditEvent: AuditEvent; version: RequirementVersion }> {
    const { workflow, companyId, engagementId } = input;
    if (!workflow.requirementSet) {
      throw new AosRepositoryError("No requirement set", "AOS_NOT_FOUND");
    }

    const nextNumber =
      input.existingVersionNumbers.length > 0
        ? Math.max(...input.existingVersionNumbers) + 1
        : 1;
    const versionId = requirementVersionDocId(companyId, workflow.requirementSet.id, nextNumber);

    const published = publishRequirementVersion({
      set: workflow.requirementSet,
      existingVersionNumbers: input.existingVersionNumbers,
      versionId,
      publishedAt: input.occurredAt,
      publishedByUserId: input.actorUserId,
      approvalNote: input.note,
      supersedesVersionId: input.supersedesVersionId,
    });
    if (!published.ok) {
      throw new AosRepositoryError(published.errors[0]?.message ?? "Publish failed", "AOS_UPDATE_FAILED");
    }

    const { version, updatedSet } = published.value;
    const updatedWorkflow = withRecomputedGates({
      ...workflow,
      requirementSet: updatedSet,
      currentApprovedRequirementVersionId: version.id,
      currentApprovedRequirementVersionNumber: version.versionNumber,
    });

    const auditResult = createAuditEvent(
      {
        companyId,
        engagementId,
        type: "aos_requirement_version_published",
        title: "Requirement version published",
        actorUserId: input.actorUserId,
        occurredAt: input.occurredAt,
        artifactType: "requirement_version",
        versionId: version.id,
        versionNumber: version.versionNumber,
      },
      auditEventId("aos_requirement_version_published", input.occurredAt),
    );
    if (!auditResult.ok) {
      throw new AosRepositoryError(auditResult.errors[0]?.message ?? "Audit failed", "AOS_CREATE_FAILED");
    }

    await this.deps.firestore.runTransaction(async (tx) => {
      const versionRef = this.deps.firestore
        .collection(AOS_COLLECTIONS.REQUIREMENT_VERSIONS)
        .doc(version.id);
      const wfRef = this.workflowRef(companyId, engagementId);
      const auditRef = this.deps.firestore
        .collection(AOS_COLLECTIONS.AUDIT_EVENTS)
        .doc(auditResult.value.id);

      const [versionSnap, wfSnap] = await Promise.all([tx.get(versionRef), tx.get(wfRef)]);

      if (versionSnap.exists) {
        throw new AosRepositoryError(`RequirementVersion ${version.id} exists`, "VERSION_CONFLICT");
      }
      if (!wfSnap.exists) {
        throw new AosRepositoryError("Workflow not found", "AOS_NOT_FOUND");
      }

      tx.set(versionRef, requirementVersionToFirestore(version));
      tx.set(
        wfRef,
        engagementWorkflowToFirestore(updatedWorkflow, input.occurredAt, { persistVersionRegistry: false }),
        { merge: true },
      );
      tx.set(auditRef, auditEventToFirestore(auditResult.value));
    });

    return { workflow: updatedWorkflow, auditEvent: auditResult.value, version };
  }

  async publishPromptPackTransactional(input: {
    companyId: CompanyId;
    engagementId: DeliveryEngagementId;
    workflow: EngagementWorkflow;
    requirementVersion: RequirementVersion;
    note: string;
    actorUserId: UserId;
    occurredAt: EpochMs;
    existingVersionNumbersByArtifact: Record<string, number[]>;
  }): Promise<{ workflow: EngagementWorkflow; auditEvent: AuditEvent; versions: PromptVersion[] }> {
    if (!input.workflow.promptPack) {
      throw new AosRepositoryError("No prompt pack", "AOS_NOT_FOUND");
    }

    let pack = input.workflow.promptPack;
    const versions: PromptVersion[] = [];

    for (const artifact of pack.artifacts) {
      const existing = input.existingVersionNumbersByArtifact[artifact.id] ?? [];
      const nextNumber = existing.length > 0 ? Math.max(...existing) + 1 : 1;
      const versionId = promptVersionDocId(input.companyId, artifact.id, nextNumber);

      const published = publishPromptArtifactVersion({
        pack,
        artifactId: artifact.id,
        requirementVersion: input.requirementVersion,
        existingVersionNumbers: existing,
        versionId,
        publishedAt: input.occurredAt,
        publishedByUserId: input.actorUserId,
      });
      if (!published.ok) {
        throw new AosRepositoryError(published.errors[0]?.message ?? "Prompt publish failed", "AOS_UPDATE_FAILED");
      }
      pack = published.value.updatedPack;
      versions.push(published.value.version);
    }

    const approved = approvePromptPackHead(pack, {
      approvalNote: input.note,
      approvedAt: input.occurredAt,
    });
    if (!approved.ok) {
      throw new AosRepositoryError(approved.errors[0]?.message ?? "Pack approve failed", "AOS_UPDATE_FAILED");
    }

    const updatedWorkflow = withRecomputedGates({
      ...input.workflow,
      promptPack: approved.value,
      currentPromptPackId: approved.value.id,
    });

    const lastVersion = versions[versions.length - 1]!;
    const auditResult = createAuditEvent(
      {
        companyId: input.companyId,
        engagementId: input.engagementId,
        type: "aos_prompt_version_published",
        title: "Prompt version published",
        actorUserId: input.actorUserId,
        occurredAt: input.occurredAt,
        artifactType: "prompt_version",
        versionId: lastVersion.id,
        versionNumber: lastVersion.versionNumber,
      },
      auditEventId("aos_prompt_version_published", input.occurredAt),
    );
    if (!auditResult.ok) {
      throw new AosRepositoryError(auditResult.errors[0]?.message ?? "Audit failed", "AOS_CREATE_FAILED");
    }

    await this.deps.firestore.runTransaction(async (tx) => {
      const wfRef = this.workflowRef(input.companyId, input.engagementId);
      const auditRef = this.deps.firestore
        .collection(AOS_COLLECTIONS.AUDIT_EVENTS)
        .doc(auditResult.value.id);

      const versionRefs = versions.map((version) =>
        this.deps.firestore.collection(AOS_COLLECTIONS.PROMPT_VERSIONS).doc(version.id),
      );
      const [wfSnap, ...versionSnaps] = await Promise.all([
        tx.get(wfRef),
        ...versionRefs.map((ref) => tx.get(ref)),
      ]);

      if (!wfSnap.exists) {
        throw new AosRepositoryError("Workflow not found", "AOS_NOT_FOUND");
      }
      for (const snap of versionSnaps) {
        if (snap.exists) {
          throw new AosRepositoryError(`PromptVersion ${snap.id} exists`, "VERSION_CONFLICT");
        }
      }

      for (const version of versions) {
        tx.set(
          this.deps.firestore.collection(AOS_COLLECTIONS.PROMPT_VERSIONS).doc(version.id),
          promptVersionToFirestore(version),
        );
      }
      tx.set(
        wfRef,
        engagementWorkflowToFirestore(updatedWorkflow, input.occurredAt, { persistVersionRegistry: false }),
        { merge: true },
      );
      tx.set(auditRef, auditEventToFirestore(auditResult.value));
    });

    return { workflow: updatedWorkflow, auditEvent: auditResult.value, versions };
  }

  async createCursorSessionTransactional(input: {
    companyId: CompanyId;
    engagementId: DeliveryEngagementId;
    workflow: EngagementWorkflow;
    promptVersion: PromptVersion;
    actorUserId: UserId;
    occurredAt: EpochMs;
  }): Promise<{ workflow: EngagementWorkflow; auditEvent: AuditEvent; session: CursorSession }> {
    if (!input.workflow.promptPack) {
      throw new AosRepositoryError("No prompt pack", "AOS_NOT_FOUND");
    }
    const artifact = input.workflow.promptPack.artifacts[0];
    if (!artifact) {
      throw new AosRepositoryError("No prompt artifact", "AOS_NOT_FOUND");
    }

    const sessionId = createRandomVersionChainId("cursor");
    const started = startDomainCursorSession({
      id: sessionId,
      companyId: input.companyId,
      engagementId: input.engagementId,
      promptPackId: input.workflow.promptPack.id,
      promptArtifactId: artifact.id,
      promptVersion: input.promptVersion,
      executorUserId: input.actorUserId,
      startedAt: input.occurredAt,
    });
    if (!started.ok) {
      throw new AosRepositoryError(started.errors[0]?.message ?? "Start session failed", "AOS_CREATE_FAILED");
    }

    const updatedWorkflow = withRecomputedGates({
      ...input.workflow,
      currentCursorSessionId: sessionId,
      cursorSessions: [started.value, ...input.workflow.cursorSessions],
    });

    const auditResult = createAuditEvent(
      {
        companyId: input.companyId,
        engagementId: input.engagementId,
        type: "aos_cursor_session_started",
        title: "Cursor session started",
        actorUserId: input.actorUserId,
        occurredAt: input.occurredAt,
        artifactType: "cursor_session",
        versionId: input.promptVersion.id,
        versionNumber: input.promptVersion.versionNumber,
      },
      auditEventId("aos_cursor_session_started", input.occurredAt),
    );
    if (!auditResult.ok) {
      throw new AosRepositoryError(auditResult.errors[0]?.message ?? "Audit failed", "AOS_CREATE_FAILED");
    }

    await this.deps.firestore.runTransaction(async (tx) => {
      const sessionRef = this.deps.firestore.collection(AOS_COLLECTIONS.CURSOR_SESSIONS).doc(sessionId);
      const wfRef = this.workflowRef(input.companyId, input.engagementId);
      const auditRef = this.deps.firestore
        .collection(AOS_COLLECTIONS.AUDIT_EVENTS)
        .doc(auditResult.value.id);

      const [sessionSnap, wfSnap] = await Promise.all([tx.get(sessionRef), tx.get(wfRef)]);
      if (sessionSnap.exists) {
        throw new AosRepositoryError(`CursorSession ${sessionId} exists`, "VERSION_CONFLICT");
      }
      if (!wfSnap.exists) {
        throw new AosRepositoryError("Workflow not found", "AOS_NOT_FOUND");
      }

      tx.set(sessionRef, cursorSessionToFirestore(started.value));
      tx.set(
        wfRef,
        engagementWorkflowToFirestore(updatedWorkflow, input.occurredAt, { persistVersionRegistry: false }),
        { merge: true },
      );
      tx.set(auditRef, auditEventToFirestore(auditResult.value));
    });

    return { workflow: updatedWorkflow, auditEvent: auditResult.value, session: started.value };
  }

  async finalizeCursorCaptureTransactional(input: {
    companyId: CompanyId;
    engagementId: DeliveryEngagementId;
    workflow: EngagementWorkflow;
    sessionId: string;
    captureSummary: string;
    actorUserId: UserId;
    occurredAt: EpochMs;
  }): Promise<{ workflow: EngagementWorkflow; auditEvent: AuditEvent; session: Readonly<CursorSession> }> {
    const session = input.workflow.cursorSessions.find((s) => s.id === input.sessionId);
    if (!session) throw new AosRepositoryError("Session not found", "AOS_NOT_FOUND");

    const captured = updateCursorSessionCapture(session, {
      captureSummary: input.captureSummary,
      capturedAt: input.occurredAt,
    });
    if (!captured.ok) {
      throw new AosRepositoryError(captured.errors[0]?.message ?? "Capture failed", "AOS_UPDATE_FAILED");
    }

    const finalized = finalizeCursorSession(captured.value, {
      status: "submitted",
      finalizedAt: input.occurredAt,
    });
    if (!finalized.ok) {
      throw new AosRepositoryError(finalized.errors[0]?.message ?? "Finalize failed", "AOS_UPDATE_FAILED");
    }

    const updatedWorkflow = withRecomputedGates({
      ...input.workflow,
      cursorSessions: input.workflow.cursorSessions.map((s) =>
        s.id === input.sessionId ? { ...finalized.value } : s,
      ),
    });

    const auditResult = createAuditEvent(
      {
        companyId: input.companyId,
        engagementId: input.engagementId,
        type: "aos_cursor_session_captured",
        title: "Cursor capture submitted",
        actorUserId: input.actorUserId,
        occurredAt: input.occurredAt,
        artifactType: "cursor_session",
        versionId: session.promptVersionId,
      },
      auditEventId("aos_cursor_session_captured", input.occurredAt),
    );
    if (!auditResult.ok) {
      throw new AosRepositoryError(auditResult.errors[0]?.message ?? "Audit failed", "AOS_CREATE_FAILED");
    }

    await this.deps.firestore.runTransaction(async (tx) => {
      const sessionRef = this.deps.firestore.collection(AOS_COLLECTIONS.CURSOR_SESSIONS).doc(input.sessionId);
      const wfRef = this.workflowRef(input.companyId, input.engagementId);
      const auditRef = this.deps.firestore
        .collection(AOS_COLLECTIONS.AUDIT_EVENTS)
        .doc(auditResult.value.id);

      const sessionSnap = await tx.get(sessionRef);
      if (!sessionSnap.exists) {
        throw new AosRepositoryError("Session not found", "AOS_NOT_FOUND");
      }

      tx.set(sessionRef, cursorSessionToFirestore(finalized.value as CursorSession), { merge: true });
      tx.set(
        wfRef,
        engagementWorkflowToFirestore(updatedWorkflow, input.occurredAt, { persistVersionRegistry: false }),
        { merge: true },
      );
      tx.set(auditRef, auditEventToFirestore(auditResult.value));
    });

    return { workflow: updatedWorkflow, auditEvent: auditResult.value, session: finalized.value };
  }

  async confirmEvaluationTransactional(input: {
    companyId: CompanyId;
    engagementId: DeliveryEngagementId;
    workflow: EngagementWorkflow;
    session: CursorSession;
    promptVersion: PromptVersion;
    requirementVersion: RequirementVersion;
    actorUserId: UserId;
    occurredAt: EpochMs;
  }): Promise<{ workflow: EngagementWorkflow; auditEvent: AuditEvent; evaluation: Evaluation }> {
    const passed = true;
    const criteria = [
      { id: "c1", label: "Requirements coverage", passed: true, score: 90 },
      { id: "c2", label: "Reuse compliance", passed: true, score: 85 },
      { id: "c3", label: "Capture evidence quality", passed: true, score: 88 },
    ];

    const evalId = createRandomVersionChainId("eval");
    const draftResult = createDraftEvaluation({
      id: evalId,
      companyId: input.companyId,
      engagementId: input.engagementId,
      session: input.session,
      promptVersion: input.promptVersion,
      requirementVersion: input.requirementVersion,
      rubric: DEFAULT_DELIVERY_RUBRIC,
      criteria,
      scorePercent: 88,
      passed,
      createdAt: input.occurredAt,
    });
    if (!draftResult.ok) {
      throw new AosRepositoryError(draftResult.errors[0]?.message ?? "Eval draft failed", "AOS_CREATE_FAILED");
    }

    const confirmed = confirmEvaluation(draftResult.value, {
      confirmedAt: input.occurredAt,
      confirmedByUserId: input.actorUserId,
    });
    if (!confirmed.ok) {
      throw new AosRepositoryError(confirmed.errors[0]?.message ?? "Eval confirm failed", "AOS_UPDATE_FAILED");
    }

    const updatedWorkflow = withRecomputedGates({
      ...input.workflow,
      evaluation: confirmed.value,
      currentEvaluationId: confirmed.value.id,
    });

    const auditResult = createAuditEvent(
      {
        companyId: input.companyId,
        engagementId: input.engagementId,
        type: "aos_evaluation_confirmed",
        title: passed ? "Evaluation passed" : "Evaluation failed",
        actorUserId: input.actorUserId,
        occurredAt: input.occurredAt,
        artifactType: "evaluation",
        versionId: confirmed.value.id,
      },
      auditEventId("aos_evaluation_confirmed", input.occurredAt),
    );
    if (!auditResult.ok) {
      throw new AosRepositoryError(auditResult.errors[0]?.message ?? "Audit failed", "AOS_CREATE_FAILED");
    }

    await this.deps.firestore.runTransaction(async (tx) => {
      const evalRef = this.deps.firestore.collection(AOS_COLLECTIONS.EVALUATIONS).doc(evalId);
      const wfRef = this.workflowRef(input.companyId, input.engagementId);
      const auditRef = this.deps.firestore
        .collection(AOS_COLLECTIONS.AUDIT_EVENTS)
        .doc(auditResult.value.id);

      const [evalSnap, wfSnap] = await Promise.all([tx.get(evalRef), tx.get(wfRef)]);
      if (evalSnap.exists) {
        throw new AosRepositoryError(`Evaluation ${evalId} exists`, "VERSION_CONFLICT");
      }
      if (!wfSnap.exists) {
        throw new AosRepositoryError("Workflow not found", "AOS_NOT_FOUND");
      }

      tx.set(evalRef, evaluationToFirestore(confirmed.value));
      tx.set(
        wfRef,
        engagementWorkflowToFirestore(updatedWorkflow, input.occurredAt, { persistVersionRegistry: false }),
        { merge: true },
      );
      tx.set(auditRef, auditEventToFirestore(auditResult.value));
    });

    return { workflow: updatedWorkflow, auditEvent: auditResult.value, evaluation: confirmed.value };
  }
}
