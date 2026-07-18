import type { AgencyType } from "../../constants/agencyType";
import type { EngagementType } from "../../constants/engagementType";
import type { CompanyId, UserId } from "../../types";

export type DeliveryEngagementId = string;
export type DeliveryTemplateId = string;
export type DeliveryQualityReportId = string;
export type RequirementSetId = string;
export type PromptPackId = string;
export type RetrospectiveId = string;

/** Non-empty engagement title — validated via rules, stored as string on entity. */
export type EngagementTitle = string;

export interface CustomerReference {
  customerId: string;
  companyId: CompanyId;
}

export interface LeadReference {
  leadId: string;
  companyId: CompanyId;
}

export interface InitiativeReference {
  initiativeId: string;
  companyId: CompanyId;
}

export interface UserReference {
  userId: UserId;
  companyId: CompanyId;
}

export interface DeliveryEngagementProfile {
  agencyType?: AgencyType;
  engagementType?: EngagementType;
}

/**
 * External artifact presence flags — supplied by callers; domain never fakes entities.
 */
export interface DeliveryEngagementArtifactRefs {
  hasApprovedRequirementSet: boolean;
  activeNonSupersededRequirementSetCount: number;
  hasApprovedPromptPack: boolean;
  allCursorSessionsSubmitted: boolean;
  evaluationsPassing: boolean;
  qaComplete: boolean;
  hasCompletedRetrospective: boolean;
}

export const EMPTY_DELIVERY_ARTIFACT_REFS: DeliveryEngagementArtifactRefs = {
  hasApprovedRequirementSet: false,
  activeNonSupersededRequirementSetCount: 0,
  hasApprovedPromptPack: false,
  allCursorSessionsSubmitted: false,
  evaluationsPassing: false,
  qaComplete: false,
  hasCompletedRetrospective: false,
};
