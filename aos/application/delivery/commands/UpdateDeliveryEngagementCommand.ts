import type { AgencyType } from "../../../constants/agencyType";
import type { EngagementType } from "../../../constants/engagementType";
import type { UserId } from "../../../types";

/** Command — update engagement metadata (domain rules apply). */
export interface UpdateDeliveryEngagementCommand {
  title?: string;
  scopeSummary?: string;
  erpLeadId?: string;
  deliveryLeadUserId?: UserId;
  teamMemberUserIds?: UserId[];
  agencyType?: AgencyType;
  engagementType?: EngagementType;
  /** Required when changing agencyType after discovery or initiative after planning. */
  auditNote?: string;
}
