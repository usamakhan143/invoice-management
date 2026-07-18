import type { AgencyType } from "../../../constants/agencyType";
import type { EngagementType } from "../../../constants/engagementType";
import type { CompanyId, EpochMs, UserId } from "../../../types";
import type { DeliveryState } from "../../../domain/delivery/deliveryState";
import type { DeliveryEngagement } from "../../../domain/delivery/entities/deliveryEngagement";
import type {
  DeliveryEngagementId,
  DeliveryTemplateId,
  PromptPackId,
  RequirementSetId,
  RetrospectiveId,
} from "../../../domain/delivery/valueObjects";

/** Application-layer read model — not a persistence document. */
export interface DeliveryEngagementDto {
  id: DeliveryEngagementId;
  companyId: CompanyId;
  title: string;
  scopeSummary?: string;
  status: DeliveryState;
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
  createdAt: EpochMs;
  updatedAt: EpochMs;
  createdById: UserId;
  updatedById?: UserId;
}

export interface DeliveryEngagementListDto {
  items: DeliveryEngagementDto[];
  nextCursor?: string;
}

export function toDeliveryEngagementDto(engagement: DeliveryEngagement): DeliveryEngagementDto {
  return { ...engagement };
}

export function toDeliveryEngagementListDto(
  items: DeliveryEngagement[],
  nextCursor?: string,
): DeliveryEngagementListDto {
  return {
    items: items.map(toDeliveryEngagementDto),
    nextCursor,
  };
}
