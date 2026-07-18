import type { AgencyType } from "../../../constants/agencyType";
import type { EngagementType } from "../../../constants/engagementType";
import type { CompanyId, EpochMs, UserId } from "../../../types";
import type { DeliveryState } from "../deliveryState";
import type {
  DeliveryEngagementId,
  DeliveryTemplateId,
  PromptPackId,
  RequirementSetId,
  RetrospectiveId,
} from "../valueObjects";

export interface DeliveryEngagementAuditTimestamps {
  createdAt: EpochMs;
  updatedAt: EpochMs;
}

export interface DeliveryEngagementAuditActor {
  createdById: UserId;
  updatedById?: UserId;
}

/**
 * DeliveryEngagement — primary AOS aggregate root for software delivery work.
 *
 * Responsibilities:
 *   - Container for delivery lifecycle and artifact references
 *   - Links ERP customer (required) and optional BOS initiative
 *   - NOT an ERP project, BOS initiative, or generic PM container
 *
 * Ownership:
 *   - AOS owns all engagement data
 *   - ERP/BOS identities are read-only references (Sidecar Law)
 *
 * Lifecycle: docs/aos-domain-model/01_DELIVERY_DOMAIN.md
 */
export interface DeliveryEngagement
  extends DeliveryEngagementAuditTimestamps,
    DeliveryEngagementAuditActor {
  id: DeliveryEngagementId;
  companyId: CompanyId;
  title: string;
  scopeSummary?: string;
  status: DeliveryState;
  /** Forward workflow state preserved while status is `paused`. */
  pausedFromState?: DeliveryState;
  agencyType?: AgencyType;
  engagementType?: EngagementType;
  erpCustomerId: string;
  erpLeadId?: string;
  bosInitiativeId?: string;
  bosVentureId?: string;
  deliveryTemplateId?: DeliveryTemplateId;
  appliedTemplateVersion?: number;
  deliveryLeadUserId: UserId;
  teamMemberUserIds?: UserId[];
  currentApprovedRequirementSetId?: RequirementSetId;
  currentApprovedPromptPackId?: PromptPackId;
  completedRetrospectiveId?: RetrospectiveId;
  cancelReason?: string;
  pausedAt?: EpochMs;
  closedAt?: EpochMs;
}

export interface CreateDeliveryEngagementInput {
  companyId: CompanyId;
  title: string;
  scopeSummary?: string;
  erpCustomerId: string;
  erpLeadId?: string;
  deliveryLeadUserId: UserId;
  agencyType?: AgencyType;
  engagementType?: EngagementType;
  bosInitiativeId?: string;
  bosVentureId?: string;
  deliveryTemplateId?: DeliveryTemplateId;
  teamMemberUserIds?: UserId[];
  createdById: UserId;
}

export interface UpdateDeliveryEngagementInput {
  title?: string;
  scopeSummary?: string;
  erpLeadId?: string;
  bosInitiativeId?: string | null;
  bosVentureId?: string | null;
  deliveryLeadUserId?: UserId;
  teamMemberUserIds?: UserId[];
  agencyType?: AgencyType;
  engagementType?: EngagementType;
  /** Required when changing agencyType after discovery or bosInitiativeId after planning. */
  auditNote?: string;
  updatedById: UserId;
}

export interface CancelDeliveryEngagementInput {
  cancelReason: string;
  cancelledById: UserId;
}

export interface PauseDeliveryEngagementInput {
  pausedById: UserId;
}

export interface ResumeDeliveryEngagementInput {
  resumedById: UserId;
}
