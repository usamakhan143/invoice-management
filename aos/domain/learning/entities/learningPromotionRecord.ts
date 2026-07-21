import type { CompanyId, UserId } from "../../../types";
import type { KilHandoffRef, LearningSourceRef } from "../valueObjects/learningSourceRef";
import type { LearningProvenance } from "../valueObjects/learningProvenance";

export type PromotedAssetKind =
  | "knowledge_pattern"
  | "module_registry"
  | "prompt_template"
  | "playbook"
  | "evaluation_rubric";

/** Immutable record created on successful promotion — LF-08 non-destructive versioning. */
export interface LearningPromotionRecord {
  readonly promotionId: string;
  readonly companyId: CompanyId;
  readonly candidateId: string;
  readonly extractionRunId: string;
  readonly promotedAssetKind: PromotedAssetKind;
  readonly promotedAssetId: string;
  readonly promotedVersion: string;
  readonly promotedAt: string;
  readonly promotedBy: UserId;
  readonly sourceProvenance: LearningProvenance;
  readonly learningSourceRef: LearningSourceRef;
  readonly rollbackOfPromotionId?: string;
  readonly kilHandoff?: KilHandoffRef;
}

export interface CreateLearningPromotionRecordInput {
  promotionId: string;
  companyId: CompanyId;
  candidateId: string;
  extractionRunId: string;
  promotedAssetKind: PromotedAssetKind;
  promotedAssetId: string;
  promotedVersion: string;
  promotedAt: string;
  promotedBy: UserId;
  sourceProvenance: LearningProvenance;
  learningSourceRef: LearningSourceRef;
  rollbackOfPromotionId?: string;
  kilHandoff?: KilHandoffRef;
}
