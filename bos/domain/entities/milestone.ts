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
  completedDate?: EpochMs;
  status: MilestoneStatus;
  ownerUserId?: UserId;
  notes?: string;
  dependencyIds?: BosMilestoneId[];
  evidence?: BosMilestoneEvidence[];
  blockedReason?: string;
  skippedReason?: string;
  startedAt?: EpochMs;
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
  evidence: Omit<BosMilestoneEvidence, "id" | "recordedAt" | "recordedById">[];
  updatedById: UserId;
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
  updatedById: UserId;
}
