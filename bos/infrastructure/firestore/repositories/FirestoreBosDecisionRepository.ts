import type firebase from "firebase/compat/app";
import { db, Timestamp } from "../../../../services/firebase";
import type { BosDecisionRepository } from "../../../contracts/BosDecisionRepository";
import type { BosInitiativeRepository } from "../../../contracts/BosInitiativeRepository";
import type { BosVentureRepository } from "../../../contracts/BosVentureRepository";
import type {
  BosDecision,
  CreateBosDecisionInput,
  EvaluateBosDecisionInput,
  UpdateBosDecisionInput,
} from "../../../domain/entities/decision";
import type {
  BosDecisionId,
  BosInitiativeId,
  BosVentureId,
  CompanyId,
  PaginatedResult,
  PaginationQuery,
} from "../../../types";
import type { DecisionStatus } from "../../../constants/decisionStatus";
import { DECISION_STATUS } from "../../../constants/decisionStatus";
import {
  validateCreateDecision,
  validateDecisionEntityLinks,
  validateDecisionStatusTransition,
  validateUpdateDecision,
} from "../../../domain/rules/decisionRules";
import { parseKnownDecisionStatus } from "../../../domain/guards/statusGuards";
import { assertDomainOk, BosRepositoryError } from "../errors";
import { BOS_COLLECTIONS } from "../collections";
import { decisionFromFirestore, decisionToFirestore } from "../models/decisionDocument";
import { assertCompanyMatch, runPaginatedQueryByCreatedAt } from "../pagination";
import { epochMsToTimestamp, nowEpochMs } from "../timestamp";

import { firestoreBosInitiativeRepository } from "./FirestoreBosInitiativeRepository";
import { firestoreBosVentureRepository } from "./FirestoreBosVentureRepository";

export class FirestoreBosDecisionRepository implements BosDecisionRepository {
  constructor(
    private readonly firestore: firebase.firestore.Firestore = db,
    private readonly ventureRepository: BosVentureRepository = firestoreBosVentureRepository,
    private readonly initiativeRepository: BosInitiativeRepository = firestoreBosInitiativeRepository,
  ) {}

  private collection() {
    return this.firestore.collection(BOS_COLLECTIONS.DECISIONS);
  }

  async findById(companyId: CompanyId, id: BosDecisionId): Promise<BosDecision | null> {
    const snap = await this.collection().doc(id).get();
    if (!snap.exists) return null;
    const decision = decisionFromFirestore(snap.id, snap.data());
    if (!decision) return null;
    assertCompanyMatch(companyId, decision.companyId, "BosDecision");
    return decision;
  }

  async listByCompany(
    companyId: CompanyId,
    query?: PaginationQuery & { status?: DecisionStatus },
  ): Promise<PaginatedResult<BosDecision>> {
    return runPaginatedQueryByCreatedAt(
      (base) => {
        let q = base.where("companyId", "==", companyId);
        if (query?.status) {
          q = q.where("status", "==", query.status);
        }
        return q;
      },
      (doc) => {
        const decision = decisionFromFirestore(doc.id, doc.data());
        if (!decision) {
          throw new BosRepositoryError(
            `Invalid BosDecision document: ${doc.id}`,
            "BOS_INVALID_DOC",
          );
        }
        return decision;
      },
      this.collection(),
      query,
    );
  }

  async listByInitiative(
    companyId: CompanyId,
    initiativeId: BosInitiativeId,
    query?: PaginationQuery,
  ): Promise<PaginatedResult<BosDecision>> {
    return runPaginatedQueryByCreatedAt(
      (base) =>
        base.where("companyId", "==", companyId).where("initiativeId", "==", initiativeId),
      (doc) => {
        const decision = decisionFromFirestore(doc.id, doc.data());
        if (!decision) {
          throw new BosRepositoryError(
            `Invalid BosDecision document: ${doc.id}`,
            "BOS_INVALID_DOC",
          );
        }
        return decision;
      },
      this.collection(),
      query,
    );
  }

  async listByVenture(
    companyId: CompanyId,
    ventureId: BosVentureId,
    query?: PaginationQuery,
  ): Promise<PaginatedResult<BosDecision>> {
    return runPaginatedQueryByCreatedAt(
      (base) => base.where("companyId", "==", companyId).where("ventureId", "==", ventureId),
      (doc) => {
        const decision = decisionFromFirestore(doc.id, doc.data());
        if (!decision) {
          throw new BosRepositoryError(
            `Invalid BosDecision document: ${doc.id}`,
            "BOS_INVALID_DOC",
          );
        }
        return decision;
      },
      this.collection(),
      query,
    );
  }

  async create(input: CreateBosDecisionInput): Promise<BosDecision> {
    assertDomainOk(validateCreateDecision(input), "Invalid decision");

    const venture = input.ventureId
      ? await this.ventureRepository.findById(input.companyId, input.ventureId)
      : null;
    const initiative = input.initiativeId
      ? await this.initiativeRepository.findById(input.companyId, input.initiativeId)
      : null;

    assertDomainOk(
      validateDecisionEntityLinks(input, { venture, initiative }),
      "Invalid decision links",
    );

    const resolvedVentureId = input.ventureId ?? initiative?.ventureId;

    const now = nowEpochMs();
    const payload = decisionToFirestore({
      companyId: input.companyId,
      ventureId: resolvedVentureId,
      initiativeId: input.initiativeId,
      title: input.title.trim(),
      context: input.context?.trim(),
      decision: input.decision.trim(),
      decisionType: input.decisionType,
      status: DECISION_STATUS.PROPOSED,
      alternatives: input.alternatives,
      expectedOutcome: input.expectedOutcome?.trim(),
      decidedAt: input.decidedAt,
      decidedById: input.createdById,
      createdById: input.createdById,
      updatedById: input.createdById,
      createdAt: now,
      updatedAt: now,
    });

    const ref = await this.collection().add(payload);
    const created = await this.findById(input.companyId, ref.id);
    if (!created) {
      throw new BosRepositoryError("Failed to load decision after create", "BOS_CREATE_FAILED");
    }
    return created;
  }

  async update(
    companyId: CompanyId,
    id: BosDecisionId,
    input: UpdateBosDecisionInput,
  ): Promise<BosDecision> {
    const existing = await this.findById(companyId, id);
    if (!existing) {
      throw new BosRepositoryError("Decision not found", "BOS_NOT_FOUND");
    }

    assertDomainOk(validateUpdateDecision(existing, input), "Invalid decision update");

    const patch: Record<string, unknown> = {
      updatedAt: Timestamp.now(),
      updatedById: input.updatedById,
    };
    if (input.title !== undefined) patch.title = input.title.trim();
    if (input.context !== undefined) patch.context = input.context.trim();
    if (input.decision !== undefined) patch.decision = input.decision.trim();
    if (input.expectedOutcome !== undefined) patch.expectedOutcome = input.expectedOutcome.trim();
    if (input.actualOutcome !== undefined) patch.actualOutcome = input.actualOutcome.trim();
    if (input.decisionType !== undefined) patch.decisionType = input.decisionType;
    if (input.decidedAt !== undefined) patch.decidedAt = epochMsToTimestamp(input.decidedAt);

    await this.collection().doc(id).update(patch);
    const updated = await this.findById(companyId, id);
    if (!updated) {
      throw new BosRepositoryError("Failed to load decision after update", "BOS_UPDATE_FAILED");
    }
    return updated;
  }

  async updateStatus(
    companyId: CompanyId,
    id: BosDecisionId,
    status: DecisionStatus,
    updatedById: string,
  ): Promise<BosDecision> {
    const existing = await this.findById(companyId, id);
    if (!existing) {
      throw new BosRepositoryError("Decision not found", "BOS_NOT_FOUND");
    }

    const statusResult = parseKnownDecisionStatus(status);
    assertDomainOk(statusResult, "Invalid decision status");
    if (!statusResult.ok) {
      throw new BosRepositoryError("Invalid decision status", "BOS_DOMAIN_VALIDATION");
    }
    const nextStatus = statusResult.value;

    assertDomainOk(
      validateDecisionStatusTransition(existing, nextStatus),
      "Invalid decision status transition",
    );

    const patch: Record<string, unknown> = {
      status: nextStatus,
      updatedAt: Timestamp.now(),
      updatedById,
    };

    if (
      (nextStatus === DECISION_STATUS.ACTIVE || nextStatus === DECISION_STATUS.EVALUATED) &&
      !existing.decidedById
    ) {
      patch.decidedById = updatedById;
    }

    await this.collection().doc(id).update(patch);
    const updated = await this.findById(companyId, id);
    if (!updated) {
      throw new BosRepositoryError(
        "Failed to load decision after status update",
        "BOS_UPDATE_FAILED",
      );
    }
    return updated;
  }

  async evaluate(
    companyId: CompanyId,
    id: BosDecisionId,
    input: EvaluateBosDecisionInput,
  ): Promise<BosDecision> {
    const existing = await this.findById(companyId, id);
    if (!existing) {
      throw new BosRepositoryError("Decision not found", "BOS_NOT_FOUND");
    }

    assertDomainOk(
      validateDecisionStatusTransition(existing, DECISION_STATUS.EVALUATED),
      "Invalid decision status transition",
    );

    const now = nowEpochMs();
    await this.collection().doc(id).update({
      status: DECISION_STATUS.EVALUATED,
      actualOutcome: input.actualOutcome.trim(),
      evaluatedAt: epochMsToTimestamp(now),
      decidedAt: existing.decidedAt !== undefined ? epochMsToTimestamp(existing.decidedAt) : epochMsToTimestamp(now),
      decidedById: existing.decidedById ?? input.evaluatedById,
      updatedAt: Timestamp.now(),
      updatedById: input.evaluatedById,
    });

    const evaluated = await this.findById(companyId, id);
    if (!evaluated) {
      throw new BosRepositoryError("Failed to load decision after evaluate", "BOS_UPDATE_FAILED");
    }
    return evaluated;
  }
}

export const firestoreBosDecisionRepository = new FirestoreBosDecisionRepository();
