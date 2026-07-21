import type { Evaluation, EvaluationDraft } from "../domain/evaluation/entities/evaluation";
import type { CompanyId } from "../types";
import type { DeliveryEngagementId } from "../domain/delivery/valueObjects";

export interface CreateEvaluationDraftCommand {
  companyId: CompanyId;
  engagementId: DeliveryEngagementId;
  draft: EvaluationDraft;
}

export interface ConfirmEvaluationCommand {
  companyId: CompanyId;
  evaluationId: string;
  confirmedAt: number;
  confirmedByUserId: string;
}

export interface OverrideEvaluationCommand {
  companyId: CompanyId;
  evaluationId: string;
  confirmedAt: number;
  confirmedByUserId: string;
  overrideReason: string;
  passed: boolean;
  scorePercent: number;
}

export interface EvaluationRepository {
  createDraft(command: CreateEvaluationDraftCommand): Promise<EvaluationDraft>;
  confirm(command: ConfirmEvaluationCommand): Promise<Evaluation>;
  override(command: OverrideEvaluationCommand): Promise<Evaluation>;
  getById(companyId: CompanyId, evaluationId: string): Promise<Evaluation | EvaluationDraft | null>;
  listBySession(companyId: CompanyId, cursorSessionId: string): Promise<readonly (Evaluation | EvaluationDraft)[]>;
  listByEngagement(
    companyId: CompanyId,
    engagementId: DeliveryEngagementId,
  ): Promise<readonly (Evaluation | EvaluationDraft)[]>;
}

export const EVALUATION_REPOSITORY = Symbol("EvaluationRepository");
