import type {
  AuditActor,
  AuditTimestamps,
  BosInitiativeId,
  BosMilestoneTemplateId,
  CompanyId,
  UserId,
} from "../../types";
import type { MilestoneTemplateVisibility } from "../../constants/milestoneTemplateVisibility";
import type { MilestonePriority } from "../../constants/milestonePriority";
import type { MilestoneCompletionRequirements } from "../../constants/milestoneCompletionRequirement";

export interface BosMilestoneTemplateStep {
  id: string;
  title: string;
  description?: string;
  sequence: number;
  defaultDurationDays?: number;
  phase?: string;
  priority?: MilestonePriority;
  milestoneType?: string;
  businessImpact?: string;
  estimatedDuration?: number;
  estimatedDurationUnit?: string;
  estimatedCostAmount?: number;
  estimatedCostCurrency?: string;
  successCriteria?: string;
  completionRequirements?: MilestoneCompletionRequirements;
  tags?: string[];
}

/**
 * BosMilestoneTemplate — reusable milestone definitions (founder institutional memory).
 */
export interface BosMilestoneTemplate extends AuditTimestamps, AuditActor {
  id: BosMilestoneTemplateId;
  companyId: CompanyId;
  name: string;
  category?: string;
  description?: string;
  steps: BosMilestoneTemplateStep[];
  visibility: MilestoneTemplateVisibility;
  ownerUserId: UserId;
  /** When saved from an existing initiative. */
  sourceInitiativeId?: BosInitiativeId;
}

export interface CreateBosMilestoneTemplateInput {
  companyId: CompanyId;
  name: string;
  category?: string;
  description?: string;
  steps: BosMilestoneTemplateStep[];
  visibility: MilestoneTemplateVisibility;
  ownerUserId: UserId;
  sourceInitiativeId?: BosInitiativeId;
  createdById: UserId;
}

export interface UpdateBosMilestoneTemplateInput {
  name?: string;
  category?: string;
  description?: string;
  steps?: BosMilestoneTemplateStep[];
  visibility?: MilestoneTemplateVisibility;
  updatedById: UserId;
}

/** Draft step used when composing milestones before initiative save. */
export interface MilestoneDraftStep {
  id: string;
  title: string;
  description?: string;
  sequence: number;
  defaultDurationDays?: number;
}
