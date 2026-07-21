import type firebase from "firebase/compat/app";
import type {
  ConfirmEvaluationCommand,
  CreateEvaluationDraftCommand,
  EvaluationRepository,
  OverrideEvaluationCommand,
} from "../../../contracts/EvaluationRepository";
import type { Evaluation, EvaluationDraft } from "../../../domain/evaluation/entities/evaluation";
import { confirmEvaluation, overrideEvaluation } from "../../../domain/evaluation/rules/evaluationRules";
import type { CompanyId } from "../../../types";
import type { DeliveryEngagementId } from "../../../domain/delivery/valueObjects";
import { AOS_COLLECTIONS } from "../collections";
import { assertCompanyMatch, AosRepositoryError, runAosFirestoreOperation } from "../errors";
import {
  evaluationFromFirestore,
  evaluationToFirestore,
  isEvaluationFinalizedStatus,
} from "../models/evaluationDocument";
import { epochMsToTimestamp } from "../timestamp";

export class EvaluationFirestoreRepository implements EvaluationRepository {
  constructor(private readonly firestore: firebase.firestore.Firestore) {}

  private collection() {
    return this.firestore.collection(AOS_COLLECTIONS.EVALUATIONS);
  }

  async createDraft(command: CreateEvaluationDraftCommand): Promise<EvaluationDraft> {
    return runAosFirestoreOperation("Evaluation.createDraft", async () => {
      assertCompanyMatch(command.companyId, command.draft.companyId, "Evaluation");
      const ref = this.collection().doc(command.draft.id);
      if ((await ref.get()).exists) {
        throw new AosRepositoryError(`Evaluation ${command.draft.id} already exists`, "VERSION_CONFLICT");
      }
      await ref.set(evaluationToFirestore(command.draft));
      const saved = evaluationFromFirestore(ref.id, (await ref.get()).data());
      if (!saved || saved.status !== "draft") throw new Error("Evaluation createDraft failed");
      return saved;
    });
  }

  async confirm(command: ConfirmEvaluationCommand): Promise<Evaluation> {
    return runAosFirestoreOperation("Evaluation.confirm", async () => {
      const ref = this.collection().doc(command.evaluationId);
      const snap = await ref.get();
      if (!snap.exists) throw new AosRepositoryError("Evaluation not found", "AOS_NOT_FOUND");
      const draft = evaluationFromFirestore(snap.id, snap.data());
      if (!draft || draft.status !== "draft") {
        throw new AosRepositoryError("Evaluation is not a draft", "AOS_UPDATE_FAILED");
      }
      assertCompanyMatch(command.companyId, draft.companyId, "Evaluation");
      const confirmed = confirmEvaluation(draft, {
        confirmedAt: command.confirmedAt,
        confirmedByUserId: command.confirmedByUserId,
      });
      if (!confirmed.ok) {
        throw new AosRepositoryError(confirmed.errors[0]?.message ?? "Confirm failed", "AOS_UPDATE_FAILED");
      }
      await ref.set(evaluationToFirestore(draft));
      await ref.update({
        status: confirmed.value.status,
        scorePercent: confirmed.value.scorePercent,
        passed: confirmed.value.passed,
        criteria: confirmed.value.criteria.map((c) => ({ ...c })),
        confirmedAt: epochMsToTimestamp(confirmed.value.confirmedAt),
        confirmedByUserId: confirmed.value.confirmedByUserId,
        overrideReason: confirmed.value.overrideReason,
      });
      const saved = evaluationFromFirestore(ref.id, (await ref.get()).data());
      if (!saved || saved.status === "draft") throw new Error("Evaluation confirm failed");
      return saved;
    });
  }

  async override(command: OverrideEvaluationCommand): Promise<Evaluation> {
    return runAosFirestoreOperation("Evaluation.override", async () => {
      const ref = this.collection().doc(command.evaluationId);
      const snap = await ref.get();
      if (!snap.exists) throw new AosRepositoryError("Evaluation not found", "AOS_NOT_FOUND");
      const draft = evaluationFromFirestore(snap.id, snap.data());
      if (!draft || draft.status !== "draft") {
        throw new AosRepositoryError("Evaluation is not a draft", "AOS_UPDATE_FAILED");
      }
      assertCompanyMatch(command.companyId, draft.companyId, "Evaluation");
      const overridden = overrideEvaluation(draft, {
        confirmedAt: command.confirmedAt,
        confirmedByUserId: command.confirmedByUserId,
        overrideReason: command.overrideReason,
        passed: command.passed,
        scorePercent: command.scorePercent,
      });
      if (!overridden.ok) {
        throw new AosRepositoryError(overridden.errors[0]?.message ?? "Override failed", "AOS_UPDATE_FAILED");
      }
      await ref.set(evaluationToFirestore(draft));
      await ref.update({
        status: overridden.value.status,
        scorePercent: overridden.value.scorePercent,
        passed: overridden.value.passed,
        criteria: overridden.value.criteria.map((c) => ({ ...c })),
        confirmedAt: epochMsToTimestamp(overridden.value.confirmedAt),
        confirmedByUserId: overridden.value.confirmedByUserId,
        overrideReason: overridden.value.overrideReason,
      });
      const saved = evaluationFromFirestore(ref.id, (await ref.get()).data());
      if (!saved || saved.status === "draft") throw new Error("Evaluation override failed");
      return saved;
    });
  }

  async getById(
    companyId: CompanyId,
    evaluationId: string,
  ): Promise<Evaluation | EvaluationDraft | null> {
    return runAosFirestoreOperation("Evaluation.getById", async () => {
      const snap = await this.collection().doc(evaluationId).get();
      if (!snap.exists) return null;
      const evaluation = evaluationFromFirestore(snap.id, snap.data());
      if (!evaluation) return null;
      assertCompanyMatch(companyId, evaluation.companyId, "Evaluation");
      return evaluation;
    });
  }

  async listBySession(
    companyId: CompanyId,
    cursorSessionId: string,
  ): Promise<readonly (Evaluation | EvaluationDraft)[]> {
    return runAosFirestoreOperation("Evaluation.listBySession", async () => {
      const snap = await this.collection()
        .where("companyId", "==", companyId)
        .where("cursorSessionId", "==", cursorSessionId)
        .get();
      return snap.docs
        .map((doc) => evaluationFromFirestore(doc.id, doc.data()))
        .filter((e): e is Evaluation | EvaluationDraft => e !== null);
    });
  }

  async listByEngagement(
    companyId: CompanyId,
    engagementId: DeliveryEngagementId,
  ): Promise<readonly (Evaluation | EvaluationDraft)[]> {
    return runAosFirestoreOperation("Evaluation.listByEngagement", async () => {
      const snap = await this.collection()
        .where("companyId", "==", companyId)
        .where("engagementId", "==", engagementId)
        .get();
      return snap.docs
        .map((doc) => evaluationFromFirestore(doc.id, doc.data()))
        .filter((e): e is Evaluation | EvaluationDraft => e !== null)
        .sort((a, b) => b.createdAt - a.createdAt);
    });
  }
}
