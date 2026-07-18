import type { AgencyType } from "../../../constants/agencyType";
import type { EngagementType } from "../../../constants/engagementType";
import type { UserId } from "../../../types";
import type { DeliveryTemplateId } from "../../../domain/delivery/valueObjects";

/** Command — create a new Delivery Engagement (initial state: draft). */
export interface CreateDeliveryEngagementCommand {
  title: string;
  scopeSummary?: string;
  erpCustomerId: string;
  erpLeadId?: string;
  deliveryLeadUserId: UserId;
  agencyType?: AgencyType;
  engagementType?: EngagementType;
  bosInitiativeId?: string;
  deliveryTemplateId?: DeliveryTemplateId;
  teamMemberUserIds?: UserId[];
}
