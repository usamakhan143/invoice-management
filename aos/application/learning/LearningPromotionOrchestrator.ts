import type { AuditEventRepository } from "../../contracts/EngagementWorkflowRepository";
import type { LearningCandidateRepository } from "../../contracts/learning/LearningRepositories";
import type { LearningCandidate } from "../../domain/learning/entities/learningCandidate";
import type { LearningPromotionRecord } from "../../domain/learning/entities/learningPromotionRecord";
import type { KnowledgeRepository } from "../../contracts/KnowledgeRepository";
import type { ModuleRegistryRepository } from "../../contracts/ModuleRegistryRepository";
import type { PlaybookRepository } from "../../contracts/PlaybookRepository";
import type { LearningPromotionRepository } from "../../contracts/learning/LearningRepositories";
import { composeLearningAuditEvent } from "./learningAuditHelpers";
import { createRandomVersionChainId } from "../../infrastructure/firestore/versionIds";
import { AOS_COLLECTIONS } from "../../infrastructure/firestore/collections";
import { deepOmitUndefinedFields } from "../../infrastructure/firestore/documentPayload";
import {
  learningCandidateToFirestore,
  learningPromotionFromFirestore,
  learningPromotionToFirestore,
  learningCandidateFromFirestore,
} from "../../infrastructure/firestore/models/learningDocument";
import { auditEventToFirestore } from "../../infrastructure/firestore/models/engagementWorkflowDocument";
import { AosRepositoryError } from "../../infrastructure/firestore/errors";
import type firebase from "firebase/compat/app";
import type { PromotionWritePlan } from "../../domain/learning/rules/promotionTargetDraftRules";

function catalogDocId(companyId: string, assetId: string): string {
  return `${companyId}__${assetId}`;
}

function buildPromotionId(candidateId: string): string {
  return `promo-${candidateId}`;
}

export interface PromotionOrchestratorDeps {
  firestore: firebase.firestore.Firestore;
  knowledge: KnowledgeRepository;
  registry: ModuleRegistryRepository;
  playbook: PlaybookRepository;
}

export interface ExecutePromotionTransactionInput {
  companyId: string;
  candidate: LearningCandidate;
  plan: PromotionWritePlan;
  promotionRecord: LearningPromotionRecord;
  promotedCandidate: LearningCandidate;
  auditEvents: readonly import("../../domain/audit/entities/auditEvent").AuditEvent[];
}

export class LearningPromotionOrchestrator {
  constructor(private readonly deps: PromotionOrchestratorDeps) {}

  async executePromotionTransaction(
    input: ExecutePromotionTransactionInput,
  ): Promise<{
    promotionRecord: LearningPromotionRecord;
    candidate: LearningCandidate;
  }> {
    const promotionRef = this.deps.firestore
      .collection(AOS_COLLECTIONS.LEARNING_PROMOTIONS)
      .doc(input.promotionRecord.promotionId);
    const candidateRef = this.deps.firestore
      .collection(AOS_COLLECTIONS.LEARNING_CANDIDATES)
      .doc(input.candidate.candidateId);

    return this.deps.firestore.runTransaction(async (tx) => {
      const [promotionSnap, candidateSnap] = await Promise.all([
        tx.get(promotionRef),
        tx.get(candidateRef),
      ]);

      if (promotionSnap.exists) {
        const existingRecord = learningPromotionFromFirestore(
          promotionSnap.id,
          promotionSnap.data(),
        );
        const loadedCandidate = learningCandidateFromFirestore(
          candidateSnap.id,
          candidateSnap.data(),
        );
        if (existingRecord && loadedCandidate) {
          return {
            promotionRecord: existingRecord,
            candidate: loadedCandidate,
          };
        }
      }

      if (!candidateSnap.exists) {
        throw new AosRepositoryError("Candidate not found", "AOS_NOT_FOUND");
      }
      const loadedVersion = candidateSnap.data()?.version as number;
      if (loadedVersion !== input.candidate.version) {
        throw new AosRepositoryError(
          `Candidate version conflict during promotion: expected ${input.candidate.version}, got ${loadedVersion}`,
          "VERSION_CONFLICT",
        );
      }
      if (candidateSnap.data()?.status === "promoted") {
        throw new AosRepositoryError("Candidate already promoted", "AOS_UPDATE_FAILED");
      }

      await this.writeTargetAsset(tx, input);

      for (const auditEvent of input.auditEvents) {
        const auditRef = this.deps.firestore
          .collection(AOS_COLLECTIONS.AUDIT_EVENTS)
          .doc(auditEvent.id);
        tx.set(auditRef, auditEventToFirestore(auditEvent));
      }

      tx.set(promotionRef, learningPromotionToFirestore(input.promotionRecord));
      tx.set(candidateRef, learningCandidateToFirestore(input.promotedCandidate));

      return {
        promotionRecord: input.promotionRecord,
        candidate: input.promotedCandidate,
      };
    });
  }

  private async writeTargetAsset(
    tx: firebase.firestore.Transaction,
    input: ExecutePromotionTransactionInput,
  ): Promise<void> {
    const { companyId, plan } = input;
    if (plan.knowledgePattern) {
      const newRef = this.deps.firestore
        .collection(AOS_COLLECTIONS.KNOWLEDGE_PATTERNS)
        .doc(catalogDocId(companyId, plan.knowledgePattern.patternId));
      const newSnap = await tx.get(newRef);
      if (newSnap.exists) return;

      if (plan.markPriorStale && plan.priorAssetId) {
        const staleRef = this.deps.firestore
          .collection(AOS_COLLECTIONS.KNOWLEDGE_PATTERNS)
          .doc(catalogDocId(companyId, plan.priorAssetId));
        const staleSnap = await tx.get(staleRef);
        if (staleSnap.exists) {
          tx.set(
            staleRef,
            { promotionStatus: "pattern_stale" },
            { merge: true },
          );
        }
      }
      tx.set(newRef, deepOmitUndefinedFields({ companyId, ...plan.knowledgePattern }));
      return;
    }

    if (plan.moduleEntry) {
      const newRef = this.deps.firestore
        .collection(AOS_COLLECTIONS.MODULE_REGISTRY)
        .doc(catalogDocId(companyId, plan.moduleEntry.moduleId));
      const newSnap = await tx.get(newRef);
      if (newSnap.exists) return;

      if (plan.markPriorStale && plan.priorAssetId) {
        const staleRef = this.deps.firestore
          .collection(AOS_COLLECTIONS.MODULE_REGISTRY)
          .doc(catalogDocId(companyId, plan.priorAssetId));
        const staleSnap = await tx.get(staleRef);
        if (staleSnap.exists) {
          tx.set(staleRef, { status: "deprecated" }, { merge: true });
        }
      }
      tx.set(newRef, deepOmitUndefinedFields({ companyId, ...plan.moduleEntry }));
      return;
    }

    if (plan.playbookEntry) {
      const newRef = this.deps.firestore
        .collection(AOS_COLLECTIONS.PLAYBOOK_ENTRIES)
        .doc(catalogDocId(companyId, plan.playbookEntry.entryId));
      const newSnap = await tx.get(newRef);
      if (newSnap.exists) return;

      if (plan.markPriorStale && plan.priorAssetId) {
        const staleRef = this.deps.firestore
          .collection(AOS_COLLECTIONS.PLAYBOOK_ENTRIES)
          .doc(catalogDocId(companyId, plan.priorAssetId));
        const staleSnap = await tx.get(staleRef);
        if (staleSnap.exists) {
          const staleTags = (staleSnap.data()?.tags as string[] | undefined) ?? [];
          tx.set(staleRef, { tags: [...staleTags, "superseded"] }, { merge: true });
        }
      }
      tx.set(newRef, deepOmitUndefinedFields({ companyId, ...plan.playbookEntry }));
    }
  }
}

export function deterministicPromotionId(candidateId: string): string {
  return buildPromotionId(candidateId);
}

export function createPromotionAuditEventId(type: string, occurredAt: number): string {
  return createRandomVersionChainId(`${type}-${occurredAt}`);
}

export interface PromotionOrchestratorRepositoryBundle {
  candidates: LearningCandidateRepository;
  promotions: LearningPromotionRepository;
  auditEvents: AuditEventRepository;
}
