import type {
  AuditActor,
  AuditTimestamps,
  BosInitiativeId,
  BosMilestoneId,
  BosMilestoneTemplateId,
  CompanyId,
  EpochMs,
  UserId,
} from "../../types";
import type { MilestoneEvidenceType } from "../../constants/milestoneEvidenceType";
import type { MilestoneStatus } from "../../constants/milestoneStatus";
import type { MilestonePriority } from "../../constants/milestonePriority";
import type { MilestoneCompletionRequirements } from "../../constants/milestoneCompletionRequirement";
import type { MilestoneDurationUnit } from "../../constants/milestoneDurationUnit";
import type { MilestoneBusinessImpact } from "../../constants/milestoneBusinessImpact";
import type { MilestoneRiskLevel } from "../../constants/milestoneRiskLevel";
import type { MilestoneResult } from "../../constants/milestoneResult";
import type { MilestoneDelayReason } from "../../constants/milestoneDelayReason";
import type { MilestoneCompletionNextAction } from "../../constants/milestoneCompletionNextAction";
import type { MilestoneFailureRootCause } from "../../constants/milestoneFailureRootCause";
import type { CurrencyCode } from "../../types";

/** Links milestone completion to explicit business evidence. */
export interface BosMilestoneEvidence {
  id: string;
  type: MilestoneEvidenceType;
  /** ERP / BOS document id when applicable. */
  sourceId?: string;
  notes?: string;
  recordedAt: EpochMs;
  recordedById: UserId;
}

/**
 * BosMilestone — founder-defined step on an initiative (not inferred).
 */
export interface BosMilestone extends AuditTimestamps, AuditActor {
  id: BosMilestoneId;
  companyId: CompanyId;
  initiativeId: BosInitiativeId;
  templateId?: BosMilestoneTemplateId;
  templateStepId?: string;
  /** Immutable reference label (e.g. M-001) — assigned at create, never edited. */
  milestoneNumber?: string;
  /** Immutable numeric index backing milestoneNumber — scoped per initiative. */
  milestoneNumberIndex?: number;
  title: string;
  description?: string;
  milestoneType?: string;
  phase?: string;
  priority?: MilestonePriority;
  businessImpact?: MilestoneBusinessImpact;
  riskLevel?: MilestoneRiskLevel;
  estimatedDuration?: number;
  estimatedDurationUnit?: MilestoneDurationUnit;
  estimatedCostAmount?: number;
  estimatedCostCurrency?: CurrencyCode;
  successCriteria?: string;
  completionRequirements?: MilestoneCompletionRequirements;
  tags?: string[];
  sequence: number;
  plannedStartDate?: EpochMs;
  plannedEndDate?: EpochMs;
  /** Actual business completion date (set when milestone is completed). */
  completedDate?: EpochMs;
  completionNotes?: string;
  status: MilestoneStatus;
  ownerUserId?: UserId;
  notes?: string;
  dependencyIds?: BosMilestoneId[];
  evidence?: BosMilestoneEvidence[];
  blockedReason?: string;
  skippedReason?: string;
  /** Business date when work began (separate from target/planned dates). */
  startedAt?: EpochMs;
  startedNotes?: string;
  startedByUserId?: UserId;
  lessonsLearned?: string;
  /** Founder-assessed outcome at completion. */
  milestoneResult?: MilestoneResult;
  /** Why completion occurred after the target date. */
  delayReason?: MilestoneDelayReason;
  /** Planned follow-up after completion. */
  completionNextAction?: MilestoneCompletionNextAction;
  completionNextActionCustom?: string;
  completionNextActionTargetId?: BosMilestoneId;
  failureRootCause?: MilestoneFailureRootCause;
  failureRootCauseNotes?: string;
  /** When a blocked milestone was explicitly reopened to planned. */
  reopenedAt?: EpochMs;
  blockedAt?: EpochMs;
  skippedAt?: EpochMs;
}

export interface CreateBosMilestoneInput {
  companyId: CompanyId;
  initiativeId: BosInitiativeId;
  templateId?: BosMilestoneTemplateId;
  templateStepId?: string;
  title: string;
  description?: string;
  milestoneType?: string;
  phase?: string;
  priority?: MilestonePriority;
  businessImpact?: MilestoneBusinessImpact;
  riskLevel?: MilestoneRiskLevel;
  estimatedDuration?: number;
  estimatedDurationUnit?: MilestoneDurationUnit;
  estimatedCostAmount?: number;
  estimatedCostCurrency?: CurrencyCode;
  successCriteria?: string;
  completionRequirements?: MilestoneCompletionRequirements;
  tags?: string[];
  sequence: number;
  plannedStartDate?: EpochMs;
  plannedEndDate?: EpochMs;
  ownerUserId?: UserId;
  notes?: string;
  dependencyIds?: BosMilestoneId[];
  createdById: UserId;
}

export interface UpdateBosMilestoneInput {
  title?: string;
  description?: string;
  milestoneType?: string;
  phase?: string;
  priority?: MilestonePriority;
  businessImpact?: MilestoneBusinessImpact;
  riskLevel?: MilestoneRiskLevel;
  estimatedDuration?: number;
  estimatedDurationUnit?: MilestoneDurationUnit;
  estimatedCostAmount?: number;
  estimatedCostCurrency?: CurrencyCode;
  successCriteria?: string;
  completionRequirements?: MilestoneCompletionRequirements;
  tags?: string[];
  sequence?: number;
  plannedStartDate?: EpochMs;
  plannedEndDate?: EpochMs;
  ownerUserId?: UserId;
  notes?: string;
  dependencyIds?: BosMilestoneId[];
  updatedById: UserId;
}

export interface CompleteBosMilestoneInput {
  completedDate: EpochMs;
  completionNotes?: string;
  lessonsLearned?: string;
  milestoneResult: MilestoneResult;
  delayReason?: MilestoneDelayReason;
  completionNextAction: MilestoneCompletionNextAction;
  completionNextActionCustom?: string;
  completionNextActionTargetId?: BosMilestoneId;
  failureRootCause?: MilestoneFailureRootCause;
  failureRootCauseNotes?: string;
  evidence: Omit<BosMilestoneEvidence, "id" | "recordedAt" | "recordedById">[];
  updatedById: UserId;
}

export interface CompleteMilestoneValidationContext {
  initiativeStartDate?: EpochMs;
  /** Latest allowed completion instant — typically end of today. */
  completedDateMaxMs: EpochMs;
}

export interface BlockBosMilestoneInput {
  blockedReason: string;
  blockedAt: EpochMs;
  updatedById: UserId;
}

export interface SkipBosMilestoneInput {
  skippedReason?: string;
  skippedAt: EpochMs;
  updatedById: UserId;
}

export interface StartBosMilestoneInput {
  startedAt: EpochMs;
  startedNotes?: string;
  startedByUserId?: UserId;
  updatedById: UserId;
}
